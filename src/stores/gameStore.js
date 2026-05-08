// zustand 스토어 — UI에서 게임 상태 구독
// 룰 엔진은 순수 함수, 스토어는 wrapper + 사용자 의사결정 핸들러

import { create } from 'zustand';
import { createGameState } from '@/engine/gameState.js';
import { createRng } from '@/engine/rng.js';
import { playTurn } from '@/engine/rules.js';
import { currentPrice, hasColorMonopoly, rentFromStage } from '@/engine/inflation.js';
import { round10 } from '@/engine/constants.js';

const SAVE_KEY = 'reallife-save';

export const useGameStore = create((set, get) => ({
  // 게임 상태
  state: null,
  rng: null,
  log: [],

  // 모달 상태
  modal: {
    property: null,    // { pos, visitorId }
    trade: null,       // { fromId, toId, initialGetPos? }
    tradeSelect: null, // { fromId } — 미니맵 모달 (거래 상대 부동산 선택)
    event: null,       // { eventId, description, affected }
    yearEnd: null,     // { year, summary }
    deathmatch: false,
    recovery: null,    // { playerId, needAmount }
  },

  // 매트릭스 토스트 (인컴/지출 페이드아웃)
  toasts: [],
  toastSeq: 0,

  // ===== 게임 초기화 =====
  initGame: ({
    numPlayers = 4,
    options = {},
    characters,
    playerNames,
    seed = Date.now(),
  } = {}) => {
    const rng = createRng(seed);
    const state = createGameState({ numPlayers, options, rng, characters });
    // 사용자 입력 이름이 있으면 덮어쓰기
    if (Array.isArray(playerNames)) {
      state.players.forEach((p, i) => {
        if (playerNames[i] && playerNames[i].trim()) p.name = playerNames[i].trim();
      });
    }
    set({
      state,
      rng,
      log: [],
      modal: { property: null, trade: null, tradeSelect: null, event: null, yearEnd: null, deathmatch: false, recovery: null },
      toasts: [],
    });
  },

  // 자기 턴 1회 실행
  step: () => {
    const { state, rng, log } = get();
    if (!state || state.finished) return;
    const { events } = playTurn(state, rng);
    set({ state: { ...state }, log: [...log, ...events] });
    // 자동 저장
    get().save();
  },

  // ===== 토스트 (매트릭스 페이드아웃) =====
  addToast: ({ type, amount, x, y, size }) => {
    const id = get().toastSeq + 1;
    const toast = { id, type, amount, x, y, size };
    set((s) => ({ toasts: [...s.toasts, toast], toastSeq: id }));
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  // ===== 부동산 매입 =====
  buyProperty: (playerId, pos) => {
    const { state } = get();
    if (!state) return;
    const tile = state.board.tiles[pos];
    const price = currentPrice(state, pos);
    const player = state.players[playerId];
    if (!player || player.cash < price) return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner != null) return;
    // 차감 + 등록
    player.cash -= price;
    ts.owner = playerId;
    if (!player.properties) player.properties = [];
    player.properties.push(pos);
    set({ state: { ...state }, modal: { ...get().modal, property: null } });
    get().addToast({ type: 'expense', amount: price });
    get().save();
  },

  // ===== 통행료 지불 — BRAINSTORM 7-2: rentFromStage 통일 호출 =====
  payRent: (visitorId, pos) => {
    const { state } = get();
    if (!state) return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner == null || ts.owner === visitorId) return;
    const rent = rentFromStage(state, pos);
    if (rent <= 0) return;
    const visitor = state.players[visitorId];
    const owner = state.players[ts.owner];
    if (!visitor || !owner) return;
    visitor.cash -= rent;
    owner.cash += rent;
    set({ state: { ...state }, modal: { ...get().modal, property: null } });
    get().addToast({ type: 'expense', amount: rent });
    get().save();
  },

  // ===== 부동산 단계 변경 (집짓기 +/-) — 룰 §6 =====
  // 비용 = tile.houseCost (그룹별 빌라값 50/100/150/200)
  //   - 짓기 (+): houseCost 차감 (아파트도 동일 — 빌라 4동 → 아파트는 houseCost 추가)
  //   - 취소 (−, 세션 내, next >= initialStage): houseCost 100% 환급
  //   - 판매 (−, 기존 빌딩, next < initialStage): houseCost 50% 환급 (절반 손해, 룰 §10)
  // 건설 조건 (룰 §6): 색깔 독점 OR freeBuilding 옵션
  // 대출 상태 카드는 건설 X
  developProperty: (playerId, pos, delta, initialStage = null) => {
    const { state } = get();
    if (!state) return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner !== playerId) return;
    if (ts.mortgaged) return; // 대출 상태 = 건설 불가
    const tile = state.board.tiles[pos];
    if (!tile) return;
    const cur = ts.stage ?? 0;
    const next = Math.max(0, Math.min(5, cur + delta));
    if (next === cur) return;
    const player = state.players[playerId];
    if (!player) return;

    // 건설 조건: 색깔 독점 또는 freeBuild 옵션 켜져 있어야 (짓는 방향만)
    if (delta > 0) {
      const monopoly = hasColorMonopoly(state, playerId, tile.color);
      const freeBuild = state.options?.freeBuild ?? true; // 기본값 true (gameState 디폴트와 일치)
      if (!monopoly && !freeBuild) return;
    }

    const houseCost = tile.houseCost ?? 0;
    if (delta > 0) {
      // 짓기 — 철거된 거 복구하는 거면 50% (전에 50% 받았으니 50% 만 내면 원상),
      // 새로 짓는 거면 100% 비용
      const isRestore = initialStage != null && next <= initialStage;
      const cost = round10(houseCost * (isRestore ? 0.5 : 1.0));
      if (player.cash < cost) return;
      player.cash -= cost;
    } else {
      // 부수기 — 세션 내 빌드 취소(100%) / 기존 빌딩 판매(50%)
      const isSelling = initialStage != null && next < initialStage;
      const refundRate = isSelling ? 0.5 : 1.0;
      player.cash += round10(houseCost * refundRate);
    }
    ts.stage = next;
    set({ state: { ...state } });
    get().save();
  },

  // ===== 거래 미니맵 (상대 부동산 선택) =====
  openTradeSelect: (fromId) => {
    set({ modal: { ...get().modal, tradeSelect: { fromId }, property: null } });
  },
  closeTradeSelect: () => {
    set({ modal: { ...get().modal, tradeSelect: null } });
  },
  // 미니맵에서 선택 완료 → TradeModal 로 진행
  openTradeFromSelect: ({ fromId, toId, getPos = [] }) => {
    set({ modal: { ...get().modal, tradeSelect: null, trade: { fromId, toId, initialGetPos: getPos } } });
  },

  // ===== 거래 모달 =====
  openTradeModal: (fromId, toId = null) => {
    set({ modal: { ...get().modal, trade: { fromId, toId } } });
  },
  closeTradeModal: () => {
    set({ modal: { ...get().modal, trade: null } });
  },
  submitTrade: ({ fromId, toId, givePos = [], getPos = [], giveCash = 0, getCash = 0 }) => {
    const { state } = get();
    if (!state) return;
    const from = state.players[fromId];
    const to = state.players[toId];
    if (!from || !to) return;
    if (from.cash < giveCash || to.cash < getCash) return;
    // 부동산 이전
    for (const pos of givePos) {
      const ts = state.tileState[pos];
      if (!ts || ts.owner !== fromId) return;
      ts.owner = toId;
      from.properties = (from.properties ?? []).filter((p) => p !== pos);
      to.properties = [...(to.properties ?? []), pos];
    }
    for (const pos of getPos) {
      const ts = state.tileState[pos];
      if (!ts || ts.owner !== toId) return;
      ts.owner = fromId;
      to.properties = (to.properties ?? []).filter((p) => p !== pos);
      from.properties = [...(from.properties ?? []), pos];
    }
    // 현금 이전
    from.cash -= giveCash;
    to.cash += giveCash;
    to.cash -= getCash;
    from.cash += getCash;
    set({ state: { ...state }, modal: { ...get().modal, trade: null } });
    get().save();
  },

  // ===== 회생 모달 =====
  openRecoveryModal: (playerId, needAmount) => {
    set({ modal: { ...get().modal, recovery: { playerId, needAmount } } });
  },
  closeRecoveryModal: () => {
    set({ modal: { ...get().modal, recovery: null } });
  },

  // 회생 1단계: 부동산 대출
  takePropertyLoan: (playerId, pos) => {
    const { state } = get();
    if (!state) return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner !== playerId || ts.mortgaged) return;
    const player = state.players[playerId];
    const loanAmount = round10(currentPrice(state, pos) * 0.7);
    player.cash += loanAmount;
    ts.mortgaged = true;
    if (!player.propertyLoans) player.propertyLoans = [];
    player.propertyLoans.push({ pos, amount: loanAmount });
    set({ state: { ...state } });
    get().addToast({ type: 'income', amount: loanAmount });
    get().save();
  },

  // 회생 3단계: NPC 매도 (시세 50%)
  sellPropertyToNPC: (playerId, pos) => {
    const { state } = get();
    if (!state) return;
    const ts = state.tileState[pos];
    if (!ts || ts.owner !== playerId) return;
    const player = state.players[playerId];
    const sellAmount = round10(currentPrice(state, pos) * 0.5);
    player.cash += sellAmount;
    ts.owner = null;
    ts.stage = 0;
    ts.mortgaged = false;
    player.properties = (player.properties ?? []).filter((p) => p !== pos);
    set({ state: { ...state } });
    get().addToast({ type: 'income', amount: sellAmount });
    get().save();
  },

  // 회생 4단계: 신용대출
  takeCreditLoan: (playerId) => {
    const { state } = get();
    if (!state) return;
    const player = state.players[playerId];
    if (!player || player.cash > 300 || player.creditLoan?.active) return;
    player.cash += 1000;
    player.creditLoan = { active: true, missedCount: 0 };
    set({ state: { ...state } });
    get().addToast({ type: 'income', amount: 1000 });
    get().save();
  },

  // 회생 5단계: 파산
  declareBankruptcy: (playerId) => {
    const { state } = get();
    if (!state) return;
    const player = state.players[playerId];
    if (!player) return;
    // 자산 NPC 회수
    for (const pos of player.properties ?? []) {
      const ts = state.tileState[pos];
      if (ts) {
        ts.owner = null;
        ts.stage = 0;
        ts.mortgaged = false;
      }
    }
    player.properties = [];
    player.cash = 0;
    player.bankrupt = true;
    set({ state: { ...state }, modal: { ...get().modal, recovery: null } });
    get().save();
  },

  // ===== 이벤트 / 결산 모달 =====
  showEvent: ({ eventId, description, affected }) => {
    set({ modal: { ...get().modal, event: { eventId, description, affected } } });
  },
  confirmEvent: () => {
    set({ modal: { ...get().modal, event: null } });
  },
  showYearEnd: ({ year, summary }) => {
    set({ modal: { ...get().modal, yearEnd: { year, summary } } });
  },
  confirmYearEnd: () => {
    set({ modal: { ...get().modal, yearEnd: null } });
  },
  showDeathmatch: () => {
    set({ modal: { ...get().modal, deathmatch: true } });
  },
  confirmDeathmatch: () => {
    set({ modal: { ...get().modal, deathmatch: false } });
  },

  // 부동산 카드 모달
  openPropertyModal: (pos, visitorId) => {
    set({ modal: { ...get().modal, property: { pos, visitorId } } });
  },
  closePropertyModal: () => {
    set({ modal: { ...get().modal, property: null } });
  },

  // ===== localStorage 저장/복원 =====
  save: () => {
    const { state } = get();
    if (state) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('[gameStore] save failed', e);
      }
    }
  },
  load: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        const rng = createRng(state.rngSeed ?? Date.now());
        set({ state, rng });
        return true;
      }
    } catch (e) {
      console.warn('[gameStore] load failed', e);
    }
    return false;
  },
  hasSavedGame: () => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  },
  clearSave: () => {
    localStorage.removeItem(SAVE_KEY);
  },
  resetGame: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      state: null,
      rng: null,
      log: [],
      modal: { property: null, trade: null, tradeSelect: null, event: null, yearEnd: null, deathmatch: false, recovery: null },
      toasts: [],
    });
  },
}));
