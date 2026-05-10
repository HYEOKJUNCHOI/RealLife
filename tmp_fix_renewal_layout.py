from pathlib import Path
p = Path('src/screens/GameMain.jsx')
s = p.read_text(encoding='utf-8')
s = s.replace("import { cn } from '@/lib/cn.js';", "import { cn } from '@/lib/cn.js';\nimport { getCharacterImg } from '@/lib/assets.js';")
s = s.replace("  const meta = CHAR_META[player.character] ?? { name: `${index + 1}P`, color: '#d83b2f', emoji: '🎭' };\n  const name = displayPlayerName(player, meta.name ?? `${index + 1}P`);", "  const meta = CHAR_META[player.character] ?? { name: `${index + 1}P`, color: '#d83b2f', emoji: '🎭' };\n  const characterImg = getCharacterImg(player.character);\n  const name = displayPlayerName(player, meta.name ?? `${index + 1}P`);")
s = s.replace('''    <section className="relative grid h-full w-full grid-cols-[250px_minmax(0,1fr)_270px] grid-rows-[1fr_126px] gap-2 overflow-hidden rounded-[22px] border-[3px] border-[#17120c] bg-[#09131f] p-2 shadow-[0_8px_0_#17120c,0_26px_60px_-32px_rgba(0,0,0,0.95)]">''', '''    <section className="relative grid h-full w-full grid-cols-[220px_minmax(0,1fr)_246px] grid-rows-[minmax(0,1fr)_104px] gap-1.5 overflow-hidden rounded-[18px] border-2 border-[#17120c] bg-[#09131f] p-1.5 shadow-[0_6px_0_#17120c,0_22px_50px_-34px_rgba(0,0,0,0.95)]">''')
s = s.replace('''      <aside className="relative z-10 flex min-h-0 flex-col gap-2 rounded-2xl border-2 border-white/16 bg-white/9 p-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[10px]">
        <div className="rounded-xl border-2 border-white/18 bg-black/24 p-3">
          <div className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-white/48">current player</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-white/55 text-3xl shadow-[0_4px_0_#0F0C0A]" style={{ background: `linear-gradient(135deg, ${meta.color} 0%, rgba(255,255,255,0.18) 100%)` }}>{meta.emoji ?? '🎭'}</div>''', '''      <aside className="relative z-10 flex min-h-0 flex-col gap-1.5 rounded-2xl border border-white/14 bg-white/8 p-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[10px]">
        <div className="rounded-xl border border-white/16 bg-black/24 p-2.5">
          <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/48">current player</div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="relative grid h-[74px] w-[74px] shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/48 bg-white/10 text-3xl shadow-[0_4px_0_#0F0C0A]" style={{ backgroundColor: `${meta.color}22` }}>
              {characterImg ? <img src={characterImg} alt="" className="h-full w-full scale-125 object-cover object-top" draggable={false} /> : (meta.emoji ?? '🎭')}
              <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),inset_0_-20px_30px_rgba(0,0,0,0.2)]" />
            </div>''')
s = s.replace('truncate font-board text-[28px] leading-none', 'truncate font-board text-[25px] leading-none')
s = s.replace('font-display text-[10px] font-black uppercase tracking-[0.18em] text-white/50', 'font-display text-[9px] font-black uppercase tracking-[0.18em] text-white/50')
s = s.replace('mt-3 grid grid-cols-2 gap-2 font-board', 'mt-2 grid grid-cols-2 gap-1.5 font-board')
s = s.replace('rounded-lg border border-emerald-200/30 bg-emerald-300/12 px-2 py-2', 'rounded-lg border border-emerald-200/25 bg-emerald-300/10 px-2 py-1.5')
s = s.replace('rounded-lg border border-red-200/30 bg-red-300/12 px-2 py-2', 'rounded-lg border border-red-200/25 bg-red-300/10 px-2 py-1.5')
s = s.replace('text-[22px] text-emerald-200', 'text-[20px] text-emerald-200')
s = s.replace('text-[22px] text-red-200', 'text-[20px] text-red-200')
s = s.replace('''        <div className="min-h-0 flex-1 rounded-xl border-2 border-white/14 bg-[#fff7df] p-2 text-ink shadow-[0_4px_0_#0F0C0A]">''', '''        <div className="min-h-0 flex-1 rounded-xl border border-white/14 bg-[#fff7df] p-1.5 text-ink shadow-[0_3px_0_#0F0C0A]">''')
s = s.replace('''      <main className="relative z-10 min-h-0 overflow-hidden rounded-2xl border-2 border-white/16 bg-[radial-gradient(circle_at_50%_45%,#214b3b_0%,#143427_52%,#091c18_100%)] p-3 shadow-[inset_0_0_0_5px_rgba(255,255,255,0.06),0_4px_0_#0F0C0A]">''', '''      <main className="relative z-10 min-h-0 overflow-hidden rounded-2xl border border-white/14 bg-[radial-gradient(circle_at_50%_45%,#214b3b_0%,#143427_52%,#091c18_100%)] p-2 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.05),0_3px_0_#0F0C0A]">''')
s = s.replace('''        <div className="absolute left-4 top-4 z-20 rounded-full border border-white/22 bg-black/42 px-4 py-2 font-display text-[10px] font-black uppercase tracking-[0.24em] text-white/70 backdrop-blur">board cinema</div>
        <div className="absolute right-4 top-4 z-20 rounded-full border border-yellow-200/35 bg-yellow-300/12 px-4 py-2 font-board text-[16px] text-yellow-100 shadow-[0_2px_0_#0F0C0A]">{activeName}</div>
        <div className="mx-auto grid h-full max-h-full aspect-square grid-cols-11 grid-rows-11 gap-1 rounded-[24px] border-[4px] border-[#17120c] bg-[#4e8b62] p-2 shadow-[inset_0_0_0_5px_rgba(255,255,255,0.12),0_16px_42px_rgba(0,0,0,0.35)]">''', '''        <div className="absolute left-3 top-3 z-20 rounded-full border border-white/18 bg-black/38 px-3 py-1.5 font-display text-[9px] font-black uppercase tracking-[0.22em] text-white/62 backdrop-blur">board</div>
        <div className="absolute right-3 top-3 z-20 rounded-full border border-white/18 bg-black/38 px-3 py-1.5 font-board text-[15px] text-white/82 shadow-[0_2px_0_#0F0C0A]">{activeName}</div>
        <div className="mx-auto grid h-full max-h-full max-w-full aspect-square grid-cols-11 grid-rows-11 gap-0.5 rounded-[18px] border-[3px] border-[#17120c] bg-[#4e8b62] p-1.5 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.1),0_14px_34px_rgba(0,0,0,0.32)]">''')
