import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import { preloadGameAssets } from '@/lib/assets.js';
import { useCustomCharacterStore } from '@/stores/customCharacterStore.js';
import { DEFAULT_OPTIONS } from '@/engine/gameState.js';
import { cn } from '@/lib/cn.js';
import { getAvailableCharacters } from '@/lib/characterRoster.js';
import { getBgmPreference, pauseBgm, playBgm } from '@/lib/bgm.js';
import AssetFrame from '@/components/AssetFrame.jsx';

const PLAYER_COLORS = ['#E12D39', '#2F75C9', '#F27A1A', '#238B45'];

const SETUP_PREFS_KEY = 'reallife:setupPrefs';
const loadSetupPrefs = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage?.getItem(SETUP_PREFS_KEY) || 'null');
  } catch {
    return null;
  }
};


const optionGroups = [
  { key: 'startingCash', label: '시작 자금', unit: '만', values: [1500, 2500, 3000] },
  { key: 'totalGameMinutes', label: '게임 시간', unit: '분', values: [30, 60, 90, 120] },
  {
    key: 'deathmatchStartMinutes',
    label: '데스매치',
    unit: '분',
    values: [0, 15, 30, 45],
    labels: { 0: '없음' },
  },
  { key: 'predistributeCount', label: '사전 분배', unit: '개', values: [0, 2, 4, 6] },
];

