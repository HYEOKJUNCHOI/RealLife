// 감옥 — 표준 모노폴리
// - 갇힘: 3턴 / 50만 보석금 / 더블 굴려 탈출
// - GO TO JAIL 도착 시 GO 보너스 X
// - 시뮬: 잔액 ≥ 100만이면 즉시 50만 보석금 내고 탈출 (단순화)

import { JAIL_TURNS, JAIL_BAIL, BOARD_SIZE } from './constants.js';

export const sendToJail = (state, playerId) => {
  const p = state.players[playerId];
  // 감옥 칸 위치 = pos 10 (board-korea.json 기준)
  p.position = 10;
  p.inJail = true;
  p.jailTurns = 0;
};

// 자기 턴 시작 시 감옥 처리
// 옵션:
//   payBail: 50만 보석금 내고 탈출
//   rolledDouble: 더블 → 즉시 탈출
// 반환: { released, bailPaid }
export const handleJailTurn = (state, playerId, { payBail = false, rolledDouble = false } = {}) => {
  const p = state.players[playerId];
  if (!p.inJail) return { released: false, bailPaid: 0 };
  if (rolledDouble) {
    p.inJail = false;
    p.jailTurns = 0;
    return { released: true, bailPaid: 0 };
  }
  if (payBail && p.cash >= JAIL_BAIL) {
    p.cash -= JAIL_BAIL;
    p.inJail = false;
    p.jailTurns = 0;
    return { released: true, bailPaid: JAIL_BAIL };
  }
  p.jailTurns += 1;
  if (p.jailTurns >= JAIL_TURNS) {
    // 3턴 차면 강제 탈출 (보석금 강제 지불)
    p.cash -= JAIL_BAIL;
    p.inJail = false;
    p.jailTurns = 0;
    return { released: true, bailPaid: JAIL_BAIL };
  }
  return { released: false, bailPaid: 0 };
};
