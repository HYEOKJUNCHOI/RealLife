// 셋업 화면 — 흐름: 인원 → 캐릭터 선택(빙그르르) → 이름 입력
// 옵션은 항상 펼쳐져 있음
// 도심 배경 + Netflix 결 빨강 글로우 로고

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';
import { DEFAULT_OPTIONS } from '@/engine/gameState.js';
import { cn } from '@/lib/cn.js';
import characters from '@/data/characters.json';
import AssetFrame from '@/components/AssetFrame.jsx';
import CityBackground from '@/components/CityBackground.jsx';
import NumPadDropdown from '@/components/NumPadDropdown.jsx';

const KOREA_CHARS = characters.korea ?? [];

// 플레이어 슬롯 색 — 1p 빨강, 2p 파랑, 3p 주황, 4p 초록
const PLAYER_COLORS = ['#D32F2F', '#1976D2', '#F57C00', '#388E3C'];

// 임시 토글 — 뒷배경(도심) 디자인 조정 중에 1·2·3 STEP 카드 가리기
// 작업 끝나면 true 로 복귀
const SHOW_STEP_CARDS = true;

export default function Setup({ onStart }) {
  const initGame = useGameStore((s) => s.initGame);
  const loadGame = useGameStore((s) => s.load);
  const hasSaved = useGameStore((s) => s.hasSavedGame);
  const clearSave = useGameStore((s) => s.clearSave);

  const [numPlayers, setNumPlayers] = useState(4);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [savedExists, setSavedExists] = useState(false);

  // 선택된 캐릭터 (순서 = 슬롯 번호). 캐릭터 ID 배열.
  const [picked, setPicked] = useState([]); // ex: ['yangban', 'general']
  // 이름 입력 (빈 문자열 시작, placeholder만)
  const [names, setNames] = useState({}); // { [characterId]: '입력값' }
  // 마지막에 클릭된 카드 추적 → 빙그르르 트리거
  const [spinTick, setSpinTick] = useState({}); // { [characterId]: tickCount }

  useEffect(() => {
    setSavedExists(hasSaved?.() ?? false);
  }, [hasSaved]);

  // 인원 변경 시 — 초과 선택은 잘라냄
  useEffect(() => {
    setPicked((prev) => prev.slice(0, numPlayers));
  }, [numPlayers]);

  const togglePick = (charId) => {
    setPicked((prev) => {
      const idx = prev.indexOf(charId);
      if (idx >= 0) {
        // 이미 선택됨 → 해제
        return prev.filter((c) => c !== charId);
      }
      // 새 선택 — numPlayers 한도면 가장 오래된 거 빼고 추가
      const next = prev.length >= numPlayers ? [...prev.slice(1), charId] : [...prev, charId];
      // 빙그르르 트리거
      setSpinTick((t) => ({ ...t, [charId]: (t[charId] ?? 0) + 1 }));
      return next;
    });
  };

  const handleName = (charId, v) => {
    setNames((n) => ({ ...n, [charId]: v }));
  };

  const allPicked = picked.length === numPlayers;

  const start = () => {
    initGame({
      numPlayers,
      options,
      characters: picked,
      playerNames: picked.map((cid) => (names[cid] ?? '').trim()),
    });
    onStart();
  };
  const continueGame = () => {
    if (loadGame()) onStart();
  };
  const newGameClearSaved = () => {
    if (
      savedExists &&
      !confirm('저장된 게임이 있습니다. 새 게임 시작하면 사라집니다. 계속?')
    )
      return;
    clearSave?.();
    start();
  };
  const startBtnText = !allPicked
    ? picked.length === 0
      ? `캐릭터 ${numPlayers}명 선택`
      : `캐릭터 ${numPlayers - picked.length}명 더 선택`
    : '시작';
  const startBtnDisabled = !allPicked;
  // STEP 별 상태 — idle(미입력 파랑) / active(입력 중 노랑 반짝) / done(완료 빨강 정적)
  // STEP 1 인원, STEP 3 옵션은 기본값으로 valid → 항상 done
  // STEP 2 캐릭터: 다 채울 때까지 계속 active (지금 입력받아야 하는 결)
  const step2Status = picked.length < numPlayers ? 'active' : 'done';
  const startReady = !startBtnDisabled;

  // isolate — stacking context 강제 형성 (도심이 TabletShell 베젤 뒤로 새는 것 방지)
  return (
    <div className="relative h-full w-full overflow-y-auto isolate">
      <CityBackground />
      {/* 도심 위에 살짝만 베이지 톤 — 도심+차들 비치게 (이전 55% → 25%) */}
      {/* -z-10 제거 — source order로 도심 위, 콘텐츠 아래에 자연스럽게 위치 */}
      <div className="pointer-events-none absolute inset-0 bg-parchment-100/25" />

      <div className="relative flex h-full flex-col gap-3 overflow-hidden p-3 md:gap-4 md:p-5">
        {/* 로고 — 좌측 영역에만 위치 (옵션이 인원선택과 같은 라인에서 시작하도록 단독 row) */}
        <h1
          className="energy-text font-display font-extrabold leading-none md:w-[58%]"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            letterSpacing: '-0.01em',
          }}
        >
          The RealLife
        </h1>

        {/* === 좌우 컬럼 — 같은 라인에서 시작 (flex-1로 남은 공간 채움) === */}
        {/* min-h-0 — flex item이 자식 자연 크기보다 작아질 수 있게 (overflow 처리용) */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-5">
        {/* === 좌측 — 인원 + 캐릭터 + 이름 === */}
        <div className="md:w-[58%] flex flex-col gap-3">
          {/* === STEP 1 — 인원 선택 + 60분룰 안내 (우측 인라인) === */}
          {SHOW_STEP_CARDS && (
            <Card status="done">
              <Step
                n={1}
                label="인원 선택"
                hint={`${options.totalGameMinutes ?? 60}분룰 · 데스매치 ${options.deathmatchStartMinutes ? `${options.deathmatchStartMinutes}분 후 시작` : '없음'}`}
              >
                <div className="flex gap-1.5">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumPlayers(n)}
                      className={cn(
                        'rounded-sm border-2 px-4 py-1.5 font-display text-[12px] font-bold uppercase tracking-wider transition',
                        numPlayers === n
                          ? 'border-ink-line bg-monopoly-red text-white shadow-chip'
                          : 'border-ink/30 bg-parchment-100 text-ink/60 hover:bg-parchment-200',
                      )}
                    >
                      {n}명
                    </button>
                  ))}
                </div>
              </Step>
            </Card>
          )}

          {/* === STEP 2 — 캐릭터 선택 === */}
          {SHOW_STEP_CARDS && (
            <Card status={step2Status}>
              <Step
                n={2}
                label="캐릭터 선택"
                hint={`${picked.length}/${numPlayers} 선택됨`}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {KOREA_CHARS.map((c) => {
                    const order = picked.indexOf(c.id); // -1 = 미선택
                    const selected = order >= 0;
                    return (
                      <CharacterPick
                        key={c.id}
                        character={c}
                        selected={selected}
                        order={order}
                        spinTick={spinTick[c.id] ?? 0}
                        onClick={() => togglePick(c.id)}
                        name={names[c.id] ?? ''}
                        onName={(v) => handleName(c.id, v)}
                      />
                    );
                  })}
                </div>
              </Step>
            </Card>
          )}
        </div>

        {/* === 우측 — 옵션 + 시작 버튼 (min-h-0: 자식 overflow가 외부로 새지 않게) === */}
        <div className="md:w-[42%] flex min-h-0 flex-col gap-3">
          {savedExists && (
            <button
              type="button"
              onClick={continueGame}
              className="rounded-md border-2 border-emerald-700 bg-emerald-100 py-3 text-center font-display text-base font-extrabold uppercase tracking-wider text-emerald-900 shadow-deed-flat transition hover:bg-emerald-200"
            >
              ▶ 이어하기 (저장된 게임)
            </button>
          )}

          {/* 옵션 — flex-1로 우측 컬럼 남은 공간 차지 + 안에서만 스크롤 (no-scrollbar 숨김) */}
          {SHOW_STEP_CARDS && (
            <Card status="done" className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <Step n={3} label="옵션">
                <NumberRow
                  label="시작 자금"
                  hint="기본 2,500만 / 숫자 입력"
                  value={options.startingCash}
                  onChange={(v) => setOptions((o) => ({ ...o, startingCash: v }))}
                  presets={[1500, 2500, 3000]}
                  unit="만"
                  enableNumPad
                />
                <NumberRow
                  label="총 게임 시간"
                  hint="기본 60분 / 숫자 입력"
                  value={options.totalGameMinutes ?? 60}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, totalGameMinutes: v }))
                  }
                  presets={[30, 60, 90, 120]}
                  unit="분"
                  enableNumPad
                />
                <NumberRow
                  label="데스매치 시작"
                  hint={
                    options.deathmatchStartMinutes
                      ? `${options.totalGameMinutes ?? 60}분 게임 중`
                      : '데스매치 없음'
                  }
                  value={options.deathmatchStartMinutes}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, deathmatchStartMinutes: v }))
                  }
                  presets={[0, 15, 20, 30, 45]}
                  presetLabels={{ 0: '없음' }}
                  unit="분"
                />
                <NumberRow
                  label="부동산 사전 분배"
                  hint="1인당 N개 (0 = 빈 보드)"
                  value={options.predistributeCount ?? 4}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, predistributeCount: v }))
                  }
                  presets={[0, 2, 4, 6]}
                  unit="개"
                />
                <BoolRow
                  label="이벤트 카드 (매년 결산)"
                  k="eventCards"
                  options={options}
                  setOptions={setOptions}
                />
                <BoolRow
                  label="신용대출 (회생)"
                  k="credit"
                  options={options}
                  setOptions={setOptions}
                />
                <BoolRow
                  label="자유 건설 (독점 없이도)"
                  k="freeBuild"
                  options={options}
                  setOptions={setOptions}
                />
                <BoolRow
                  label="인플레이션 4%/년"
                  k="inflation"
                  options={options}
                  setOptions={setOptions}
                />
                <BoolRow
                  label="사채 (고리대금)"
                  k="loanshark"
                  options={options}
                  setOptions={setOptions}
                />
              </Step>
            </Card>
          )}

          {/* === 시작 버튼 — 우측 컬럼 바닥에 박음 (mt-auto) === */}
          <button
            type="button"
            onClick={savedExists ? newGameClearSaved : start}
            disabled={startBtnDisabled}
            className={cn(
              'group relative mt-auto inline-flex items-center justify-center gap-3 rounded-md border-[3px] border-ink-line py-6 text-center font-display text-3xl font-extrabold uppercase tracking-widest transition-transform duration-100',
              'shadow-[0_6px_0_0_#0F0C0A,0_14px_28px_-4px_rgba(211,47,47,0.55)]',
              startBtnDisabled
                ? 'cursor-not-allowed bg-parchment-200 text-ink/40 shadow-deed-flat'
                : 'bg-monopoly-red text-white hover:bg-monopoly-deep active:translate-y-[5px] active:shadow-[0_1px_0_0_#0F0C0A]',
              startReady && 'step-glow',
            )}
          >
            {!startBtnDisabled && <span className="text-4xl leading-none">🎲</span>}
            <span>{startBtnText}</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// CharacterPick — 카드 클릭 시 360° 빙그르르
