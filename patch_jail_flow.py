from pathlib import Path
import re

p = Path('src/engine/rules.js')
s = p.read_text(encoding='utf-8')
s = s.replace("""    log.push({ kind: 'jail_turn', ...out });
    if (!out.released) {
      advanceTurn(state, rng, log);
      return { events: log };
    }""", """    log.push({ kind: 'jail_turn', d1: dice.d1, d2: dice.d2, sum: dice.sum, isDouble: dice.isDouble, choice: jailChoice, ...out });
    if (!out.released) {
      if (!turnOptions.deferAdvance) advanceTurn(state, rng, log);
      return { events: log };
    }""")
s = s.replace("""    advanceTurn(state, rng, log);
    return { events: log };
  }

  // 정상 턴""", """    if (!turnOptions.deferAdvance) advanceTurn(state, rng, log);
    return { events: log };
  }

  // 정상 턴""", 1)
p.write_text(s, encoding='utf-8')

p = Path('src/screens/GameMain.jsx')
s = p.read_text(encoding='utf-8')
new = r'''  const showJailTurnResult = (events, choice) => {
    const jail = events.find((event) => event.kind === 'jail_turn');
    if (!jail) return;
    const diceText = jail.d1 != null && jail.d2 != null ? `${jail.d1} + ${jail.d2} = ${jail.sum}` : '보석금 납부';
    const forced = jail.released && jail.bailPaid > 0 && choice !== 'bail';
    setTurnResult({
      kind: 'jail',
      title: jail.released ? '감옥 탈출 성공' : '감옥 탈출 실패',
      text: choice === 'bail'
        ? `보석금 ${jail.bailPaid ?? JAIL_BAIL}만을 내고 탈출했습니다.`
        : forced
          ? `${diceText} · 3번째 시도라 보석금 ${jail.bailPaid}만을 내고 탈출합니다.`
          : jail.released
            ? `${diceText} · 더블! 감옥에서 탈출합니다.`
            : `${diceText} · 더블이 아니라 감옥에 남습니다.`,
      icon: jail.released ? '🔓' : '🚓',
      d1: jail.d1,
      d2: jail.d2,
      sum: jail.sum,
      isDouble: !!jail.isDouble,
      released: !!jail.released,
      bailPaid: jail.bailPaid ?? 0,
    });
  };

  const promptJailTurn = async () => {
    if (!turnPlayer?.inJail || jailDialogOpen || state?.finished) return;
    setJailDialogOpen(true);
    try {
      const jailTurnsLeft = Math.max(1, JAIL_TURNS - (turnPlayer.jailTurns ?? 0));
      const runJailChoice = (choice) => {
        setDiceLocked(true);
        setTurnMovedKey(`${state.round ?? 0}-${state.turnIndex ?? 0}`);
        setTurnResult({ kind: 'jail', title: '감옥 탈출 시도', text: choice === 'bail' ? '보석금을 납부합니다.' : '주사위를 굴려 더블을 노립니다.', icon: '🚓' });
        const events = step({ jailChoice: choice, deferAdvance: true });
        window.setTimeout(() => showJailTurnResult(events, choice), 420);
      };

      if ((turnPlayer.cash ?? 0) < JAIL_BAIL) {
        await dialog.alert({
          title: '감옥 탈출 시도',
          badgeText: `남은 ${jailTurnsLeft}턴`,
          message: `보석금 ${JAIL_BAIL}만이 부족합니다.\n\n주사위를 굴려 더블이면 탈출, 아니면 감옥에 남습니다.`,
          okText: '주사위 굴리기',
          tone: 'warn',
        });
        runJailChoice('roll');
        return;
      }
      const payBail = await dialog.confirm({
        title: '감옥 탈출 선택',
        badgeText: `남은 ${jailTurnsLeft}턴`,
        message: `보석금은 ${JAIL_BAIL}만입니다.\n\n보석금을 내면 바로 탈출하고,\n주사위는 더블이 나와야 탈출합니다.`,
        okText: `${JAIL_BAIL}만 내기`,
        cancelText: '주사위 굴리기',
        tone: 'warn',
      });
      runJailChoice(payBail ? 'bail' : 'roll');
    } finally {
      setJailDialogOpen(false);
    }
  };
'''
pattern = r"  const promptJailTurn = async \(\) => \{.*?\n  \};\n\n  useEffect\(\(\) => \{"
s2, n = re.subn(pattern, new + "\n  useEffect(() => {", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f'promptJailTurn regex replaced {n}')
p.write_text(s2, encoding='utf-8')