export default function Setup({ onStart }) {
  const initGame = useGameStore((s) => s.initGame);
  const customCharacters = useCustomCharacterStore((s) => s.characters);

  const roster = getAvailableCharacters();
  const rosterSlotCount = Math.max(20, Math.ceil(roster.length / 4) * 4 + 12);
  const rosterSlots = [...roster, ...Array.from({ length: Math.max(0, rosterSlotCount - roster.length) }, (_, index) => ({ id: `locked-${index}`, locked: true }))].slice(0, rosterSlotCount);
  const customCount = customCharacters.filter((character) => character.active !== false).length;
  const setupPrefs = loadSetupPrefs();
  const [numPlayers, setNumPlayers] = useState(() => Math.min(4, Math.max(2, Number(setupPrefs?.numPlayers ?? 2) || 2)));
  const [options, setOptions] = useState(() => ({
    ...DEFAULT_OPTIONS,
    startingCash: 1500,
    totalGameMinutes: 30,
    deathmatchStartMinutes: 15,
    predistributeCount: 4,
    teamMode: false,
    ...(setupPrefs?.options ?? {}),
  }));
  const [picked, setPicked] = useState([]);
  const [playerTypes, setPlayerTypes] = useState(() => Array.from({ length: Math.min(4, Math.max(2, Number(setupPrefs?.numPlayers ?? 2) || 2)) }, (_, i) => setupPrefs?.playerTypes?.[i] ?? 'human'));
  const [names, setNames] = useState({});
  const [numberPad, setNumberPad] = useState(null);
  const [preloading, setPreloading] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(() => getBgmPreference());
  const rosterScrollerRef = useRef(null);
  const rosterDragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false, raf: null, nextScrollLeft: 0 });

  useEffect(() => {
    setPicked((prev) => prev.slice(0, numPlayers));
    setPlayerTypes((prev) => Array.from({ length: numPlayers }, (_, i) => prev[i] ?? 'human'));
  }, [numPlayers]);

  const selectedCount = picked.length;
  const ready = selectedCount === numPlayers;

  const togglePick = (id) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return prev.length >= numPlayers ? [...prev.slice(1), id] : [...prev, id];
    });
  };

  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const openNumberPad = (group) => {
    setNumberPad({
      key: group.key,
      label: group.label,
      unit: group.unit,
      value: String(options[group.key] ?? ''),
    });
  };

  const updateNumberPadValue = (next) => {
    setNumberPad((prev) => prev ? { ...prev, value: next } : prev);
  };

  const applyNumberPad = () => {
    if (!numberPad) return;
    const parsed = Math.max(0, Number.parseInt(numberPad.value || '0', 10) || 0);
    updateOption(numberPad.key, parsed);
    setNumberPad(null);
  };

  const toggleBgm = () => {
    if (bgmEnabled) {
      pauseBgm();
      setBgmEnabled(false);
      return;
    }
    playBgm().then(() => setBgmEnabled(true)).catch(() => setBgmEnabled(false));
  };

  const start = () => {
    const selected = picked.map((id) => roster.find((c) => c.id === id)).filter(Boolean);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(SETUP_PREFS_KEY, JSON.stringify({
        numPlayers,
        options,
        playerTypes: playerTypes.slice(0, numPlayers),
      }));
    }
    initGame({
      numPlayers,
      options,
      characters: picked,
      playerNames: selected.map((c) => names[c.id]?.trim() || c.name),
      playerTypes: playerTypes.slice(0, numPlayers),
      showInitialDeal: true,
    });
    onStart();
  };

  const startNew = async () => {
    if (!ready || preloading) return;
    setPreloading(true);
    try {
      await Promise.race([
        preloadGameAssets(),
        new Promise((resolve) => window.setTimeout(resolve, 3200)),
      ]);
    } catch (error) {
      console.warn('[Setup] preload failed; starting game anyway', error);
    }
    start();
  };

  const remainingPlayers = numPlayers - selectedCount;
  const startLabel = preloading ? '필수 에셋 로딩 중...' : ready ? '게임 시작' : selectedCount === 0 ? `${numPlayers}명 선택` : `${remainingPlayers}명 더 선택`;

  const scrollRoster = (direction) => {
    rosterScrollerRef.current?.scrollBy({
      left: direction * 132,
      behavior: 'smooth',
    });
  };

  const beginRosterDrag = (event) => {
    if (event.button !== 0) return;
    const scroller = rosterScrollerRef.current;
    if (!scroller) return;
    rosterDragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
      moved: false,
      raf: null,
      nextScrollLeft: scroller.scrollLeft,
    };
    scroller.classList.add('roster-dragging');
  };

  const moveRosterDrag = (event) => {
    const drag = rosterDragRef.current;
    const scroller = rosterScrollerRef.current;
    if (!drag.active || !scroller) return;
    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 6) {
      drag.moved = true;
      drag.nextScrollLeft = drag.scrollLeft - deltaX;
      if (!drag.raf) {
        drag.raf = window.requestAnimationFrame(() => {
          scroller.scrollLeft = rosterDragRef.current.nextScrollLeft;
          rosterDragRef.current.raf = null;
        });
      }
      event.preventDefault();
    }
  };

  const endRosterDrag = () => {
    const scroller = rosterScrollerRef.current;
    if (rosterDragRef.current.raf) {
      window.cancelAnimationFrame(rosterDragRef.current.raf);
      rosterDragRef.current.raf = null;
    }
    rosterDragRef.current.active = false;
    scroller?.classList.remove('roster-dragging');
  };

  const pickFromRoster = (id) => {
    togglePick(id);
  };

  return (
    <div className="setup-screen relative h-full w-full overflow-hidden bg-[#f5dfad] text-[#17120c]">
      <img
        src="/cityscape/reallife-lobby-concept.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        style={{ objectPosition: '40% center' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,22,36,0.20)_0%,rgba(255,251,238,0.02)_46%,rgba(255,248,226,0.48)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(54,207,255,0.18),transparent_34%),radial-gradient(circle_at_78%_12%,rgba(255,215,106,0.18),transparent_30%),radial-gradient(circle_at_52%_84%,rgba(84,205,255,0.12),transparent_38%)]" />
      <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-white/45 via-cyan-100/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-[#081926]/18 via-[#16364a]/7 to-transparent" />

      <main className="setup-main relative z-10 flex h-full flex-col gap-2 overflow-visible p-3 md:gap-2 md:p-3.5">
        <header className="setup-header shrink-0 px-3 pt-0 pb-0">
          <h1 className="setup-logo energy-text font-display text-[76px] font-extrabold leading-[0.86] drop-shadow-[0_5px_0_rgba(35,10,8,0.72)]">
            The RealLife
          </h1>
        </header>

        <div className="setup-body flex min-h-0 flex-1 gap-3 overflow-visible pt-1">
          <section className="flex min-h-0 w-[63%] flex-col gap-2.5">
          <div className="setup-player-count rounded-xl border-2 border-cyan-50/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.30),rgba(54,207,255,0.12),rgba(255,255,255,0.12))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_#17120c,0_14px_28px_-20px_rgba(7,28,44,0.58),0_0_24px_rgba(54,207,255,0.14)] backdrop-blur-[10px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionTitle index="1" title="플레이 인원" />
                <p className="setup-player-count-desc mt-0.5 text-xs font-black text-[#0b2f46]">참가 인원만큼 캐릭터를 선택하세요.</p>
              </div>
              <div className="flex rounded-2xl border-2 border-[#17120c] bg-white/18 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_3px_0_#17120c] backdrop-blur-[10px]">
                {[2, 3, 4].map((n) => (
                  <ChipButton key={n} active={numPlayers === n} onClick={() => setNumPlayers(n)}>
                    {n}명
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>

          <div className="setup-glass-panel relative min-h-0 flex-1 overflow-hidden rounded-xl border-2 border-cyan-50/36 bg-transparent p-3 shadow-[0_5px_0_#17120c,0_18px_36px_-22px_rgba(7,28,44,0.62),0_0_24px_rgba(54,207,255,0.12)]">
            <div className="relative z-20 flex h-full min-h-0 flex-col rounded-lg p-2">
              <div className="shrink-0 px-1 pb-1.5">
                <SectionTitle index="2" title="캐릭터 선택" />
              </div>

              <button
                type="button"
                onClick={() => updateOption('teamMode', !options.teamMode)}
                className={cn(
                  'mb-1.5 h-9 w-full rounded-lg border-2 border-[#17120c] font-board text-[14px] font-extrabold shadow-[0_2px_0_#17120c] transition active:translate-y-1 active:shadow-none',
                  options.teamMode
                    ? 'bg-[linear-gradient(180deg,#ffe07a_0%,#e44a3c_100%)] text-white'
                    : 'bg-white/55 text-ink/70',
                )}
              >
                {options.teamMode ? '팀전 ON · 휴먼팀 VS AI팀' : '팀전 OFF'}
              </button>

              <div className="setup-character-scroll relative min-h-0 flex-1 overflow-hidden rounded-xl">
                <div className="pointer-events-none absolute inset-x-2 top-0 z-20 h-8 bg-gradient-to-b from-white/18 to-transparent" />
                <div className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-10 bg-gradient-to-t from-[#081926]/18 to-transparent" />
                <div className="pointer-events-none absolute inset-y-2 left-1/2 z-10 w-px -translate-x-1/2 bg-white/10" />
                <div className="setup-character-grid grid h-full min-h-0 grid-cols-4 auto-rows-max content-start gap-x-2.5 gap-y-3 overflow-y-auto overscroll-contain px-2 py-5 no-scrollbar">
              {rosterSlots.map((character, index) => {
                if (character.locked) return <LockedCharacterSlot key={character.id} />;
                const order = picked.indexOf(character.id);
                const column = index % 4;
                return (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    selected={order >= 0}
                    order={order}
                    onPick={() => pickFromRoster(character.id)}
                    name={names[character.id] ?? ''}
                    onName={(value) => setNames((prev) => ({ ...prev, [character.id]: value }))}
                    playerType={order >= 0 ? playerTypes[order] : 'human'}
                    onTogglePlayerType={() => {
                      if (order < 0) return;
                      setPlayerTypes((prev) => prev.map((type, i) => i === order ? (type === 'ai' ? 'human' : 'ai') : type));
                    }}
                    edgeBias={column === 0 ? 'left' : column === 3 ? 'right' : 'center'}
                  />
                );
              })}
                </div>
              </div>

              <div className="setup-pick-status mt-1.5 flex h-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 font-board text-sm text-[#17120c]/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-[8px]">
                {ready ? '선택 완료' : selectedCount === 0 ? `${numPlayers}명 선택` : `${numPlayers - selectedCount}명 더 선택`}
              </div>
            </div>
          </div>
          </section>

        <aside className="setup-rules relative z-40 flex min-h-0 w-[37%] flex-col gap-2.5 overflow-visible">
          <div className="setup-glass-panel min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border-2 border-rose-100/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.25),rgba(255,75,112,0.13),rgba(54,207,255,0.08))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_0_#17120c,0_16px_30px_-22px_rgba(80,10,28,0.58),0_0_24px_rgba(255,55,96,0.16)] backdrop-blur-[10px] no-scrollbar">
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div>
                <SectionTitle index="3" title="룰 세팅" />
                <p className="mt-1 text-xs font-black text-[#0b2f46]">숫자값은 눌러서 입력하고, 옵션은 스위치로 켭니다.</p>
              </div>
              <span className="shrink-0 rounded-full border border-rose-100/50 bg-rose-100/24 px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#b01845] backdrop-blur-[8px]">Rules</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {optionGroups.map((group) => (
                <NumberOptionRow
                  key={group.key}
                  group={group}
                  value={options[group.key]}
                  onChange={(value) => updateOption(group.key, value)}
                  onCustom={() => openNumberPad(group)}
                />
              ))}
            </div>

            <div className="my-2.5 h-px bg-gradient-to-r from-transparent via-rose-400/35 to-transparent" />

            <div className="mb-2 flex items-center justify-between">
              <div className="font-board text-xl leading-none text-[#17120c]">옵션 룰</div>
              <span className="rounded-full border border-white/30 bg-white/12 px-2.5 py-1 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#087652] backdrop-blur-[8px]">Switch</span>
            </div>
            <div className="grid gap-2">
              <TogglePill icon="🎲" label="이벤트" description="1년 결산/데스매치 이벤트 카드" checked={options.eventCards} onClick={() => updateOption('eventCards', !options.eventCards)} />
              <TogglePill icon="🏦" label="대출" description="신용대출/사채 회생 시스템" checked={options.credit} onClick={() => updateOption('credit', !options.credit)} />
              <TogglePill icon="📈" label="물가" description="매년 시세 4% 복리 상승" checked={options.inflation} onClick={() => updateOption('inflation', !options.inflation)} />
              <TogglePill icon="🎵" label="BGM" description={bgmEnabled ? '배경음악 재생 중' : '시작 전 배경음악 끄기'} checked={bgmEnabled} onClick={toggleBgm} />
            </div>
          </div>

          <button
            type="button"
            onClick={startNew}
            disabled={!ready || preloading}
            className={cn(
              'group mt-auto flex h-[78px] shrink-0 items-center justify-between rounded-2xl border-[3px] border-[#17120c] px-4 text-left shadow-[0_5px_0_#17120c] transition active:translate-y-[5px] active:shadow-none',
              ready && !preloading
                ? 'bg-[linear-gradient(135deg,#ff4d66_0%,#e12d39_56%,#a90f27_100%)] text-white drop-shadow-[0_0_18px_rgba(225,45,57,0.52)]'
                : 'cursor-not-allowed bg-[linear-gradient(135deg,rgba(255,255,255,0.52),rgba(204,224,236,0.78))] text-[#24465a]',
            )}
          >
            <span className="flex flex-col">
              <span className="font-display text-[10px] font-black uppercase tracking-[0.22em] opacity-80">Game Ready</span>
              <span className="font-board text-[30px] leading-none">{startLabel}</span>
            </span>
            <span className={cn('grid h-12 w-12 place-items-center rounded-full border-2 border-[#17120c] bg-white/70 font-board text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_3px_0_#17120c]', ready && !preloading ? 'text-[#e12d39]' : 'text-[#24465a]/70')}>
              {preloading ? '…' : '▶'}
            </span>
          </button>
        </aside>
        </div>
      </main>

      {numberPad && (
        <NumberPadModal
          pad={numberPad}
          onChange={updateNumberPadValue}
          onClose={() => setNumberPad(null)}
          onApply={applyNumberPad}
        />
      )}
    </div>
  );
}

function NumberOptionRow({ group, value, onChange, onCustom }) {
  const [open, setOpen] = useState(false);
  const displayValue = group.labels?.[value] ?? `${value}${group.unit}`;
  const options = group.values.map((item) => ({ value: item, label: group.labels?.[item] ?? `${item}${group.unit}` }));
  if (!group.values.includes(value)) options.push({ value, label: displayValue });

  return (
    <div className={cn('number-option-row relative flex h-[48px] items-center justify-between gap-3 rounded-xl border border-rose-100/44 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(255,65,105,0.13),rgba(255,255,255,0.08))] px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_0_#17120c] backdrop-blur-[10px]', open ? 'z-[1000]' : 'z-20')}>
      <div className="min-w-0">
        <div className="font-board text-base leading-none text-[#17120c]">{group.label}</div>
        <div className="mt-1 font-display text-[9px] font-black uppercase tracking-[0.12em] text-[#0b2f46]">옵션 선택 / 직접 입력</div>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-8 min-w-[124px] items-center justify-between gap-2 rounded-lg border-2 border-[#17120c] bg-[linear-gradient(180deg,#fffaf0_0%,#ffd9e3_100%)] px-2.5 font-board text-lg leading-none text-[#17120c] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_2px_0_#17120c] active:translate-y-0.5 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_1px_0_#17120c]"
        >
          <span className="tabular-nums">{displayValue}</span>
          <span className={cn('text-xs text-[#b01845] transition-transform', open && 'rotate-180')}>▼</span>
        </button>
        {open && (
          <div className="absolute right-0 top-[38px] z-[1200] w-[152px] overflow-hidden rounded-xl border-[3px] border-[#17120c] bg-[#fffaf0] p-1.5 shadow-[0_5px_0_#17120c,0_20px_34px_-12px_rgba(0,0,0,0.76)]">
            {options.map((item) => (
              <button
                key={`${group.key}-${item.value}`}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex h-8 w-full items-center justify-between rounded-lg px-2 font-board text-base leading-none text-[#17120c] transition hover:bg-[#ffe0e8]',
                  item.value === value && 'bg-[#e12d39] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
                )}
              >
                <span>{item.label}</span>
                {item.value === value && <span className="text-xs">✓</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCustom();
              }}
              className="mt-1.5 flex h-8 w-full items-center justify-center rounded-lg border-2 border-[#b01845] bg-[#ffe0e8] px-2 font-board text-base leading-none text-[#b01845] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-[#fff0f4]"
            >
              직접 입력
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NumberPadModal({ pad, onChange, onClose, onApply }) {
  const press = (key) => {
    if (key === 'back') return onChange(pad.value.slice(0, -1));
    if (key === 'clear') return onChange('');
    onChange((pad.value + key).replace(/^0+(?=\d)/, '').slice(0, 5));
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px]">
      <div className="w-[min(92vw,320px)] rounded-2xl border-[3px] border-[#17120c] bg-[#fffdf5] p-4 shadow-[0_6px_0_#17120c,0_22px_55px_rgba(0,0,0,0.38)]">
        <div className="text-center">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#087652]">Number Pad</div>
          <div className="mt-1 font-board text-2xl text-[#17120c]">{pad.label}</div>
          <div className="mt-3 rounded-lg border-2 border-[#17120c] bg-white px-3 py-2 text-right font-display text-3xl font-extrabold tabular-nums text-[#17120c] shadow-[inset_0_2px_0_rgba(0,0,0,0.08)]">
            {pad.value || '0'}<small className="ml-1 text-sm text-[#17120c]/55">{pad.unit}</small>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','clear','0','back'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="h-12 rounded-lg border-2 border-[#17120c] bg-[#fff6d4] font-board text-2xl shadow-[0_3px_0_#17120c] active:translate-y-1 active:shadow-none"
            >
              {key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border-2 border-[#17120c] bg-neutral-200 font-board text-xl shadow-[0_3px_0_#17120c] active:translate-y-1 active:shadow-none">취소</button>
          <button type="button" onClick={onApply} className="h-11 rounded-lg border-2 border-[#17120c] bg-[#0f8a5f] font-board text-xl text-white shadow-[0_3px_0_#17120c] active:translate-y-1 active:shadow-none">적용</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ index, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="setup-section-index flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#17120c] bg-[#e12d39] font-board text-lg font-black text-white shadow-[0_2px_0_#17120c]">
        {index}
      </span>
      <h2
        className="font-board text-2xl font-black leading-none text-[#17120c]"
        style={{ WebkitTextStroke: '0.1px #17120c', textShadow: '0.2px 0 #17120c, 0 0.2px #17120c' }}
      >
        {title}
      </h2>
    </div>
  );
}

function ChipButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-11 min-w-16 rounded-xl border-2 px-3.5 font-board text-2xl shadow-[0_2px_0_#17120c] transition active:translate-y-0.5 active:shadow-none',
        active ? 'border-[#17120c] bg-[#e12d39] text-white drop-shadow-[0_0_10px_rgba(225,45,57,0.32)]' : 'border-transparent bg-white/22 text-[#12384f] shadow-none hover:bg-white/35',
      )}
    >
      {children}
    </button>
  );
}

function LockedCharacterSlot() {
  return (
    <div className="locked-character-slot relative mx-auto flex h-[178px] w-full max-w-[136px] min-w-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-cyan-50/38 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_24px_-18px_rgba(7,28,44,0.5)] backdrop-blur-[8px]">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(54,207,255,0.12),transparent_45%)]" />
      <div className="relative z-[1] flex flex-col items-center gap-1 text-[#17120c]/45">
        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#17120c]/25 bg-white/24 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">🔒</div>
        <div className="font-display text-[9px] font-black uppercase tracking-[0.16em]">잠금</div>
      </div>
    </div>
  );
}

function CharacterCard({ character, selected, order, onPick, name, onName, playerType = 'human', onTogglePlayerType, edgeBias = 'center' }) {
  const color = selected ? PLAYER_COLORS[order] : '#17120c';
  const displayName = name || character.name;
  const glassShadow = selected
    ? `inset 0 1px 0 rgba(255,255,255,0.42), inset 1px 0 0 rgba(221,247,255,0.2), inset 0 -28px 44px rgba(7,28,44,0.1), 0 44px 58px -20px rgba(9,31,48,0.42), 0 24px 26px -16px rgba(9,31,48,0.28), 0 9px 12px -8px rgba(9,31,48,0.18), 0 0 0 1px rgba(232,250,255,0.28), 0 0 20px rgba(135,220,255,0.28), 0 0 30px ${color}22`
    : 'inset 0 1px 0 rgba(255,255,255,0.34), inset 1px 0 0 rgba(221,247,255,0.18), inset 0 -28px 44px rgba(7,28,44,0.08), 0 44px 58px -20px rgba(9,31,48,0.38), 0 24px 26px -16px rgba(9,31,48,0.24), 0 9px 12px -8px rgba(9,31,48,0.16), 0 0 0 1px rgba(232,250,255,0.22), 0 0 18px rgba(135,220,255,0.22)';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick?.();
        }
      }}
      className={cn(
        'character-card relative mx-auto flex h-[212px] w-full max-w-[162px] min-w-0 cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-transparent px-4 pb-4 pt-5 text-left transition active:translate-y-1',
        selected && 'character-card-selected-active character-card-selected-pulse character-card-aurora-selected',
        selected && edgeBias === 'left' && 'character-card-grow-left',
        selected && edgeBias === 'right' && 'character-card-grow-right',
      )}
      style={{
        background:
          'linear-gradient(125deg, rgba(255,255,255,0.56) 0%, rgba(101,205,255,0.38) 36%, rgba(4,22,36,0.42) 100%)',
        backdropFilter: 'blur(9px) saturate(1.08) brightness(1.04)',
        WebkitBackdropFilter: 'blur(9px) saturate(1.08) brightness(1.04)',
        boxShadow: glassShadow,
      }}
    >
      {selected && <span className="character-card-aurora-outline pointer-events-none absolute left-1/2 top-1/2 h-[215%] w-[215%] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
      {selected && <span className="character-card-selected-ring pointer-events-none absolute inset-0 rounded-xl" />}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-xl bg-gradient-to-b from-black/22 via-black/10 to-transparent" />
      <span className="pointer-events-none absolute -left-14 top-8 h-24 w-36 rounded-full bg-sky-300/6 blur-[22px]" />
      <span className="pointer-events-none absolute -right-12 bottom-2 h-24 w-32 rounded-full bg-cyan-300/4 blur-[22px]" />
      <span className="pointer-events-none absolute -left-10 top-[46px] h-12 w-[190px] -rotate-[24deg] bg-[linear-gradient(90deg,transparent_0%,rgba(223,248,255,0.03)_24%,rgba(238,253,255,0.34)_46%,rgba(145,222,255,0.10)_58%,transparent_78%)] blur-[4px]" />
      <span className="pointer-events-none absolute -left-4 top-5 h-px w-[150px] -rotate-[24deg] bg-cyan-50/42 shadow-[0_0_12px_rgba(186,237,255,0.42)]" />
      <span className="pointer-events-none absolute inset-x-3 top-2 h-8 rounded-full bg-cyan-50/18 blur-[10px]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#081926]/10 to-transparent" />
      <span className="pointer-events-none absolute left-2 top-3 h-[72%] w-px bg-cyan-50/34 shadow-[0_0_10px_rgba(186,237,255,0.26)]" />
      <span className="pointer-events-none absolute right-2 top-4 h-[58%] w-px bg-sky-200/12" />
      {selected && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePlayerType?.();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              'character-control-badge absolute left-1 top-1 z-20 rounded-full border-2 border-[#17120c] px-1.5 py-0.5 font-board text-[11px] text-white shadow-[0_2px_0_#17120c] transition active:translate-y-0.5 active:shadow-none',
              playerType === 'ai'
                ? 'bg-[linear-gradient(180deg,#2f75c9_0%,#164d91_100%)]'
                : 'bg-[linear-gradient(180deg,#f27a1a_0%,#b84a10_100%)]',
            )}
            aria-label={`${order + 1}P ${playerType === 'ai' ? 'AI' : '휴먼'} 전환`}
          >
            {playerType === 'ai' ? 'AI' : '휴먼'}
          </button>
          <span
            className="character-player-badge absolute right-1 top-1 z-10 rounded-full border-2 border-[#17120c] px-1.5 py-0.5 font-board text-xs text-white"
            style={{ backgroundColor: color }}
          >
            {order + 1}P
          </span>
        </>
      )}
      {character.source === 'custom' && (
        <span className="absolute left-2 top-2 rounded-full bg-[#2f75c9] px-1.5 py-0.5 text-[9px] font-bold text-white">
          추가
        </span>
      )}
      <div className="character-avatar-wrap relative z-[1] mt-1 flex h-[122px] w-[122px] shrink-0 items-end justify-center overflow-visible rounded-xl">
        <span className="portal-card-aura pointer-events-none absolute inset-[-18%] rounded-full bg-sky-400/10 blur-[18px]" />
        <span className="portal-card-flash pointer-events-none absolute inset-[-4%] rounded-full bg-cyan-100/6 blur-[8px]" />
        <img
          src="/backgrounds/portal-residue.png"
          alt=""
          className="portal-card-residue pointer-events-none absolute left-1/2 top-1/2 h-[188%] w-[188%] -translate-x-1/2 -translate-y-[58%] object-contain opacity-95 drop-shadow-[0_0_22px_rgba(84,205,255,0.42)]"
          draggable={false}
        />
        <span className="portal-card-summon-light pointer-events-none absolute left-1/2 top-[46%] h-[86%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full" />

        {character.imageDataUrl ? (
          <img
            src={character.imageDataUrl}
            alt={character.name}
            className="character-avatar-idle character-avatar-materialize relative z-[1] max-h-[106%] max-w-[106%] object-contain drop-shadow-[0_10px_10px_rgba(42,25,12,0.28)]"
          />
        ) : (
          <AssetFrame
            slot={character.slot}
            transparent
            className="character-avatar-idle character-avatar-materialize relative z-[1] max-h-[106%] max-w-[106%] object-contain drop-shadow-[0_10px_10px_rgba(42,25,12,0.28)]"
            fallback={character.emoji ?? '?'}
          />
        )}
      </div>
      {selected ? (
        <input
          value={name}
          placeholder={character.name}
          onChange={(event) => onName(event.target.value)}
          onClick={(event) => {
            event.stopPropagation();
            event.currentTarget.focus();
          }}
          onTouchStart={(event) => event.stopPropagation()}
          maxLength={10}
          className="character-name-plate character-name-plate-input relative z-[80] flex h-[28px] max-w-full items-center justify-center px-3 py-0 text-center font-board text-[15px] font-extrabold leading-none text-[#1b2024] caret-[#1d5e9f] placeholder:text-[#3f4a52]/90 focus:outline-none"
        />
      ) : (
        <div
          className={cn(
            'character-name-plate relative z-[1] flex h-[28px] max-w-full items-center justify-center truncate px-3 py-0 text-center font-board text-[15px] font-extrabold leading-none text-[#1b2024]',
            Array.from(character.name ?? '').length === 3 && 'tracking-[0.28em]',
          )}
        >
          {character.name}
        </div>
      )}
    </div>
  );
}

