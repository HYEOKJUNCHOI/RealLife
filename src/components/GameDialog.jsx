import { createContext, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn.js';

const GameDialogContext = createContext(null);

export function GameDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const api = useMemo(
    () => ({
      alert: ({ title = '알림', message, tone = 'info', okText = '확인', badgeText = null }) =>
        new Promise((resolve) => {
          setDialog({
            type: 'alert',
            title,
            message,
            tone,
            okText,
            badgeText,
            resolve: () => {
              setDialog(null);
              resolve(true);
            },
          });
        }),
      confirm: ({
        title = '확인',
        message,
        tone = 'warn',
        okText = '진행',
        cancelText = '취소',
        badgeText = null,
      }) =>
        new Promise((resolve) => {
          setDialog({
            type: 'confirm',
            title,
            message,
            tone,
            okText,
            cancelText,
            badgeText,
            resolve: (value) => {
              setDialog(null);
              resolve(value);
            },
          });
        }),
      jailTurn: ({
        title = '감옥 탈출 선택',
        badgeText = null,
        bailAmount = 200,
        canPayBail = true,
        onBail,
        onRoll,
      }) =>
        new Promise((resolve) => {
          setDialog({
            type: 'jailTurn',
            title,
            badgeText,
            bailAmount,
            canPayBail,
            onBail,
            onRoll,
            resolve: (value) => {
              setDialog(null);
              resolve(value);
            },
          });
        }),
      lottoTurn: ({
        title = '로또 찬스',
        badgeText = 'LOTTO',
        numbers = [],
        prize = 500,
        onRoll,
      }) =>
        new Promise((resolve) => {
          setDialog({
            type: 'lottoTurn',
            title,
            badgeText,
            numbers,
            prize,
            onRoll,
            resolve: (value) => {
              setDialog(null);
              resolve(value);
            },
          });
        }),
    }),
    [],
  );

  return (
    <GameDialogContext.Provider value={api}>
      {children}
      <GameDialog dialog={dialog} />
    </GameDialogContext.Provider>
  );
}

export function useGameDialog() {
  const dialog = useContext(GameDialogContext);
  if (!dialog) throw new Error('useGameDialog must be used inside GameDialogProvider');
  return dialog;
}

