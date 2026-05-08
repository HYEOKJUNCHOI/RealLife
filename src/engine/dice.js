// 주사위 / 더블 룰
// 표준: 더블 시 한 번 더 굴림. 3연속 더블 = 감옥행.

export const rollTurnDice = (rng, doublesCount = 0) => {
  const { d1, d2, sum, isDouble } = rng.rollDice();
  const newDoublesCount = isDouble ? doublesCount + 1 : 0;
  const goToJail = newDoublesCount >= 3;
  return {
    d1,
    d2,
    sum,
    isDouble,
    doublesCount: newDoublesCount,
    extraTurn: isDouble && !goToJail,
    goToJail,
  };
};
