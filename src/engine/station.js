// 역장 자리 (춘천역·광주역) — 매턴 적립 + 도착 시 강제 교체
// 한전·수자원 (한전·수자원공사) — 자기 턴 입금 + 강탈만 권리 이전
// 환승 허브 (서울역·부산역) — 매입형, 도착자 텔레포트 옵션

import {
  STATION_RATE_BY_YEAR,
  STATION_CAP,
  UTILITY_RATE_BY_YEAR,
  UTILITY_DOUBLE_BONUS,
  HUB_TELEPORT_FEE,
  HUB_TWO_TELEPORT_FEE,
  HUB_OWNER_REPAIR,
  HUB_PRICE,
} from './constants.js';
import { stationPositions, institutionPositions, hubPositions, isHub, isStation, isInstitution } from './board.js';

// =================== 역장 ===================

// 매턴 (누구턴이든) 역장 자리 적립
export const accrueStationFunds = (state) => {
  const yearIdx = Math.min(state.year, STATION_RATE_BY_YEAR.length - 1);
  const rate = STATION_RATE_BY_YEAR[yearIdx];
  for (const pos of stationPositions(state.board.tiles)) {
    const ts = (state.tileState[pos] ??= {});
    ts.fund = Math.min((ts.fund ?? 0) + rate, STATION_CAP);
  }
};

// 도착자 = 적립금 자동 수령 + 새 역장 부임 (이전 역장 강제 퇴직)
export const handleStationArrival = (state, visitorId, pos) => {
  const ts = (state.tileState[pos] ??= {});
  const fund = ts.fund ?? 0;
  state.players[visitorId].cash += fund;
  ts.fund = 0;
  const prevOwner = ts.owner;
  ts.owner = visitorId;
  return { collected: fund, prevOwner };
};

// 명예퇴직 (자기 턴 선택)
export const stationResign = (state, playerId) => {
  for (const pos of stationPositions(state.board.tiles)) {
    const ts = state.tileState[pos];
    if (ts?.owner === playerId) {
      const fund = ts.fund ?? 0;
      state.players[playerId].cash += fund;
      ts.fund = 0;
      ts.owner = null;
      return { pos, collected: fund };
    }
  }
  return null;
};

// =================== 한전·수자원 ===================

// 자기 턴마다 부임자에게 입금
export const payInstitutionSalary = (state, playerId) => {
  const owned = [];
  for (const pos of institutionPositions(state.board.tiles)) {
    const ts = state.tileState[pos];
    if (ts?.owner === playerId) owned.push(pos);
  }
  if (owned.length === 0) return 0;
  let totalPaid = 0;
  for (const pos of owned) {
    const ts = state.tileState[pos];
    const yearsHeld = state.year - (ts.appointedYear ?? state.year);
    const yIdx = Math.min(yearsHeld, UTILITY_RATE_BY_YEAR.length - 1);
    let rate = UTILITY_RATE_BY_YEAR[yIdx];
    if (owned.length === 2) rate *= UTILITY_DOUBLE_BONUS;
    totalPaid += rate;
  }
  state.players[playerId].cash += totalPaid;
  return totalPaid;
};

// 도착자 자동 부임 (강탈만)
export const handleInstitutionArrival = (state, visitorId, pos) => {
  const ts = (state.tileState[pos] ??= {});
  const prevOwner = ts.owner;
  if (prevOwner === visitorId) {
    return { type: 'own', pos };
  }
  ts.owner = visitorId;
  ts.appointedYear = state.year; // 부임 연차 리셋
  return { type: 'appoint', pos, prevOwner };
};

// =================== 환승 허브 ===================

// 매입 (간이): 도착자가 미보유 시 정가 매입 (입찰 단순화)
// 시뮬에서는 cash가 충분하면 매입.
export const handleHubArrival = (state, visitorId, pos, rng) => {
  const ts = (state.tileState[pos] ??= {});
  if (ts.owner == null) {
    const player = state.players[visitorId];
    if (player.cash >= HUB_PRICE) {
      player.cash -= HUB_PRICE;
      ts.owner = visitorId;
      return { type: 'buy', pos, price: HUB_PRICE };
    }
    return { type: 'unowned', pos };
  }
  if (ts.owner === visitorId) {
    // 본인 소유: 짝수=무료 텔레포트 / 홀수=수리비 50만
    const die = rng.rollDie();
    if (die % 2 === 0) {
      return { type: 'self_teleport_free', pos };
    }
    state.players[visitorId].cash -= HUB_OWNER_REPAIR;
    return { type: 'self_repair', pos, fee: HUB_OWNER_REPAIR };
  }
  // 타인 소유 — 50만 텔레포트 or 머무름 (시뮬: 머무름)
  // 2개 모음 보유 시 도착자 선택: 머무름(통행세 강제) / 150만 텔레포트
  const ownerHubs = hubPositions(state.board.tiles).filter(
    (p) => state.tileState[p]?.owner === ts.owner,
  );
  if (ownerHubs.length === 2) {
    // 통행세 강제 (간단화: HUB_TELEPORT_FEE 만큼 지불 → 머무름)
    state.players[visitorId].cash -= HUB_TELEPORT_FEE;
    state.players[ts.owner].cash += HUB_TELEPORT_FEE;
    return { type: 'rent_forced', pos, fee: HUB_TELEPORT_FEE, ownerId: ts.owner };
  }
  // 1개 보유 — 머무름 자유, 시뮬: 머무름 (텔레포트 X)
  return { type: 'stay_no_fee', pos };
};
