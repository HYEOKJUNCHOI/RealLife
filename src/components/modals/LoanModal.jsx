import { useState } from 'react';
import ModalBase from './ModalBase.jsx';
import { useGameStore } from '@/stores/gameStore.js';
import { CREDIT_ELIGIBILITY_CASH, CREDIT_INTEREST_PER_TURN, CREDIT_LIMIT, LOANSHARK_INTEREST_PER_TURN, LOANSHARK_LIMIT } from '@/engine/constants.js';
import { cn } from '@/lib/cn.js';

const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');

export default function LoanModal({ open, onClose, playerId }) {
  const state = useGameStore((s) => s.state);
  const takeCreditLoan = useGameStore((s) => s.takeCreditLoan);
  const takeLoanSharkLoan = useGameStore((s) => s.takeLoanSharkLoan);
  const canTakeCreditLoan = useGameStore((s) => s.canTakeCreditLoan);
  const canTakeLoanSharkLoan = useGameStore((s) => s.canTakeLoanSharkLoan);
  const creditLoanReason = useGameStore((s) => s.creditLoanReason);
  const getLoanRepaymentInfo = useGameStore((s) => s.getLoanRepaymentInfo);
  const repayAllLoans = useGameStore((s) => s.repayAllLoans);
  const repayLoans = useGameStore((s) => s.repayLoans);
  const [partialAmount, setPartialAmount] = useState('');

  if (!state || playerId == null) return null;
  const player = state.players[playerId];
  if (!player) return null;

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

  return (
    <ModalBase open={open} onClose={onClose}>
      <div className="overflow-hidden rounded-2xl border-2 border-ink-line bg-[#fffdf5] shadow-[0_6px_0_#0F0C0A]">
        <div className="bg-[linear-gradient(180deg,#17324a_0%,#081926_100%)] px-5 py-4 text-center text-white">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.28em] text-cyan-100/75">Loan Office</div>
          <div className="mt-1 font-board text-2xl leading-none">{hasDebt ? '💳 대출 상환소' : '💰 대출 상담소'}</div>
          <div className="mt-2 font-display text-[11px] font-bold text-white/75">현재 예금 {fmt(player.cash)}만</div>
        </div>

        <div className="grid gap-3 p-4">
          {hasDebt ? (
            <>
            <div className="rounded-xl border-2 border-ink-line bg-white p-4 shadow-[0_3px_0_#0F0C0A]">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink-line bg-[#fff2b8] text-2xl shadow-[0_2px_0_#0F0C0A]">💳</div>
                <div className="min-w-0 flex-1">
                  <div className="font-board text-xl leading-none text-ink">대출 상환</div>
                  <div className="mt-2 space-y-1 font-display text-[12px] font-extrabold tabular-nums text-ink/75">
                    <div className="flex justify-between"><span>원금</span><span>{fmt(repayInfo.principal)}만</span></div>
                    <div className="flex justify-between text-monopoly-red"><span>중도상환수수료 1%</span><span>+{fmt(repayInfo.fee)}만</span></div>
                    <div className="border-t border-ink-line/20 pt-1 flex justify-between text-[14px] text-ink"><span>총 상환액</span><span>{fmt(repayInfo.total)}만</span></div>
                  </div>
                  <div className="mt-2 text-xs font-bold text-ink/55">
                    {repayInfo.withinYear ? '1년 이내 상환분에 수수료 1%가 적용됩니다.' : '1년 경과 대출은 수수료 없이 상환됩니다.'}
                  </div>
                  {!canRepay && <div className="mt-1 text-xs font-extrabold text-monopoly-red">예금이 부족합니다.</div>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!canRepay}
                  onClick={() => repayAllLoans?.(playerId)}
                  className={cn(
                    'rounded-md border-2 border-ink-line px-3 py-2 font-board text-lg shadow-[0_3px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:shadow-none',
                    canRepay ? 'bg-[#0f8a5f] text-white' : 'bg-neutral-200 text-ink/35',
                  )}
                >
                  전액 상환
                </button>
                <button
                  type="button"
                  disabled={!canPartialRepay}
                  onClick={() => repayLoans?.(playerId, partialPrincipal)}
                  className={cn(
                    'rounded-md border-2 border-ink-line px-3 py-2 font-board text-lg shadow-[0_3px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:shadow-none',
                    canPartialRepay ? 'bg-monopoly-red text-white' : 'bg-neutral-200 text-ink/35',
                  )}
                >
                  부분 상환
                </button>
              </div>
              <div className={cn('mt-3 rounded-md border-2 p-2', partialPrincipal > 0 ? 'border-ink-line/50 bg-parchment-50' : 'border-ink-line/20 bg-neutral-100/70')}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-board text-base text-ink">부분상환 원금</span>
                  <span className="font-display text-[10px] font-bold text-ink/55">수수료 포함 {fmt(partialTotal)}만</span>
                </div>
                <input
                  value={partialAmount}
                  onChange={(event) => setPartialAmount(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="상환할 원금 입력"
                  className="w-full rounded-md border-2 border-ink-line bg-white px-3 py-2 text-right font-display text-lg font-extrabold tabular-nums text-ink outline-none"
                />
                {partialPrincipal > 0 && !canPartialRepay && (
                  <div className="mt-1 text-xs font-extrabold text-monopoly-red">부분상환 금액보다 예금이 부족합니다.</div>
                )}
              </div>
            </div>

            {(canCredit || canShark || !player.creditUsed || !player.loansharkUsed) && (
              <div className="rounded-xl border-2 border-ink-line bg-[#f8fbff] p-3 shadow-[0_3px_0_#0F0C0A]">
                <div className="mb-2 font-board text-lg leading-none text-ink">추가 대출 메뉴</div>
                <div className="grid gap-2">
                  {!player.creditUsed && (
                    <LoanChoice
                      emoji="🏦"
                      title="은행 신용대출"
                      subtitle={`최대 ${fmt(CREDIT_LIMIT)}만 · 자기 턴 이자 -${CREDIT_INTEREST_PER_TURN}만`}
                      detail={`조건: 예금 ${CREDIT_ELIGIBILITY_CASH}만 이하 · 게임 중 1회`}
                      enabled={canCredit}
                      disabledReason={creditReason || '신청 조건을 확인하세요.'}
                      buttonText="은행에서 빌리기"
                      compact
                      onClick={() => takeCreditLoan?.(playerId)}
                    />
                  )}
                  {!player.loansharkUsed && (
                    <LoanChoice
                      emoji="🦈"
                      title="사채업자"
                      subtitle={`최대 ${fmt(LOANSHARK_LIMIT)}만 · 자기 턴 이자 -${LOANSHARK_INTEREST_PER_TURN}만`}
                      detail="대출금이 있어도 추가 신청 가능 · 게임 중 1회"
                      enabled={canShark}
                      disabledReason="이미 사채를 사용했습니다."
                      buttonText="사채업자에게 빌리기"
                      danger
                      compact
                      onClick={() => takeLoanSharkLoan?.(playerId)}
                    />
                  )}
                </div>
              </div>
            )}
            </>
          ) : (
            <>
          <LoanChoice
            emoji="🏦"
            title="은행 신용대출"
            subtitle={`최대 ${fmt(CREDIT_LIMIT)}만 · 자기 턴 이자 -${CREDIT_INTEREST_PER_TURN}만`}
            detail={`조건: 예금 ${CREDIT_ELIGIBILITY_CASH}만 이하 · 게임 중 1회`}
            enabled={canCredit}
            disabledReason={creditReason || '신청 가능'}
            buttonText="은행에서 빌리기"
            onClick={() => takeCreditLoan?.(playerId)}
          />

          <LoanChoice
            emoji="🦈"
            title="사채업자"
            subtitle={`최대 ${fmt(LOANSHARK_LIMIT)}만 · 자기 턴 이자 -${LOANSHARK_INTEREST_PER_TURN}만`}
            detail="언제든 신청 가능 · 게임 중 1회 · 미납 시 위험"
            enabled={canShark}
            disabledReason="이미 사채를 사용했습니다."
            buttonText="사채업자에게 빌리기"
            danger
            onClick={() => takeLoanSharkLoan?.(playerId)}
          />
            </>
          )}
        </div>

        <div className="border-t-2 border-ink-line bg-parchment-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border-2 border-ink-line bg-white px-4 py-2 font-board text-lg text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none"
          >
            닫기
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

function LoanChoice({ emoji, title, subtitle, detail, enabled, disabledReason, buttonText, danger = false, compact = false, onClick }) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 border-ink-line shadow-[0_3px_0_#0F0C0A]',
        compact ? 'p-2.5' : 'p-3',
        enabled ? 'bg-white' : 'bg-neutral-100 opacity-55 grayscale',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('grid shrink-0 place-items-center rounded-full border-2 border-ink-line shadow-[0_2px_0_#0F0C0A]', compact ? 'h-10 w-10 text-xl' : 'h-12 w-12 text-2xl', danger ? 'bg-[#ffe1d7]' : 'bg-[#e8fff6]')}>
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-board text-xl leading-none text-ink">{title}</div>
          <div className="mt-1 font-display text-[11px] font-extrabold text-ink/70">{subtitle}</div>
          <div className="mt-1 text-xs font-bold text-ink/55">{detail}</div>
          {!enabled && <div className="mt-1 text-xs font-extrabold text-monopoly-red">{disabledReason}</div>}
        </div>
      </div>
      <button
        type="button"
        disabled={!enabled}
        onClick={onClick}
        className={cn(
          'mt-3 w-full rounded-md border-2 border-ink-line px-3 py-2 font-board text-lg shadow-[0_3px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:shadow-none',
          enabled
            ? danger ? 'bg-monopoly-red text-white' : 'bg-[#0f8a5f] text-white'
            : 'bg-neutral-200 text-ink/35',
        )}
      >
        {buttonText}
      </button>
    </div>
  );
}
