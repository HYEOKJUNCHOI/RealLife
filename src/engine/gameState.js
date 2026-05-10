// 게임 상태 초기화
// state shape:
// {
//   board, players[], tileState{pos→{owner,stage,premium,mortgaged,mortgageAmount,fund,appointedYear,priceModifier}},
//   year, round, turnIndex, parkingPot, loanRate, log[],
//   options: { startingCash, predistribute, eventCards, credit, freeBuild, inflation, loanshark }
// }

import { loadBoard, propertyPositions } from './board.js';
import { STARTING_CASH, PREDISTRIBUTE_PER_PLAYER } from './constants.js';
import { rollNewLoanRate } from './loan.js';

const CHARACTER_NAME = {
  yangban: '정약용',
  general: '이순신',
  magistrate: '세종대왕',
  farmer: '녹두장군',
};

export const DEFAULT_OPTIONS = {
  startingCash: STARTING_CASH,
  predistributeCount: PREDISTRIBUTE_PER_PLAYER, // 1인당 N개 (0 = 분배 X). 옛 boolean predistribute 폐기
  eventCards: true,
  credit: true,
  freeBuild: true,
  inflation: true,
  loanshark: true,
  totalGameMinutes: 60, // 60분룰
  deathmatchStartMinutes: 30, // 데스매치 시작 시점 (분, 0 = 비활성)
  realTimeMode: true, // 실제 시계 기준으로 시간 진행
};

export const createGameState = ({
  numPlayers = 4,
  options = {},
  rng,
  characters = ['yangban', 'general', 'magistrate', 'farmer'],
  playerNames = [],
  playerTypes = [],
} = {}) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const board = loadBoard('korea');

  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: i,
    name: playerNames[i]?.trim() || CHARACTER_NAME[characters[i]] || `${i + 1}p`,
    character: characters[i] ?? 'yangban',
    controller: playerTypes[i] === 'ai' ? 'ai' : 'human',
    team: opts.teamMode ? (playerTypes[i] === 'ai' ? 'ai' : 'human') : null,
    position: 0,
    cash: opts.startingCash,
    salaryBonus: 0,
    defenseCards: 0,
    inJail: false,
    jailTurns: 0,
    skipTurns: 0,
    creditUsed: false,
    creditDebt: 0,
    creditMisses: 0,
    loansharkUsed: false,
    loansharkDebt: 0,
    bankrupt: false,
    doublesCount: 0,
    passedGoCount: 0, // GO 통과 횟수 (1년 결산 트리거)
  }));

  const tileState = {};
  // 사전 분배: 일반 부동산 셔플 → 1인당 N개 분배 (N = predistributeCount)
  // 하위 호환: 옛 predistribute(boolean) → true면 PREDISTRIBUTE_PER_PLAYER 개
  const perPlayer = (() => {
    if (typeof opts.predistributeCount === 'number') return opts.predistributeCount;
    if (typeof opts.predistribute === 'boolean')
      return opts.predistribute ? PREDISTRIBUTE_PER_PLAYER : 0;
    return PREDISTRIBUTE_PER_PLAYER;
  })();
  if (perPlayer > 0 && rng) {
    const props = rng.shuffle(propertyPositions(board.tiles));
    let idx = 0;
    for (let p = 0; p < numPlayers; p++) {
      for (let k = 0; k < perPlayer && idx < props.length; k++, idx++) {
        const pos = props[idx];
        tileState[pos] = { owner: p, stage: 0, premium: 0 };
      }
    }
  }

  return {
    board,
    players,
    tileState,
    year: 0, // 1년 결산 발화마다 +1
    round: 0,
    turnIndex: 0,
    parkingPot: 0,
    loanRate: rng ? rollNewLoanRate(rng) : 0.02,
    options: opts,
    log: [],
    elapsedMin: 0, // 실제 경과 시간(분). 구버전은 라운드 가상 시간
    realTimeMode: opts.realTimeMode !== false,
    realTimeStartedAt: Date.now(),
    deathmatch: false,
    finished: false,
    winner: null,
  };
};

// 활성 플레이어 (파산 X)
export const livePlayers = (state) =>
  state.players.map((p, i) => i).filter((i) => !state.players[i].bankrupt);

// 자산 합계 (간이 — 현금 + 부동산 시세) — sim용 빠른 평가
export const quickWorth = (state, playerId) => {
  const p = state.players[playerId];
  let total = p.cash - (p.creditDebt ?? 0) - (p.loansharkDebt ?? 0);
  for (const pos in state.tileState) {
    const ts = state.tileState[pos];
    if (ts.owner === playerId) {
      const tile = state.board.tiles[pos];
      if (tile.type === 'property') {
        const stage = ts.stage ?? 0;
        total += tile.basePrice + (tile.houseCost ?? 0) * (stage <= 4 ? stage : 5);
      } else if (tile.type === 'railroad' && tile.subType === 'hub') {
        total += tile.basePrice ?? 400;
      }
    }
  }
  return total;
};
