// 시뮬 AI 페르소나 — 자기 턴 시작 시 자동 의사결정
//
// 4종 페르소나:
//  - aggressive (적극형): 컬러 독점 시 즉시 풀업, 매입 우선
//  - defensive (방어형): 잔액 보수 (>2000만 유지), 거래 적극, 고리대금 X
//  - gambler (도박형): 고리대금 자발 사용, 노른자 노림, 풀업
//  - stable (안정형): 빌라 1채까지만, 사치세 회피
//
// 자기 턴 시작 시 호출. 주사위 굴리기 직전.

import { isProperty, groupByColor } from '../engine/board.js';
import { hasColorMonopoly, currentPrice } from '../engine/inflation.js';
import { canBuild, build } from '../engine/build.js';
import { canTakeLoanshark, takeLoanshark } from '../engine/loan.js';
import { stationResign } from '../engine/station.js';
import { validateTrade, executeTrade } from '../engine/trade.js';
import { stationPositions, hubPositions } from '../engine/board.js';

export const PERSONAS = ['aggressive', 'defensive', 'gambler', 'stable'];

// 플레이어가 보유한 일반 부동산 pos
const ownedProps = (state, playerId) =>
  Object.entries(state.tileState)
    .filter(([pos, ts]) => {
      const tile = state.board.tiles[+pos];
      return ts.owner === playerId && isProperty(tile);
    })
    .map(([pos]) => +pos);

// 컬러 독점 보유 컬러 목록
const monopolyColors = (state, playerId) => {
  const colors = new Set();
  for (const pos of ownedProps(state, playerId)) {
    const color = state.board.tiles[pos].color;
    if (hasColorMonopoly(state, playerId, color)) colors.add(color);
  }
  return [...colors];
};

// 같은 컬러 보유 개수 (3개 중 N개) — 거래 후보
const colorOwnership = (state, playerId) => {
  const map = {}; // color -> { my: [pos], total: N, others: { otherId: [pos] } }
  const groups = groupByColor(state.board.tiles);
  for (const color in groups) {
    const positions = groups[color];
    const my = positions.filter((p) => state.tileState[p]?.owner === playerId);
    const others = {};
    for (const p of positions) {
      const o = state.tileState[p]?.owner;
      if (o != null && o !== playerId) {
        others[o] ??= [];
        others[o].push(p);
      }
    }
    map[color] = { my, total: positions.length, others };
  }
  return map;
};

// === 자동 건설 ===
// 페르소나별 임계값
const BUILD_THRESHOLD = {
  aggressive: 1500, // 컬러 독점 + cash > 1500만 → 풀업
  defensive: 2500, // 잔액 보수, cash > 2500만일 때만 빌라 1채
  gambler: 1500, // 노른자 풀업
  stable: 2000, // 빌라 1채까지만
};

const buildPolicy = (persona) => {
  switch (persona) {
    case 'aggressive':
      return { max: 5, allowNoMonopoly: true }; // 풀업까지
    case 'defensive':
      return { max: 2, allowNoMonopoly: false }; // 빌라 2채까지, 독점만
    case 'gambler':
      return { max: 5, allowNoMonopoly: true }; // 풀업
    case 'stable':
      return { max: 1, allowNoMonopoly: false }; // 빌라 1채만, 독점만
    default:
      return { max: 1, allowNoMonopoly: false };
  }
};

// 자기 턴 시작 시 자동 건설 시도 (1턴 1채)
const tryAutoBuild = (state, playerId, persona, log) => {
  const player = state.players[playerId];
  const cashThreshold = BUILD_THRESHOLD[persona] ?? 2000;
  if (player.cash < cashThreshold) return;

  const policy = buildPolicy(persona);
  const owned = ownedProps(state, playerId);
  if (owned.length === 0) return;

  // 후보 정렬: 컬러 독점 보유분 우선 → 시세 높은 순
  const candidates = owned
    .map((pos) => {
      const tile = state.board.tiles[pos];
      const ts = state.tileState[pos];
      const stage = ts.stage ?? 0;
      const monopoly = hasColorMonopoly(state, playerId, tile.color);
      const price = currentPrice(state, pos);
      return { pos, stage, monopoly, price };
    })
    .filter((c) => {
      if (c.stage >= policy.max) return false;
      if (!policy.allowNoMonopoly && !c.monopoly) return false;
      return true;
    })
    .sort((a, b) => {
      // 독점 우선, 그 다음 시세 높은 순
      if (a.monopoly !== b.monopoly) return a.monopoly ? -1 : 1;
      return b.price - a.price;
    });

  if (candidates.length === 0) return;

  // 한 채만 건설 (1턴 1채로 페이스 조절)
  // gambler/aggressive는 cash가 크게 남으면 1턴 2채까지
  let buildCount = 1;
  if ((persona === 'aggressive' || persona === 'gambler') && player.cash > 4000) buildCount = 2;

  for (let i = 0; i < buildCount && i < candidates.length; i++) {
    const c = candidates[i];
    const check = canBuild(state, playerId, c.pos);
    if (!check.ok) continue;
    if (player.cash < check.cost + 500) break; // 안전 버퍼
    const r = build(state, playerId, c.pos);
    log.push({ kind: 'auto_build', playerId, ...r });
  }
};

