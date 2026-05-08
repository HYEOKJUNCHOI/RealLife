// THE REALLIFE 시뮬레이션 — 4명 자동 게임 (개선 버전 v2)
// 사용: node src/sim/simulate.js [--years N] [--seed S] [--verbose] [--no-loanshark]
//
// v2 변경점:
//  - 4종 페르소나 (aggressive/defensive/gambler/stable)
//  - 자기 턴 자동 건설/거래/고리대금/명예퇴직 (agents.js)
//  - 더 풍부한 이벤트 로그

import { createRng } from '../engine/rng.js';
import { createGameState } from '../engine/gameState.js';
import { playTurn } from '../engine/rules.js';
import { quickWorth } from '../engine/gameState.js';
import { computeNetWorth } from '../engine/tax.js';
import { runAgentDecisions, PERSONAS } from './agents.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const opts = {
    years: 5,
    seed: 1,
    verbose: false,
    loanshark: true,
    label: null,
    out: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--years') opts.years = +args[++i];
    else if (a === '--seed') opts.seed = +args[++i];
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--no-loanshark') opts.loanshark = false;
    else if (a === '--loanshark') opts.loanshark = true;
    else if (a === '--label') opts.label = args[++i];
    else if (a === '--out') opts.out = args[++i];
    else if (a === '--no-timecap') opts.ignoreTimeCap = true;
  }
  return opts;
};

export const runSimulation = ({ years = 5, seed = 1, loanshark = true, ignoreTimeCap = false } = {}) => {
  const rng = createRng(seed);
  const state = createGameState({
    numPlayers: 4,
    options: { loanshark },
    rng,
  });
  if (ignoreTimeCap) {
    // 60분 컷 우회 — 라운드별 elapsedMin 증가를 0으로 (파산 도달 분석용)
    state._ignoreTimeCap = true;
  }

  // 4명에 페르소나 배정
  state.players[0].persona = 'aggressive';
  state.players[1].persona = 'defensive';
  state.players[2].persona = 'gambler';
  state.players[3].persona = 'stable';

  const snapshots = [];
  const eventLog = [];
  const TRACK_KINDS = new Set([
    'event_card', 'recover', 'recover_arrival', 'recover_pre_turn',
    'go_to_jail', 'three_doubles_jail', 'parking_jackpot',
    'arrive_station', 'arrive_hub', 'year_end', 'loan_rate_update',
    'deathmatch_start', 'game_end', 'loanshark_default',
    'auto_build', 'auto_trade', 'auto_loanshark', 'station_resign',
    'buy_property',
  ]);

  const maxRounds = years * 6;
  let safety = 0;
  while (!state.finished && state.year < years && safety < 2000) {
    const { events } = playTurn(state, rng, runAgentDecisions);
    for (const e of events) {
      if (TRACK_KINDS.has(e.kind)) {
        eventLog.push({ round: state.round, turn: state.turnIndex, ...e });
      }
    }
    if (state.turnIndex === 0 && (snapshots.length === 0 || snapshots[snapshots.length - 1].round !== state.round)) {
      snapshots.push(snapshot(state));
    }
    safety += 1;
  }
  snapshots.push(snapshot(state));

  return {
    state,
    snapshots,
    eventLog,
    summary: summarize(state, snapshots, eventLog),
  };
};

const snapshot = (state) => ({
  round: state.round,
  year: state.year,
  elapsedMin: state.elapsedMin,
  parkingPot: state.parkingPot,
  loanRate: state.loanRate,
  players: state.players.map((p, i) => ({
    id: i,
    persona: p.persona,
    cash: p.cash,
    quickWorth: quickWorth(state, i),
    netWorth: computeNetWorth(state, i),
    inJail: p.inJail,
    bankrupt: p.bankrupt,
    creditDebt: p.creditDebt ?? 0,
    loansharkDebt: p.loansharkDebt ?? 0,
    propsOwned: countProps(state, i),
    villas: countVillas(state, i),
    apts: countApts(state, i),
  })),
});

const countProps = (state, playerId) =>
  Object.values(state.tileState).filter((ts) => ts.owner === playerId).length;

const countVillas = (state, playerId) => {
  let n = 0;
  for (const pos in state.tileState) {
    const ts = state.tileState[pos];
    if (ts.owner === playerId) {
      const stage = ts.stage ?? 0;
      if (stage >= 1 && stage <= 4) n += stage;
    }
  }
  return n;
};

