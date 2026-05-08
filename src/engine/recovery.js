// 회생 5단계 — 파산 직전 시나리오
// 1️⃣ 부동산 대출
// 2️⃣ 거래 (자기 턴만)
// 3️⃣ 은행 매도 (NPC 50%)
// 4️⃣ 신용대출 (1,000만 1회)
// 5️⃣ 파산
//
// 시뮬에서는 자동 AI: cash < 0 시 단계별 시도

import {
  NPC_SELL_RATIO,
  HOUSE_SELL_RATIO,
  round10,
} from './constants.js';
import { currentPrice } from './inflation.js';
import { isProperty, propertyPositions } from './board.js';
import {
  mortgage,
  canMortgage,
  takeCredit,
  canTakeCredit,
  takeLoanshark,
  canTakeLoanshark,
} from './loan.js';

// 자기 부동산 NPC 매도 (시세 50%)
export const sellPropertyToBank = (state, playerId, pos) => {
  const ts = state.tileState[pos];
  if (ts?.owner !== playerId) throw new Error('소유 X');
  // 빌라/아파트 있으면 먼저 매각
  const tile = state.board.tiles[pos];
  let houseRefund = 0;
  if ((ts.stage ?? 0) > 0) {
    houseRefund = round10(tile.houseCost * (ts.stage <= 4 ? ts.stage : 5) * HOUSE_SELL_RATIO);
    ts.stage = 0;
  }
  const sale = round10(currentPrice(state, pos) * NPC_SELL_RATIO);
  // 대출 중이면 차액만
  let net = sale + houseRefund;
  if (ts.mortgaged) {
    net -= ts.mortgageAmount ?? 0;
    ts.mortgaged = false;
    ts.mortgageAmount = 0;
  }
  state.players[playerId].cash += net;
  ts.owner = null;
  return net;
};

// 빌라 1채 매각 (건설가 50%)
export const sellOneHouse = (state, playerId, pos) => {
  const ts = state.tileState[pos];
  if (ts?.owner !== playerId) throw new Error('소유 X');
  if ((ts.stage ?? 0) <= 0) throw new Error('건설 없음');
  const tile = state.board.tiles[pos];
  const refund = round10(tile.houseCost * HOUSE_SELL_RATIO);
  ts.stage -= 1;
  state.players[playerId].cash += refund;
  return refund;
};

// AI 회생 시도 — cash가 음수일 때 호출. 5단계 순서대로 시도.
// 반환: { recovered, bankrupt, log }
export const tryRecover = (state, playerId, allowLoanshark = true) => {
  const player = state.players[playerId];
  const log = [];
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 1단계: 미사용 대출 — 빈 부동산부터
  const owned = propertyPositions(state.board.tiles).filter(
    (pos) => state.tileState[pos]?.owner === playerId,
  );
  for (const pos of owned) {
    if (player.cash >= 0) break;
    if (canMortgage(state, pos)) {
      const amt = mortgage(state, pos);
      log.push({ step: 'mortgage', pos, amt });
    }
  }
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 2단계 (거래) — 시뮬 자동 AI에서는 스킵 (협상 모델링 무거움)

  // 3단계: 빌라 매각 (건설가 50%)
  for (const pos of owned) {
    if (player.cash >= 0) break;
    while ((state.tileState[pos].stage ?? 0) > 0 && player.cash < 0) {
      const refund = sellOneHouse(state, playerId, pos);
      log.push({ step: 'sell_house', pos, refund });
    }
  }
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 3-2단계: 부동산 NPC 매도 (시세 50%)
  // 가장 비싼 부동산부터 매각하지 않고, 부족분만큼만 — 작은 것부터 (잃는 부담 최소화)
  const sorted = [...owned].sort((a, b) => currentPrice(state, a) - currentPrice(state, b));
  for (const pos of sorted) {
    if (player.cash >= 0) break;
    if (state.tileState[pos]?.owner !== playerId) continue;
    const net = sellPropertyToBank(state, playerId, pos);
    log.push({ step: 'sell_bank', pos, net });
  }
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 4단계: 신용대출
  if (canTakeCredit(player)) {
    const amt = takeCredit(player);
    log.push({ step: 'credit', amt });
  }
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 4-2단계: 고리대금 (옵션)
  if (allowLoanshark && canTakeLoanshark(player)) {
    const amt = takeLoanshark(player);
    log.push({ step: 'loanshark', amt });
  }
  if (player.cash >= 0) return { recovered: true, bankrupt: false, log };

  // 5단계: 파산
  player.bankrupt = true;
  log.push({ step: 'bankrupt' });
  return { recovered: false, bankrupt: true, log };
};
