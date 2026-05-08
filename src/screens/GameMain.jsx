// 메인 게임 화면 — 모노폴리 결, 3구역
//   ┌──────── HEADER (객주 + 큰 현금 + 글로벌 칩 + ⚙) ────────┐
//   │ CURRENT PLAYER STAGE (캐릭터 투명 + STATUS + 보유 5×2)  │
//   ├──────── FOOTER (다른 플레이어 strip + 🎲 턴 종료) ───────┤
// CardDeck 영역 폐기 — 보유 카드 시스템 자체 무의미 (룰 재정리 결과).
// 턴종료는 푸터 우측 끝으로 이동 (사용자 명시).

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';
import charactersData from '@/data/characters.json';
import voicelines from '@/data/voicelines.json';

import CurrentPlayerStage from '@/components/CurrentPlayerStage.jsx';
import OtherPlayersStrip from '@/components/OtherPlayersStrip.jsx';
import MatrixToast from '@/components/MatrixToast.jsx';
import PropertyModal from '@/components/modals/PropertyModal.jsx';
import TradeModal from '@/components/modals/TradeModal.jsx';
import TradeSelectModal from '@/components/modals/TradeSelectModal.jsx';
import EventModal from '@/components/modals/EventModal.jsx';
import YearEndModal from '@/components/modals/YearEndModal.jsx';
import DeathmatchModal from '@/components/modals/DeathmatchModal.jsx';
import RecoveryModal from '@/components/modals/RecoveryModal.jsx';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};

export default function GameMain({ onExit }) {
  const state = useGameStore((s) => s.state);
  const log = useGameStore((s) => s.log);
  const step = useGameStore((s) => s.step);
  // modal 키별 개별 구독 — 객체 통째로 구독하면 Zustand shallow 비교 오판 방지
  const modalProperty  = useGameStore((s) => s.modal.property);
  const modalTrade     = useGameStore((s) => s.modal.trade);
  const modalTradeSelect = useGameStore((s) => s.modal.tradeSelect);
  const modalEvent     = useGameStore((s) => s.modal.event);
  const modalYearEnd   = useGameStore((s) => s.modal.yearEnd);
  const modalDeathmatch = useGameStore((s) => s.modal.deathmatch);
  const modalRecovery  = useGameStore((s) => s.modal.recovery);
  const closePropertyModal = useGameStore((s) => s.closePropertyModal);
  const closeTradeModal = useGameStore((s) => s.closeTradeModal);
  const closeTradeSelect = useGameStore((s) => s.closeTradeSelect);
  const closeRecoveryModal = useGameStore((s) => s.closeRecoveryModal);
  const confirmEvent = useGameStore((s) => s.confirmEvent);
  const confirmYearEnd = useGameStore((s) => s.confirmYearEnd);
  const confirmDeathmatch = useGameStore((s) => s.confirmDeathmatch);
  const resetGame = useGameStore((s) => s.resetGame);

  const hostLine = useMemo(() => {
    const last = log.length > 0 ? log[log.length - 1] : null;
    if (!last) {
      const welcome = voicelines?.realtor?.game_start;
      if (Array.isArray(welcome) && welcome.length > 0) return welcome[0];
      return '환영합니다. 권리증을 배포합니다.';
    }
    return summarizeEvent(last);
  }, [log]);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-parchment-100">
        <div className="font-display text-xl font-bold uppercase tracking-widest text-ink">
          Loading...
        </div>
      </div>
    );
  }

  const turnIndex = state.turnIndex;
  const turnPlayer = state.players[turnIndex];
  const turnBaseMeta = turnPlayer
    ? CHAR_META[turnPlayer.character] ?? { name: turnPlayer.character, color: '#666' }
    : { name: '-', color: '#666' };
  const turnMeta = turnPlayer
    ? { ...turnBaseMeta, name: displayPlayerName(turnPlayer, turnBaseMeta.name) }
    : turnBaseMeta;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-parchment-100/60" />

      <div className="relative flex h-full min-h-dvh flex-col gap-2 p-2 md:min-h-full md:gap-2.5 md:p-3">
        {/* === STAGE === (헤더는 폐기 — 모든 정보가 CurrentPlayerStage TOP 으로 통합됨) */}
        <div className="hidden flex-1 min-h-0 md:flex">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={state}
            hostLine={hostLine}
            year={state.year}
            loanRate={state.loanRate}
            onExit={onExit}
          />
        </div>
        <div className="flex flex-1 min-h-0 md:hidden">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={state}
            hostLine={hostLine}
            year={state.year}
            loanRate={state.loanRate}
            onExit={onExit}
            compact
          />
        </div>

        {/* === FOOTER (turn 종료 우측 끝) === */}
        <OtherPlayersStrip
          state={state}
          onStep={step}
          finished={state.finished}
          winnerIndex={state.winner}
        />

        {/* === MODALS === */}
        {modalProperty && (
          <PropertyModal
            open
            onClose={closePropertyModal}
            pos={modalProperty.pos}
            visitorId={modalProperty.visitorId}
          />
        )}
        {modalTrade && (
          <TradeModal
            open
            onClose={closeTradeModal}
            fromId={modalTrade.fromId}
            toId={modalTrade.toId}
            initialGetPos={modalTrade.initialGetPos}
          />
        )}
        {modalTradeSelect && (
          <TradeSelectModal
            open
            onClose={closeTradeSelect}
            fromId={modalTradeSelect.fromId}
          />
        )}
        {modalEvent && (
          <EventModal
            open
            onClose={confirmEvent}
            eventId={modalEvent.eventId}
            description={modalEvent.description}
            affected={modalEvent.affected}
          />
        )}
        {modalYearEnd && (
          <YearEndModal
            open
            onClose={confirmYearEnd}
            year={modalYearEnd.year}
            summary={modalYearEnd.summary}
          />
        )}
        {modalDeathmatch && <DeathmatchModal open onClose={confirmDeathmatch} />}
        {modalRecovery && (
          <RecoveryModal
            open
            onClose={closeRecoveryModal}
            playerId={modalRecovery.playerId}
            needAmount={modalRecovery.needAmount}
          />
        )}

        {state.finished && (
          <GameEndOverlay
            state={state}
            onRestart={() => {
              resetGame?.();
              onExit?.();
            }}
            onQuit={onExit}
          />
        )}

        <MatrixToast />
      </div>
    </>
  );
}

