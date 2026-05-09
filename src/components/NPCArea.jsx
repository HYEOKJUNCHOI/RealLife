// NPC 멘트 영역 — 사회자 액자 + 말풍선 결
// AssetFrame npc.realtor (classic 액자) + 최근 5건 로그를 정리한 멘트
import voicelines from '@/data/voicelines.json';
import AssetFrame from '@/components/AssetFrame.jsx';
import { cn } from '@/lib/cn.js';

export default function NPCArea({ log = [] }) {
  const recent = log.slice(-5).reverse();
  const headLine =
    recent.length > 0
      ? summarize(recent[0])
      : '환영합니다. 권리증을 배포합니다.';

  return (
    <div
      className="flex items-stretch gap-3 rounded-md border-2 border-ink-line bg-parchment-50 p-2.5 shadow-deed-flat"
      data-component="NPCArea"
    >
      {/* 사회자 액자 (classic frame) */}
      <div className="shrink-0">
        <AssetFrame
          slot="npc.realtor"
          transparent
          className="w-14 drop-shadow-[0_4px_6px_rgba(15,12,10,0.18)]"
          rounded="rounded-sm"
        />
      </div>

      {/* 말풍선 + 라벨 + 로그 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="rounded-sm border-2 border-ink-line bg-monopoly-red px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-white">
              사회자
            </span>
            <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-ink/50">
              Banker · Host
            </span>
          </div>
          <span className="font-display text-[9px] font-semibold uppercase tracking-wider text-ink/40">
            최근 {recent.length}건
          </span>
        </div>

        {/* 메인 멘트 (말풍선) */}
        <div className="relative mt-1.5 rounded-md border-2 border-ink-line bg-white px-2.5 py-1.5">
          <p className="font-board text-[13px] leading-snug text-ink">
            {headLine}
          </p>
          {/* 말풍선 꼬리 (좌측) */}
          <span
            className="absolute -left-[7px] top-3 h-3 w-3 rotate-45 border-b-2 border-l-2 border-ink-line bg-white"
            aria-hidden="true"
          />
        </div>

        {/* 이전 로그 라인 */}
        {recent.length > 1 && (
          <ul className="mt-1.5 space-y-0.5">
            {recent.slice(1).map((e, i) => (
              <li
                key={i}
                className="flex items-baseline gap-1.5 truncate font-display text-[10px] font-medium uppercase tracking-wider text-ink/60"
              >
                <span className="font-bold text-ink/30">·</span>
                <span className="truncate">{summarize(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const pickLine = (path) => {
  let cur = voicelines;
  for (const k of path) {
    if (!cur || cur[k] == null) return null;
    cur = cur[k];
  }
  if (Array.isArray(cur)) return cur[Math.floor(Math.random() * cur.length)];
  return typeof cur === 'string' ? cur : null;
};

const summarize = (e) => {
  switch (e.kind) {
    case 'roll':
      return `주사위 ${e.d1}+${e.d2}=${e.sum}${e.isDouble ? ' · 더블!' : ''}`;
    case 'buy_property':
      return `🏠 매입 — ${e.price}만`;
    case 'rent':
      return `💸 통행료 ${e.rent}만 → ${e.ownerId + 1}p`;
    case 'go_pass':
      return pickLine(['realtor', 'go_pass']) ?? `월급 +${e.amt}만`;
    case 'go_exact':
      return pickLine(['realtor', 'go_exact']) ?? `🎉 성과급 +${e.amt}만`;
    case 'event_card':
      return `📜 사회 이벤트 — ${e.card}`;
    case 'year_end':
      return `📅 ${e.year}년차 결산`;
    case 'parking_jackpot':
      return `🎰 휴게소 잭팟 +${e.amt}만`;
    case 'arrive_station':
      return `🚉 역장 부임 (적립 ${e.collected}만)`;
    case 'arrive_hub':
      return `🚄 환승 허브 (${e.type})`;
    case 'go_to_jail':
      return '🚓 감옥행';
    case 'deathmatch_start':
      return '🔥 데스매치 시작';
    case 'game_end':
      return `🏆 승자 ${e.winner + 1}p`;
    case 'credit_loan':
      return '💳 신용대출 1,000만 신청';
    case 'tax':
      return `${e.kind === 'income' ? '소득세' : '사치세'} -${e.amt}만`;
    default:
      return e.kind;
  }
};
