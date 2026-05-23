// 푸터 — 자기 턴이 아닌 다른 플레이어 strip (가로 한 줄)
// 각 칩: 작은 액자 + 이름 + 현금 + 부동산 수
// 끝에 🎲 주사위 굴리기 버튼
import AssetFrame from '@/components/AssetFrame.jsx';
import charactersData from '@/data/characters.json';
import koreaBoard from '@/boards/korea.json';
import { cn } from '@/lib/cn.js';
import { getCharacterImg } from '@/lib/assets.js';

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};
const PROP_TILES = koreaBoard.tiles.filter((t) => t.type === 'property');
const fmt = (n) => (n ?? 0).toLocaleString('ko-KR');
const PLAYER_SIGNATURE_COLORS = ['#DC2626', '#2563EB', '#F97316', '#16A34A'];

// 캐릭터별 동그란 아바타 background-position — 모자 크기/얼굴 높이 따라 미세조정
const AVATAR_POSITION = {
  yangban:    'center 24%',  // 얼굴 중심 크롭
  general:    '36% 23%',     // 투구 얼굴 중앙 맞춤
  magistrate: 'center 22%',  // 익선관
  farmer:     'center 23%',  // 패랭이
  chunDooHwan: 'center 18%',
  genghisKhan: 'center 20%',
  steveJobs: 'center calc(18% + 7px)',
  billGates: 'center calc(18% + 7px)',
  donaldTrump: 'center calc(18% + 7px)',
  leeJaeMyung: 'center 18%',
  wakizakaYasuharu: 'center 20%',
  toyotomiHideyoshi: 'center 20%',
  elonMusk: 'center calc(18% + 7px)',
  choiHyeokjun: 'center calc(24% + 15px)',
  haruna: 'center calc(24% + 15px)',
  choiDasol: 'center calc(24% + 10px)',
  choiDabin: 'center 48%',
  takedaShingen: 'center 18%',
  liuBei: 'center 18%',
  guanYu: 'center 18%',
  zhangFei: 'center 18%',
  caoCao: 'center 18%',
  luBu: 'calc(50% - 10px) 18%',
  dongZhuo: 'center 18%',
  luffy: 'center 18%',
  zoro: 'center 18%',
  shanks: 'center 18%',
  sanji: 'center 18%',
};

const AVATAR_SIZE = {
  yangban: '220%',
  general: '205%',
  magistrate: '220%',
  farmer: '220%',
  chunDooHwan: '220%',
  genghisKhan: '220%',
  steveJobs: '255%',
  billGates: '255%',
  donaldTrump: '255%',
  leeJaeMyung: '245%',
  wakizakaYasuharu: '245%',
  toyotomiHideyoshi: '245%',
  elonMusk: '255%',
  choiHyeokjun: '300%',
  haruna: '390%',
  choiDasol: '255%',
  choiDabin: '259%',
  takedaShingen: '255%',
  liuBei: '255%',
  guanYu: '255%',
  zhangFei: '255%',
  caoCao: '255%',
  luBu: '255%',
  dongZhuo: '255%',
  luffy: '255%',
  zoro: '255%',
  shanks: '255%',
  sanji: '255%',
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
    if (stage >= 1 && stage <= 3) houses += stage; // 빌라 N채
    if (stage === 5) apts += 1;
  }
  return { deeds, houses, apts };
}

export default function OtherPlayersStrip({ state, onStep, onViewPlayer, finished, winnerIndex, readyToEnd = false, locked = false }) {
  const others = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i !== state.turnIndex);

  return (
    <footer
      className="relative z-30 mx-2.5 -mt-1 flex min-h-[66px] items-stretch gap-2.5 overflow-visible rounded-2xl border border-slate-300/68 bg-white/14 px-2 pb-1.5 pt-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_1px_rgba(100,116,139,0.30),0_0_18px_rgba(71,85,105,0.22)]"
      data-component="OtherPlayersStrip"
      aria-disabled={locked}
    >
      {locked && (
        <div
          className="absolute inset-0 z-[90] rounded-2xl bg-ink/22 backdrop-blur-[2px]"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          aria-hidden="true"
        />
      )}
      <div className="flex flex-1 items-stretch gap-2.5 overflow-visible no-scrollbar">
        {others.map(({ p, i }) => (
          <PlayerChip key={i} player={p} index={i} state={state} onClick={() => !locked && onViewPlayer?.(i)} locked={locked} />
        ))}
      </div>

      <button
        type="button"
        onClick={onStep}
        disabled={finished || locked}
        className={cn(
          'group relative shrink-0 inline-flex w-[128px] items-center justify-center gap-1.5 rounded-lg border border-white/70 px-2 py-1.5 transition-transform duration-100 ease-out shadow-[0_10px_20px_-16px_rgba(36,57,74,0.8)]',
          'active:translate-y-[1px] active:shadow-none',
          finished || locked
            ? 'cursor-not-allowed bg-parchment-200 text-ink/40 shadow-none'
            : readyToEnd
              ? 'bg-monopoly-red text-white shadow-none hover:bg-monopoly-deep turn-end-ready-glow'
              : 'bg-monopoly-red/72 text-white/82 shadow-none hover:bg-monopoly-red',
        )}
      >
        <span className="font-display text-[18px] leading-none">↻</span>
        <span className="font-display text-[12px] font-extrabold uppercase tracking-wider">
          {finished ? `승자 ${winnerIndex + 1}p` : locked ? '확인중' : '턴종료'}
        </span>
      </button>

    </footer>
  );
}

