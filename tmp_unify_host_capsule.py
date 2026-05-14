from pathlib import Path
p = Path('src/screens/GameMain.jsx')
s = p.read_text(encoding='utf-8')
insert = r'''
function HostCapsule({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={cn('mb-2 inline-flex max-w-full items-center justify-center gap-2 rounded-[18px] border border-emerald-200/75 bg-[linear-gradient(180deg,rgba(236,253,245,0.86),rgba(16,185,129,0.42))] px-4 py-2 text-center text-[#08372b] shadow-[0_12px_28px_-22px_rgba(6,95,70,0.78),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-[16px]', className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_2px_0_#0F0C0A]">🎙️</span>
      <span className="font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>{children}</span>
    </div>
  );
}
'''
marker = 'const CARD_REVEAL_TONE = {'
s = s.replace(marker, insert + '\n' + marker)
# CardReveal host capsule
old = '''        <div className="mb-2 rounded-[18px] border border-white/25 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] px-4 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-[12px]">
          <div className="font-display text-[8px] font-black uppercase tracking-[0.24em] text-white/50">사회자</div>
          <div className="mt-0.5 font-board text-[17px] font-extrabold text-white/82">결과는 뒤집기 전까지 비밀입니다</div>
        </div>'''
s = s.replace(old, '<HostCapsule>결과는 뒤집기 전까지 비밀입니다</HostCapsule>')
# Lotto host capsule
old = '''        <div className="mb-2 rounded-[18px] border border-yellow-200/50 bg-[linear-gradient(180deg,rgba(255,251,235,0.22),rgba(250,204,21,0.14))] px-4 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-[12px]">
          <div className="font-display text-[8px] font-black uppercase tracking-[0.24em] text-yellow-100/62">사회자</div>
          <div className="mt-0.5 font-board text-[17px] font-extrabold text-yellow-50/90">세 숫자 중 하나만 맞히면 대박입니다 🎲</div>
        </div>'''
s = s.replace(old, '<HostCapsule>세 숫자 중 하나만 맞히면 대박입니다 🎲</HostCapsule>')
# GlobalNotice host capsule
old = '''          <div className="mb-[5px] flex max-w-[860px] items-center justify-center gap-2 rounded-[18px] border border-emerald-200/75 bg-[linear-gradient(180deg,rgba(236,253,245,0.78),rgba(16,185,129,0.34))] px-4 py-2 text-center text-[#08372b] shadow-[0_12px_28px_-22px_rgba(6,95,70,0.78),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-[16px]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">🎙️</span>
            <span className="font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>{hostText}</span>
          </div>'''
s = s.replace(old, '<HostCapsule className="mb-[5px] max-w-[860px]">{hostText}</HostCapsule>')
# TurnStart host capsule
old = '''        <div className="inline-flex max-w-full items-center justify-center gap-2 rounded-[18px] border border-emerald-200/75 bg-[linear-gradient(180deg,rgba(236,253,245,0.86),rgba(16,185,129,0.42))] px-4 py-2 text-[#08372b] shadow-[0_12px_28px_-22px_rgba(6,95,70,0.78),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-[16px]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_2px_0_#0F0C0A]">🎙️</span>
          <div className="whitespace-nowrap font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight">자, 다음 플레이어 준비됐습니다!</div>
        </div>'''
s = s.replace(old, '<HostCapsule className="mb-0">자, 다음 플레이어 준비됐습니다!</HostCapsule>')
# Initial deal host capsule (keep inside layout but same style)
old = '''          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-xl text-white">🎙️</span>
            <div>
              <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-emerald-900/62">사회자</div>
              <div className="font-board text-[clamp(18px,2.4vw,25px)] font-extrabold leading-tight">자, 첫 출발은 권리증부터 나눠드릴게요 🎁</div>
              
            </div>
          </div>'''
s = s.replace(old, '<HostCapsule className="mb-0">자, 첫 출발은 권리증부터 나눠드릴게요 🎁</HostCapsule>')
p.write_text(s, encoding='utf-8')