// === 자동 거래 ===
// 컬러셋 2/3 보유 + 다른 플레이어 1명이 마지막 1개 보유 시 시도
const tryAutoTrade = (state, playerId, persona, rng, log) => {
  const player = state.players[playerId];
  if (player.cash < 1000) return; // 거래 자금 부족

  // defensive는 가장 적극적, stable은 소극, gambler/aggressive 중간
  if (persona === 'stable' && rng.next() > 0.3) return;

  const ownership = colorOwnership(state, playerId);
  for (const color in ownership) {
    const info = ownership[color];
    if (info.total < 2) continue; // 1개 컬러는 패스
    if (info.my.length !== info.total - 1) continue; // 마지막 1개만 거래
    // 다른 플레이어 후보
    const otherIds = Object.keys(info.others).map(Number);
    if (otherIds.length === 0) continue;
    const otherId = otherIds[0];
    const targetPos = info.others[otherId][0];
    if (state.tileState[targetPos]?.mortgaged) continue;
    if ((state.tileState[targetPos]?.stage ?? 0) > 0) continue;

    const targetPrice = currentPrice(state, targetPos);
    const offerCash = Math.round(targetPrice * 1.5);
    if (player.cash < offerCash + 500) continue;

    // 상대 cash 부족하면 응할 가능성 더 높음
    const counterPlayer = state.players[otherId];
    // 단순화: 상대 cash가 1500만 미만이면 100% 수락, 아니면 50%
    let acceptProb;
    if (counterPlayer.cash < 1500) acceptProb = 0.9;
    else if (counterPlayer.cash < 3000) acceptProb = 0.5;
    else acceptProb = 0.2;
    if (rng.next() > acceptProb) continue;

    const offer = {
      from: playerId,
      to: otherId,
      give: { cash: offerCash, props: [] },
      take: { cash: 0, props: [targetPos] },
    };
    const v = validateTrade(state, offer);
    if (!v.ok) continue;
    executeTrade(state, offer);
    log.push({
      kind: 'auto_trade',
      from: playerId,
      to: otherId,
      pos: targetPos,
      cash: offerCash,
      color,
    });
    return; // 한 턴 1거래만
  }
};

// === 고리대금 자발 사용 (gambler 전용) ===
const tryAutoLoanshark = (state, playerId, persona, log) => {
  if (persona !== 'gambler') return;
  const player = state.players[playerId];
  if (!state.options.loanshark) return;
  if (!canTakeLoanshark(player)) return;
  if (player.cash >= 500) return;
  // 노른자 매입 기회: 보유 부동산이 6개 미만이고 cash 추가하면 다음 매입 가능할 때
  // 단순화: cash < 500 + 미보유 일반 부동산 존재 시 발동
  const unowned = Object.values(state.tileState).filter((ts) => ts.owner == null).length;
  // tileState에 등록 안 된 칸도 있으니 보드에서 직접
  const totalProps = state.board.tiles.filter((t) => t.type === 'property').length;
  const ownedTotal = Object.entries(state.tileState).filter(([pos, ts]) => {
    return ts.owner != null && state.board.tiles[+pos]?.type === 'property';
  }).length;
  const remainingProps = totalProps - ownedTotal;
  if (remainingProps <= 0) return;
  const amt = takeLoanshark(player);
  log.push({ kind: 'auto_loanshark', playerId, amt });
};

// === 명예퇴직 ===
// 역장 자리 보유 + 적립금 600만+ + 다른 플레이어가 위험 거리 내
const tryStationResign = (state, playerId, persona, log) => {
  for (const pos of stationPositions(state.board.tiles)) {
    const ts = state.tileState[pos];
    if (ts?.owner !== playerId) continue;
    const fund = ts.fund ?? 0;
    if (fund < 600) continue;
    // 위험 평가: 다른 플레이어 누구라도 -3 ~ +12 거리에 있으면 위험
    const danger = state.players.some((p, i) => {
      if (i === playerId || p.bankrupt) return false;
      let d = pos - p.position;
      if (d < 0) d += state.board.size;
      return d >= 1 && d <= 12;
    });
    // persona별 임계값
    const fundThreshold = {
      aggressive: 700,
      defensive: 600,
      gambler: 800,
      stable: 600,
    }[persona] ?? 700;
    if (fund < fundThreshold && !danger) continue;
    if (!danger && fund < 900) continue; // 아주 많이 쌓였거나 위험할 때만
    const r = stationResign(state, playerId);
    if (r) log.push({ kind: 'station_resign', playerId, ...r });
  }
};

// 메인 진입점 — 자기 턴 시작 시 호출 (주사위 굴리기 직전)
export const runAgentDecisions = (state, playerId, rng, log) => {
  const player = state.players[playerId];
  if (player.bankrupt || player.inJail) return;
  const persona = player.persona ?? 'aggressive';

  // 순서: 명예퇴직 → 거래 → 건설 → 고리대금 (도박형 한정)
  tryStationResign(state, playerId, persona, log);
  tryAutoTrade(state, playerId, persona, rng, log);
  tryAutoBuild(state, playerId, persona, log);
  tryAutoLoanshark(state, playerId, persona, log);
};
