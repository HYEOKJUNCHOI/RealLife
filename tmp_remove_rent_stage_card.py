from pathlib import Path
p = Path('src/components/CurrentPlayerStage.jsx')
s = p.read_text(encoding='utf-8')
start = s.index("      ) : isRent ? (")
end = s.index("      ) : showNumberPad ? (", start)
s = s[:start] + "      ) : showNumberPad ? (" + s[end + len("      ) : showNumberPad ? ("):]
s = s.replace("  const isAction = result?.kind === 'buy' || result?.kind === 'card' || result?.kind === 'rent';\n", "")
s = s.replace("  const isRent = result?.kind === 'rent';\n", "")
p.write_text(s, encoding='utf-8')
