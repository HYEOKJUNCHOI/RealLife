// 카드 시스템 — 찬스/복지(즉시) / 이벤트(매년 결산 / 데스매치)

import { round10 } from './constants.js';
import { propertyPositions } from './board.js';
import { currentPrice } from './inflation.js';

const moneyText = (amount) => `${amount > 0 ? '+' : ''}${amount}만`;
const tileName = (state, pos) => state.board.tiles[pos]?.names?.ko ?? state.board.tiles[pos]?.name ?? '보유 부동산';
const playerName = (state, playerId) => state.players[playerId]?.name ?? `${playerId + 1}P`;

// =================== 찬스 카드 (즉시 발동) ===================

export const LIFE_CHANGE_CHANCE_RATE = 0.10;
export const DEFENSE_CARD_CHANCE_RATE = 0.15;

export const CHANCE_CARDS = [
  { id: 'marriage', name: '결혼', description: '결혼식 비용을 지불합니다.', delta: -200 },
  { id: 'job_change', name: '이직', description: '이직 성공 보너스를 받습니다.', delta: +50 },
  { id: 'promotion', name: '승진', description: '승진 보너스를 받습니다.', delta: +100 },
  { id: 'startup', name: '창업', description: '창업 지원금을 받습니다.', delta: +200 },
  { id: 'childbirth', name: '출산', description: '출산 준비 비용을 지불합니다.', delta: -100 },
  { id: 'honor_retire', name: '명예퇴직', description: '명예퇴직금을 받습니다.', delta: +300 },
  { id: 'military', name: '군 입대', description: '입대 지원금 200만을 받고 3턴 쉽니다.', delta: +200, skipTurns: 3 },
  { id: 'holiday_bonus', name: '명절 보너스', description: '명절 보너스를 받습니다.', delta: +100 },
  { id: 'accident', name: '사고', description: '사고 처리 비용을 지불합니다.', delta: -150 },
  { id: 'lotto', name: '로또', description: '로또에 당첨되어 상금을 받습니다.', delta: +500 },
  { id: 'subscription_win', name: '청약 당첨', description: '보유 부동산 1곳을 한 단계 업그레이드합니다.', upgrade: true },
  { id: 'move_forward_3', name: '앞으로 3칸', description: '말을 앞으로 3칸 이동합니다.', moveSteps: +3 },
  { id: 'move_forward_2', name: '앞으로 2칸', description: '말을 앞으로 2칸 이동합니다.', moveSteps: +2 },
  { id: 'move_back_3', name: '뒤로 3칸', description: '말을 뒤로 3칸 이동합니다.', moveSteps: -3 },
  { id: 'move_back_2', name: '뒤로 2칸', description: '말을 뒤로 2칸 이동합니다.', moveSteps: -2 },
  { id: 'teleport', name: '순간이동', description: '이번 버전에서는 이동 효과 없이 카드만 공개됩니다.', delta: 0 },
];

export const drawChanceCard = (state, playerId, rng, { deferEffects = false } = {}) => {
  const player = state.players[playerId];
  const rareRoll = rng.next();
  if (rareRoll < LIFE_CHANGE_CHANCE_RATE) {
    if (!deferEffects) state.pendingLifeChange = { playerId, nonce: Date.now() };
    return {
      card: '인생체인지',
      cardId: 'life_change',
      description: '선택한 상대와 자산·잔고·카드 상태를 맞바꿀 수 있습니다.',
      effectText: `${playerName(state, playerId)} 인생체인지 권한 획득`,
      choiceRequired: true,
    };
  }
  if (rareRoll < LIFE_CHANGE_CHANCE_RATE + DEFENSE_CARD_CHANCE_RATE) {
    const nextDefenseCards = (player.defenseCards ?? 0) + 1;
    if (!deferEffects) player.defenseCards = nextDefenseCards;
    return {
      card: '방어카드',
      cardId: 'defense_card',
      description: '인생체인지 공격을 1회 막을 수 있습니다.',
      effectText: `방어카드 1장 획득 (보유 ${nextDefenseCards}장)`,
      defenseCards: nextDefenseCards,
    };
  }

  const card = rng.pick(CHANCE_CARDS);
  const log = { card: card.name, cardId: card.id, description: card.description };

  if (card.delta) {
    if (!deferEffects) player.cash += card.delta;
    log.delta = card.delta;
    log.effectText = `${card.description} (${moneyText(card.delta)})`;
  }

  if (card.skipTurns) {
    if (!deferEffects) player.skipTurns = (player.skipTurns ?? 0) + card.skipTurns;
    log.skipTurns = card.skipTurns;
    log.effectText = card.delta
      ? `${card.description} (${moneyText(card.delta)}, ${card.skipTurns}턴 휴식)`
      : `${card.description} (${card.skipTurns}턴 휴식)`;
  }

  if (card.moveSteps) {
    const boardSize = state.board?.tiles?.length ?? 40;
    const fromPos = player.position ?? 0;
    const toPos = ((fromPos + card.moveSteps) % boardSize + boardSize) % boardSize;
    if (!deferEffects) player.position = toPos;
    log.moveSteps = card.moveSteps;
    log.fromPos = fromPos;
    log.toPos = toPos;
    log.effectText = `${card.description} (${tileName(state, fromPos)} → ${tileName(state, toPos)})`;
  }

  if (card.upgrade) {
    const owned = propertyPositions(state.board.tiles).filter(
      (pos) => state.tileState[pos]?.owner === playerId && (state.tileState[pos]?.stage ?? 0) < 5,
    );
    if (owned.length > 0) {
      owned.sort((a, b) => currentPrice(state, b) - currentPrice(state, a));
      const target = owned[0];
      if (!deferEffects) state.tileState[target].stage = (state.tileState[target].stage ?? 0) + 1;
      log.upgraded = target;
      log.effectText = `${tileName(state, target)} 1단계 업그레이드`;
    } else {
      log.effectText = '업그레이드 가능한 보유 부동산이 없습니다.';
    }
  }

  if (!log.effectText) log.effectText = card.description;
  return log;
};

