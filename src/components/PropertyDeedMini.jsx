// 蹂댁쑀 遺?숈궛 mini 沅뚮━利???5????以?而댄뙥?? ?대┃ ??PropertyModal ?대┝.
// 由щ뵒?먯씤: 吏꾪븳 ?⑥깋 ?ㅻ뜑 + ?대え?곗퐯 ?꾨?猷???+ ?④퀎 progress ?꾩옣
import { useGameStore } from '@/stores/gameStore.js';
import { currentPrice, rentFromStage } from '@/engine/inflation.js';
import { APARTMENT_INCOME_RATIO, round10 } from '@/engine/constants.js';
import { cn } from '@/lib/cn.js';
import AssetFrame from '@/components/AssetFrame.jsx';
import charactersData from '@/data/characters.json';

// ?ㅻ뜑??吏꾪븳 ?⑥깋 (李멸퀬 ?대?吏: 蹂대씪/?ㅼ씠鍮????꾨땶, 而щ윭??蹂몄깋 吏꾪븯寃?
const COLOR_HEADER_BG = {
  brown:     'bg-prop-brown',
  lightblue: 'bg-prop-lightblue',
  pink:      'bg-prop-pink',
  orange:    'bg-prop-orange',
  red:       'bg-prop-red',
  yellow:    'bg-prop-yellow',
  green:     'bg-prop-green',
  darkblue:  'bg-prop-darkblue',
};
// 而щ윭??hex (湲濡쒖슦????tailwind config ? ?숆린)
const COLOR_HEX = {
  brown:     '#955436',
  lightblue: '#AAE0FA',
  pink:      '#D93A96',
  orange:    '#F7941D',
  red:       '#ED1B24',
  yellow:    '#FEF200',
  green:     '#1FB25A',
  darkblue:  '#0072BB',
};
// 而щ윭???쒓? ?대쫫 (?쒖꽭 ?먮━??洹몃９ ?쒖떆)
const COLOR_NAME_KO = {
  brown:     '갈색',
  lightblue: '하늘',
  pink:      '분홍',
  orange:    '주황',
  red:       '빨강',
  yellow:    '노랑',
  green:     '초록',
  darkblue:  '파랑',
};
const COLOR_HEADER_TEXT = {
  brown:     'text-white',
  lightblue: 'text-ink',
  pink:      'text-white',
  orange:    'text-ink',
  red:       'text-white',
  yellow:    'text-ink',
  green:     'text-white',
  darkblue:  'text-white',
};
const COLOR_TO_SKYLINE = {
  brown:     'skyline.brown',
  lightblue: 'skyline.lightblue',
  pink:      'skyline.pink',
  orange:    'skyline.orange',
  red:       'skyline.red',
  yellow:    'skyline.yellow',
  green:     'skyline.green',
  darkblue:  'skyline.darkblue',
};
// ?④퀎 ?꾩옣 ??(?꾩옱 ?④퀎源뚯? 梨꾩?)
const COLOR_STAGE_FILL = {
  brown:     'bg-prop-brown',
  lightblue: 'bg-prop-lightblue',
  pink:      'bg-prop-pink',
  orange:    'bg-prop-orange',
  red:       'bg-prop-red',
  yellow:    'bg-prop-yellow',
  green:     'bg-prop-green',
  darkblue:  'bg-prop-darkblue',
};

// 罹먮┃??id ??硫뷀? (state.players[i].character 濡?議고쉶)
const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));

// playerId ??洹??뚮젅?댁뼱??罹먮┃??而щ윭
// ?좑툘 characters.json ???몃뜳????state.players ???몃뜳??(罹먮┃???좏깮 ?쒖꽌 ?곕씪 ?ㅻ쫫)
const playerColor = (state, playerId) => {
  const p = state?.players?.[playerId];
  return CHAR_META[p?.character]?.color ?? '#666';
};

// ?대え?곗퐯?쇰줈 ?④퀎 ?쒗쁽
const STAGE_EMOJI = ['□', '🏠', '🏠🏠', '🏠🏠🏠', '🏢', '🏢'];
const STAGE_LABEL = {
  1: '빌라×1',
  2: '빌라×2',
  3: '빌라×3',
  5: '아파트 완성',
};
const VILLA_STAGES = [1, 2, 3]; // 빌라 단계는 아이콘 개수로 표시