// =============================================
function CharacterPick({
  character,
  selected,
  order,
  spinTick,
  onClick,
  name = '',
  onName,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-md border-2 px-2 pt-3 pb-2.5 transition',
        selected
          ? 'bg-parchment-50'
          : 'border-ink-line bg-parchment-100/40 shadow-[0_0_0_1px_rgba(15,12,10,0.16)] hover:border-ink hover:bg-parchment-100 hover:shadow-[0_0_14px_rgba(15,12,10,0.18)]',
      )}
      style={
        selected
          ? {
              borderColor: PLAYER_COLORS[order],
              boxShadow: `0 2px 0 0 #0F0C0A, 0 0 0 3px ${PLAYER_COLORS[order]}66, 0 0 24px ${PLAYER_COLORS[order]}AA`,
            }
          : undefined
      }
    >
      {/* 선택 순서 뱃지 — 1p~4p 전용색 */}
      {selected && (
        <span
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-line font-display text-[13px] font-extrabold text-white shadow-[0_2px_0_0_#0F0C0A]"
          style={{ backgroundColor: PLAYER_COLORS[order] }}
        >
          {order + 1}p
        </span>
      )}

      {/* 캐릭터 이미지 영역 */}
      <div className="relative w-20 md:w-24">
        {/* 빛 폭발 — 선택 순간 한 번 (radial gradient 확장) */}
        {spinTick > 0 && (
          <motion.div
            key={`burst-${spinTick}`}
            initial={{ scale: 0.6, opacity: 0.85 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,217,128,0.7) 0%, rgba(255,180,80,0.35) 35%, transparent 65%)',
            }}
            aria-hidden="true"
          />
        )}

        {/* 캐릭터 — 커졌다 작아짐 + 빛나는 플래시 */}
        <motion.div
          key={spinTick}
          initial={spinTick > 0 ? { scale: 1 } : false}
          animate={
            spinTick > 0
              ? {
                  scale: [1, 1.28, 1.05, 1],
                  filter: [
                    'drop-shadow(0 0 0 transparent) brightness(1)',
                    'drop-shadow(0 0 28px rgba(255,217,128,0.95)) brightness(1.35)',
                    'drop-shadow(0 0 12px rgba(255,217,128,0.4)) brightness(1.1)',
                    'drop-shadow(0 0 0 transparent) brightness(1)',
                  ],
                }
              : { scale: 1 }
          }
          transition={{ duration: 0.65, ease: 'easeOut', times: [0, 0.35, 0.7, 1] }}
          className="relative z-10 w-full rounded-full p-1 ring-2 ring-monopoly-gold/80 drop-shadow-[0_0_12px_rgba(255,193,7,0.42)]"
        >
          <AssetFrame
            slot={character.slot}
            transparent
            className="mx-auto w-[90%] -translate-y-1"
            fallback={character.emoji ?? '🎭'}
          />
        </motion.div>
      </div>

      {/* 이름 — 뱃지 스타일 (선택 시 input 뱃지 / 미선택 시 outline 뱃지) */}
      {selected ? (
        <div
          className="relative w-full rounded-full border-2 px-3 py-1 shadow-[0_1px_0_0_rgba(0,0,0,0.18)]"
          style={{
            borderColor: PLAYER_COLORS[order],
            backgroundColor: `${PLAYER_COLORS[order]}14`, // 8% 알파 (16진수 14 ≈ 20/255)
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => onName?.(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={character.name}
            maxLength={6}
            className="w-full bg-transparent text-center font-board text-[14px] font-semibold leading-none tracking-[0.02em] focus:outline-none placeholder:text-ink/40"
            style={{ color: PLAYER_COLORS[order] }}
          />
        </div>
      ) : (
        <span
          className="rounded-full border-2 px-3 py-1 font-board text-[13px] font-bold leading-none tracking-[0.03em] text-ink"
          style={{
            borderColor: '#D4A94F',
            backgroundColor: 'rgba(212,169,79,0.12)',
          }}
        >
          {character.name}
        </span>
      )}
    </button>
  );
}

// =============================================
// 공통 Card / Step 래퍼
// =============================================
function Card({ children, status = 'done', className }) {
  // status: 'idle' (미입력 — 파랑) | 'active' (입력 중 — 노랑 반짝) | 'done' (완료 — 빨강 정적)
  return (
    <div
      className={cn(
        // overflow-visible 명시 — BoolRow 토글이 우측으로 돌출됨
        'rounded-md border-2 border-ink-line bg-parchment-50 p-3 overflow-visible transition-shadow duration-300',
        status === 'idle' && 'step-glow-idle',
        status === 'active' && 'step-glow',
        status === 'done' && 'step-glow-done',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Step({ n, label, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="rounded-full border-2 border-ink-line bg-monopoly-red px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-white">
            {n}
          </span>
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.25em] text-ink">
            {label}
          </h2>
        </div>
        {hint && (
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-ink/45">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// =============================================
// NumberRow / BoolRow
// =============================================
function NumberRow({
  label,
  hint,
  value,
  onChange,
  presets = [],
  presetLabels = {},
  unit,
  enableNumPad = false, // true 시 input 클릭하면 NumPadModal 열림
}) {
  const [padOpen, setPadOpen] = useState(false);
  return (
    <div className="border-b border-ink/10 py-2 last:border-b-0">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-display text-[11px] font-bold uppercase tracking-wider text-ink">
            {label}
          </div>
          {hint && (
            <div className="font-display text-[9px] font-semibold uppercase tracking-wider text-ink/45">
              {hint}
            </div>
          )}
        </div>
        <div className="relative flex items-center gap-1">
          {enableNumPad ? (
            <button
              type="button"
              onClick={() => setPadOpen((v) => !v)}
              className={cn(
                'w-24 rounded-sm border-2 px-2 py-1 text-right font-display text-[14px] font-bold tabular-nums text-ink shadow-chip transition active:translate-y-[1px]',
                padOpen
                  ? 'border-monopoly-red bg-parchment-100'
                  : 'border-ink-line bg-white hover:bg-parchment-100',
              )}
              title="숫자 패드 열기"
            >
              {value.toLocaleString('ko-KR')}
            </button>
          ) : (
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(+e.target.value || 0)}
              className="w-20 rounded-sm border-2 border-ink-line bg-white px-2 py-1 text-right font-display text-[13px] font-bold tabular-nums text-ink focus:border-monopoly-red focus:outline-none"
            />
          )}
          <span className="font-display text-[10px] font-bold uppercase text-ink/55">
            {unit}
          </span>

          {/* NumPad 드롭다운 — 인풋 바로 아래 */}
          {enableNumPad && (
            <NumPadDropdown
              open={padOpen}
              onClose={() => setPadOpen(false)}
              initialValue={value}
              onConfirm={(v) => onChange(v)}
              unit={unit}
              align="right"
            />
          )}
        </div>
      </div>
      {presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                'rounded-sm border px-2 py-0.5 font-display text-[10px] font-semibold tabular-nums transition',
                value === p
                  ? 'border-monopoly-red bg-monopoly-red text-white'
                  : 'border-ink/20 bg-parchment-100 text-ink/60 hover:bg-parchment-200',
              )}
            >
              {presetLabels[p] ?? `${p}${unit}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BoolRow({ label, k, options, setOptions }) {
  const checked = !!options[k];
  const toggle = () => setOptions((o) => ({ ...o, [k]: !o[k] }));
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      className="flex w-full items-center justify-between border-b border-ink/10 py-2.5 text-left last:border-b-0"
    >
      <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-ink">
        {label}
      </span>
      {/* iOS 결 토글 — 라벨 영역 클릭으로도 토글됨 (button 전체 onClick) */}
      <span
        aria-hidden="true"
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border border-ink-line transition-colors duration-200',
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]',
          checked ? 'bg-monopoly-red' : 'bg-ink/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-transform duration-200',
            checked && 'translate-x-[20px]',
          )}
        />
      </span>
    </button>
  );
}
