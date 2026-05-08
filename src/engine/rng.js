// 시드 기반 PRNG (mulberry32) — 시뮬 재현 가능
// 보드게임 결정성을 위해 모든 랜덤은 이 모듈을 통과한다.

export const createRng = (seed = 1) => {
  let s = seed >>> 0;
  if (s === 0) s = 1;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    rollDie: () => Math.floor(next() * 6) + 1,
    // 주사위 2개 굴림 → { d1, d2, sum, isDouble }
    rollDice: () => {
      const d1 = Math.floor(next() * 6) + 1;
      const d2 = Math.floor(next() * 6) + 1;
      return { d1, d2, sum: d1 + d2, isDouble: d1 === d2 };
    },
    shuffle: (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
};