// =================== 복지 카드 (10장, 즉시 발동) ===================

export const WELFARE_CARDS = [
  { id: 1, name: '코로나 재난지원금', description: '재난지원금을 받습니다.', delta: +200 },
  { id: 2, name: '근로장려금', description: '근로장려금을 받습니다.', delta: +100 },
  { id: 3, name: '기초연금', description: '기초연금을 받습니다.', delta: +50 },
  { id: 4, name: '건강검진', description: '건강검진 비용을 지불합니다.', delta: -50 },
  { id: 5, name: '국민연금', description: '국민연금을 납부합니다.', delta: -100 },
  { id: 6, name: '동네모임회비', description: '모든 플레이어가 동네모임 회비를 냅니다.', allDelta: -30 },
  { id: 7, name: '친척결혼식', description: '다른 플레이어들에게 축의금을 받습니다.', collectFromAll: 50 },
  { id: 8, name: '청약당첨_복지', description: '보유 부동산 1곳을 한 단계 업그레이드합니다.', upgrade: true },
  { id: 9, name: '출산장려금', description: '출산장려금을 받습니다.', delta: +200 },
  { id: 10, name: '부정수급적발', description: '부정수급 적발로 환수금을 냅니다.', delta: -200 },
];

export const drawWelfareCard = (state, playerId, rng, { deferEffects = false } = {}) => {
  const card = rng.pick(WELFARE_CARDS);
  const player = state.players[playerId];
  const log = { card: card.name, cardId: card.id, description: card.description };

  if (card.delta) {
    if (!deferEffects) player.cash += card.delta;
    log.delta = card.delta;
    log.effectText = `${card.description} (${moneyText(card.delta)})`;
  }

  if (card.allDelta) {
    if (!deferEffects) for (const p of state.players) p.cash += card.allDelta;
    log.allDelta = card.allDelta;
    log.effectText = `${card.description} (모두 ${moneyText(card.allDelta)})`;
  }

  if (card.collectFromAll) {
    if (!deferEffects) {
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerId) continue;
        state.players[i].cash -= card.collectFromAll;
        player.cash += card.collectFromAll;
      }
    }
    log.collected = card.collectFromAll * (state.players.length - 1);
    log.effectText = `${card.description} (+${log.collected}만)`;
  }

  if (card.upgrade) {
    const owned = propertyPositions(state.board.tiles).filter(
      (pos) => state.tileState[pos]?.owner === playerId && (state.tileState[pos]?.stage ?? 0) < 5,
    );
    if (owned.length > 0) {
      owned.sort((a, b) => currentPrice(state, b) - currentPrice(state, a));
      const target = owned[0];
      if (!deferEffects) state.tileState[target].stage = (state.tileState[target].stage ?? 0) + 1;
      log.upgraded = target;
      log.effectText = `${tileName(state, target)} 1단계 업그레이드`;
    } else {
      log.effectText = '업그레이드 가능한 보유 부동산이 없습니다.';
    }
  }

  if (!log.effectText) log.effectText = card.description;
  return log;
};

// =================== 이벤트 카드 (7장, 매년 결산 / 데스매치) ===================

