// 거래 시스템 — 자기 턴만, 패키지 N:N, 결렬 후 1회 재시도, 프리미엄 카운터 승계 + 대출 떠안음
// MVP 룰 엔진은 거래 "실행" 함수만 제공. UI/AI 협상 로직은 별도.

// 거래 제안 구조:
// {
//   from: playerId,
//   to: playerId,
//   give: { cash, props: [pos, pos, ...] },
//   take: { cash, props: [pos, pos, ...] },
// }

import { isProperty } from './board.js';

export const validateTrade = (state, offer) => {
  const fromP = state.players[offer.from];
  const toP = state.players[offer.to];
  if (!fromP || !toP) return { ok: false, reason: '플레이어 없음' };
  if (fromP.bankrupt || toP.bankrupt) return { ok: false, reason: '파산자 거래 X' };
  if ((offer.give.cash ?? 0) > fromP.cash) return { ok: false, reason: 'from 잔액 부족' };
  if ((offer.take.cash ?? 0) > toP.cash) return { ok: false, reason: 'to 잔액 부족' };
  for (const pos of offer.give.props ?? []) {
    if (state.tileState[pos]?.owner !== offer.from) return { ok: false, reason: 'from 소유 X' };
  }
  for (const pos of offer.take.props ?? []) {
    if (state.tileState[pos]?.owner !== offer.to) return { ok: false, reason: 'to 소유 X' };
  }
  return { ok: true };
};

// 거래 실행 — 프리미엄 카운터 그대로 / 대출도 떠안음 (mortgage 상태 그대로)
export const executeTrade = (state, offer) => {
  const v = validateTrade(state, offer);
  if (!v.ok) throw new Error(`거래 무효: ${v.reason}`);
  const fromP = state.players[offer.from];
  const toP = state.players[offer.to];

  fromP.cash -= offer.give.cash ?? 0;
  toP.cash += offer.give.cash ?? 0;
  toP.cash -= offer.take.cash ?? 0;
  fromP.cash += offer.take.cash ?? 0;

  for (const pos of offer.give.props ?? []) {
    state.tileState[pos].owner = offer.to;
  }
  for (const pos of offer.take.props ?? []) {
    state.tileState[pos].owner = offer.from;
  }
  return { ok: true };
};
