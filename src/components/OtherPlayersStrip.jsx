// 푸터 — 자기 턴이 아닌 다른 플레이어 strip (가로 한 줄)
// 각 칩: 작은 액자 + 이름 + 현금 + 부동산 수
// 끝에 ⚙ 셋업 복귀 아이콘
import AssetFrame from '@/components/AssetFrame.jsx';
import charactersData from '@/data/characters.json';
import koreaBoard from '@/boards/korea.json';
import { cn } from '@/lib/cn.js';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};
const PROP_TILES = koreaBoard.tiles.filter((t) => t.type === 'property');
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');

// 캐릭터별 동그란 아바타 background-position — 모자 크기/얼굴 높이 따라 미세조정
const AVATAR_POSITION = {
  yangban:    'center 30%',  // 갓 큼 → 살짝 더 아래로
  general:    '36% 29%',     // 투구 얼굴 중앙 맞춤
  magistrate: 'center 26%',  // 익선관
  farmer:     'center 26%',  // 패랭이
};

const AVATAR_SIZE = {
  general: '135%',
};

// 보유 stage 별 개수 반환: 땅문서(전체) / 집(빌라 1~4) / 아파트(stage 5)
function propertyStats(state, playerId) {
  let deeds = 0;
  let houses = 0;
  let apts = 0;
  for (const t of PROP_TILES) {
    const ts = state.tileState[t.pos];
    if (ts?.owner !== playerId) continue;
    deeds += 1;
    const stage = ts.stage ?? 0;
    if (stage >= 1 && stage <= 4) houses += stage; // 빌라 N채
    if (stage === 5) apts += 1;
  }
  return { deeds, houses, apts };
}

export default function OtherPlayersStrip({ state, onStep, finished, winnerIndex }) {
  const others = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i !== state.turnIndex);

  return (
    <footer
      className="flex items-stretch gap-2.5 rounded-md border-2 border-ink-line px-3 py-1.5 md:py-2"
      data-component="OtherPlayersStrip"
      style={{
        // 양피지 결 + 살짝 갈색 글로우 — CurrentPlayerStage 와 분위기 통일
        background:
          'linear-gradient(180deg, #FBF6E9 0%, #F4EAD0 100%)',
        boxShadow:
          '0 4px 0 0 #0F0C0A, 0 0 0 3px rgba(149,84,54,0.35), 0 0 24px 4px rgba(149,84,54,0.25), 0 8px 14px -3px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex flex-1 items-stretch gap-2 overflow-x-auto no-scrollbar">
        {others.map(({ p, i }) => (
          <PlayerChip key={i} player={p} index={i} state={state} />
        ))}
      </div>

      {/* === 턴 종료 — 우측 끝 큼직 + 진행 가능 시 step-glow === */}
      <button
        type="button"
        onClick={onStep}
        disabled={finished}
        className={cn(
          'group relative shrink-0 inline-flex items-center gap-2.5 rounded-md border-[3px] border-ink-line px-7 py-2.5 transition-transform duration-100 ease-out',
          'active:translate-y-[4px] active:shadow-[0_1px_0_0_#0F0C0A]',
          finished
            ? 'cursor-not-allowed bg-parchment-200 text-ink/40 shadow-[0_5px_0_0_#0F0C0A,0_10px_18px_-4px_rgba(0,0,0,0.5)]'
            : 'bg-monopoly-red text-white hover:bg-monopoly-deep turn-end-glow',
        )}
      >
        <span className="text-[26px] leading-none">🎲</span>
        <span className="font-display text-[18px] font-extrabold uppercase tracking-widest">
          {finished ? `승자 ${winnerIndex + 1}p` : '턴 종료'}
        </span>
      </button>
    </footer>
  );
}

function PlayerChip({ player: p, index: i, state }) {
  const baseMeta = CHAR_META[p.character] ?? { name: p.character, color: '#666', slot: null };
  const meta = { ...baseMeta, name: displayPlayerName(p, baseMeta.name) };
  const { deeds, houses, apts } = propertyStats(state, i);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center gap-2 overflow-hidden rounded-md border-[3px] border-ink-line bg-parchment-50 px-3 py-2 shadow-[0_4px_0_0_#0F0C0A,0_10px_18px_-10px_rgba(0,0,0,0.75)]',
        p.bankrupt && 'opacity-40 saturate-50',
      )}
      style={{
        minWidth: 270,
        boxShadow: `0 4px 0 0 #0F0C0A, 0 0 0 2px ${meta.color}33, 0 10px 18px -10px rgba(0,0,0,0.75)`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 border-r-2 border-ink-line"
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-2 top-1 h-px bg-gradient-to-r from-transparent via-monopoly-gold/70 to-transparent" />
      {/* 캐릭터 — 동그랗게 얼굴 잘 보이게 (캐릭터별 모자 높이 따라 position 분기) */}
      <div className="ml-1.5 shrink-0">
        <div
          className="h-14 w-14 rounded-full border-[3px] shadow-[0_2px_0_0_#0F0C0A,0_0_0_3px_rgba(255,213,79,0.5),0_0_14px_rgba(255,193,7,0.4)]"
          style={{
            backgroundImage: `url(/characters/${p.character}.png)`,
            backgroundSize: AVATAR_SIZE[p.character] ?? '155%',
            backgroundPosition: AVATAR_POSITION[p.character] ?? 'center 22%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: meta.color + '22',
            borderColor: '#FFD54F',
          }}
          aria-label={meta.name}
        />
      </div>

      {/* 좌측: 이름 2행 (P# 이름 / 자산 분해) */}
      <div className="min-w-0 flex-1">
        {/* 1행: 1P · 이름 · 상태 배지 */}
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-sm border-2 border-ink-line px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest leading-none text-white shadow-[0_1px_0_0_#0F0C0A]"
            style={{ backgroundColor: meta.color }}
          >
            {i + 1}p
          </span>
          <span className="truncate font-board font-extrabold text-[16px] leading-none text-ink">
            {meta.name}
          </span>
          {p.inJail && <span className="font-display text-[9px] font-bold text-monopoly-red">감옥</span>}
          {p.skipTurns > 0 && <span className="font-display text-[9px] font-bold text-amber-700">군복무</span>}
          {p.bankrupt && <span className="font-display text-[9px] font-bold text-ink/40">파산</span>}
        </div>
        {/* 2행: 집문서 / 집 / 아파트 */}
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-ink-line/25 bg-white/55 px-1.5 py-0.5 font-display text-[10px] font-bold leading-none tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <span className="inline-flex items-center gap-0.5 text-ink/75" title="보유 부동산">
            📜<span>{deeds}</span>
          </span>
          <span className="text-ink/20">/</span>
          <span className="inline-flex items-center gap-0.5 text-ink/75" title="빌라 (총 채수)">
            🏠<span>{houses}</span>
          </span>
          <span className="text-ink/20">/</span>
          <span className="inline-flex items-center gap-0.5 text-monopoly-deep" title="아파트">
            🏢<span>{apts}</span>
          </span>
        </div>
      </div>

      {/* 우측: 현금 — 살짝 크게 */}
      <div className="ml-1 inline-flex shrink-0 items-baseline gap-0.5 rounded-md border-2 border-ink-line bg-white px-2.5 py-1.5 font-display tabular-nums shadow-[0_2px_0_0_#0F0C0A]">
        <span className="text-[10px] font-bold text-emerald-900/60">₩</span>
        <span className="text-[20px] font-extrabold leading-none text-ink">{fmt(p.cash)}</span>
        <span className="text-[10px] font-bold text-ink/55">만</span>
      </div>
    </div>
  );
}
