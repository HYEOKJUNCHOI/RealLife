// zustand 스토어 — UI에서 게임 상태 구독
// 룰 엔진은 순수 함수, 스토어는 wrapper + 사용자 의사결정 핸들러

import { create } from 'zustand';
import { createGameState } from '@/engine/gameState.js';
import { createRng } from '@/engine/rng.js';
import { advanceTurn, finishGame, handleTileArrival, onTurnStart, playTurn } from '@/engine/rules.js';
import { applyDeferredCardEffect } from '@/engine/cards.js';
import { handleInstitutionArrival, stationResign } from '@/engine/station.js';
import { currentPrice, hasColorMonopoly, rentFromStage } from '@/engine/inflation.js';
import { CREDIT_ELIGIBILITY_CASH, CREDIT_LIMIT, LOANSHARK_LIMIT, round10 } from '@/engine/constants.js';
import { canTakeCredit, canTakeLoanshark, takeCredit, takeLoanshark } from '@/engine/loan.js';

const SAVE_KEY = 'reallife-save';
const DEBUG_LOG_KEY = 'reallife-debug-log-v1';

export const useGameStore = create((set, get) => ({
  // 게임 상태
  state: null,
  rng: null,
  log: [],
  lastTurn: null,

  // 모달 상태
  modal: {
    property: null,    // { pos, visitorId }
    trade: null,       // { fromId, toId, initialGetPos? }
    tradeSelect: null, // { fromId } — 미니맵 모달 (거래 상대 부동산 선택)
    event: null,       // { eventId, description, affected }
    yearEnd: null,     // { year, summary }
    deathmatch: false,
    recovery: null,    // { playerId, needAmount }
    loan: null,         // { playerId }
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
    playerTypes,
    seed = Date.now(),
    showInitialDeal = false,
  } = {}) => {
    const rng = createRng(seed);
    const state = createGameState({ numPlayers, options, rng, characters, playerTypes });
    // 사용자 입력 이름이 있으면 덮어쓰기
    if (Array.isArray(playerNames)) {
      state.players.forEach((p, i) => {
        if (playerNames[i] && playerNames[i].trim()) p.name = playerNames[i].trim();
      });
    }
    state._gameStartNonce = seed;
    state._forceInitialDeal = !!showInitialDeal;
    state._initialDealShown = false;
    if (typeof localStorage !== 'undefined') {
      const selected = state.players.map((player, index) => `${index + 1}P ${player.name ?? player.character ?? '플레이어'}`).join(', ');
      localStorage.setItem(DEBUG_LOG_KEY, `# RealLife DEBUG LOG\n[새 게임 시작] ${new Date().toLocaleString('ko-KR')}\n플레이어: ${selected}\n\n`);
    }
    set({
      state,
      rng,
      log: [],
      lastTurn: null,
      modal: { property: null, trade: null, tradeSelect: null, event: null, yearEnd: null, deathmatch: false, recovery: null, loan: null },
      toasts: [],
    });
    get().save();
  },

  tickClock: () => {
    const { state, rng, log } = get();
    if (!state || state.finished || state.realTimeMode === false) return false;
    const startedAt = state.realTimeStartedAt ?? Date.now();
    if (!state.realTimeStartedAt) state.realTimeStartedAt = startedAt;
    const elapsedMin = Math.max(0, (Date.now() - startedAt) / 60000);
    const prevElapsed = state.elapsedMin ?? 0;
    state.elapsedMin = elapsedMin;
    const events = [];

    const dmStart = state.options?.deathmatchStartMinutes ?? 0;
    if (dmStart > 0 && !state.deathmatch && elapsedMin >= dmStart) {
      state.deathmatch = true;
      events.push({ kind: 'deathmatch_start' });
    }

    const gameDurationMin = state.options?.totalGameMinutes ?? 60;
    if (elapsedMin >= gameDurationMin && !state.finished) {
      finishGame(state, events);
    }

    if (events.length || Math.floor(prevElapsed * 60) !== Math.floor(elapsedMin * 60)) {
      set({ state: { ...state }, log: events.length ? [...log, ...events] : log });
      if (events.length || state.finished) get().save();
      return true;
    }
    return false;
  },

  // 턴 시작 안내를 닫은 순간 실제 턴 시작 비용/수입을 반영
  startTurn: (playerId = null) => {
    const { state, log } = get();
    if (!state || state.finished) return [];
    const activeId = playerId ?? state.turnIndex;
    if (activeId !== state.turnIndex) return [];
    const key = `${state.round ?? 0}-${state.turnIndex ?? 0}`;
    if (state._turnStartAppliedKey === key) return [];
    const events = [];
    const cashBefore = state.players[activeId]?.cash ?? 0;
    onTurnStart(state, activeId, events);
    state._turnStartAppliedKey = key;
    const cashAfter = state.players[activeId]?.cash ?? cashBefore;
    set({
      state: { ...state },
      log: [...log, ...events],
      lastTurn: { playerId: activeId, cashBefore, cashAfter, events },
    });
    get().save();
    return events;
  },

  // 자기 턴 1회 실행
  step: (turnOptions = {}) => {
    const { state, rng, log } = get();
    if (!state || state.finished) return [];
    const playerId = state.turnIndex;
    const turnKey = `${state.round ?? 0}-${state.turnIndex ?? 0}`;
    const turnStartAlreadyApplied = state._turnStartAppliedKey === turnKey;
    const cashBefore = state.players[playerId]?.cash ?? 0;
    const { events } = playTurn(state, rng, null, { ...turnOptions, skipTurnStart: turnOptions.skipTurnStart || turnStartAlreadyApplied });
    const cashAfter = state.players[playerId]?.cash ?? cashBefore;
    const eventKinds = new Set(['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate']);
    const eventCard = events.find((event) => event.card && eventKinds.has(event.kind));
    const arrivedUnownedProperty = events.find((event) => event.kind === 'arrive_property' && event.type === 'unowned');
    const nextModal = {
      ...get().modal,
      ...(eventCard ? { event: { eventId: eventCard.kind, description: `${eventCard.card} · ${eventCard.effectText ?? eventCard.description ?? ''}`, affected: eventCard } } : {}),
      ...(arrivedUnownedProperty && !turnOptions.deferPropertyModal ? { property: { pos: arrivedUnownedProperty.pos, visitorId: playerId } } : {}),
    };
    set({
      state: { ...state },
      log: [...log, ...events],
      lastTurn: {
        playerId,
        cashBefore: turnStartAlreadyApplied && get().lastTurn?.playerId === playerId ? get().lastTurn.cashBefore : cashBefore,
        cashAfter,
        events: turnStartAlreadyApplied && get().lastTurn?.playerId === playerId ? [...(get().lastTurn.events ?? []), ...events] : events,
      },
      modal: nextModal,
    });
    // 자동 저장
    get().save();
    return events;
  },
  endTurn: () => {
    const { state, rng, log } = get();
    if (!state || state.finished) return false;
    const events = [];
    advanceTurn(state, rng, events);
    set({
      state: { ...state },
      log: [...log, ...events],
      lastTurn: null,
    });
    get().save();
    return events;
  },
  restoreSnapshot: (snapshot) => {
    if (!snapshot?.state) return false;
    set({
      state: snapshot.state,
      log: snapshot.log ?? get().log,
      lastTurn: snapshot.lastTurn ?? get().lastTurn,
      modal: snapshot.modal ?? get().modal,
    });
    get().save();
    return true;
  },
  revealCardEffect: (playerId, event) => {
    const { state, rng, lastTurn, log } = get();
    if (!state || !event || event._applied) return false;
    const before = state.players[playerId]?.cash ?? 0;
    const applied = applyDeferredCardEffect(state, playerId, event);
    if (!applied) return false;
    const followUpEvents = [];
    if (applied.moveSteps && Number.isInteger(state.players[playerId]?.position)) {
      handleTileArrival(state, playerId, state.players[playerId].position, rng, followUpEvents, {
        deferCardEffects: true,
        deferPropertyModal: true,
      });
    }
    const after = state.players[playerId]?.cash ?? before;
    const safeFollowUpEvents = followUpEvents.map(e => ({ ...e, _state: undefined, _rng: undefined })); // 참조 제거
    const nextEvents = lastTurn?.playerId === playerId ? [...(lastTurn.events ?? []), ...safeFollowUpEvents] : safeFollowUpEvents;
    set({
      state: { ...state },
      log: [...log, ...safeFollowUpEvents],
      lastTurn: lastTurn?.playerId === playerId ? { ...lastTurn, cashAfter: after, events: nextEvents } : lastTurn,
    });
    get().save();
    return { event: applied, followUpEvents };
  },
  settleLottoRoll: (playerId, event, dice) => {
    const { state, lastTurn, log } = get();
    if (!state || !event || event.lottoResolved) return false;
    const player = state.players[playerId];
    if (!player) return false;
    const numbers = Array.isArray(event.lottoNumbers) ? event.lottoNumbers : [];
    const sum = Number(dice?.sum);
    const hit = numbers.includes(sum);
    const prize = Number(event.lottoPrize ?? 500);
    if (hit) player.cash += prize;
    event.lottoRoll = { d1: dice?.d1, d2: dice?.d2, sum };
    event.lottoHit = hit;
    event.lottoResolved = true;
    event.effectText = `당첨 숫자 ${numbers.join(' · ')} · 추가 주사위 ${sum}${hit ? ` 적중! (+${prize}만)` : ' 아쉽게 실패'}`;
    const after = player.cash;
    set({
      state: { ...state },
      log: [...log],
      lastTurn: lastTurn?.playerId === playerId ? { ...lastTurn, cashAfter: after } : lastTurn,
    });
    get().save();
    return { hit, prize, sum };
  },

  // ===== 토스트 비활성화 =====
  // 오른쪽 아래/플로팅 상태 알림은 사용하지 않는다.
  addToast: () => {},
  removeToast: () => {},

  // ===== 부동산 매입 =====
  buyProperty: (playerId, pos) => {
    const { state } = get();
    if (!state) return false;
    const tile = state.board.tiles[pos];
    const price = tile?.basePrice ?? currentPrice(state, pos);
    const player = state.players[playerId];
    if (!tile || !player || player.cash < price) return false;
    const ownedPropertyCount = Object.entries(state.tileState ?? {}).filter(([ownedPos, tileState]) => {
      const ownedTile = state.board?.tiles?.[Number(ownedPos)];
      return ownedTile?.type === 'property' && tileState?.owner === playerId;
    }).length;
    if (ownedPropertyCount >= 8) {
      get().addToast({ message: '부동산은 최대 8개까지만 보유할 수 있습니다. 하나 정리하고 매입하세요.', tone: 'warn' });
      return false;
    }
    const ts = state.tileState[pos];
    if (!ts || ts.owner != null) return false;
    // 차감 + 등록
    const cashBefore = player.cash ?? 0;
    player.cash -= price;
    ts.owner = playerId;
    if (!player.properties) player.properties = [];
    player.properties.push(pos);
    state._lastDeedAdded = { playerId, pos, nonce: Date.now() };
    const event = { kind: 'buy_property', playerId, pos, price };
    const prevLastTurn = get().lastTurn;
    const nextEvents = prevLastTurn?.playerId === playerId ? [...(prevLastTurn.events ?? []), event] : [event];
    set({
      state: { ...state },
      modal: { ...get().modal, property: null },
      log: [...get().log, event],
      lastTurn: {
        playerId,
        cashBefore: prevLastTurn?.playerId === playerId ? prevLastTurn.cashBefore : cashBefore,
        cashAfter: player.cash ?? 0,
        events: nextEvents,
      },
    });
    get().addToast({ type: 'expense', amount: price });
    get().addToast({ message: `${tile.names?.ko ?? tile.name ?? '부동산'} 매입 완료 · ${price}만 지출`, tone: 'success' });
    get().save();
    return true;
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

  hubTeleport: (playerId, destPos, fee = 0) => {
    const { state, log, lastTurn } = get();
    if (!state || state.finished) return false;
    const player = state.players[playerId];
    const target = state.board?.tiles?.[destPos];
    const safeFee = Math.max(0, Number(fee) || 0);
    if (!player || !target) return false;
    if (safeFee > 0 && (player.cash ?? 0) < safeFee) return false;
    const fromPos = player.position ?? 0;
    if (safeFee > 0) player.cash -= safeFee;
    player.position = destPos;
    const event = { kind: 'hub_teleport', playerId, fromPos, destPos, fee: safeFee };
    const arrivalEvents = [];
    if (target.type === 'utility') {
      arrivalEvents.push({ kind: 'arrive_institution', ...handleInstitutionArrival(state, playerId, destPos) });
    }
    const appendedEvents = [event, ...arrivalEvents];
    const nextEvents = lastTurn?.playerId === playerId ? [...(lastTurn.events ?? []), ...appendedEvents] : appendedEvents;
    set({
      state: { ...state },
      log: [...log, ...appendedEvents],
      lastTurn: {
        playerId,
        cashBefore: lastTurn?.playerId === playerId ? lastTurn.cashBefore : (player.cash ?? 0) + safeFee,
        cashAfter: player.cash ?? 0,
        events: nextEvents,
      },
    });
    if (safeFee > 0) get().addToast({ type: 'expense', amount: safeFee });
    get().save();
    return true;
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
    const rawNext = cur + delta;
    const next = delta > 0 && cur === 3
      ? 5
      : delta < 0 && cur === 5
        ? 3
        : Math.max(0, Math.min(5, rawNext));
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
    const cashBefore = player.cash ?? 0;
    let amount = 0;
    if (delta > 0) {
      // 짓기 — 철거된 거 복구하는 거면 50% (전에 50% 받았으니 50% 만 내면 원상),
      // 새로 짓는 거면 100% 비용
      const isRestore = initialStage != null && next <= initialStage;
      const cost = round10(houseCost * (isRestore ? 0.5 : 1.0));
      if (player.cash < cost) return;
      player.cash -= cost;
      amount = -cost;
    } else {
      // 부수기 — 세션 내 빌드 취소(100%) / 기존 빌딩 판매(50%)
      const isSelling = initialStage != null && next < initialStage;
      const refundRate = isSelling ? 0.5 : 1.0;
      const refund = round10(houseCost * refundRate);
      player.cash += refund;
      amount = refund;
    }
    ts.stage = next;
    const event = { kind: 'develop_property', playerId, pos, fromStage: cur, toStage: next, amount };
    const prevLastTurn = get().lastTurn;
    const nextEvents = prevLastTurn?.playerId === playerId ? [...(prevLastTurn.events ?? []), event] : [event];
    set({
      state: { ...state },
      log: [...get().log, event],
      lastTurn: {
        playerId,
        cashBefore: prevLastTurn?.playerId === playerId ? prevLastTurn.cashBefore : cashBefore,
        cashAfter: player.cash ?? 0,
        events: nextEvents,
      },
    });
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
  skipLifeChange: (playerId) => {
    const { state } = get();
    if (!state?.pendingLifeChange || state.pendingLifeChange.playerId !== playerId) return false;
    state.pendingLifeChange = null;
    set({ state: { ...state } });
    get().addToast({ message: '인생체인지를 스킵했습니다.', tone: 'info' });
    get().save();
    return true;
  },

  lifeChange: (fromId, toId, { useDefense = false } = {}) => {
    const { state, log, lastTurn } = get();
    if (!state || state.finished) return false;
    const pending = state.pendingLifeChange;
    if (!pending || pending.playerId !== fromId || fromId === toId) return false;
    const from = state.players[fromId];
    const to = state.players[toId];
    if (!from || !to || from.bankrupt || to.bankrupt) return false;

    if (useDefense && (to.defenseCards ?? 0) > 0) {
      to.defenseCards -= 1;
      state.pendingLifeChange = null;
      const event = { kind: 'life_change_blocked', fromId, toId };
      const nextEvents = lastTurn?.playerId === fromId ? [...(lastTurn.events ?? []), event] : [event];
      set({
        state: { ...state },
        log: [...log, event],
        lastTurn: {
          playerId: fromId,
          cashBefore: lastTurn?.playerId === fromId ? lastTurn.cashBefore : from.cash,
          cashAfter: from.cash,
          events: nextEvents,
        },
      });
      get().addToast({ message: `${to.name ?? `${toId + 1}P`} 방어카드 발동 · 인생체인지 무효`, tone: 'warn' });
      get().save();
      return 'blocked';
    }

    const swapKeys = [
      'cash', 'salaryBonus', 'creditUsed', 'creditDebt', 'creditMisses', 'loansharkUsed', 'loansharkDebt', 'defenseCards',
      'propertyLoans', 'chanceCards', 'welfareCards', 'activeCards', 'passives',
    ];
    for (const key of swapKeys) {
      const tmp = from[key];
      from[key] = to[key];
      to[key] = tmp;
    }

    for (const ts of Object.values(state.tileState ?? {})) {
      if (!ts) continue;
      if (ts.owner === fromId) ts.owner = toId;
      else if (ts.owner === toId) ts.owner = fromId;
    }
    const rebuildProperties = (playerId) => Object.entries(state.tileState ?? {})
      .filter(([, ts]) => ts?.owner === playerId)
      .map(([pos]) => Number(pos));
    from.properties = rebuildProperties(fromId);
    to.properties = rebuildProperties(toId);
    state.pendingLifeChange = null;

    const event = { kind: 'life_change_swap', fromId, toId };
    const nextEvents = lastTurn?.playerId === fromId ? [...(lastTurn.events ?? []), event] : [event];
    set({
      state: { ...state },
      log: [...log, event],
      lastTurn: {
        playerId: fromId,
        cashBefore: lastTurn?.playerId === fromId ? lastTurn.cashBefore : to.cash,
        cashAfter: from.cash,
        events: nextEvents,
      },
    });
    get().addToast({ message: `${from.name ?? `${fromId + 1}P`} ↔ ${to.name ?? `${toId + 1}P`} 인생체인지 완료`, tone: 'success' });
    get().save();
    return true;
  },

  resignStation: (playerId) => {
    const { state, log, lastTurn } = get();
    if (!state || playerId == null) return null;
    const result = stationResign(state, playerId);
    if (!result) return null;
    const event = { kind: 'station_resign', playerId, pos: result.pos, collected: result.collected };
    set({
      state: { ...state },
      log: [...log, event],
      lastTurn: lastTurn?.playerId === playerId
        ? { ...lastTurn, cashAfter: state.players[playerId]?.cash ?? lastTurn.cashAfter, events: [...(lastTurn.events ?? []), event] }
        : lastTurn,
    });
    get().save();
    return result;
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
    if (!ts || ts.owner !== playerId || ts.mortgaged) return false;
    const player = state.players[playerId];
    const loanAmount = round10(currentPrice(state, pos) * 0.7);
    player.cash += loanAmount;
    ts.mortgaged = true;
    ts.mortgageAmount = loanAmount;
    ts.mortgageYear = state.year ?? 0;
    if (!player.propertyLoans) player.propertyLoans = [];
    player.propertyLoans.push({ pos, amount: loanAmount, year: state.year ?? 0 });
    set({ state: { ...state } });
    get().addToast({ type: 'income', amount: loanAmount });
    get().save();
    return true;
  },

  repayPropertyLoan: (playerId, pos) => {
    const { state } = get();
    if (!state) return false;
    const ts = state.tileState[pos];
    if (!ts || ts.owner !== playerId || !ts.mortgaged || (ts.mortgageAmount ?? 0) <= 0) return false;
    const player = state.players[playerId];
    if (!player) return false;
    const currentYear = state.year ?? 0;
    const principal = ts.mortgageAmount ?? 0;
    const fee = currentYear - (ts.mortgageYear ?? currentYear) < 1 ? round10(principal * 0.01) : 0;
    const total = principal + fee;
    if ((player.cash ?? 0) < total) return false;
    player.cash -= total;
    ts.mortgaged = false;
    ts.mortgageAmount = 0;
    ts.mortgageYear = null;
    player.propertyLoans = (player.propertyLoans ?? []).filter((loan) => loan.pos !== pos);
    set({ state: { ...state } });
    get().addToast({ type: 'expense', amount: total });
    get().save();
    return true;
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

  // 카드 옆 메뉴 일반 매도: 현재 시세 70%
  sellPropertyMarket: (playerId, pos) => {
    const { state, log, lastTurn } = get();
    if (!state) return false;
    const ts = state.tileState[pos];
    if (!ts || ts.owner !== playerId || ts.mortgaged) return false;
    const player = state.players[playerId];
    if (!player) return false;
    const cashBefore = player.cash ?? 0;
    const sellAmount = round10(currentPrice(state, pos) * 0.7);
    player.cash += sellAmount;
    ts.owner = null;
    ts.stage = 0;
    ts.premium = 0;
    ts.mortgaged = false;
    ts.mortgageAmount = 0;
    ts.mortgageYear = null;
    player.properties = (player.properties ?? []).filter((p) => p !== pos);
    player.propertyLoans = (player.propertyLoans ?? []).filter((loan) => loan.pos !== pos);
    const event = { kind: 'sell_property_market', playerId, pos, amount: sellAmount };
    const nextEvents = lastTurn?.playerId === playerId ? [...(lastTurn.events ?? []), event] : [event];
    set({
      state: { ...state },
      modal: { ...get().modal, property: null },
      log: [...log, event],
      lastTurn: lastTurn?.playerId === playerId
        ? { ...lastTurn, cashAfter: player.cash ?? 0, events: nextEvents }
        : { playerId, cashBefore, cashAfter: player.cash ?? 0, events: nextEvents },
    });
    get().addToast({ type: 'income', amount: sellAmount });
    get().save();
    return true;
  },

  openLoanModal: (playerId) => {
    set({ modal: { ...get().modal, loan: { playerId } } });
  },
  closeLoanModal: () => {
    set({ modal: { ...get().modal, loan: null } });
  },

  // 회생/대출: 신용대출 (1,000만, 현금 300만 이하, 1회 제한)
  takeCreditLoan: (playerId) => {
    const { state } = get();
    if (!state) return false;
    const player = state.players[playerId];
    if (!player || !canTakeCredit(player)) return false;
    const amount = takeCredit(player, CREDIT_LIMIT);
    player.creditLoanYear = state.year ?? 0;
    set({ state: { ...state }, modal: { ...get().modal, loan: null } });
    get().addToast({ type: 'income', amount });
    get().save();
    return true;
  },

  // 대출: 사채 (2,000만, 언제든 가능, 1회 제한)
  takeLoanSharkLoan: (playerId) => {
    const { state } = get();
    if (!state) return false;
    const player = state.players[playerId];
    if (!player || !canTakeLoanshark(player)) return false;
    const amount = takeLoanshark(player, LOANSHARK_LIMIT);
    player.loansharkYear = state.year ?? 0;
    set({ state: { ...state }, modal: { ...get().modal, loan: null } });
    get().addToast({ type: 'income', amount });
    get().save();
    return true;
  },

  canTakeCreditLoan: (playerId) => {
    const player = get().state?.players?.[playerId];
    return !!player && canTakeCredit(player);
  },
  canTakeLoanSharkLoan: (playerId) => {
    const player = get().state?.players?.[playerId];
    return !!player && canTakeLoanshark(player);
  },
  creditLoanReason: (playerId) => {
    const player = get().state?.players?.[playerId];
    if (!player) return '';
    if (player.creditUsed) return '이미 신용대출을 사용했습니다.';
    if ((player.cash ?? 0) > CREDIT_ELIGIBILITY_CASH) return `예금이 ${CREDIT_ELIGIBILITY_CASH}만 이하일 때만 가능합니다.`;
    return '';
  },

  getLoanRepaymentInfo: (playerId) => {
    const state = get().state;
    const player = state?.players?.[playerId];
    if (!state || !player) return { principal: 0, fee: 0, total: 0, withinYear: false };
    const currentYear = state.year ?? 0;
    const debts = [];
    for (const pos in state.tileState ?? {}) {
      const ts = state.tileState[pos];
      if (ts?.owner === playerId && ts?.mortgaged && (ts.mortgageAmount ?? 0) > 0) {
        debts.push({ amount: ts.mortgageAmount ?? 0, year: ts.mortgageYear ?? currentYear });
      }
    }
    if ((player.creditDebt ?? 0) > 0) debts.push({ amount: player.creditDebt, year: player.creditLoanYear ?? currentYear });
    if ((player.loansharkDebt ?? 0) > 0) debts.push({ amount: player.loansharkDebt, year: player.loansharkYear ?? currentYear });
    const principal = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const feeBase = debts.filter((debt) => currentYear - (debt.year ?? currentYear) < 1).reduce((sum, debt) => sum + debt.amount, 0);
    const fee = round10(feeBase * 0.01);
    return { principal, fee, total: principal + fee, withinYear: feeBase > 0 };
  },

  repayLoans: (playerId, principalAmount) => {
    const { state } = get();
    const player = state?.players?.[playerId];
    if (!state || !player) return false;
    const info = get().getLoanRepaymentInfo(playerId);
    const principalToPay = Math.min(Math.max(0, round10(principalAmount)), info.principal);
    if (principalToPay <= 0) return false;

    const currentYear = state.year ?? 0;
    let remain = principalToPay;
    let feeBase = 0;
    const markFee = (amount, year) => {
      if (currentYear - (year ?? currentYear) < 1) feeBase += amount;
    };

    if ((player.loansharkDebt ?? 0) > 0 && remain > 0) {
      const pay = Math.min(player.loansharkDebt, remain);
      markFee(pay, player.loansharkYear ?? currentYear);
      player.loansharkDebt -= pay;
      remain -= pay;
    }
    if ((player.creditDebt ?? 0) > 0 && remain > 0) {
      const pay = Math.min(player.creditDebt, remain);
      markFee(pay, player.creditLoanYear ?? currentYear);
      player.creditDebt -= pay;
      if (player.creditDebt <= 0) player.creditMisses = 0;
      remain -= pay;
    }
    for (const pos in state.tileState ?? {}) {
      if (remain <= 0) break;
      const ts = state.tileState[pos];
      if (ts?.owner === playerId && ts?.mortgaged && (ts.mortgageAmount ?? 0) > 0) {
        const pay = Math.min(ts.mortgageAmount, remain);
        markFee(pay, ts.mortgageYear ?? currentYear);
        ts.mortgageAmount -= pay;
        remain -= pay;
        if (ts.mortgageAmount <= 0) {
          ts.mortgaged = false;
          ts.mortgageAmount = 0;
          ts.mortgageYear = null;
        }
      }
    }
    player.propertyLoans = (player.propertyLoans ?? []).filter((loan) => {
      const ts = state.tileState?.[loan.pos];
      return ts?.mortgaged && (ts.mortgageAmount ?? 0) > 0;
    });
    const fee = round10(feeBase * 0.01);
    const total = principalToPay + fee;
    if ((player.cash ?? 0) < total) return false;
    player.cash -= total;
    set({ state: { ...state } });
    get().addToast({ type: 'expense', amount: total });
    get().save();
    return true;
  },

  repayAllLoans: (playerId) => {
    const info = get().getLoanRepaymentInfo(playerId);
    const ok = get().repayLoans(playerId, info.principal);
    if (ok) set({ modal: { ...get().modal, loan: null } });
    return ok;
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
        if (state.realTimeMode !== false && !state.realTimeStartedAt) state.realTimeStartedAt = Date.now() - Math.max(0, state.elapsedMin ?? 0) * 60000;
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
  restartSameGame: () => {
    const { state } = get();
    if (!state) return false;
    const characters = state.players.map((player) => player.character);
    const playerNames = state.players.map((player) => player.name);
    const playerTypes = state.players.map((player) => player.controller === 'ai' ? 'ai' : 'human');
    const options = { ...state.options };
    localStorage.removeItem(SAVE_KEY);
    get().initGame({
      numPlayers: state.players.length,
      options,
      characters,
      playerNames,
      playerTypes,
      seed: Date.now(),
      showInitialDeal: true,
    });
    return true;
  },
  resetGame: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      state: null,
      rng: null,
      log: [],
      lastTurn: null,
      modal: { property: null, trade: null, tradeSelect: null, event: null, yearEnd: null, deathmatch: false, recovery: null, loan: null },
      toasts: [],
    });
    get().save();
  },
}));
