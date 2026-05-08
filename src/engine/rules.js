// 메인 룰 통합 — 자기 턴 흐름 + 도착 칸 처리
//
// 자기 턴 흐름:
//  1. (감옥) 처리
//  2. 매 자기 턴 입금/차감: 한전·수자원 / 부동산 대출 이자 / 신용대출 / 고리대금 / 생활비
//  3. 신용대출 자동 상환 체크
//  4. 주사위 굴림 → 이동 → GO 통과/도착 처리
//  5. 도착 칸 처리 (부동산/세금/카드/감옥/역장 등)
//  6. 더블이면 한 번 더 (3연속 = 감옥)
//  7. 회생 체크 (cash < 0)
//  8. 매턴 적립 (역장 자리, 누구 턴이든 advanceTurn 끝에서 한 번)
//  9. 1년 결산 트리거 체크 (모두 GO 1바퀴) — turn 바뀔 때 처리
// 10. 데스매치 체크 (시간/이벤트)
// 11. 파산자 1명 → 게임 종료

import { rollTurnDice } from './dice.js';
import { advanceYear, currentPrice } from './inflation.js';
import {
  chargeMortgageInterest,
  chargeCreditInterest,
  chargeLoansharkInterest,
  tryAutoRepayCredit,
  rollNewLoanRate,
} from './loan.js';
import {
  payInstitutionSalary,
  accrueStationFunds,
  handleStationArrival,
  handleInstitutionArrival,
  handleHubArrival,
} from './station.js';
import {
  chargeLivingCost,
  chargePropertyTax,
  handleLuxuryTax,
  handleIncomeTax,
  collectParkingPot,
  computeNetWorth,
} from './tax.js';
import { handlePropertyArrival } from './rent.js';
import { drawWelfareCard, triggerEventCard } from './cards.js';
import { sendToJail, handleJailTurn } from './jail.js';
import { tryRecover } from './recovery.js';
import {
  GO_SALARY,
  GO_BONUS,
  BOARD_SIZE,
  EVENT_TRIGGER_YEARS,
  DEATHMATCH_TRIGGER_MIN,
  GAME_DURATION_MIN,
  APARTMENT_INCOME_RATIO,
  round10,
} from './constants.js';
import { isProperty, isHub, isStation, isInstitution, propertyPositions } from './board.js';
import { quickWorth, livePlayers } from './gameState.js';

const MIN_PER_ROUND = 2.5; // 1라운드 = 2.5분 가정

// 보유 아파트 (stage 5) 채수 카운트
export const countApartments = (state, playerId) => {
  let n = 0;
  for (const pos of propertyPositions(state.board.tiles)) {
    const ts = state.tileState[pos];
    if (ts?.owner === playerId && ts.stage === 5 && !ts.mortgaged) n++;
  }
  return n;
};

// 아파트 패시브 인컴 — 비용 비례: 각 아파트의 houseCost × 비율 합산
// 싼 아파트(수원 houseCost 25) = 적게, 비싼 아파트(서울 houseCost 200) = 많이
export const apartmentPassiveIncome = (state, playerId) => {
  let total = 0;
  for (const pos of propertyPositions(state.board.tiles)) {
    const ts = state.tileState[pos];
    if (ts?.owner === playerId && ts.stage === 5 && !ts.mortgaged) {
      const tile = state.board.tiles[pos];
      total += round10((tile.houseCost ?? 0) * APARTMENT_INCOME_RATIO);
    }
  }
  return total;
};

// 자기 턴 시작 전 자동 차감/입금
export const onTurnStart = (state, playerId, log) => {
  const player = state.players[playerId];
  if (player.bankrupt) return;

  // 한전·수자원 입금
  const salary = payInstitutionSalary(state, playerId);
  if (salary > 0) log.push({ kind: 'institution_pay', amt: salary });

  // 아파트 패시브 인컴 (BRAINSTORM 7-2: 매 자기 턴 누진)
  const aptIncome = apartmentPassiveIncome(state, playerId);
  if (aptIncome > 0) {
    player.cash += aptIncome;
    log.push({ kind: 'apartment_income', amt: aptIncome, count: countApartments(state, playerId) });
  }

  // 부동산 대출 이자
  const mortInt = chargeMortgageInterest(state, playerId);
  if (mortInt > 0) log.push({ kind: 'mortgage_interest', amt: mortInt });

  // 신용대출 이자
  const ci = chargeCreditInterest(player);
  if (ci.paid > 0 || ci.missed) log.push({ kind: 'credit_interest', ...ci });

  // 고리대금 이자
  const li = chargeLoansharkInterest(player);
  if (li.paid > 0 || li.defaulted) log.push({ kind: 'loanshark_interest', ...li });
  if (li.defaulted) {
    player.bankrupt = true;
    log.push({ kind: 'loanshark_default' });
  }

  // 자동 상환
  const auto = tryAutoRepayCredit(player);
  if (auto > 0) log.push({ kind: 'credit_auto_repay', amt: auto });

  // 생활비
  const living = chargeLivingCost(state, playerId);
  log.push({ kind: 'living', amt: living });
};