function GameEndOverlay({ state, onRestart, onQuit }) {
  const ranking = state.ranking?.length
    ? state.ranking
    : state.players
        .map((p, i) => ({ i, worth: p.cash ?? 0, bankrupt: p.bankrupt }))
        .sort((a, b) => {
          if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
          return b.worth - a.worth;
        });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/55 backdrop-blur-[4px] p-4">
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="w-[min(92vw,520px)] overflow-hidden rounded-md border-[3px] border-ink-line bg-parchment-50 shadow-[0_5px_0_0_#0F0C0A,0_18px_38px_-12px_rgba(0,0,0,0.7)]"
      >
        <div className="bg-monopoly-red px-5 py-4 text-center text-white">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.32em] opacity-80">
            Game Finished
          </div>
          <div className="mt-1 font-board text-[28px] font-extrabold leading-none">
            🏆 최종 순위
          </div>
        </div>

        <div className="space-y-2 px-5 py-4">
          {ranking.map((r, idx) => {
            const player = state.players[r.i];
            const base = CHAR_META[player?.character] ?? { name: `${r.i + 1}P`, color: '#666' };
            const name = displayPlayerName(player, base.name);
            return (
              <div
                key={r.i}
                className="flex items-center gap-3 rounded-md border-2 border-ink-line bg-white px-3 py-2 shadow-[0_2px_0_0_#0F0C0A]"
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink-line font-display text-[13px] font-extrabold text-white"
                  style={{ backgroundColor: idx === 0 ? '#D32F2F' : base.color }}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: base.color }}>
                      {r.i + 1}P
                    </span>
                    <span className="truncate font-board text-[17px] font-extrabold text-ink">
                      {name}
                    </span>
                    {r.bankrupt && (
                      <span className="font-display text-[9px] font-bold text-ink/40">파산</span>
                    )}
                  </div>
                </div>
                <span className="font-display text-[18px] font-extrabold tabular-nums text-ink">
                  {fmt(r.worth)}
                  <span className="ml-0.5 text-[10px] font-bold text-ink/45">만</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t-2 border-ink-line bg-parchment-100 px-5 py-4">
          <button
            type="button"
            onClick={onQuit}
            className="rounded-md border-2 border-ink-line bg-neutral-200 px-4 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_3px_0_0_#0F0C0A] transition hover:bg-neutral-100 active:translate-y-px"
          >
            그만하기
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border-2 border-ink-line bg-monopoly-red px-4 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_3px_0_0_#0F0C0A] transition hover:bg-monopoly-deep active:translate-y-px"
          >
            다시하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// === 로그 → 한 줄 객주 멘트 ===
function pickLine(path) {
  let cur = voicelines;
  for (const k of path) {
    if (!cur || cur[k] == null) return null;
    cur = cur[k];
  }
  if (Array.isArray(cur)) return cur[Math.floor(Math.random() * cur.length)];
  return typeof cur === 'string' ? cur : null;
}

function summarizeEvent(e) {
  if (!e) return '';
  switch (e.kind) {
    case 'roll':
      return `주사위 ${e.d1}+${e.d2}=${e.sum}${e.isDouble ? ' · 더블!' : ''}`;
    case 'buy_property':
      return `🏠 매입 — ${e.price}만`;
    case 'rent':
      return `💸 통행료 ${e.rent}만 → ${e.ownerId + 1}p`;
    case 'go_pass':
      return pickLine(['realtor', 'go_pass']) ?? `월급 +${e.amt}만`;
    case 'go_exact':
      return pickLine(['realtor', 'go_exact']) ?? `🎉 성과급 +${e.amt}만`;
    case 'event_card':
      return `📜 사회 이벤트 — ${e.card}`;
    case 'year_end':
      return `📅 ${e.year}년차 결산`;
    case 'parking_jackpot':
      return `🎰 휴게소 잭팟 +${e.amt}만`;
    case 'arrive_station':
      return `🚉 역장 부임 (적립 ${e.collected}만)`;
    case 'arrive_hub':
      return `🚄 환승 허브 (${e.type})`;
    case 'go_to_jail':
      return '🚓 감옥행';
    case 'deathmatch_start':
      return '🔥 데스매치 시작';
    case 'game_end':
      return `🏆 승자 ${e.winner + 1}p`;
    case 'credit_loan':
      return '💳 신용대출 1,000만 신청';
    case 'tax':
      return `${e.kind === 'income' ? '소득세' : '사치세'} -${e.amt}만`;
    default:
      return e.kind;
  }
}
