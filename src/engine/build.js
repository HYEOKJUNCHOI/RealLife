// 빌라/아파트 건설 — 자기 턴 메뉴
//
// 룰 (BRAINSTORM_LOG.md 7-2):
// - 표준 룰 (freeBuild OFF): 컬러셋 독점 + 균등 건설
// - 자유 룰 (freeBuild ON): 독점 X도 풀업 가능, 균등 X
// - 빌라 4채 → 아파트 1채 (stage 5)
// - 대출 중 부동산 건설 X / 같은 컬러 대출 1개라도 있으면 그룹 전체 X
// - 한정: 빌라 32채, 아파트 12개

import { HOUSE_LIMIT, APT_LIMIT, HOUSE_SELL_RATIO, round10 } from './constants.js';
import { isProperty, groupByColor } from './board.js';
import { hasColorMonopoly } from './inflation.js';

// 글로벌 빌라/아파트 카운트
const countHouses = (state) => {
  let villas = 0;
  let apts = 0;
  for (const pos in state.tileState) {
    const stage = state.tileState[pos]?.stage ?? 0;
    if (stage >= 1 && stage <= 3) villas += stage;
    else if (stage === 5) apts += 1;
  }
  return { villas, apts };
};

// 같은 컬러 그룹에 대출이 1개라도 있으면 false
const colorGroupHasMortgage = (state, color) => {
  const positions = groupByColor(state.board.tiles)[color] ?? [];
  return positions.some((pos) => state.tileState[pos]?.mortgaged);
};

// 건설 가능 여부
export const canBuild = (state, playerId, pos) => {
  const tile = state.board.tiles[pos];
  if (!isProperty(tile)) return { ok: false, reason: '부동산 X' };
  const ts = state.tileState[pos];
  if (!ts || ts.owner !== playerId) return { ok: false, reason: '소유 X' };
  if (ts.mortgaged) return { ok: false, reason: '대출 중' };
  if (colorGroupHasMortgage(state, tile.color)) return { ok: false, reason: '컬러 그룹 대출' };
  const stage = ts.stage ?? 0;
  if (stage >= 5) return { ok: false, reason: '풀업 완료' };

  const freeBuild = state.options.freeBuild ?? true;
  if (!freeBuild) {
    // 표준: 컬러 독점 필수
    if (!hasColorMonopoly(state, playerId, tile.color)) {
      return { ok: false, reason: '독점 X' };
    }
    // 균등 건설: 같은 컬러 다른 칸 stage가 -1 이상이어야
    const positions = groupByColor(state.board.tiles)[tile.color] ?? [];
    const minStage = Math.min(
      ...positions.map((p) => state.tileState[p]?.stage ?? 0),
    );
    if (stage > minStage) return { ok: false, reason: '균등 건설 위반' };
  }

  // 잔액 확인
  const cost = tile.houseCost;
  if (state.players[playerId].cash < cost) return { ok: false, reason: '잔액 부족' };

  // 한정 체크
  const { villas, apts } = countHouses(state);
  if (stage < 3 && villas >= HOUSE_LIMIT) return { ok: false, reason: '빌라 한정' };
  if (stage === 3 && apts >= APT_LIMIT) return { ok: false, reason: '아파트 한정' };

  return { ok: true, cost };
};

// 빌라 1채 건설 (stage 0→1, 1→2, 2→3, 3→5=아파트)
export const build = (state, playerId, pos) => {
  const c = canBuild(state, playerId, pos);
  if (!c.ok) throw new Error(`건설 불가: ${c.reason}`);
  const ts = state.tileState[pos];
  state.players[playerId].cash -= c.cost;
  ts.stage = (ts.stage ?? 0) === 3 ? 5 : (ts.stage ?? 0) + 1;
  return { pos, newStage: ts.stage, cost: c.cost };
};

// 풀업 (한 칸에 가능한 만큼 모두 건설) — 자유 건설 모드 활용
export const buildFull = (state, playerId, pos) => {
  const built = [];
  while (canBuild(state, playerId, pos).ok) {
    built.push(build(state, playerId, pos));
  }
  return built;
};