// 이동 — GO 통과 처리
const movePlayer = (state, playerId, steps, log) => {
  const player = state.players[playerId];
  const oldPos = player.position;
  const newPos = (oldPos + steps) % BOARD_SIZE;
  // GO 통과 (newPos < oldPos 또는 정확히 0)
  const passedGo = oldPos + steps >= BOARD_SIZE;
  if (passedGo) {
    if (newPos === 0) {
      player.cash += GO_SALARY + GO_BONUS;
      log.push({ kind: 'go_exact', amt: GO_SALARY + GO_BONUS });
    } else {
      player.cash += GO_SALARY;
      log.push({ kind: 'go_pass', amt: GO_SALARY });
    }
    player.passedGoCount = (player.passedGoCount ?? 0) + 1;
  }
  player.position = newPos;
  return newPos;
};

// 도착 칸 처리
const handleTileArrival = (state, playerId, pos, rng, log) => {
  const tile = state.board.tiles[pos];
  switch (tile.type) {
    case 'go':
      // 정확 도착은 movePlayer에서 처리
      break;
    case 'property': {
      const r = handlePropertyArrival(state, playerId, pos);
      log.push({ kind: 'arrive_property', ...r });
      // 시뮬 AI: 미보유 시 cash 충분하면 매입
      if (r.type === 'unowned') {
        const player = state.players[playerId];
        if (player.cash >= r.buyPrice + 100) {
          player.cash -= r.buyPrice;
          state.tileState[pos] ??= {};
          state.tileState[pos].owner = playerId;
          state.tileState[pos].stage = 0;
          log.push({ kind: 'buy_property', pos, price: r.buyPrice });
        }
      }
      break;
    }
    case 'railroad': {
      if (isHub(tile)) {
        const r = handleHubArrival(state, playerId, pos, rng);
        log.push({ kind: 'arrive_hub', ...r });
      } else if (isStation(tile)) {
        const r = handleStationArrival(state, playerId, pos);
        log.push({ kind: 'arrive_station', ...r });
      }
      break;
    }
    case 'utility': {
      const r = handleInstitutionArrival(state, playerId, pos);
      log.push({ kind: 'arrive_institution', ...r });
      break;
    }
    case 'tax': {
      if (tile.taxKind === 'luxury') {
        const amt = handleLuxuryTax(state, playerId, rng);
        log.push({ kind: 'luxury_tax', amt });
      } else {
        const amt = handleIncomeTax(state, playerId);
        log.push({ kind: 'income_tax', amt });
      }
      break;
    }
    case 'chance': {
      // BRAINSTORM §9: MVP에서 찬스 카드 시스템 제외 (V2 이벤트와 결 중복)
      // 보드의 'chance' 칸은 그대로 두되 효과 없음 (도착 시 패스)
      break;
    }
    case 'community_chest': {
      const r = drawWelfareCard(state, playerId, rng);
      log.push({ kind: 'welfare_draw', ...r });
      break;
    }
    case 'free_parking': {
      const pot = collectParkingPot(state, playerId);
      if (pot > 0) log.push({ kind: 'parking_jackpot', amt: pot });
      break;
    }
    case 'jail': {
      // 방문만 (그냥 머무름)
      break;
    }
    case 'go_to_jail': {
      sendToJail(state, playerId);
      log.push({ kind: 'go_to_jail' });
      break;
    }
  }
};