const countApts = (state, playerId) => {
  let n = 0;
  for (const pos in state.tileState) {
    const ts = state.tileState[pos];
    if (ts.owner === playerId && (ts.stage ?? 0) === 5) n += 1;
  }
  return n;
};

const summarize = (state, snapshots, eventLog) => {
  const last = snapshots[snapshots.length - 1];
  const max = Math.max(...last.players.map((p) => p.netWorth));
  const liveWorth = last.players.filter((p) => !p.bankrupt).map((p) => p.netWorth);
  const min = liveWorth.length > 0 ? Math.min(...liveWorth) : 0;
  // 이벤트 통계
  const buildCount = eventLog.filter((e) => e.kind === 'auto_build').length;
  const tradeCount = eventLog.filter((e) => e.kind === 'auto_trade').length;
  const loansharkCount = eventLog.filter((e) => e.kind === 'auto_loanshark').length;
  const resignCount = eventLog.filter((e) => e.kind === 'station_resign').length;
  // 첫 파산 시점
  const firstBankrupt = eventLog.find(
    (e) => (e.kind === 'recover' || e.kind === 'recover_arrival' || e.kind === 'recover_pre_turn')
      && Array.isArray(e.log) && e.log.some((l) => l.step === 'bankrupt'),
  );
  return {
    finalYear: state.year,
    finalRound: state.round,
    finalElapsedMin: state.elapsedMin,
    deathmatch: state.deathmatch,
    finished: state.finished,
    winner: state.winner,
    bankruptCount: state.players.filter((p) => p.bankrupt).length,
    maxNetWorth: max,
    minNetWorth: min,
    spread: max / Math.max(min, 1),
    buildCount,
    tradeCount,
    loansharkCount,
    resignCount,
    firstBankruptRound: firstBankrupt?.round ?? null,
    firstBankruptYear: firstBankrupt ? snapshots.find((s) => s.round === firstBankrupt.round)?.year : null,
    rankings: last.players
      .map((p) => ({ id: p.id, persona: p.persona, netWorth: p.netWorth, bankrupt: p.bankrupt }))
      .sort((a, b) => b.netWorth - a.netWorth),
  };
};

if (process.argv[1] && (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('simulate.js'))) {
  const opts = parseArgs();
  const result = runSimulation(opts);
  console.log('==================================');
  console.log(`시뮬 결과 v2 (${opts.label ?? `${opts.years}년 / seed ${opts.seed}`})`);
  console.log('==================================');
  console.log('최종 라운드:', result.summary.finalRound);
  console.log('최종 연도:', result.summary.finalYear);
  console.log('경과 시간(분):', result.summary.finalElapsedMin);
  console.log('데스매치 발동:', result.summary.deathmatch);
  console.log('파산자 수:', result.summary.bankruptCount);
  console.log('자산 격차 배수:', result.summary.spread.toFixed(2));
  console.log('첫 파산 라운드:', result.summary.firstBankruptRound ?? '없음');
  console.log('자동 건설:', result.summary.buildCount, '회');
  console.log('자동 거래:', result.summary.tradeCount, '회');
  console.log('고리대금 자발 사용:', result.summary.loansharkCount, '회');
  console.log('명예퇴직:', result.summary.resignCount, '회');
  console.log('순위:');
  for (const r of result.summary.rankings) {
    const last = result.snapshots[result.snapshots.length - 1];
    const lp = last.players.find((p) => p.id === r.id);
    console.log(
      `  ${r.id} (${r.persona}): ${r.netWorth.toFixed(0)}만 빌라${lp.villas}/아파트${lp.apts} ${r.bankrupt ? '[파산]' : ''}`,
    );
  }
  console.log('주요 이벤트:', result.eventLog.length, '건');
  if (opts.verbose) {
    for (const e of result.eventLog.slice(0, 60)) {
      console.log(`  R${e.round}: ${e.kind}`, JSON.stringify(e).slice(0, 140));
    }
  }
  if (opts.out) {
    const outPath = resolve(opts.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify(
        {
          opts,
          summary: result.summary,
          snapshots: result.snapshots,
          eventLog: result.eventLog,
        },
        null,
        2,
      ),
    );
    console.log('저장:', outPath);
  }
}