function OptionGroup({ group, value, onChange }) {
  return (
    <div className="rounded-md border-2 border-[#dfc894] bg-[#fff8dc]/82 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-board text-[15px] leading-none">{group.label}</span>
        <span className="shrink-0 rounded-md border-2 border-[#17120c] bg-white px-2 py-0 font-board text-xl leading-tight shadow-[0_2px_0_#17120c]">
          {value}
          <small className="ml-1 text-xs">{group.unit}</small>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {group.values.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              'rounded-md border px-2 py-1 font-board text-[13px] leading-none',
              value === item
                ? 'border-[#e12d39] bg-[#e12d39] text-white'
                : 'border-[#c7ad78] bg-[#f1dfb5] text-[#715b38]',
            )}
          >
            {group.labels?.[item] ?? `${item}${group.unit}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function TogglePill({ icon, label, description, checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'toggle-pill group flex h-[44px] items-center justify-between gap-2 rounded-xl border border-white/35 px-2.5 font-board text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_1px_0_rgba(15,12,10,0.18)] backdrop-blur-[10px] transition active:translate-y-1',
        checked
          ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.24),rgba(220,236,242,0.12),rgba(120,150,160,0.08))] text-[#2f574d]'
          : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(220,236,242,0.10),rgba(120,150,160,0.08))] text-[#12384f]',
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-left">
        <span className="text-[20px] leading-none">{icon}</span>
        <span className="min-w-0">
          <span className="block leading-none">{label}</span>
          <span className="mt-1 block truncate font-sans text-[10px] font-extrabold text-[#3f5f55]">{description}</span>
        </span>
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border border-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-colors',
          checked ? 'bg-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_10px_rgba(16,185,129,0.55)]' : 'bg-white/22',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/70 bg-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_3px_rgba(15,12,10,0.22)] transition-transform',
            checked ? 'translate-x-[20px]' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}