s = s.replace("className={cn('relative overflow-hidden rounded-lg border-2 border-[#17120c] bg-[#fff7df] p-1 text-center shadow-[0_2px_0_rgba(0,0,0,0.5)]', isHere && 'ring-4 ring-yellow-300 ring-offset-2 ring-offset-[#4e8b62]')}", "className={cn('relative overflow-hidden rounded-md border border-[#17120c] bg-[#fff7df] p-0.5 text-center shadow-[0_1px_0_rgba(0,0,0,0.45)]', isHere && 'ring-2 ring-white ring-offset-2 ring-offset-[#4e8b62]')}")
s = s.replace('''                {isHere && <motion.div className="absolute inset-0 rounded-lg border-[3px] border-yellow-300" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity }} />}
                {isHere && <div className="absolute bottom-1 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-white text-[12px] font-black text-white shadow-[0_2px_0_#0F0C0A]" style={{ backgroundColor: meta.color }}>{index + 1}</div>}''', '''                {isHere && <motion.div className="absolute inset-0 rounded-md border-2 border-white" animate={{ opacity: [0.28, 0.85, 0.28] }} transition={{ duration: 1.1, repeat: Infinity }} />}
                {isHere && <div className="absolute bottom-0.5 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center overflow-hidden rounded-full border-2 border-white bg-black/20 text-[12px] font-black text-white shadow-[0_2px_0_#0F0C0A]" style={{ backgroundColor: characterImg ? '#fffaf0' : meta.color }}>
                  {characterImg ? <img src={characterImg} alt="" className="h-full w-full scale-125 object-cover object-top" draggable={false} /> : index + 1}
                </div>''')
s = s.replace('''          <div className="col-start-3 col-end-10 row-start-3 row-end-10 grid place-items-center rounded-[24px] border-[4px] border-[#17120c] bg-[radial-gradient(circle_at_50%_35%,#fff7df_0%,#e2bd66_52%,#93652d_100%)] p-4 text-center shadow-[inset_0_4px_0_rgba(255,255,255,0.55)]">
            <div>
              <div className="font-display text-[12px] font-black uppercase tracking-[0.32em] text-ink/42">The RealLife</div>
              <div className="mt-2 font-board text-[44px] leading-none text-ink">한 턴 더</div>
              <div className="mt-2 font-board text-[18px] text-ink/60">{prompt}</div>
            </div>
          </div>''', '''          <div className="col-start-3 col-end-10 row-start-3 row-end-10 grid place-items-center rounded-[18px] border-2 border-white/18 bg-[linear-gradient(135deg,rgba(7,18,24,0.72),rgba(19,48,42,0.64))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[1px]">
            <div className="max-w-[80%]">
              <div className="font-display text-[10px] font-black uppercase tracking-[0.28em] text-white/42">economy board</div>
              <div className="mt-2 font-board text-[34px] leading-none text-white">{name}의 차례</div>
              <div className="mt-2 font-board text-[16px] leading-snug text-white/64">{prompt}</div>
            </div>
          </div>''')
s = s.replace('''      <aside className="relative z-10 flex min-h-0 flex-col gap-2 rounded-2xl border-2 border-white/16 bg-white/9 p-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-[10px]">''', '''      <aside className="relative z-10 flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-white/14 bg-white/8 p-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[10px] no-scrollbar">''', 1)
s = s.replace('''      <div className="relative z-10 col-span-3 grid grid-cols-[1fr_190px_190px_190px] items-center gap-3 rounded-2xl border-2 border-white/16 bg-black/34 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px]">''', '''      <div className="relative z-10 col-span-3 grid grid-cols-[1fr_150px_170px_170px] items-center gap-2 rounded-2xl border border-white/14 bg-black/34 p-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px]">''')
s = s.replace('h-[70px]', 'h-[60px]')
s = s.replace('font-board text-[26px] text-ink', 'font-board text-[23px] text-ink')
p.write_text(s, encoding='utf-8')
