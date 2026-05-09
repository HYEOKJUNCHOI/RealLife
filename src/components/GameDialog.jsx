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

              <p className="whitespace-pre-line rounded-md border-2 border-[#d8c9a9] bg-[#fff8e8] px-4 py-4 text-lg font-bold leading-relaxed text-[#2a2119]">
                {dialog.message}
              </p>

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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