function PlayerChip({ player: p, index: i, state, onClick, locked = false }) {
  const baseMeta = CHAR_META[p.character] ?? { name: p.character, color: '#666', slot: null };
  const meta = { ...baseMeta, name: displayPlayerName(p, baseMeta.name) };
  const frameColor = PLAYER_SIGNATURE_COLORS[i] ?? meta.color;
  const { deeds, houses, apts } = propertyStats(state, i);
  const characterImg = getCharacterImg(p.character);
  const isCashBankrupt = (p.cash ?? 0) <= 0;
  const stationCount = (state.board?.tiles ?? []).filter((tile) => tile.type === 'railroad' && tile.subType === 'station' && state.tileState?.[tile.pos]?.owner === i).length;
  const institutionCount = (state.board?.tiles ?? []).filter((tile) => tile.type === 'utility' && state.tileState?.[tile.pos]?.owner === i).length;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      data-player-strip-index={i}
      className={cn(
        'relative flex h-full shrink-0 items-center gap-1.5 overflow-visible rounded-lg border border-white/60 bg-white/92 py-1 pl-1 pr-1.5 text-left transition active:translate-y-[1px] active:shadow-none',
        locked && 'cursor-not-allowed',
        (p.bankrupt || isCashBankrupt) && 'opacity-55 grayscale saturate-50',
      )}
      style={{
        minWidth: 188,
        '--player-strip-color': frameColor,
        boxShadow: `0 0 0 2px ${frameColor}9a, 0 0 10px ${frameColor}8a, 0 0 24px ${frameColor}72, inset 0 0 16px ${frameColor}1c`,
      }}
    >
      {stationCount > 0 && (
        <>
          <div className="pointer-events-none absolute right-2 top-[-18px] z-[80] rounded-full border border-emerald-700 bg-emerald-100 px-2.5 py-1 font-display text-[10px] font-black text-emerald-800 shadow-[0_2px_0_#0F0C0A,0_0_18px_rgba(34,197,94,0.55)] station-income-pulse">
            +{stationCount * 10}만
          </div>
        </>
      )}
      {/* 캐릭터 — 동그랗게 얼굴 잘 보이게 (캐릭터별 모자 높이 따라 position 분기) */}
      <div className="ml-0 shrink-0">
        <div
          data-player-strip-avatar-index={i}
          className="h-11 w-11 rounded-full border-2 shadow-[0_0_0_2px_rgba(255,255,255,0.18),0_0_8px_rgba(255,213,79,0.24)]"
          style={{
            backgroundImage: characterImg ? `url(${characterImg})` : undefined,
            backgroundSize: AVATAR_SIZE[p.character] ?? '155%',
            backgroundPosition: AVATAR_POSITION[p.character] ?? 'center 22%',
            backgroundRepeat: 'no-repeat',
            backgroundColor: meta.color + '22',
            borderColor: '#FFD54F',
            filter: isCashBankrupt ? 'grayscale(1) brightness(0.72)' : undefined,
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
            style={{ backgroundColor: frameColor }}
          >
            {i + 1}p
          </span>
          <span className="truncate font-board font-extrabold text-[12px] leading-[1.18] text-ink">
            {meta.name}
          </span>
          {p.inJail && <span className="font-display text-[9px] font-bold text-monopoly-red">감옥</span>}
          {p.skipTurns > 0 && <span className="font-display text-[9px] font-bold text-amber-700">군복무</span>}
          {(p.bankrupt || isCashBankrupt) && <span className="font-display text-[9px] font-bold text-monopoly-red">파산</span>}
          {(stationCount > 0 || institutionCount > 0) && (
            <span className="inline-flex shrink-0 flex-col gap-0.5 leading-none">
              {stationCount > 0 && <span className="rounded-full border border-emerald-700 bg-emerald-50 px-1.5 py-0.5 font-display text-[7px] font-black leading-none text-emerald-800 shadow-[0_1px_0_#0F0C0A]">역장</span>}
              {institutionCount > 0 && <span className="rounded-full border border-sky-700 bg-sky-50 px-1.5 py-0.5 font-display text-[7px] font-black leading-none text-sky-800 shadow-[0_1px_0_#0F0C0A]">기관장</span>}
            </span>
          )}
        </div>
        {/* 2행: 집문서 / 집 / 아파트 */}
        <div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-ink-line/25 bg-white/55 px-1.5 py-0.5 font-display text-[9px] font-bold leading-none tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
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

      {/* 우측: 현금 */}
      <div
        data-player-cash-anchor={i}
        className="ml-0.5 mt-auto inline-flex shrink-0 items-baseline gap-0.5 self-end rounded-md border-2 border-ink-line bg-white px-2 py-1 font-display tabular-nums shadow-[0_2px_0_0_#0F0C0A]"
      >
        <span className="text-[10px] font-bold text-emerald-900/60">₩</span>
        <span className="text-[14px] font-extrabold leading-none text-ink">{fmt(p.cash)}</span>
        <span className="text-[10px] font-bold text-ink/55">만</span>
      </div>
    </button>
  );
}
