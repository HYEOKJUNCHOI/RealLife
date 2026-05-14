from pathlib import Path
p = Path('src/screens/GameMain.jsx')
s = p.read_text(encoding='utf-8')
# HostCapsule formatting cleanups
s = s.replace('<HostCapsule>결과는 뒤집기 전까지 비밀입니다</HostCapsule>', '        <HostCapsule>{flipped ? \'카드를 확인했습니다. 화면을 터치하면 진행합니다\' : \'결과는 뒤집기 전까지 비밀입니다\'}</HostCapsule>')
s = s.replace('<HostCapsule>세 숫자 중 하나만 맞히면 대박입니다 🎲</HostCapsule>', '        <HostCapsule>세 숫자 중 하나만 맞히면 대박입니다 🎲</HostCapsule>')
s = s.replace('<HostCapsule className="mb-[5px] max-w-[860px]">{hostText}</HostCapsule>', '          <HostCapsule className="mb-[5px] max-w-[860px]">{hostText}</HostCapsule>')
s = s.replace('<HostCapsule className="mb-0">자, 다음 플레이어 준비됐습니다!</HostCapsule>', '        <HostCapsule className="mb-0">자, 다음 플레이어 준비됐습니다!</HostCapsule>')
# Card reveal ratio and remove QA English label
s = s.replace('className="relative h-[250px] w-[180px] rounded-2xl [transform-style:preserve-3d]"', 'className="relative h-[240px] w-[180px] rounded-2xl [transform-style:preserve-3d]"')
s = s.replace('<div className="mt-3 font-display text-[8px] font-black uppercase tracking-[0.2em] text-white/58">tap to reveal</div>', '')
# Card reveal panel: stronger boundary, not glassy weak
s = s.replace('border border-white/30 bg-[linear-gradient(135deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.86)_70%,rgba(255,255,255,0.14)_100%)]', 'border-2 border-white/42 bg-[linear-gradient(135deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.88)_70%,rgba(255,255,255,0.16)_100%)]')
# Lotto main panel boundary
s = s.replace('rounded-[28px] border border-white/28 bg-[#19110c]/92 p-5', 'rounded-[28px] border-2 border-white/42 bg-[#19110c]/96 p-5')
# Global notice needs dim/blur board background but keep board visible behind
s = s.replace('className="pointer-events-auto fixed inset-0 flex items-center justify-center px-3"', 'className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/34 px-3 backdrop-blur-[2px]"', 1)
# Main alert boundary clearer
s = s.replace("'mx-auto grid w-full overflow-hidden rounded-[24px] border-[3px] border-ink-line p-3 text-center text-white shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46)] backdrop-blur-[1px]'", "'mx-auto grid w-full overflow-hidden rounded-[24px] border-[3px] border-ink-line p-3 text-center text-white shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46)]'")
# Initial deal intro use same host capsule and larger touch content
old = '''          <div className="w-[min(88vw,640px)] rounded-[28px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.84),rgba(16,185,129,0.42))] px-6 py-8 text-[#08372b] shadow-[0_18px_42px_-24px_rgba(6,95,70,0.72),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[16px] transition active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-xl text-white">🎙️</span>
            <div>
              <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-emerald-900/62">사회자</div>
              <div className="font-board text-[clamp(18px,2.4vw,25px)] font-extrabold leading-tight">자, 첫 출발은 권리증부터 나눠드릴게요 👀</div>
              
            </div>
          </div>
          </div>'''
new = '''          <div className="w-[min(88vw,680px)] rounded-[30px] border-2 border-emerald-200/85 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(16,185,129,0.48))] px-7 py-14 text-[#08372b] shadow-[0_18px_42px_-24px_rgba(6,95,70,0.72),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[16px] transition active:scale-[0.99]">
            <HostCapsule className="mb-0">자, 첫 출발은 권리증부터 나눠드릴게요 👀</HostCapsule>
          </div>'''
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
