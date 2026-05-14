from pathlib import Path

p = Path('src/screens/GameMain.jsx')
s = p.read_text(encoding='utf-8')
s = s.replace('<div className="font-display text-[8px] font-black uppercase tracking-[0.24em] text-emerald-900/48">사회자 멘트창</div>\n          ', '')
s = s.replace('<div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-ink/45">메인 알림창</div>\n            ', '')
s = s.replace('            <div className="mt-2 font-board text-[13px] text-ink/45">터치하면 닫힘 · 뒤 화면 클릭은 반응하지 않음</div>\n', '')
s = s.replace('        {flipped && <div className="mt-3 font-board text-[15px] text-white/62">아무 곳이나 터치하면 정산을 진행합니다</div>}\n', '')
s = s.replace('<div className="mt-1 font-display text-[8px] font-black uppercase tracking-[0.18em] text-ink/44">터치하면 닫기</div>', '')
s = s.replace("{notice.cta ?? 'tap to close'}", "{notice.cta ?? ''}")
s = s.replace('<div className="mt-1 font-board text-[14px] font-extrabold text-emerald-950/54">터치하면 내 첫 권리증이 펼쳐집니다</div>', '')
p.write_text(s, encoding='utf-8')

p = Path('src/components/CurrentPlayerStage.jsx')
s = p.read_text(encoding='utf-8')
s = s.replace("{cardFlipped ? '카드 확인 · 정산 공개 (터치하면 닫고 진행)' : '먼저 카드를 뒤집어주세요'}", "{cardFlipped ? '카드 확인 · 정산 공개' : '먼저 카드를 뒤집어주세요'}")
p.write_text(s, encoding='utf-8')
