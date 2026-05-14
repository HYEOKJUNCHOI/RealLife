from pathlib import Path
p=Path('src/screens/GameMain.jsx')
s=p.read_text(encoding='utf-8')
start=s.index('function LottoChallengeOverlay')
end=s.index('\nfunction PropertyShatterOverlay', start)
new='''function LottoChallengeOverlay({ challenge, onRoll, onDone }) {
  if (!challenge || typeof document === 'undefined') return null;
  const result = challenge.result;
  const layer = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/46 px-4 backdrop-blur-[2px]"
      style={{ zIndex: 2147483300, touchAction: 'none' }}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="w-full max-w-[380px] text-center text-white">
        <div className="mb-2 rounded-[18px] border border-yellow-200/50 bg-[linear-gradient(180deg,rgba(255,251,235,0.22),rgba(250,204,21,0.14))] px-4 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-[12px]">
          <div className="font-display text-[8px] font-black uppercase tracking-[0.24em] text-yellow-100/62">사회자</div>
          <div className="mt-0.5 font-board text-[17px] font-extrabold text-yellow-50/90">세 숫자 중 하나만 맞히면 대박입니다 🎲</div>
        </div>
        <div className="rounded-[28px] border border-white/28 bg-[#19110c]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="font-display text-[10px] font-black uppercase tracking-[0.25em] text-white/58">Lotto Chance</div>
          <div className="mt-2 font-board text-[34px] leading-none">로또 숫자</div>
          <div className="mt-4 flex justify-center gap-2">
            {(challenge.numbers ?? []).map((num) => (
              <div key={num} className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-yellow-300 font-board text-[27px] text-ink shadow-[0_5px_0_#7c4a03]">{num}</div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/16 bg-white/10 px-3 py-3 font-board text-[17px] leading-snug text-white/86">
            {result
              ? `추가 주사위 ${result.d1}➕${result.d2}=${result.sum} · ${result.hit ? `당첨! +${challenge.prize}만` : '아쉽게 실패'}`
              : `주사위 한 번 더! 합이 위 숫자 중 하나면 ${challenge.prize}만원 지급`}
          </div>
          {!result ? (
            <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRoll?.(); }} className="mt-4 h-12 w-full rounded-2xl border border-white/30 bg-white text-ink font-board text-[20px] shadow-[0_5px_0_#9b7a42] active:translate-y-0.5 active:shadow-none">
              🎲 추가 주사위 굴리기
            </button>
          ) : (
            <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDone?.(); }} className="mt-4 h-12 w-full rounded-2xl border border-white/30 bg-white/18 font-board text-[20px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] active:translate-y-0.5">
              확인하고 차례 넘기기
            </button>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(layer, document.body);
}
'''
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')
