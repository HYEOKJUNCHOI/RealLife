import { useState } from 'react';
import ModalBase from './ModalBase.jsx';
import { useGameStore } from '@/stores/gameStore.js';
import { CREDIT_ELIGIBILITY_CASH, CREDIT_INTEREST_PER_TURN, CREDIT_LIMIT, LOANSHARK_INTEREST_PER_TURN, LOANSHARK_LIMIT } from '@/engine/constants.js';
import { currentPrice } from '@/engine/inflation.js';
import { cn } from '@/lib/cn.js';

const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');
const PROPERTY_COLOR_HEX = {
  brown: '#955436',
  lightblue: '#AAE0FA',
  pink: '#D93A96',
  orange: '#F7941D',
  red: '#ED1B24',
  yellow: '#FEF200',
  green: '#1FB25A',
  darkblue: '#0072BB',
};

export default function LoanModal({ open, onClose, playerId, inline = false }) {
  const state = useGameStore((s) => s.state);
  const takePropertyLoan = useGameStore((s) => s.takePropertyLoan);
  const repayPropertyLoan = useGameStore((s) => s.repayPropertyLoan);
  const takeCreditLoan = useGameStore((s) => s.takeCreditLoan);
  const takeLoanSharkLoan = useGameStore((s) => s.takeLoanSharkLoan);
  const canTakeCreditLoan = useGameStore((s) => s.canTakeCreditLoan);
  const canTakeLoanSharkLoan = useGameStore((s) => s.canTakeLoanSharkLoan);
  const creditLoanReason = useGameStore((s) => s.creditLoanReason);
  const getLoanRepaymentInfo = useGameStore((s) => s.getLoanRepaymentInfo);
  const repayAllLoans = useGameStore((s) => s.repayAllLoans);
  const repayLoans = useGameStore((s) => s.repayLoans);
  const [partialAmount, setPartialAmount] = useState('');
  const [pendingLoan, setPendingLoan] = useState(null);

  if (!state || playerId == null) return null;
  const player = state.players[playerId];
  if (!player) return null;

  const ownedProperties = Object.entries(state.tileState ?? {})
    .map(([rawPos, ts]) => ({ pos: Number(rawPos), ts, tile: state.board?.tiles?.[Number(rawPos)] }))
    .filter(({ ts, tile }) => tile?.type === 'property' && ts?.owner === playerId);
  const mortgageTargets = ownedProperties.filter(({ ts }) => !ts.mortgaged);
  const mortgagedTargets = ownedProperties.filter(({ ts }) => ts.mortgaged && (ts.mortgageAmount ?? 0) > 0);
  const firstRepayTarget = mortgagedTargets[0];
  const mortgageRepayAmount = firstRepayTarget?.ts?.mortgageAmount ?? 0;
  const loanAmountFor = (pos) => Math.round(currentPrice(state, pos) * 0.7 / 10) * 10;

  const canCredit = canTakeCreditLoan?.(playerId);
  const canShark = canTakeLoanSharkLoan?.(playerId);
  const creditReason = creditLoanReason?.(playerId);
  const repayInfo = getLoanRepaymentInfo?.(playerId) ?? { principal: 0, fee: 0, total: 0, withinYear: false };
  const hasDebt = repayInfo.principal > 0;
  const canRepay = (player.cash ?? 0) >= repayInfo.total;
  const partialPrincipal = Math.min(Math.max(0, Number.parseInt(partialAmount || '0', 10) || 0), repayInfo.principal);
  const partialFee = repayInfo.withinYear ? Math.round(partialPrincipal * 0.01 / 10) * 10 : 0;
  const partialTotal = partialPrincipal + partialFee;
  const canPartialRepay = partialPrincipal > 0 && (player.cash ?? 0) >= partialTotal;
  const confirmLoan = () => {
    if (!pendingLoan) return;
    pendingLoan.action?.();
    setPendingLoan(null);
  };

  const panel = (
      <div className="relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border-2 border-ink-line bg-[#fff8df] shadow-[0_6px_0_#0F0C0A]">
        <div className="relative bg-[linear-gradient(180deg,#17324a_0%,#081926_100%)] px-5 py-3 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg border-2 border-white/45 bg-white/14 px-3 py-1.5 font-board text-[15px] font-black text-white shadow-[0_2px_0_#0F0C0A] active:translate-y-0.5 active:shadow-none"
          >
            나가기
          </button>
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.28em] text-cyan-100/75">Loan Office</div>
          <div className="mt-1 font-board text-[24px] leading-none">대출 선택</div>
          <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/55 bg-emerald-500/18 px-3 py-1 font-display text-[11px] font-black text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <span>예금 {fmt(player.cash)}만</span>
            <span className="h-3 w-px bg-white/28" />
            <span className="text-white/75">총 대출 {fmt(repayInfo.principal)}만</span>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-2 overflow-hidden p-3">
          <LoanStage title="담보대출" badge="PROPERTY" tone="blue">
            <div className="flex h-full min-h-0 flex-col gap-1.5 text-center">
              {firstRepayTarget && (
                <div className="rounded-md border border-blue-300 bg-blue-50 px-2 py-2 font-display text-[11px] font-black text-[#0f56b8]">
                  <div className="truncate">담보 중: {firstRepayTarget.tile?.names?.ko ?? firstRepayTarget.tile?.name}</div>
                  <button
                    type="button"
                    disabled={(player.cash ?? 0) < mortgageRepayAmount}
                    onClick={() => repayPropertyLoan?.(playerId, firstRepayTarget.pos)}
                    className="mt-1 min-h-[28px] w-full rounded-md border-2 border-ink-line bg-monopoly-gold px-2 py-1 font-board text-sm text-ink shadow-[0_2px_0_#0F0C0A] disabled:bg-neutral-200 disabled:text-ink/35"
                  >
                    상환 {fmt(mortgageRepayAmount)}만
                  </button>
                </div>
              )}
              {mortgageTargets.length > 0 ? (
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <div className="grid shrink-0 grid-cols-[1fr_auto] rounded-md border border-ink-line/25 bg-white/70 px-2 py-1 font-display text-[10px] font-black text-ink/55">
                    <span>내 부동산</span>
                    <span>가능금액</span>
                  </div>
                  {mortgageTargets.map(({ pos, tile, ts }) => {
                    const amount = loanAmountFor(pos);
                    const name = tile?.names?.ko ?? tile?.name ?? `${pos}번`;
                    const stage = ts.stage ?? 0;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPendingLoan({
                          type: 'mortgage',
                          title: '담보대출 계약',
                          amount,
                          message: `${name} 권리증을 담보로 ${fmt(amount)}만 대출합니다.`,
                          action: () => takePropertyLoan?.(playerId, pos),
                        })}
                        className="grid min-h-[28px] w-full grid-cols-[1fr_auto] items-center gap-1 rounded-md border-2 border-ink-line px-2 py-0.5 text-left font-display text-[10.5px] font-black shadow-[0_2px_0_#0F0C0A] active:translate-y-px active:shadow-none"
                        style={{ backgroundColor: PROPERTY_COLOR_HEX[tile?.color] ?? '#1769d8', color: ['lightblue', 'yellow'].includes(tile?.color) ? '#17120c' : '#fff' }}
                      >
                        <span className="truncate">{name}{stage > 0 ? ` +${stage === 5 ? '아파트' : `빌라${stage}`}` : ''}</span>
                        <span className="tabular-nums">{fmt(amount)}만</span>
                      </button>
                    );
                  })}
                </div>
              ) : !firstRepayTarget ? (
                <div className="rounded-md border border-ink-line/20 bg-neutral-100 p-2 text-xs font-extrabold text-ink/45">선택 가능한 담보가 없습니다.</div>
              ) : null}
              <div className="shrink-0 text-[10px] font-bold text-ink/45">가능 {mortgageTargets.length} · 담보중 {mortgagedTargets.length}</div>
            </div>
          </LoanStage>

          <LoanStage title="신용대출" badge="BANK" tone="green">
            <LoanChoice
              emoji="🏦"
              title="은행 신용"
              subtitle={`최대 ${fmt(CREDIT_LIMIT)}만`}
              detail={`예금 ${CREDIT_ELIGIBILITY_CASH}만 이하 · 이자 매턴당 -${CREDIT_INTEREST_PER_TURN}만`}
              enabled={canCredit}
              disabledReason={creditReason || '신청 조건을 확인하세요.'}
              buttonText="신용대출"
              onClick={() => setPendingLoan({
                type: 'credit',
                title: '신용대출 계약',
                amount: CREDIT_LIMIT,
                message: `신용대출 ${fmt(CREDIT_LIMIT)}만을 받습니다. 이자는 매턴당 -${CREDIT_INTEREST_PER_TURN}만입니다.`,
                action: () => takeCreditLoan?.(playerId),
              })}
            />
          </LoanStage>

          <LoanStage title="고리대금" badge="SHARK" tone="red">
            <LoanChoice
              emoji="🦈"
              title="사채"
              subtitle={`최대 ${fmt(LOANSHARK_LIMIT)}만`}
              detail={`언제든 가능 · 이자 매턴당 -${LOANSHARK_INTEREST_PER_TURN}만`}
              enabled={canShark}
              disabledReason="이미 사채를 사용했습니다."
              buttonText="고리대금"
              danger
              onClick={() => setPendingLoan({
                type: 'shark',
                title: '고리대금 계약',
                amount: LOANSHARK_LIMIT,
                message: `이자 매턴당 -${LOANSHARK_INTEREST_PER_TURN}만. 이자 잘 갚을 수 있겠습니까?`,
                action: () => takeLoanSharkLoan?.(playerId),
              })}
            />
          </LoanStage>
        </div>

        {pendingLoan && (
          <LoanSignConfirm
            loan={pendingLoan}
            onSign={confirmLoan}
            onCancel={() => setPendingLoan(null)}
          />
        )}

        <div className="border-t-2 border-ink-line bg-parchment-100 px-3 py-2">
          {hasDebt ? (
            <div className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2">
              <button
                type="button"
                disabled={!canRepay}
                onClick={() => repayAllLoans?.(playerId)}
                className={cn('rounded-md border-2 border-ink-line px-3 py-2 font-board text-base shadow-[0_2px_0_#0F0C0A]', canRepay ? 'bg-[#0f8a5f] text-white' : 'bg-neutral-200 text-ink/35')}
              >
                전액상환 {fmt(repayInfo.total)}만
              </button>
              <button
                type="button"
                disabled={!canPartialRepay}
                onClick={() => repayLoans?.(playerId, partialPrincipal)}
                className={cn('rounded-md border-2 border-ink-line px-3 py-2 font-board text-base shadow-[0_2px_0_#0F0C0A]', canPartialRepay ? 'bg-monopoly-red text-white' : 'bg-neutral-200 text-ink/35')}
              >
                부분상환
              </button>
              <input
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="상환 원금 입력"
                className="rounded-md border-2 border-ink-line bg-white px-3 py-2 text-right font-display text-base font-extrabold tabular-nums text-ink outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border-2 border-ink-line bg-white px-4 py-2 font-board text-base font-black text-ink shadow-[0_2px_0_#0F0C0A] active:translate-y-1 active:shadow-none"
              >
                나가기
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl border-2 border-ink-line bg-white font-board text-[18px] font-black text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none"
            >
              나가기
            </button>
          )}
        </div>
      </div>
  );

  if (inline) return panel;

  return (
    <ModalBase
      open={open}
      onClose={onClose}
      surface={false}
      size="lg"
      className="h-full w-full max-w-none"
    >
      {panel}
    </ModalBase>
  );
}

