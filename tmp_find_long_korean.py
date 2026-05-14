import re
from pathlib import Path
for path in list(Path('src').rglob('*.jsx'))+list(Path('src').rglob('*.js')):
    s=path.read_text(encoding='utf-8')
    for m in re.finditer(r"'([^'\\]*(?:\\.[^'\\]*)*)'|\"([^\"\\]*(?:\\.[^\"\\]*)*)\"|`([^`\\]*(?:\\.[^`\\]*)*)`", s):
        txt=next(g for g in m.groups() if g is not None)
        if re.search(r'[가-힣]', txt) and len(txt.replace('\\n',''))>=20 and '<br' not in txt and '\\n' not in txt:
            line=s[:m.start()].count('\n')+1
            print(f"{path}:{line}: {txt[:120]}")
