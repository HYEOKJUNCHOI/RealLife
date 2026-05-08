// 카드 시스템 — 복지(즉시) / 이벤트(2년 결산 / 데스매치)
// 찬스 카드는 BRAINSTORM §9 결정으로 MVP 제외 (V2 이벤트 시스템과 결 중복)

import { round10 } from './constants.js';
import { computeNetWorth } from './tax.js';
import { isProperty, propertyPositions } from './board.js';
import { currentPrice } from './inflation.js';

// =================== 복지 카드 (10장, 즉시 발동) ===================

export const WELFARE_CARDS = [
  { id: 1, name: '코로나재난지원금', delta: +200 },
  { id: 2, name: '근로장려금', delta: +100 },
  { id: 3, name: '기초연금', delta: +50 },
  { id: 4, name: '건강검진', delta: -50 },
  { id: 5, name: '국민연금', delta: -100 },
  { id: 6, name: '동네모임회비', allDelta: -30 },
  { id: 7, name: '친척결혼식', collectFromAll: 50 },
  { id: 8, name: '청약당첨_복지', upgrade: true },
  { id: 9, name: '출산장려금', delta: +200 },
  { id: 10, name: '부정수급적발', delta: -200 },
];

export const drawWelfareCard = (state, playerId, rng) => {
  const card = rng.pick(WELFARE_CARDS);
  const player = state.players[playerId];
  const log = { card: card.name };
  if (card.delta) {
    player.cash += card.delta;
    log.delta = card.delta;
  }
  if (card.allDelta) {
    for (const p of state.players) p.cash += card.allDelta;
    log.allDelta = card.allDelta;
  }
  if (card.collectFromAll) {
    for (let i = 0; i < state.players.length; i++) {
      if (i === playerId) continue;
      state.players[i].cash -= card.collectFromAll;
      player.cash += card.collectFromAll;
    }
    log.collected = card.collectFromAll * (state.players.length - 1);
  }
  if (card.upgrade) {
    const owned = propertyPositions(state.board.tiles).filter(
      (pos) => state.tileState[pos]?.owner === playerId && (state.tileState[pos]?.stage ?? 0) < 5,
    );
    if (owned.length > 0) {
      owned.sort((a, b) => currentPrice(state, b) - currentPrice(state, a));
      const target = owned[0];
      state.tileState[target].stage = (state.tileState[target].stage ?? 0) + 1;
      log.upgraded = target;
    }
  }
  return log;
};

// =================== 이벤트 카드 (7장, 2년 결산 / 데스매치) ===================

export const EVENT_CARDS = [
  { id: 1, name: '전쟁', kind: 'war' },
  { id: 2, name: '다주택자규제', kind: 'multihouse' },
  { id: 3, name: '화재', kind: 'fire' },
  { id: 4, name: '거품붕괴', kind: 'bubble' },
  { id: 5, name: '재개발', kind: 'redev' },
  { id: 6, name: 'GTX개통', kind: 'gtx' },
  { id: 7, name: '부동산청약', kind: 'lottery_estate' },
];

export const triggerEventCard = (state, rng) => {
  const card = rng.pick(EVENT_CARDS);
  const log = { card: card.name, kind: card.kind };
  switch (card.kind) {
    case 'war': {
      // 랜덤 1명 부동산 1개 국유화 + 빌라 1~2채 파괴
      const owners = state.players.map((_, i) => i).filter((i) => !state.players[i].bankrupt);
      const target = rng.pick(owners);
      const owned = propertyPositions(state.board.tiles).filter(
        (pos) => state.tileState[pos]?.owner === target,
      );
      if (owned.length > 0) {
        const lossPos = rng.pick(owned);
        const ts = state.tileState[lossPos];
        ts.owner = null;
        ts.stage = 0;
        ts.mortgaged = false;
        log.target = target;
        log.lossPos = lossPos;
      }
      break;
    }
    case 'multihouse': {
      // 5채 이상 보유자 1명 → 1개 70% NPC 매각
      const heavy = state.players
        .map((p, i) => ({ i, count: countPropsOwned(state, i) }))
        .filter((x) => x.count >= 5);
      if (heavy.length > 0) {
        const target = rng.pick(heavy).i;
        const owned = propertyPositions(state.board.tiles).filter(
          (pos) => state.tileState[pos]?.owner === target,
        );
        const lossPos = rng.pick(owned);
        const sale = round10(currentPrice(state, lossPos) * 0.7);
        state.players[target].cash += sale;
        state.tileState[lossPos].owner = null;
        state.tileState[lossPos].stage = 0;
        log.target = target;
        log.lossPos = lossPos;
        log.sale = sale;
      }
      break;
    }
    case 'fire': {
      const owners = state.players.map((_, i) => i).filter((i) => !state.players[i].bankrupt);
      const target = rng.pick(owners);
      const owned = propertyPositions(state.board.tiles).filter(
        (pos) => state.tileState[pos]?.owner === target,
      );
      if (owned.length > 0) {
        const lossPos = rng.pick(owned);
        const ts = state.tileState[lossPos];
        ts.priceModifier = (ts.priceModifier ?? 1) * 0.7;
        if ((ts.stage ?? 0) >= 1 && ts.stage <= 4) ts.stage -= 1;
        log.target = target;
        log.lossPos = lossPos;
      }
      break;
    }
    case 'bubble': {
      // 랜덤 컬러 2개 -25%
      const colors = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];
      const picked = rng.shuffle(colors).slice(0, 2);
      for (const pos of propertyPositions(state.board.tiles)) {
        const tile = state.board.tiles[pos];
        if (picked.includes(tile.color)) {
          state.tileState[pos] ??= {};
          state.tileState[pos].priceModifier =
            (state.tileState[pos].priceModifier ?? 1) * 0.75;
        }
      }
      log.colors = picked;
      break;
    }
    case 'redev': {
      for (const pos of propertyPositions(state.board.tiles)) {
        state.tileState[pos] ??= {};
        state.tileState[pos].priceModifier =
          (state.tileState[pos].priceModifier ?? 1) * 1.1;
      }
      break;
    }
    case 'gtx': {
      // 수도권 남색 +30%
      for (const pos of propertyPositions(state.board.tiles)) {
        const tile = state.board.tiles[pos];
        if (tile.color === 'darkblue') {
          state.tileState[pos] ??= {};
          state.tileState[pos].priceModifier =
            (state.tileState[pos].priceModifier ?? 1) * 1.3;
        }
      }
      break;
    }
    case 'lottery_estate': {
      const free = propertyPositions(state.board.tiles).filter(
        (pos) => state.tileState[pos]?.owner == null,
      );
      if (free.length > 0) {
        const givePos = rng.pick(free);
        const owners = state.players.map((_, i) => i).filter((i) => !state.players[i].bankrupt);
        const target = rng.pick(owners);
        state.tileState[givePos] ??= {};
        state.tileState[givePos].owner = target;
        log.target = target;
        log.givePos = givePos;
      }
      break;
    }
  }
  return log;
};

const countPropsOwned = (state, playerId) =>
  propertyPositions(state.board.tiles).filter((p) => state.tileState[p]?.owner === playerId)
    .length;