function LoanSignConfirm({ loan, onSign, onCancel }) {
  const isShark = loan.type === 'shark';
  return (
    <div
      className="absolute inset-0 z-[80] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); onCancel?.(); }}
    >
      <div
        className="grid w-[min(92%,420px)] overflow-hidden rounded-2xl border-2 border-ink-line bg-[#fff8df] shadow-[0_6px_0_#0F0C0A,0_24px_46px_-26px_rgba(0,0,0,0.85)]"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={cn('px-4 py-3 text-center text-white', isShark ? 'bg-[linear-gradient(180deg,#5a1111_0%,#1d0707_100%)]' : 'bg-[linear-gradient(180deg,#17324a_0%,#081926_100%)]')}>
          <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] opacity-70">Loan Contract</div>
          <div className="mt-1 font-board text-[24px] leading-none">{loan.title}</div>
        </div>
        <div className="grid gap-3 p-4 text-center">
          {isShark ? (
            <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-2 border-ink-line bg-[#ffe1d7] shadow-[0_3px_0_#0F0C0A]">
              <img src="/npc/loan_shark.png" alt="사채업자" className="h-full w-full object-cover object-top" draggable={false} />
            </div>
          ) : (
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-ink-line bg-monopoly-gold text-4xl shadow-[0_3px_0_#0F0C0A]">
              {loan.type === 'mortgage' ? '🏠' : '🏦'}
            </div>
          )}
          <div className="rounded-xl border-2 border-ink-line bg-white px-3 py-3 shadow-[0_2px_0_#0F0C0A]">
            <div className="font-display text-[22px] font-black tabular-nums text-ink">{fmt(loan.amount)}만</div>
            <div className="mt-1 text-sm font-bold leading-snug text-ink/70">{loan.message}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onSign} className="rounded-md border-2 border-ink-line bg-monopoly-gold px-3 py-2 font-board text-lg text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none">
              사인하기
            </button>
            <button type="button" onClick={onCancel} className="rounded-md border-2 border-ink-line bg-neutral-200 px-3 py-2 font-board text-lg text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none">
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoanStage({ title, badge, tone = 'blue', children }) {
  const toneClass = {
    blue: 'from-[#eaf3ff] to-[#cfe4ff] text-[#0f56b8]',
    green: 'from-[#effff6] to-[#d6f7e7] text-[#0f8a5f]',
    red: 'from-[#fff0ec] to-[#ffd7cb] text-monopoly-red',
  }[tone];
  return (
    <section className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-xl border-2 border-ink-line bg-white shadow-[0_3px_0_#0F0C0A]">
      <div className={cn('border-b-2 border-ink-line bg-gradient-to-b px-2 py-2 text-center', toneClass)}>
        <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] opacity-60">{badge}</div>
        <div className="font-board text-[20px] leading-none text-ink">{title}</div>
      </div>
      <div className="min-h-0 overflow-y-auto p-2 no-scrollbar">{children}</div>
    </section>
  );
}

function LoanChoice({ emoji, title, subtitle, detail, enabled, disabledReason, buttonText, danger = false, onClick }) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col rounded-lg border-2 border-ink-line p-2 text-center shadow-[0_2px_0_#0F0C0A]', enabled ? 'bg-white' : 'bg-neutral-100 opacity-60 grayscale')}>
      <div className={cn('mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-ink-line text-2xl shadow-[0_2px_0_#0F0C0A]', danger ? 'bg-[#ffe1d7]' : 'bg-[#e8fff6]')}>{emoji}</div>
      <div className="mt-2 font-board text-lg leading-none text-ink">{title}</div>
      <div className="mt-1 font-display text-[12px] font-extrabold text-ink/70">{subtitle}</div>
      <div className="mt-1 flex-1 text-[11px] font-bold leading-snug text-ink/55">{detail}</div>
      {!enabled && <div className="mt-1 text-[10px] font-extrabold leading-tight text-monopoly-red">{disabledReason}</div>}
      <button
        type="button"
        disabled={!enabled}
        onClick={onClick}
        className={cn('loan-action mt-2 disabled:bg-neutral-200 disabled:text-ink/35', enabled ? (danger ? 'bg-monopoly-red text-white' : 'bg-[#0f8a5f] text-white') : '')}
      >
        {buttonText}
      </button>
    </div>
  );
}
