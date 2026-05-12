// 대출 시스템 — 부동산 대출 / 신용대출 / 고리대금
//
// 부동산 대출:
//  - 한도: 현시세 × LTV_RATIO (70%)
//  - 이자율: 1년마다 1~4% 랜덤 (모든 부동산 공통, 균등 추첨)
//  - 매 자기 턴 차감
//  - 일시 상환만, 빌린 금액 그대로 (수수료 X)
//  - 건설된 부동산 대출 X
//  - 같은 컬러 그룹 1개라도 대출 시 그룹 전체 건설 X
//
// 신용대출:
//  - 한도 1,000만, 자격: 잔액 ≤ 300만
//  - 자기 턴마다 10만 이자
//  - 미납 3회 OK, 4회 청산
//  - 1회 제한
//  - 자동 상환: 잔액 1,000만 도달 시 300만 자동 상환
//
// 고리대금:
//  - 한도 2,000만, 누구나
//  - 자기 턴마다 30만 이자
//  - 1회 미납 = 즉시 청산
//  - 중도상환 가능 (수수료 10%)
//  - 1회 제한

import {
  LTV_RATIO,
  LOAN_RATES,
  CREDIT_LIMIT,
  CREDIT_INTEREST_PER_TURN,
  CREDIT_ELIGIBILITY_CASH,
  CREDIT_MISS_LIMIT,
  CREDIT_AUTO_REPAY,
  LOANSHARK_LIMIT,
  LOANSHARK_INTEREST_PER_TURN,
  LOANSHARK_PREPAY_FEE,
  round10,
} from './constants.js';
import { currentPrice } from './inflation.js';
import { isProperty } from './board.js';

// =================== 부동산 대출 ===================

// 1년마다 갱신되는 글로벌 이자율 (모든 부동산 공통)
export const rollNewLoanRate = (rng) => rng.pick(LOAN_RATES);

// 대출 가능 여부
export const canMortgage = (state, pos) => {
  const tile = state.board.tiles[pos];
  if (!isProperty(tile)) return false;
  const ts = state.tileState[pos];
  if (!ts || ts.owner == null) return false;
  if (ts.mortgaged) return false;
  if ((ts.stage ?? 0) > 0) return false; // 건설된 부동산 대출 X
  return true;
};

// 대출 실행 → 플레이어 cash + 대출금
export const mortgage = (state, pos) => {
  if (!canMortgage(state, pos)) throw new Error(`대출 불가: pos=${pos}`);
  const ts = state.tileState[pos];
  const player = state.players[ts.owner];
  const loanAmount = round10(currentPrice(state, pos) * LTV_RATIO);
  ts.mortgaged = true;
  ts.mortgageAmount = loanAmount;
  ts.mortgageYear = state.year ?? 0;
  player.cash += loanAmount;
  return loanAmount;
};

// 대출 해제 (일시 상환)
export const repayMortgage = (state, pos) => {
  const ts = state.tileState[pos];
  if (!ts?.mortgaged) throw new Error('대출 안 된 부동산');
  const player = state.players[ts.owner];
  const amt = ts.mortgageAmount;
  if (player.cash < amt) throw new Error('잔액 부족');
  player.cash -= amt;
  ts.mortgaged = false;
  ts.mortgageAmount = 0;
  ts.mortgageYear = null;
  return amt;
};

export const calculateMortgageInterest = (state, playerId) => {
  const rate = state.loanRate ?? 0;
  let totalInterest = 0;
  for (const pos in state.tileState) {
    const ts = state.tileState[pos];
    if (ts.owner === playerId && ts.mortgaged) {
      totalInterest += round10((ts.mortgageAmount ?? 0) * rate);
    }
  }
  return totalInterest;
};

// 자기 턴 부동산 대출 이자 차감 (해당 플레이어 모든 대출 합산)
export const chargeMortgageInterest = (state, playerId) => {
  const totalInterest = calculateMortgageInterest(state, playerId);
  if (totalInterest > 0) {
    state.players[playerId].cash -= totalInterest;
  }
  return totalInterest;
};

// =================== 신용대출 ===================

// 자격 확인
export const canTakeCredit = (player) => {
  if (player.creditUsed) return false; // 1회 제한
  if (player.cash > CREDIT_ELIGIBILITY_CASH) return false;
  return true;
};

// 신용대출 실행
export const takeCredit = (player, amount = CREDIT_LIMIT) => {
  if (!canTakeCredit(player)) throw new Error('신용대출 자격 X');
  if (amount > CREDIT_LIMIT) throw new Error('한도 초과');
  player.creditUsed = true;
  player.creditDebt = amount;
  player.creditMisses = 0;
  player.cash += amount;
  return amount;
};

// 자기 턴 신용대출 이자 차감 — 미납 시 누적
// 반환: { paid, missed, defaulted }
export const chargeCreditInterest = (player) => {
  if (!player.creditDebt || player.creditDebt <= 0) {
    return { paid: 0, missed: false, defaulted: false };
  }
  const owed = CREDIT_INTEREST_PER_TURN + (player.creditMisses ?? 0) * CREDIT_INTEREST_PER_TURN;
  if (player.cash >= owed) {
    player.cash -= owed;
    player.creditMisses = 0;
    return { paid: owed, missed: false, defaulted: false };
  }
  // 미납 처리
  player.creditMisses = (player.creditMisses ?? 0) + 1;
  if (player.creditMisses > CREDIT_MISS_LIMIT) {
    // 4회째 = 청산 시도
    return { paid: 0, missed: true, defaulted: true };
  }
  return { paid: 0, missed: true, defaulted: false };
};

// 자동 상환 체크 — 잔액 1,000만 도달/초과 시 300만 상환
export const tryAutoRepayCredit = (player) => {
  if (!player.creditDebt || player.creditDebt <= 0) return 0;
  if (player.cash < CREDIT_LIMIT) return 0;
  const repay = Math.min(CREDIT_AUTO_REPAY, player.creditDebt);
  player.cash -= repay;
  player.creditDebt -= repay;
  return repay;
};

// =================== 고리대금 ===================

export const canTakeLoanshark = (player) => {
  if (player.loansharkUsed) return false;
  return true;
};

export const takeLoanshark = (player, amount = LOANSHARK_LIMIT) => {
  if (!canTakeLoanshark(player)) throw new Error('고리대금 자격 X');
  if (amount > LOANSHARK_LIMIT) throw new Error('한도 초과');
  player.loansharkUsed = true;
  player.loansharkDebt = amount;
  player.cash += amount;
  return amount;
};

// 자기 턴 고리대금 이자 — 1회 미납 = 즉시 청산
export const chargeLoansharkInterest = (player) => {
  if (!player.loansharkDebt || player.loansharkDebt <= 0) {
    return { paid: 0, defaulted: false };
  }
  if (player.cash >= LOANSHARK_INTEREST_PER_TURN) {
    player.cash -= LOANSHARK_INTEREST_PER_TURN;
    return { paid: LOANSHARK_INTEREST_PER_TURN, defaulted: false };
  }
  return { paid: 0, defaulted: true };
};

// 고리대금 중도상환 (수수료 10%)
export const repayLoanshark = (player) => {
  if (!player.loansharkDebt) throw new Error('고리대금 없음');
  const principal = player.loansharkDebt;
  const total = round10(principal * (1 + LOANSHARK_PREPAY_FEE));
  if (player.cash < total) throw new Error('잔액 부족');
  player.cash -= total;
  player.loansharkDebt = 0;
  return total;
};