// 자기 턴 1회 실행 (시뮬 자동 모드)
// 반환: { events: [...], finished, winner }
// agentHook: (state, playerId, rng, log) => void — 주사위 굴리기 직전 자동 의사결정
export const playTurn = (state, rng, agentHook = null) => {
  if (state.finished) return { events: [], finished: true, winner: state.winner };
  const playerId = state.turnIndex;
  const player = state.players[playerId];
  const log = [];

  if (player.bankrupt) {
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    return { events: log };
  }

  // skipTurns (군복무 등)
  if ((player.skipTurns ?? 0) > 0) {
    player.skipTurns -= 1;
    log.push({ kind: 'skip', remaining: player.skipTurns });
    advanceTurn(state, rng, log);
    return { events: log };
  }

  // 감옥 처리: 보석금 우선 (시뮬 단순화: cash ≥ 200만이면 보석금)
  if (player.inJail) {
    const dice = rng.rollDice();
    const out = handleJailTurn(state, playerId, {
      payBail: player.cash >= 200,
      rolledDouble: dice.isDouble,
    });
    log.push({ kind: 'jail_turn', ...out });
    if (!out.released) {
      advanceTurn(state, rng, log);
      return { events: log };
    }
    // 탈출 후 그 주사위로 이동
    onTurnStart(state, playerId, log);
    if (player.cash < 0) {
      const rec = tryRecover(state, playerId, state.options.loanshark);
      log.push({ kind: 'recover', ...rec });
      if (rec.bankrupt) {
        player.bankrupt = true;
      }
    }
    if (!player.bankrupt) {
      const newPos = movePlayer(state, playerId, dice.sum, log);
      handleTileArrival(state, playerId, newPos, rng, log);
      if (player.cash < 0) {
        const rec = tryRecover(state, playerId, state.options.loanshark);
        log.push({ kind: 'recover', ...rec });
      }
    }
    advanceTurn(state, rng, log);
    return { events: log };
  }

  // 정상 턴
  onTurnStart(state, playerId, log);
  if (player.cash < 0) {
    const rec = tryRecover(state, playerId, state.options.loanshark);
    log.push({ kind: 'recover_pre_turn', ...rec });
  }
  if (player.bankrupt) {
    advanceTurn(state, rng, log);
    return { events: log };
  }

  // 외부 agent 의사결정 (자동 건설/거래/고리대금/명예퇴직)
  if (agentHook) {
    try {
      agentHook(state, playerId, rng, log);
    } catch (e) {
      log.push({ kind: 'agent_error', message: e.message });
    }
  }

  // 주사위 — 더블 시 한 번 더 (3연속 감옥)
  let doublesCount = 0;
  while (true) {
    const dice = rollTurnDice(rng, doublesCount);
    log.push({ kind: 'roll', ...dice });
    if (dice.goToJail) {
      sendToJail(state, playerId);
      log.push({ kind: 'three_doubles_jail' });
      break;
    }
    const newPos = movePlayer(state, playerId, dice.sum, log);
    handleTileArrival(state, playerId, newPos, rng, log);
    if (player.cash < 0) {
      const rec = tryRecover(state, playerId, state.options.loanshark);
      log.push({ kind: 'recover_arrival', ...rec });
      if (rec.bankrupt) break;
    }
    if (player.inJail) break;
    if (!dice.extraTurn) break;
    doublesCount = dice.doublesCount;
  }

  advanceTurn(state, rng, log);
  return { events: log };
};

// 자기 턴 종료 → 다음 턴
const advanceTurn = (state, rng, log) => {
  // 매턴 (누구턴이든) 역장 적립
  accrueStationFunds(state);

  state.turnIndex = (state.turnIndex + 1) % state.players.length;
  // 한 라운드 끝 = 모든 플레이어 1턴씩
  if (state.turnIndex === 0) {
    state.round += 1;
    if (!state._ignoreTimeCap) state.elapsedMin += MIN_PER_ROUND;

    // 1년 결산 = 모두 GO 1바퀴 — passedGoCount 합 / players 수 ≥ year+1
    const minPassed = Math.min(...state.players.map((p) => p.passedGoCount ?? 0));
    if (minPassed > state.year) {
      yearEndSettlement(state, rng, log);
    }

    // 데스매치 체크 — deathmatchStartMinutes 옵션이 0이면 비활성, > 0 이면 그 시각에 트리거
    const dmStart = state.options.deathmatchStartMinutes ?? DEATHMATCH_TRIGGER_MIN;
    if (dmStart > 0 && !state.deathmatch && state.elapsedMin >= dmStart) {
      state.deathmatch = true;
      log.push({ kind: 'deathmatch_start' });
    }
    // 데스매치 = 매 라운드 이벤트 카드 (eventCards 옵션은 매년 결산만 게이팅, 데스매치는 별도 트리거)
    if (state.deathmatch) {
      const r = triggerEventCard(state, rng);
      log.push({ kind: 'event_card', ...r });
    }

    // 게임 종료 체크
    if (state.elapsedMin >= GAME_DURATION_MIN) {
      finishGame(state, log);
    }
  }

  // 파산자 체크
  const live = livePlayers(state);
  if (live.length <= 1 && !state.finished) {
    finishGame(state, log);
  }
};

// 1년 결산
const yearEndSettlement = (state, rng, log) => {
  advanceYear(state);
  log.push({ kind: 'year_end', year: state.year });

  // 종부세 (모두)
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].bankrupt) continue;
    const tax = chargePropertyTax(state, i);
    log.push({ kind: 'property_tax', playerId: i, amt: tax });
    if (state.players[i].cash < 0) {
      tryRecover(state, i, state.options.loanshark);
    }
  }

  // 대출 이자율 갱신
  state.loanRate = rollNewLoanRate(rng);
  log.push({ kind: 'loan_rate_update', rate: state.loanRate });

  // 2년 결산 시 이벤트 카드 (데스매치 모드 X일 때만)
  if (state.options.eventCards && !state.deathmatch && state.year % EVENT_TRIGGER_YEARS === 0) {
    const r = triggerEventCard(state, rng);
    log.push({ kind: 'event_card', ...r });
  }
};

const finishGame = (state, log) => {
  state.finished = true;
  // 자산 1위 승리
  const ranking = state.players
    .map((p, i) => ({ i, worth: quickWorth(state, i), bankrupt: p.bankrupt }))
    .sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
      return b.worth - a.worth;
    });
  state.winner = ranking[0].i;
  state.ranking = ranking;
  log.push({ kind: 'game_end', winner: ranking[0].i, ranking });
};