export const EVENT_CARDS = [
  { id: 1, name: '전쟁', kind: 'war', description: '랜덤 플레이어의 부동산 1곳이 국유화됩니다.' },
  { id: 2, name: '다주택자규제', kind: 'multihouse', description: '5채 이상 보유자 1명의 부동산 1곳이 70% 가격으로 강제 매각됩니다.' },
  { id: 3, name: '화재', kind: 'fire', description: '랜덤 플레이어의 부동산 1곳 가치가 하락하고 건물이 피해를 입습니다.' },
  { id: 4, name: '거품붕괴', kind: 'bubble', description: '랜덤 색상 그룹 2개의 부동산 시세가 25% 하락합니다.' },
  { id: 5, name: '재개발', kind: 'redev', description: '모든 부동산 시세가 10% 상승합니다.' },
  { id: 6, name: 'GTX개통', kind: 'gtx', description: '남색 부동산 시세가 30% 상승합니다.' },
  { id: 7, name: '부동산청약', kind: 'lottery_estate', description: '빈 부동산 1곳이 랜덤 플레이어에게 지급됩니다.' },
];

export const triggerEventCard = (state, rng) => {
  const card = rng.pick(EVENT_CARDS);
  const log = { card: card.name, kind: card.kind, description: card.description };

  switch (card.kind) {
    case 'war': {
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
        log.effectText = `${playerName(state, target)}의 ${tileName(state, lossPos)} 국유화`;
      } else {
        log.effectText = '회수할 부동산이 없어 효과 없음';
      }
      break;
    }

    case 'multihouse': {
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
        log.effectText = `${playerName(state, target)}의 ${tileName(state, lossPos)} 강제매각 (+${sale}만)`;
      } else {
        log.effectText = '5채 이상 보유자가 없어 효과 없음';
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
        log.effectText = `${playerName(state, target)}의 ${tileName(state, lossPos)} 가치 -30% 및 건물 피해`;
      } else {
        log.effectText = '피해를 입을 부동산이 없어 효과 없음';
      }
      break;
    }

    case 'bubble': {
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
      log.effectText = `${picked.join('·')} 색상 그룹 시세 -25%`;
      break;
    }

    case 'redev': {
      for (const pos of propertyPositions(state.board.tiles)) {
        state.tileState[pos] ??= {};
        state.tileState[pos].priceModifier =
          (state.tileState[pos].priceModifier ?? 1) * 1.1;
      }
      log.effectText = '모든 부동산 시세 +10%';
      break;
    }

    case 'gtx': {
      for (const pos of propertyPositions(state.board.tiles)) {
        const tile = state.board.tiles[pos];
        if (tile.color === 'darkblue') {
          state.tileState[pos] ??= {};
          state.tileState[pos].priceModifier =
            (state.tileState[pos].priceModifier ?? 1) * 1.3;
        }
      }
      log.effectText = '남색 부동산 시세 +30%';
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
        log.effectText = `${playerName(state, target)}에게 ${tileName(state, givePos)} 지급`;
      } else {
        log.effectText = '빈 부동산이 없어 효과 없음';
      }
      break;
    }

  }

  if (!log.effectText) log.effectText = card.description;
  return log;
};

const countPropsOwned = (state, playerId) =>
  propertyPositions(state.board.tiles).filter((p) => state.tileState[p]?.owner === playerId)
    .length;


export const applyDeferredCardEffect = (state, playerId, event) => {
  if (!state || !event || event._applied) return null;
  const player = state.players[playerId];
  if (!player) return null;
  const kind = event.kind;
  if (kind === 'chance_draw') {
    if (event.cardId === 'life_change') {
      state.pendingLifeChange = { playerId, nonce: Date.now() };
    } else if (event.cardId === 'defense_card') {
      player.defenseCards = event.defenseCards ?? ((player.defenseCards ?? 0) + 1);
    } else if (event.delta) {
      player.cash += event.delta;
    }
    if (event.skipTurns) player.skipTurns = (player.skipTurns ?? 0) + event.skipTurns;
    if (event.moveSteps) {
      const boardSize = state.board?.tiles?.length ?? 40;
      const fromPos = player.position ?? event.fromPos ?? 0;
      player.position = event.toPos != null
        ? event.toPos
        : (((fromPos + event.moveSteps) % boardSize + boardSize) % boardSize);
    }
    if (event.upgraded != null && state.tileState[event.upgraded]) {
      state.tileState[event.upgraded].stage = (state.tileState[event.upgraded].stage ?? 0) + 1;
    }
  }
  if (kind === 'welfare_draw') {
    if (event.delta) player.cash += event.delta;
    if (event.allDelta) for (const p of state.players) p.cash += event.allDelta;
    if (event.collected) {
      const each = event.collected / Math.max(1, state.players.length - 1);
      for (let i = 0; i < state.players.length; i++) {
        if (i === playerId) continue;
        state.players[i].cash -= each;
        player.cash += each;
      }
    }
    if (event.upgraded != null && state.tileState[event.upgraded]) {
      state.tileState[event.upgraded].stage = (state.tileState[event.upgraded].stage ?? 0) + 1;
    }
  }
  event._applied = true;
  return event;
};
