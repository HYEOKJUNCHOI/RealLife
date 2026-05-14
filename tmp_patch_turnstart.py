from pathlib import Path
p=Path('src/screens/GameMain.jsx')
s=p.read_text(encoding='utf-8')
start=s.index('function TurnStartOverlay')
end=s.index('\nfunction InitialDealOverlay', start)
new='''function TurnStartOverlay({ player, meta, onDismiss }) {
  if (!player || typeof document === 'undefined') return null;
  const name = displayPlayerName(player, meta?.name ?? player.character ?? '플레이어');
  const img = getCharacterImg(player.character);
  const color = meta?.color ?? '#d83b2f';
  const layer = (
    <div
      className="fixed inset-0 z-[2147483100] flex items-center justify-center bg-black/18 px-4"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); onDismiss?.(); }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="pointer-events-none flex max-w-[min(88vw,620px)] flex-col items-center gap-2 text-center"
      >
        <div className="rounded-[18px] border border-emerald-200/75 bg-[linear-gradient(180deg,rgba(236,253,245,0.82),rgba(16,185,129,0.36))] px-4 py-2 text-[#08372b] shadow-[0_12px_28px_-22px_rgba(6,95,70,0.78),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-[16px]">
          <div className="font-display text-[8px] font-black uppercase tracking-[0.24em] text-emerald-900/48">사회자 멘트창</div>
          <div className="mt-0.5 font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight">이제 {name} 님의 차례입니다.</div>
        </div>
        <div className="grid w-full max-w-[540px] grid-cols-[88px_1fr] items-center gap-4 rounded-[26px] border-[3px] border-ink-line bg-[linear-gradient(135deg,#fff_0%,#f4fff9_55%,#e5f6ff_100%)] p-4 text-left text-ink shadow-[0_7px_0_#0F0C0A,0_24px_70px_rgba(0,0,0,0.34)]">
          <div className="relative h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-white bg-white/70 shadow-[0_4px_0_#0F0C0A]" style={{ backgroundImage: img ? `url(${img})` : undefined, backgroundSize: AVATAR_SIZE[player.character] ?? '155%', backgroundPosition: AVATAR_POSITION[player.character] ?? 'center 24%', backgroundRepeat: 'no-repeat', backgroundColor: `${color}22` }}>
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[18px] shadow-[0_2px_0_#0F0C0A]">🎲</span>
          </div>
          <div className="min-w-0">
            <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-ink/45">메인 알림창</div>
            <div className="mt-1 font-board text-[clamp(25px,4.8vw,43px)] font-extrabold leading-[0.95]" style={{ color }}>{name} 님의 차례입니다.</div>
            <div className="mt-2 font-board text-[clamp(16px,2.8vw,25px)] font-extrabold leading-tight text-ink/78">주사위를 굴려주세요 🎲</div>
            <div className="mt-2 font-board text-[13px] text-ink/45">터치하면 닫힘 · 뒤 화면 클릭은 반응하지 않음</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
  return createPortal(layer, document.body);
}
'''
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')