function GameDialog({ dialog }) {
  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
          style={{ touchAction: 'none' }}
          onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 22, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative w-full max-w-[520px] overflow-hidden rounded-lg border-[3px] border-[#17120c] bg-[#fffdf5] p-5 shadow-[0_8px_0_#17120c,0_0_0_6px_rgba(64,152,211,0.22),0_22px_60px_rgba(0,0,0,0.42)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={cn(
                'absolute inset-x-0 top-0 h-2',
                dialog.tone === 'success'
                  ? 'bg-[#0b7d5a]'
                  : dialog.tone === 'danger'
                    ? 'bg-[#b91c1c]'
                    : dialog.tone === 'warn'
                      ? 'bg-[#d2ad50]'
                      : 'bg-[#2f75c9]',
              )}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,220,130,0.36),transparent_34%)]" />

            <div className="relative">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0f0c0a] bg-[#df2f35] font-board text-2xl text-white shadow-[0_3px_0_#0f0c0a]">
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[#0b7d5a]">
                    The RealLife
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <h2 className="font-board text-3xl leading-none text-[#160f0a]">
                      {dialog.title}
                    </h2>
                    {dialog.badgeText && (
                      <span className="inline-flex rounded-full border-2 border-[#0f0c0a] bg-[#df2f35] px-3 py-1 font-display text-[12px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_2px_0_#0f0c0a]">
                        {dialog.badgeText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {dialog.type === 'jailTurn' ? (
                <JailTurnDialog dialog={dialog} />
              ) : dialog.type === 'lottoTurn' ? (
                <LottoTurnDialog dialog={dialog} />
              ) : (
                <>
                  <div className={cn('rounded-md border-2 border-[#d8c9a9] bg-[#fff8e8] px-4 py-4 text-lg font-bold leading-relaxed text-[#2a2119]', typeof dialog.message === 'string' && 'whitespace-pre-line')}>
                    {dialog.message}
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    {dialog.type === 'confirm' && (
                      <button
                        type="button"
                        onClick={() => dialog.resolve(false)}
                        className="rounded-md border-2 border-[#0f0c0a] bg-[#efe2c5] px-5 py-2 font-board text-xl text-[#5f5343] shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none"
                      >
                        {dialog.cancelText}
                      </button>
                    )}
                    <button
                      type="button"
                      autoFocus
                      onClick={() => dialog.resolve(true)}
                      className="rounded-md border-2 border-[#0f0c0a] bg-[#df2f35] px-6 py-2 font-board text-xl text-white shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none"
                    >
                      {dialog.okText}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function JailTurnDialog({ dialog }) {
  const [stage, setStage] = useState('choice');
  const [dice, setDice] = useState({ d1: 1, d2: 1, rolling: false });
  const [result, setResult] = useState(null);
  const locked = stage === 'rolling' || stage === 'result';
  const bailAmount = dialog.bailAmount ?? 200;

  const finish = (nextResult) => {
    const safeResult = nextResult ?? { title: '감옥 처리 완료', text: '이번 차례를 종료합니다.', icon: '🚓' };
    setResult(safeResult);
    if (safeResult.d1 && safeResult.d2) setDice({ d1: safeResult.d1, d2: safeResult.d2, rolling: false });
    setStage('result');
  };

  const handleBail = () => {
    if (locked || !dialog.canPayBail) return;
    finish(dialog.onBail?.());
  };

  const handleRoll = () => {
    if (locked) return;
    setStage('rolling');
    setDice({ d1: 1, d2: 1, rolling: true });
    const nextResult = dialog.onRoll?.();
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      setDice({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6), rolling: true });
      if (ticks >= 10) {
        window.clearInterval(timer);
        finish(nextResult);
      }
    }, 85);
  };

  return (
    <div className="rounded-md border-2 border-[#d8c9a9] bg-[#fff8e8] px-4 py-4 text-lg font-bold leading-relaxed text-[#2a2119]">
      <div className="space-y-3 font-board leading-tight">
        <div>
          보석금은 <span className="rounded-md border-2 border-[#17120c] bg-[#df2f35] px-2 py-0.5 text-white shadow-[0_2px_0_#0F0C0A]">{bailAmount}만</span>입니다.
        </div>
        <div className="grid gap-2 text-[17px]">
          <div className="rounded-lg border-2 border-emerald-800 bg-emerald-50 px-3 py-2 text-emerald-900 shadow-[0_2px_0_rgba(15,12,10,0.35)]">
            보석금을 내면 <b className="text-emerald-700">바로 탈출</b>합니다.
          </div>
          <div className="rounded-lg border-2 border-amber-700 bg-amber-50 px-3 py-2 text-amber-950 shadow-[0_2px_0_rgba(15,12,10,0.35)]">
            주사위는 <b className="text-[#b45309]">더블</b>이 나와야 탈출합니다.
          </div>
        </div>
      </div>

      {(stage === 'rolling' || stage === 'result') && (
        <div className="mt-4 rounded-xl border-2 border-[#17120c] bg-white/88 px-3 py-3 text-center shadow-[0_3px_0_#0F0C0A]">
          <div className="mb-2 font-board text-[15px] text-[#5f5343]">감옥 탈출 주사위</div>
          <div className="flex items-center justify-center gap-3 [perspective:760px]">
            <DialogDiceFace value={dice.d1} rolling={dice.rolling} />
            <span className="font-display text-2xl font-black text-[#17120c]">+</span>
            <DialogDiceFace value={dice.d2} rolling={dice.rolling} />
          </div>
        </div>
      )}

      {stage === 'result' && result && (
        <div className={cn('mt-4 rounded-xl border-2 px-4 py-3 text-center shadow-[0_3px_0_#0F0C0A]', result.released ? 'border-emerald-800 bg-emerald-50 text-emerald-950' : 'border-rose-900 bg-rose-50 text-rose-950')}>
          <div className="font-board text-2xl leading-none">{result.icon} {result.title}</div>
          <div className="mt-2 text-[16px] leading-tight">{result.text}</div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        {stage === 'result' ? (
          <button type="button" autoFocus onClick={() => dialog.resolve(true)} className="rounded-md border-2 border-[#0f0c0a] bg-[#df2f35] px-6 py-2 font-board text-xl text-white shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none">
            턴종료
          </button>
        ) : (
          <>
            <button type="button" onClick={handleRoll} disabled={locked} className="rounded-md border-2 border-[#0f0c0a] bg-[#efe2c5] px-5 py-2 font-board text-xl text-[#5f5343] shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none disabled:opacity-50">
              주사위 굴리기
            </button>
            <button type="button" autoFocus onClick={handleBail} disabled={locked || !dialog.canPayBail} className="rounded-md border-2 border-[#0f0c0a] bg-[#df2f35] px-6 py-2 font-board text-xl text-white shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45">
              {dialog.canPayBail ? `${bailAmount}만 내기` : '보석금 부족'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LottoTurnDialog({ dialog }) {
  const [stage, setStage] = useState('ready');
  const [dice, setDice] = useState({ d1: 1, d2: 1, rolling: false });
  const [result, setResult] = useState(null);
  const numbers = Array.isArray(dialog.numbers) ? dialog.numbers : [];
  const prize = dialog.prize ?? 500;
  const rolling = stage === 'rolling';

  const handleRoll = () => {
    if (rolling || stage === 'result') return;
    setStage('rolling');
    setDice({ d1: 1, d2: 1, rolling: true });
    const nextResult = dialog.onRoll?.() ?? { d1: 1, d2: 1, sum: 2, hit: false, prize };
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks += 1;
      setDice({ d1: 1 + Math.floor(Math.random() * 6), d2: 1 + Math.floor(Math.random() * 6), rolling: true });
      if (ticks >= 12) {
        window.clearInterval(timer);
        setDice({ d1: nextResult.d1, d2: nextResult.d2, rolling: false });
        setResult(nextResult);
        setStage('result');
      }
    }, 82);
  };

  return (
    <div className="rounded-md border-2 border-[#d8c9a9] bg-[#fff8e8] px-4 py-4 text-lg font-bold leading-relaxed text-[#2a2119]">
      <div className="rounded-xl border-2 border-[#17120c] bg-[linear-gradient(135deg,#fff7df_0%,#fef3c7_55%,#fde68a_100%)] px-4 py-3 text-center shadow-[0_3px_0_#0F0C0A]">
        <div className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-[#8a5a0a]">winning numbers</div>
        <div className="mt-2 flex justify-center gap-2">
          {numbers.map((num) => (
            <span key={num} className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#17120c] bg-[#df2f35] font-display text-[22px] font-black text-white shadow-[0_3px_0_#0F0C0A]">
              {num}
            </span>
          ))}
        </div>
        <div className="mt-3 font-board text-[16px] leading-tight text-[#4b3510]">
          추가 주사위 합이 당첨 숫자와 같으면 <b className="text-emerald-700">+{prize}만</b>!
        </div>
      </div>

      {(stage === 'rolling' || stage === 'result') && (
        <div className="mt-4 rounded-xl border-2 border-[#17120c] bg-white/88 px-3 py-3 text-center shadow-[0_3px_0_#0F0C0A]">
          <div className="mb-2 font-board text-[15px] text-[#5f5343]">로또 찬스 주사위</div>
          <div className="flex items-center justify-center gap-3 [perspective:760px]">
            <DialogDiceFace value={dice.d1} rolling={dice.rolling} />
            <span className="font-display text-2xl font-black text-[#17120c]">+</span>
            <DialogDiceFace value={dice.d2} rolling={dice.rolling} />
            <span className="font-display text-2xl font-black text-[#17120c]">=</span>
            <span className="grid h-14 min-w-14 place-items-center rounded-xl border-2 border-[#17120c] bg-[#fff7df] px-3 font-display text-2xl font-black text-[#17120c] shadow-[0_3px_0_#0F0C0A]">{dice.rolling ? '?' : result?.sum ?? '?'}</span>
          </div>
        </div>
      )}

      {stage === 'result' && result && (
        <div className={cn('mt-4 rounded-xl border-2 px-4 py-3 text-center shadow-[0_3px_0_#0F0C0A]', result.hit ? 'border-emerald-800 bg-emerald-50 text-emerald-950' : 'border-rose-900 bg-rose-50 text-rose-950')}>
          <div className="font-board text-2xl leading-none">{result.hit ? '🎉 당첨!' : '😢 아쉽게 실패'}</div>
          <div className="mt-2 text-[16px] leading-tight">
            추가 주사위 합 {result.sum} {result.hit ? `적중! ${result.prize ?? prize}만을 받습니다.` : '이번엔 당첨 숫자가 아니었습니다.'}
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        {stage === 'result' ? (
          <button type="button" autoFocus onClick={() => dialog.resolve(result)} className="rounded-md border-2 border-[#0f0c0a] bg-[#df2f35] px-6 py-2 font-board text-xl text-white shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none">
            확인
          </button>
        ) : (
          <button type="button" autoFocus onClick={handleRoll} disabled={rolling} className="rounded-md border-2 border-[#0f0c0a] bg-[#efe2c5] px-6 py-2 font-board text-xl text-[#5f5343] shadow-[0_4px_0_#0f0c0a] transition active:translate-y-1 active:shadow-none disabled:opacity-50">
            주사위 굴리기
          </button>
        )}
      </div>
    </div>
  );
}

function DialogDiceFace({ value = 1, rolling = false }) {
  const safeValue = Math.max(1, Math.min(6, value));
  return (
    <motion.img
      key={`${safeValue}-${rolling ? 'rolling' : 'fixed'}`}
      src={`/ui/dice-face-${safeValue}.svg`}
      alt={`${safeValue}`}
      draggable={false}
      className="h-16 w-16 select-none object-contain drop-shadow-[0_5px_0_rgba(15,12,10,0.78)]"
      animate={rolling ? { rotateX: [0, 180, 360], rotateZ: [-10, 14, -8], y: [0, -8, 0] } : { rotateX: 0, rotateZ: 0, y: 0 }}
      transition={rolling ? { duration: 0.22, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.18 }}
    />
  );
}