// BRAINSTORM 7-2: ?쒖꽭 횞 RENT_RATIO[stage] 鍮꾩쑉 ?듯뻾猷?// ?뺣낫??????owner ?놁뼱??projection 蹂댁씠寃?媛吏?owner 二쇱엯
function stageRents(state, pos) {
  const ts = state.tileState[pos] ?? {};
  return [0, 1, 2, 3, 4, 5].map((key) => {
    const fakeState = {
      ...state,
      tileState: {
        ...state.tileState,
        [pos]: { ...ts, stage: key, owner: ts.owner ?? 0, mortgaged: false },
      },
    };
    return { key, rent: rentFromStage(fakeState, pos) };
  });
}

function VillaMarks({ count = 0, active = false, small = false }) {
  const safeCount = Math.max(0, Math.min(3, count));
  return (
    <span className={cn('inline-flex items-center justify-center', small ? 'gap-[1px]' : 'gap-[2px]')}>
      {Array.from({ length: safeCount }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'inline-block leading-none drop-shadow-[0_1px_0_rgba(15,12,10,0.45)]',
            small ? 'text-[9px]' : 'text-[12px]',
            active ? 'opacity-100' : 'opacity-25 grayscale',
          )}
        >
          🏠
        </span>
      ))}
    </span>
  );
}
function PremiumStars({ premium }) {
  if (!premium || premium <= 0) return null;
  const count = Math.min(Math.ceil(premium / 25), 3);
  return (
    <div className="flex items-center justify-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="text-[8px] drop-shadow-[0_0_3px_rgba(201,162,75,0.9)]"
          style={{ color: '#FFD700' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function PropertyDeedMini({ pos, className }) {
  const state = useGameStore((s) => s.state);
  if (!state || pos == null) return null;

  const tile = state.board.tiles[pos];
  if (!tile || tile.type !== 'property') return null;

  const ts = state.tileState[pos] ?? {};
  const price = currentPrice(state, pos);
  const currentStage = ts.stage ?? 0;
  const ownerColor = ts.owner != null ? playerColor(state, ts.owner) : null;
  const skylineSlot = COLOR_TO_SKYLINE[tile.color];
  const rents = stageRents(state, pos);

  const glow = COLOR_HEX[tile.color] ?? '#955436';

  return (
    <div
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden',
        'border-2 border-ink-line rounded-md',
        'bg-parchment-50 ring-1 ring-inset ring-ink-line/55',
        'transition-transform duration-150 hover:-translate-y-0.5',
        ts.mortgaged && 'opacity-60 saturate-50',
        className,
      )}
      style={{
        // 而щ윭???쒓렇?덉쿂 湲濡쒖슦 ?????멸낸 ?덉そ outline + outset blur
        boxShadow: `0 0 0 2px ${glow}cc, 0 0 0 5px ${glow}55, 0 0 14px 2px ${glow}80, 0 3px 0 0 #0F0C0A`,
      }}
      data-component="PropertyDeedMini"
    >
      {/* ?? 1. ?ㅻ뜑: 吏꾪븳 ?⑥깋 而щ윭??+ ?ㅼ뭅?대씪??tint + TITLE DEED + 蹂??? */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-b-2 border-ink-line',
          COLOR_HEADER_BG[tile.color] || 'bg-neutral-600',
        )}
        style={{ aspectRatio: '5 / 2.2' }}
      >
        {/* ?ㅼ뭅?대씪???ㅻ쾭?덉씠 (?щ챸????쾶 ???ㅻ뜑 ???대┝) */}
        {skylineSlot && (
          <AssetFrame
            slot={skylineSlot}
            rounded="rounded-none"
            className="absolute inset-0 !aspect-auto h-full w-full scale-110 origin-center"
            style={{ opacity: 0.82, mixBlendMode: 'normal' }}
          />
        )}
        {/* ?섎떒 洹몃씪?곗씠????蹂몃Ц怨?遺?쒕윭???꾪솚 */}
        <div
          className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/30 to-transparent"
          aria-hidden="true"
        />
        {/* TITLE DEED 캡슐 */}
        <div className="absolute inset-x-0 top-[3px] flex justify-center px-1 text-center">
          <div
            className={cn(
              'rounded-full border border-white/22 bg-black/34 px-2 py-[2px] font-display text-[6px] font-bold uppercase leading-none',
              'tracking-[0.18em] text-white backdrop-blur-[3px]',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.34)]',
            )}
          >
            Title Deed
          </div>
        </div>
        {/* ?꾨━誘몄뾼 蹂????ㅻ뜑 以묒븰 ?섎떒 */}
        {ts.premium > 0 && (
          <div className="absolute inset-x-0 bottom-[3px] flex justify-center">
            <PremiumStars premium={ts.premium} />
          </div>
        )}
      </div>

      {/* ?? 2. ?꾩떆紐??? */}
      <div className="shrink-0 border-b-2 border-ink-line bg-parchment-50 px-1.5 py-1.5 text-center">
        <div className="rounded-full border-2 border-ink-line bg-white/92 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_2px_0_#0F0C0A,0_5px_10px_rgba(15,12,10,0.22)]">
          <h3 className="font-board font-extrabold text-[17px] leading-none text-ink tracking-tight">
            {tile.names.ko}
          </h3>
          {tile.names.region && (
            <div className="mt-0.5 font-display text-[6.5px] font-semibold uppercase tracking-[0.14em] text-ink/55">
              {tile.names.region}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-b-2 border-ink-line bg-parchment-100 px-1 py-1">
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center rounded-[5px] px-1.5 py-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{ backgroundColor: '#1A1612' }}
        >
          <div className="text-center">
            <div className="font-display text-[5.5px] font-bold uppercase leading-none tracking-[0.12em] text-white">
              매입가
            </div>
            <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
              <span className="font-display text-[12px] font-bold leading-none tabular-nums text-white">
                {tile.basePrice ?? '-'}
              </span>
              <span className="font-display text-[5.5px] font-semibold text-white/55">만</span>
            </div>
          </div>
          <span className="h-6 w-px bg-white/20" aria-hidden="true" />
          <div className="text-center">
            <div className="font-display text-[5.5px] font-bold uppercase leading-none tracking-[0.12em] text-[#FFD700]">
              현시세
            </div>
            <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
              <span
                className={cn(
                  'font-display text-[12px] font-bold leading-none tabular-nums',
                  price < (tile.basePrice ?? 0)
                    ? 'text-monopoly-red'
                    : 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.45)]',
                )}
              >
                {price}
              </span>
              <span className="font-display text-[5.5px] font-semibold text-white/55">만</span>
            </div>
          </div>
        </div>
        <div className="mt-1 h-2 rounded-full border border-ink-line/55 bg-[#80848c] shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_1px_0_#0F0C0A]" aria-hidden="true" />
      </div>

      {/* 같은 색상 그룹의 보유 상태를 표시한다. */}
      <div className="shrink-0 border-b-2 border-ink-line bg-parchment-100 px-1.5 py-1.5">
        <div className="flex flex-wrap items-center justify-center gap-1">
          {state.board.tiles
            .filter((t) => t.type === 'property' && t.color === tile.color)
            .map((t) => {
              const tts = state.tileState[t.pos] ?? {};
              const isMine = tts.owner != null && tts.owner === ts.owner;
              const otherOwner =
                tts.owner != null && !isMine ? tts.owner : null;
              const otherColor =
                otherOwner != null ? playerColor(state, otherOwner) : null;
              const isUnowned = tts.owner == null;
              return (
                <span
                  key={t.pos}
                  title={t.names.ko + (otherOwner != null ? ` - ${otherOwner + 1}P 보유` : isUnowned ? ' - 빈 땅' : '')}
                  className={cn(
                    'relative min-w-[34px] rounded-[5px] border px-1.5 py-1 text-center font-board text-[11px] font-extrabold leading-none tracking-tight',
                    isMine
                      ? cn(
                          COLOR_HEADER_BG[tile.color] || 'bg-neutral-500',
                          COLOR_HEADER_TEXT[tile.color] || 'text-white',
                          'border-ink-line shadow-[0_2px_0_0_#0F0C0A,0_4px_8px_rgba(15,12,10,0.28)]',
                        )
                      : isUnowned
                        ? 'border-neutral-400 bg-[#d6d8dc] text-neutral-600 shadow-[0_2px_0_rgba(15,12,10,0.32),0_4px_8px_rgba(15,12,10,0.16)]'
                        : 'border-ink-line/50 bg-[#aeb3ba] text-ink shadow-[0_2px_0_rgba(15,12,10,0.35),0_4px_8px_rgba(15,12,10,0.18)]',
                  )}
                >
                  {/* ?ㅻⅨ ?щ엺 蹂댁쑀 ?쒖떆 ????以묒븰 ??(?섑뙣??8 ?꾩튂) */}
                  {otherColor && (
                    <span
                      className="absolute left-1/2 -top-[5px] h-[9px] w-[9px] -translate-x-1/2 rounded-full border-[1.5px] border-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                      style={{ backgroundColor: otherColor }}
                      aria-hidden="true"
                    />
                  )}
                  {t.names.ko}
                </span>
              );
            })}
        </div>
      </div>

      {/* 임대료 + 단계 게이지 — 임대료는 독립 컨테이너로 분리 */}
      <div className="flex-1 min-h-0 border-t-2 border-ink-line bg-parchment-50 px-[5px] py-[5px]">
        {(() => {
          const currentRent = rents.find((r) => r.key === currentStage)?.rent ?? 0;
          const apartmentDone = currentStage === 5;
          const apartmentIncome = round10((tile.houseCost ?? 0) * APARTMENT_INCOME_RATIO);

          return (
            <div className="flex h-full min-h-[42px] flex-col justify-between gap-1">
              <div className="flex items-center justify-between rounded-[6px] border border-ink-line bg-white px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_1px_0_0_#0F0C0A]">
                <span className="font-display text-[7px] font-extrabold uppercase tracking-[0.13em] text-ink/58">
                  임대료
                </span>
                <div className="flex items-baseline gap-0.5 font-display font-extrabold leading-none tabular-nums">
                  <span className="text-[20px] text-monopoly-red">{currentRent}</span>
                  <span className="text-[8px] font-bold text-ink/48">만</span>
                </div>
              </div>

              {apartmentDone ? (
                <div
                  className="flex min-h-[31px] items-center justify-center rounded-[7px] border border-ink-line bg-[#F4B000] px-1.5 py-1 text-center font-board text-[12px] font-extrabold leading-none text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_1px_0_0_#0F0C0A,0_0_14px_rgba(244,176,0,0.95)]"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.65), 0 1px 0 #0F0C0A, 0 0 16px rgba(244,176,0,0.95), 0 0 28px rgba(244,176,0,0.45)',
                  }}
                >
                  <span className="mr-1 text-[14px] leading-none">🏢</span>
                  <span className="truncate">아파트 완성 · 월세 +{apartmentIncome}만</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {VILLA_STAGES.map((stageKey) => {
                    const active = currentStage >= stageKey;
                    return (
                      <div
                        key={stageKey}
                        className={cn(
                          'relative flex min-h-[31px] min-w-0 flex-col items-center justify-center rounded-[6px] border border-ink-line px-0.5 py-[3px] text-center font-board leading-none shadow-[0_1px_0_0_#0F0C0A]',
                          active ? 'text-white' : 'bg-parchment-50 text-ink/35',
                        )}
                        style={{ backgroundColor: active ? glow : undefined }}
                      >
                        <VillaMarks count={stageKey} active={active} small />
                        <span className="mt-0.5 max-w-full truncate text-[7px] leading-none">
                          {STAGE_LABEL[stageKey]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 而щ윭???쒓렇?덉쿂 ???곗긽????洹몃９ ?됯퉼 ?쒖떇 */}
      {ts.owner != null && (
        <div
          className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white/80 shadow-sm"
          style={{ backgroundColor: glow }}
          title={`${COLOR_NAME_KO[tile.color] ?? tile.color} 그룹`}
        />
      )}

      {/* ????꾩옣 ???ш퀬 ?먮졆???곸깋 stamp 寃?*/}
      {ts.mortgaged && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="rotate-[-14deg] border-[4px] border-monopoly-deep bg-monopoly-red/25 px-4 py-2 font-display text-[28px] font-extrabold uppercase tracking-[0.2em] text-monopoly-deep shadow-[0_3px_0_0_#9F1F1F,0_0_18px_rgba(159,31,31,0.55)]"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.45)' }}
          >
            담보
          </div>
        </div>
      )}
    </div>
  );
}



