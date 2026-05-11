// 메인 게임 화면 — 실제 보드 + 실제 주사위 입력 흐름
// 중앙 스테이지, 우측 정산/카드 패널, 하단 플레이어 스트립으로 구성
// 카드/정산/환승/감옥 UX는 실제 플레이 진행을 방해하지 않도록 작게 제어한다.




import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';
import { HUB_TELEPORT_FEE, JAIL_BAIL, JAIL_TURNS } from '@/engine/constants.js';
import charactersData from '@/data/characters.json';
import voicelines from '@/data/voicelines.json';

import CurrentPlayerStage from '@/components/CurrentPlayerStage.jsx';
import OtherPlayersStrip from '@/components/OtherPlayersStrip.jsx';
import PropertyModal from '@/components/modals/PropertyModal.jsx';
import PropertyDeedMini from '@/components/PropertyDeedMini.jsx';
import CardArtwork from '@/components/CardArtwork.jsx';
import TradeModal from '@/components/modals/TradeModal.jsx';
import TradeSelectModal from '@/components/modals/TradeSelectModal.jsx';
import EventModal from '@/components/modals/EventModal.jsx';
import YearEndModal from '@/components/modals/YearEndModal.jsx';
import DeathmatchModal from '@/components/modals/DeathmatchModal.jsx';
import RecoveryModal from '@/components/modals/RecoveryModal.jsx';
import LoanModal from '@/components/modals/LoanModal.jsx';
import { useGameDialog } from '@/components/GameDialog.jsx';
import { cn } from '@/lib/cn.js';
import { getBgmPreference, pauseBgm, playBgm } from '@/lib/bgm.js';
import { getCharacterImg } from '@/lib/assets.js';

const AVATAR_POSITION = {
  yangban: 'center 30%',
  general: '36% 29%',
  magistrate: 'center 26%',
  farmer: 'center 26%',
  chunDooHwan: 'center 18%',
  genghisKhan: 'center 24%',
  steveJobs: 'center 24%',
  billGates: 'center 24%',
  donaldTrump: 'center 22%',
  leeJaeMyung: 'center 22%',
  wakizakaYasuharu: 'center 24%',
  toyotomiHideyoshi: 'center 24%',
};
const AVATAR_SIZE = {
  general: '135%',
  chunDooHwan: '145%',
  genghisKhan: '142%',
  steveJobs: '138%',
  billGates: '138%',
  donaldTrump: '138%',
  leeJaeMyung: '138%',
  wakizakaYasuharu: '140%',
  toyotomiHideyoshi: '140%',
};

const CHAR_META = Object.fromEntries(charactersData.korea.map((c) => [c.id, c]));
const displayPlayerName = (player, fallback) => {
  const name = player?.name?.trim();
  return name && name !== player?.character ? name : fallback;
};
const tileNameForPos = (state, pos) => state?.board?.tiles?.[pos]?.names?.ko ?? state?.board?.tiles?.[pos]?.name ?? '도착한 땅';
const fmt = (n) => Math.round(n ?? 0).toLocaleString('ko-KR');

export default function GameMain({ onExit }) {
  const state = useGameStore((s) => s.state);
  const log = useGameStore((s) => s.log);
  const lastTurn = useGameStore((s) => s.lastTurn);
  const step = useGameStore((s) => s.step);
  const dialog = useGameDialog();
  const [jailDialogOpen, setJailDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  // modal 키별 개별 구독 — 객체 전체 구독 시 shallow 비교 오판 방지
  const modalProperty  = useGameStore((s) => s.modal.property);
  const modalTrade     = useGameStore((s) => s.modal.trade);
  const modalTradeSelect = useGameStore((s) => s.modal.tradeSelect);
  const modalEvent     = useGameStore((s) => s.modal.event);
  const [showEventModal, setShowEventModal] = useState(false);
  const modalYearEnd   = useGameStore((s) => s.modal.yearEnd);
  const modalDeathmatch = useGameStore((s) => s.modal.deathmatch);
  const modalRecovery  = useGameStore((s) => s.modal.recovery);
  const modalLoan = useGameStore((s) => s.modal.loan);
  const closePropertyModal = useGameStore((s) => s.closePropertyModal);
  const openPropertyModal = useGameStore((s) => s.openPropertyModal);
  const buyProperty = useGameStore((s) => s.buyProperty);
  const revealCardEffect = useGameStore((s) => s.revealCardEffect);
  const closeTradeModal = useGameStore((s) => s.closeTradeModal);
  const closeTradeSelect = useGameStore((s) => s.closeTradeSelect);
  const closeRecoveryModal = useGameStore((s) => s.closeRecoveryModal);
  const openLoanModal = useGameStore((s) => s.openLoanModal);
  const closeLoanModal = useGameStore((s) => s.closeLoanModal);
  const confirmEvent = useGameStore((s) => s.confirmEvent);
  const confirmYearEnd = useGameStore((s) => s.confirmYearEnd);
  const confirmDeathmatch = useGameStore((s) => s.confirmDeathmatch);
  const restartSameGame = useGameStore((s) => s.restartSameGame);
  const endTurn = useGameStore((s) => s.endTurn);
  const restoreSnapshot = useGameStore((s) => s.restoreSnapshot);
  const addToast = useGameStore((s) => s.addToast);
  const tickClock = useGameStore((s) => s.tickClock);
  const hubTeleportAction = useGameStore((s) => s.hubTeleport);
  const lifeChangeAction = useGameStore((s) => s.lifeChange);
  const skipLifeChangeAction = useGameStore((s) => s.skipLifeChange);
  const initialDealPlayedRef = useRef(false);
  const prevTurnIndexRef = useRef(null);
  const jailPromptKeyRef = useRef(null);
  const skipPromptKeyRef = useRef(null);
  const [showInitialDeal, setShowInitialDeal] = useState(false);
  const [showTurnCardTouch, setShowTurnCardTouch] = useState(false);
  const [boardTurn, setBoardTurn] = useState(null);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [turnResult, setTurnResult] = useState(null);
  const [turnMovedKey, setTurnMovedKey] = useState(null);
  const [aiTurnSummary, setAiTurnSummary] = useState(null);
  const [hubTeleport, setHubTeleport] = useState(null);
  const [cardSettlementSeenKey, setCardSettlementSeenKey] = useState(null);
  const autoBoardTurnKeyRef = useRef(null);
  const diceSnapshotRef = useRef(null);
  const [diceLocked, setDiceLocked] = useState(false);
  const [diceMode, setDiceMode] = useState('app');
  const [lastDiceRoll, setLastDiceRoll] = useState(null);
  const [bgmEnabled, setBgmEnabled] = useState(() => getBgmPreference());
  const [globalNotice, setGlobalNotice] = useState(null);
  const [noticeLog, setNoticeLog] = useState([]);
  const [viewPlayerIndex, setViewPlayerIndex] = useState(null);
  const [propertyShatter, setPropertyShatter] = useState(null);

  const initialDealCards = useMemo(() => {
    if (!state?.tileState || !state?.players?.length || !state?.board?.tiles) return [];
    const tilesByPos = Object.fromEntries(state.board.tiles.map((tile) => [tile.pos, tile]));
    const byPlayer = state.players.map(() => []);
    Object.entries(state.tileState).forEach(([pos, tileState]) => {
      const owner = tileState?.owner;
      if (typeof owner !== 'number' || !byPlayer[owner]) return;
      const tile = tilesByPos[pos];
      if (!tile) return;
      byPlayer[owner].push({ pos: Number(pos), title: tile.name, color: tile.color ?? '#d9b45f' });
    });
    byPlayer.forEach((items) => items.sort((a, b) => a.pos - b.pos));
    const playerOrder = [
      state.turnIndex,
      ...state.players.map((_, index) => index).filter((index) => index !== state.turnIndex),
    ];
    return playerOrder.flatMap((playerIndex, recipientOrder) => (
      byPlayer[playerIndex].slice(0, 4).map((card, cardIndex) => ({
        ...card,
        playerIndex,
        cardIndex,
        recipientOrder,
      }))
    ));
  }, [state]);

  useEffect(() => {
    if (!state) return undefined;
    if (state._forceInitialDeal && !state._initialDealShown) {
      initialDealPlayedRef.current = true;
      state._initialDealShown = true;
      setShowInitialDeal(true);
      return undefined;
    }
    if (initialDealPlayedRef.current || state._initialDealShown) return undefined;
    initialDealPlayedRef.current = true;
    state._initialDealShown = true;
    setShowInitialDeal(false);
    return undefined;
  }, [state?._gameStartNonce]);

  useEffect(() => {
    document.documentElement.classList.toggle('initial-deal-live', showInitialDeal);
    return () => document.documentElement.classList.remove('initial-deal-live');
  }, [showInitialDeal]);

  useEffect(() => {
    if (!state) return undefined;
    const currentTurn = state.turnIndex ?? 0;
    if (prevTurnIndexRef.current == null) {
      prevTurnIndexRef.current = currentTurn;
      return undefined;
    }
    if (prevTurnIndexRef.current === currentTurn || showInitialDeal) return undefined;
    prevTurnIndexRef.current = currentTurn;
    setShowTurnCardTouch(true);
    const timer = window.setTimeout(() => setShowTurnCardTouch(false), 950);
    return () => window.clearTimeout(timer);
  }, [state?.turnIndex, showInitialDeal]);

  useEffect(() => {
    document.documentElement.classList.toggle('turn-card-touch-live', showTurnCardTouch);
    return () => document.documentElement.classList.remove('turn-card-touch-live');
  }, [showTurnCardTouch]);

  useEffect(() => {
    if (!bgmEnabled) {
      pauseBgm();
      return undefined;
    }
    playBgm().catch(() => {
      setBgmEnabled(false);
      addToast?.({ message: 'BGM 버튼을 한 번 더 눌러주세요.', tone: 'warn' });
    });
    return undefined;
  }, [bgmEnabled, addToast]);

  const handleToggleBgm = useCallback(() => {
    if (bgmEnabled) {
      pauseBgm();
      setBgmEnabled(false);
      return;
    }
    playBgm().then(() => {
      setBgmEnabled(true);
    }).catch(() => {
      setBgmEnabled(false);
      addToast?.({ message: 'BGM 재생이 차단되었습니다. 버튼을 다시 눌러주세요.', tone: 'warn' });
    });
  }, [bgmEnabled, addToast]);


  // 실시간 게임 시간: 실제 플레이에서는 1초 단위로 흐른다.
  useEffect(() => {
    if (!state || state.finished || state.realTimeMode === false) return undefined;
    tickClock?.();
    const timer = window.setInterval(() => tickClock?.(), 1000);
    return () => window.clearInterval(timer);
  }, [state?._gameStartNonce, state?.finished, state?.realTimeMode, tickClock]);

  // 구매 대기/주사위 흐름: 턴 변경 또는 구매 완료 시 대기 상태를 정리한다.
  useEffect(() => undefined, []);


  useEffect(() => {
    if (!pendingPurchase || !state) return;
    const currentTurnKey = `${state.round ?? 0}-${state.turnIndex ?? 0}`;
    const owner = state.tileState?.[pendingPurchase.pos]?.owner;
    if (pendingPurchase.turnKey !== currentTurnKey || owner != null) setPendingPurchase(null);
  }, [pendingPurchase, state?.round, state?.turnIndex, state?.tileState]);


  const currentTurnKey = state ? `${state.round ?? 0}-${state.turnIndex ?? 0}` : null;
  const hasMovedThisTurn = !!currentTurnKey && turnMovedKey === currentTurnKey;
  const diceInputLocked = diceLocked || hasMovedThisTurn;

  useEffect(() => {
    setTurnResult(null);
    setDiceLocked(false);
    setTurnMovedKey(null);
    setCardSettlementSeenKey(null);
    setLastDiceRoll(null);
    const activePlayer = state?.players?.[state?.turnIndex ?? 0];
    const activeBaseMeta = activePlayer
      ? CHAR_META[activePlayer.character] ?? { name: activePlayer.character, color: '#d83b2f' }
      : { name: '플레이어', color: '#d83b2f' };
    const activeName = activePlayer ? displayPlayerName(activePlayer, activeBaseMeta.name) : activeBaseMeta.name;
    if (showInitialDeal) {
      setGlobalNotice(null);
      diceSnapshotRef.current = null;
      return;
    }
    // 이동 전 차례/주사위 안내 팝업은 띄우지 않는다.
    // 흐름은 주사위 → 말 이동 → 전체 보드 복귀 → 사회자창+알림창만 사용한다.
    diceSnapshotRef.current = null;
  }, [state?.round, state?.turnIndex, showInitialDeal]);

  const pushGlobalNotice = (notice) => {
    if (!notice) return;
    const item = { ...notice, id: Date.now() + Math.random() };
    setNoticeLog((prev) => [item, ...prev].slice(0, 8));
    setGlobalNotice(item);
  };

  const showNoticeLog = () => {
    const latest = noticeLog[0];
    if (!latest) return;
    setGlobalNotice({ ...latest, id: Date.now() + Math.random(), replay: true, subtle: false });
  };

  const triggerPropertyShatter = (pos, label = '권리증 파괴') => {
    if (pos == null) return;
    setPropertyShatter({ pos, label, id: Date.now() + Math.random() });
    window.setTimeout(() => setPropertyShatter((current) => current?.pos === pos ? null : current), 1150);
  };

  const cardSettlementKey = turnResult?.kind === 'card'
    ? `${lastTurn?.playerId ?? ''}|${turnResult.cardKind ?? ''}|${turnResult.cardId ?? ''}|${turnResult.eventId ?? ''}|${turnResult.text ?? ''}`
    : null;
  const cardSettlementPending = !!cardSettlementKey && cardSettlementSeenKey !== cardSettlementKey;

  const turnBriefing = useMemo(() => {
    if (cardSettlementPending) return null;
    if (lastTurn?.events?.length && state) return buildTurnBriefing(lastTurn, state);
    return null;
  }, [lastTurn, state, cardSettlementPending]);

  const handleOpenResultCard = (card) => {
    if (card?.kind === 'buy') {
      openPropertyModal?.(card.pos, card.visitorId);
      return;
    }
    if (card?.kind === 'card' && cardSettlementKey) {
      revealCardEffect?.(lastTurn?.playerId ?? state?.turnIndex ?? 0, card.rawEvent ?? card);
      setCardSettlementSeenKey(cardSettlementKey);
      pushGlobalNotice({
        kind: 'card_revealed',
        speaker: '사회자',
        title: card.cardName ?? card.title ?? '카드 공개',
        text: card.revealText ?? card.text ?? '카드 효과를 정산합니다.',
        icon: card.icon ?? '💡',
        subtle: false,
      });
      const revealedEvent = card.rawEvent ?? card;
      if (revealedEvent?.lossPos != null && ['war', 'multihouse', 'fire'].includes(revealedEvent.kind)) {
        window.setTimeout(() => triggerPropertyShatter(revealedEvent.lossPos, revealedEvent.effectText ?? '부동산 피해'), 360);
      }
      if ((card.rawEvent ?? card)?.cardId === 'life_change') {
        window.setTimeout(async () => {
          const playerId = lastTurn?.playerId ?? state?.turnIndex ?? 0;
          const use = await dialog.confirm({
            title: '인생체인지',
            badgeText: '레어 찬스카드',
            message: '다른 사람과 현금·부동산·대출·카드 상태를 바꿀 수 있습니다. 진행할까요?',
            okText: '체인지',
            cancelText: '스킵',
            tone: 'danger',
          });
          if (!use) {
            skipLifeChangeAction?.(playerId);
            return;
          }
          addToast?.({ message: '푸터에서 바꿀 상대의 스테이터스를 열고 체인지 버튼을 누르세요.', tone: 'warn' });
        }, 520);
      }
    }
  };

  const handleBuyProperty = (playerId, pos) => {
    const tile = state?.board?.tiles?.[pos];
    const price = tile ? (state.tileState?.[pos]?.price ?? undefined) : undefined;
    const ownedPropertyCount = Object.entries(state?.tileState ?? {}).filter(([ownedPos, tileState]) => {
      const ownedTile = state?.board?.tiles?.[Number(ownedPos)];
      return ownedTile?.type === 'property' && tileState?.owner === playerId;
    }).length;
    if (ownedPropertyCount >= 8) {
      addToast?.({ message: '부동산은 최대 8개까지만 보유할 수 있습니다. 하나 정리하고 매입하세요.', tone: 'warn' });
      pushGlobalNotice({
        kind: 'buy_limit',
        speaker: '중개 NPC',
        title: '보유 한도 초과',
        text: '부동산은 8개까지만 보유할 수 있습니다. 하나 정리하고 다시 매입하세요.',
        icon: '⚠️',
        subtle: false,
      });
      return false;
    }
    const ok = buyProperty?.(playerId, pos);
    if (!ok) {
      addToast?.({ message: '매입에 실패했습니다. 잔액 또는 소유 상태를 확인해주세요.', tone: 'warn' });
      return false;
    }
    const tileName = tile?.names?.ko ?? tile?.name ?? '부동산';
    setPendingPurchase(null);
    setDiceLocked(true);
    setTurnResult({
      kind: 'bought',
      title: '매입 완료',
      text: `${tileName} 매입 완료`,
      icon: '🏠',
      pos,
      visitorId: playerId,
      amount: price,
      cash: useGameStore.getState().state?.players?.[playerId]?.cash,
    });
    pushGlobalNotice({ kind: 'bought', speaker: '중개 NPC', title: '매입 완료!', text: `${tileName} · ${signedMoney(-(price ?? 0))} 지출`, icon: '🏠', amount: -(price ?? 0), cash: useGameStore.getState().state?.players?.[playerId]?.cash });
    closePropertyModal?.();
    return true;
  };

  const hostLine = useMemo(() => {
    if (showInitialDeal) return '권리증을 나눠드리는 중입니다.';
    if (pendingPurchase) return `${tileNameForPos(state, pendingPurchase.pos)}에 도착했습니다. 주인이 없는 땅인데 구매할까요?`;
    if (turnResult?.kind === 'buy') return `${tileNameForPos(state, turnResult.pos)}에 도착했습니다. 주인이 없는 땅인데 구매할까요?`;
    if (turnResult?.kind === 'rent') return `아… ${turnResult.ownerName ?? '소유자'}님 땅입니다 😭 통행료 ${turnResult.amount ?? 0}만 나갑니다.`;
    if (turnResult?.kind === 'tax') return `${turnResult.title ?? '세금'}입니다 😅 ${turnResult.amount ?? ''}만 납부할게요.`;
    if (turnResult?.kind === 'bought') return '좋습니다 🎉 권리증이 내 카드 슬롯에 들어왔습니다.';
    if (turnResult?.kind === 'moving') return '말이 이동 중입니다. 어디에 멈출까요? 👀';
    const last = log.length > 0 ? log[log.length - 1] : null;
    if (!last) {
      return '주사위를 굴려주세요.';
    }
    if (last.card && ['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate'].includes(last.kind)) {
      return '이벤트 카드 발동! 판이 흔들립니다 ⚡';
    }
    if (turnBriefing) return '이번 턴 정산을 확인하세요.';
    return summarizeEvent(last);
  }, [showInitialDeal, pendingPurchase, turnResult?.kind, turnResult?.pos, turnBriefing, log, state]);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-parchment-100">
        <div className="font-display text-xl font-bold uppercase tracking-widest text-ink">
          Loading...
        </div>
      </div>
    );
  }

  const turnIndex = state.turnIndex;
  const turnPlayer = state.players[turnIndex];
  const turnBaseMeta = turnPlayer
    ? CHAR_META[turnPlayer.character] ?? { name: turnPlayer.character, color: '#666' }
    : { name: '-', color: '#666' };
  const turnMeta = turnPlayer
    ? { ...turnBaseMeta, name: displayPlayerName(turnPlayer, turnBaseMeta.name) }
    : turnBaseMeta;


  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.style.setProperty('--active-player-color', turnMeta?.color ?? '#d83b2f');
    return undefined;
  }, [turnMeta?.color]);
  useEffect(() => {
    if (!modalEvent) {
      setShowEventModal(false);
      return undefined;
    }
    setShowEventModal(false);
    const timer = window.setTimeout(() => setShowEventModal(true), 1650);
    return () => window.clearTimeout(timer);
  }, [modalEvent]);

  const showJailTurnResult = (events, choice) => {
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
          message: `보석금 ${JAIL_BAIL}만이 부족합니다.

주사위를 굴려 더블이면 탈출, 아니면 감옥에 남습니다.`,
          okText: '주사위 굴리기',
          tone: 'warn',
        });
        runJailChoice('roll');
        return;
      }
      const payBail = await dialog.confirm({
        title: '감옥 탈출 선택',
        badgeText: `남은 ${jailTurnsLeft}턴`,
        message: `보석금은 ${JAIL_BAIL}만입니다.

보석금을 내면 바로 탈출하고,
주사위는 더블이 나와야 탈출합니다.`,
        okText: `${JAIL_BAIL}만 내기`,
        cancelText: '주사위 굴리기',
        tone: 'warn',
      });
      runJailChoice(payBail ? 'bail' : 'roll');
    } finally {
      setJailDialogOpen(false);
    }
  };

  useEffect(() => {
    if (!turnPlayer?.inJail || showInitialDeal || state?.finished) return;
    const key = `${state.round ?? 0}-${state.turnIndex ?? 0}-${turnPlayer.jailTurns ?? 0}-${turnPlayer.cash ?? 0}`;
    if (jailPromptKeyRef.current === key) return;
    jailPromptKeyRef.current = key;
    const timer = window.setTimeout(() => {
      promptJailTurn();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [turnPlayer?.inJail, turnPlayer?.jailTurns, turnPlayer?.cash, state?.turnIndex, state?.round, showInitialDeal, state?.finished]);

  const promptSkipTurn = async () => {
    if (!turnPlayer || (turnPlayer.skipTurns ?? 0) <= 0 || skipDialogOpen || state?.finished) return;
    setSkipDialogOpen(true);
    try {
      const turns = turnPlayer.skipTurns ?? 0;
      await dialog.alert({
        title: '군 복무 중',
        badgeText: `남은 ${turns}턴`,
        message: `${turnPlayer.name ?? `${turnIndex + 1}P`}님은 군 복무 중이라 이번 차례를 쉽니다.\n\n확인을 누르면 이번 차례가 넘어갑니다.`,
        okText: '차례 넘기기',
        tone: 'warn',
      });
      step({ deferAdvance: false });
    } finally {
      setSkipDialogOpen(false);
    }
  };

  useEffect(() => {
    if ((turnPlayer?.skipTurns ?? 0) <= 0 || turnPlayer?.inJail || showInitialDeal || state?.finished) return;
    if (turnPlayer?.controller === 'ai') {
      const timer = window.setTimeout(() => step({ deferAdvance: false }), 220);
      return () => window.clearTimeout(timer);
    }
    const key = `${state.round ?? 0}-${state.turnIndex ?? 0}-${turnPlayer?.skipTurns ?? 0}`;
    if (skipPromptKeyRef.current === key) return;
    skipPromptKeyRef.current = key;
    const timer = window.setTimeout(() => {
      promptSkipTurn();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [turnPlayer?.skipTurns, turnPlayer?.inJail, turnPlayer?.controller, state?.turnIndex, state?.round, showInitialDeal, state?.finished]);

  const finishAiTurnSummary = () => {
    setAiTurnSummary(null);
    setBoardTurn(null);
    setDiceLocked(false);
    setPendingPurchase(null);
    setTurnResult(null);
    setHubTeleport(null);
    return endTurn?.();
  };

  const handleEndTurn = () => {
    if (hubTeleport) {
      addToast?.({ message: '환승 이동을 선택하거나 머무르기를 눌러주세요.', tone: 'warn' });
      return false;
    }
    if (!diceLocked && !hasMovedThisTurn) {
      addToast?.({ message: '주사위를 먼저 입력해주세요.', tone: 'warn' });
      return false;
    }
    diceSnapshotRef.current = null;
    setDiceLocked(false);
    setPendingPurchase(null);
    setTurnResult(null);
    setBoardTurn(null);
    setAiTurnSummary(null);
    setHubTeleport(null);
    return endTurn?.();
  };

  const handleStep = async () => {
    setShowInitialDeal(false);
    setShowTurnCardTouch(false);
    if (state) state._initialDealShown = true;
    if (turnPlayer?.inJail) {
      await promptJailTurn();
      return;
    }
    if ((turnPlayer?.skipTurns ?? 0) > 0) {
      await promptSkipTurn();
    }
  };

  const summarizeTurnResult = (events, playerId, pendingBuy) => {
    if (pendingBuy) {
      const tileName = tileNameForPos(state, pendingBuy.pos);
      return { kind: 'buy', title: '매입 가능', text: `${tileName}에 도착했습니다. 주인이 없는 땅인데 구매할까요?`, icon: '🏠', pos: pendingBuy.pos, visitorId: playerId, tileName };
    }
    const jailSent = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail');
    if (jailSent) {
      const reason = jailSent.kind === 'three_doubles_jail' ? '3연속 더블' : '감옥행 칸 도착';
      return { kind: 'jail_sent', title: '감옥 수감', text: `${reason} · 감옥으로 이동했습니다. 다음 차례부터 최대 ${JAIL_TURNS}턴 동안 출소 시도`, icon: '🚓', jailTurns: JAIL_TURNS };
    }
    const cardEvent = events.find((event) => event.kind === 'chance_draw' || event.kind === 'welfare_draw' || event.kind === 'event_card' || event.card);
    if (cardEvent) {
      const cardDelta = cardEvent.delta ?? cardEvent.allDelta ?? cardEvent.collected;
      const cardText = cardEvent.effectText
        ? `${cardEvent.card ?? '카드'} · ${cardEvent.effectText}`
        : cardDelta != null
          ? `${cardEvent.card ?? cardEvent.description ?? '카드'} · ${signedMoney(cardDelta)}`
          : cardEvent.upgraded != null
            ? `${cardEvent.card ?? '카드'} · 업그레이드`
            : `${cardEvent.card ?? '카드'} · ${cardEvent.description ?? '카드 효과'}`;
      const eventCardKinds = new Set(['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate']);
      const isEventCard = cardEvent.kind === 'event_card' || (cardEvent.card && eventCardKinds.has(cardEvent.kind));
      const cardTitle = cardEvent.kind === 'welfare_draw' ? '일상 카드' : isEventCard ? '이벤트 카드' : '찬스 카드';
      const cardKind = cardEvent.kind === 'welfare_draw' ? 'welfare' : isEventCard ? 'event' : 'chance';
      const cardId = isEventCard ? cardEvent.kind : (cardEvent.cardId ?? cardEvent.kind);
      return { kind: 'card', title: `${cardTitle} 도착`, cardName: cardEvent.card ?? cardEvent.description ?? cardTitle, revealText: cardText, text: '카드를 뒤집어야 결과가 공개됩니다.', icon: cardEvent.kind === 'welfare_draw' ? '🏠' : isEventCard ? '🌪️' : '💡', cardKind, cardId, eventId: cardEvent.kind, rawEvent: cardEvent };
    }
    const taxEvent = events.find((event) => event.kind === 'income_tax' || event.kind === 'luxury_tax');
    if (taxEvent) return { kind: 'tax', title: taxEvent.kind === 'luxury_tax' ? '사치세' : '소득세', text: `${taxEvent.amt ?? taxEvent.amount ?? 0}만 납부`, icon: taxEvent.kind === 'luxury_tax' ? '💎' : '🧾' };
    const stationEvent = events.find((event) => event.kind === 'arrive_station');
    if (stationEvent) {
      const tileName = tileNameForPos(state, stationEvent.pos);
      const collected = stationEvent.collected ?? 0;
      return { kind: 'station', title: `${tileName} 역장 부임`, text: `적립금 ${collected}만을 받고 새 역장이 되었습니다.`, icon: '🚉', pos: stationEvent.pos, amount: collected, cash: state.players?.[playerId]?.cash };
    }
    const rentEvent = events.find((event) => (event.kind === 'arrive_property' && event.type === 'rent') || event.kind === 'pay_rent' || event.kind === 'rent' || (event.kind === 'arrive_hub' && event.type === 'rent_forced'));
    if (rentEvent) {
      const amount = rentEvent.rent ?? rentEvent.fee ?? rentEvent.amt ?? rentEvent.amount ?? 0;
      const ownerId = rentEvent.ownerId;
      const owner = Number.isInteger(ownerId) ? state.players?.[ownerId] : null;
      const payer = state.players?.[playerId];
      const tile = rentEvent.pos != null ? state.board?.tiles?.[rentEvent.pos] : null;
      const tileName = tile?.names?.ko ?? tile?.name ?? '도착한 땅';
      const ownerName = owner?.name ?? (ownerId != null ? `${ownerId + 1}P` : '소유자');
      const payerName = payer?.name ?? `${playerId + 1}P`;
      return { kind: 'rent', title: '정산 발생', text: `${payerName}님이 ${ownerName}님의 ${tileName}을 밟고 ${amount}만 지출했습니다.`, icon: '💸', amount, ownerName, payerName, tileName };
    }
    const arrival = [...events].reverse().find((event) => ['arrive_property', 'arrive_hub', 'arrive_station', 'arrive_institution', 'parking_jackpot', 'go_to_jail'].includes(event.kind));
    if (arrival) return { kind: 'arrival', title: '도착', text: arrival.tileName ?? arrival.name ?? '도착 처리 완료', icon: arrival.kind === 'go_to_jail' ? '🚓' : '📍' };
    return { kind: 'ready', title: '턴 처리 확인', text: '보드 이동과 도착 처리를 확인하세요.', icon: '📍' };
  };

  const runManualDiceMove = async (manualSteps, { ai = false, allowLocked = false } = {}) => {
    if (!state || state.finished || boardTurn || (!allowLocked && diceLocked)) return;
    const currentKey = `${state.round ?? 0}-${state.turnIndex ?? 0}`;
    if (turnMovedKey === currentKey) {
      addToast?.({ message: '이미 주사위를 진행했습니다.', tone: 'warn' });
      return;
    }
    setShowInitialDeal(false);
    setShowTurnCardTouch(false);
    if (state) state._initialDealShown = true;
    if (turnPlayer?.inJail) {
      await promptJailTurn();
      return;
    }
    const playerId = turnIndex;
    const startPos = turnPlayer?.position ?? 0;
    const cashBeforeMove = turnPlayer?.cash ?? 0;
    diceSnapshotRef.current = ai ? null : { state: JSON.parse(JSON.stringify(state)), log: JSON.parse(JSON.stringify(log)), lastTurn: JSON.parse(JSON.stringify(lastTurn)), modal: JSON.parse(JSON.stringify({ property: modalProperty, trade: modalTrade, tradeSelect: modalTradeSelect, event: modalEvent, yearEnd: modalYearEnd, deathmatch: modalDeathmatch, recovery: modalRecovery, loan: modalLoan })) };
    setDiceLocked(true);
    setTurnResult(null);
    setGlobalNotice(null);
    setBoardTurn({ phase: 'rolling', playerId, startPos, displayPos: startPos, manualSteps, nonce: Date.now() });
    const events = step({ manualSteps, deferPropertyModal: true, deferAdvance: true, deferCardEffects: !ai });
    const latestState = useGameStore.getState().state ?? state;
    const turnKey = `${state.round ?? 0}-${playerId}`;
    setTurnMovedKey(turnKey);
    const pendingBuy = events.find((event) => event.kind === 'arrive_property' && event.type === 'unowned');
    const buyState = pendingBuy ? { pos: pendingBuy.pos, visitorId: playerId, turnKey } : null;
    setPendingPurchase(buyState);
    const roll = events.find((event) => event.kind === 'roll' || event.kind === 'jail_turn');
    const arrival = [...events].reverse().find((event) => ['arrive_property', 'arrive_hub', 'arrive_station', 'arrive_institution', 'income_tax', 'luxury_tax', 'chance_draw', 'welfare_draw', 'parking_jackpot', 'go_to_jail', 'three_doubles_jail'].includes(event.kind));
    const card = events.find((event) => event.kind === 'chance_draw' || event.kind === 'welfare_draw' || event.kind === 'event_card' || event.card);
    const jailNoticeForEnd = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail');
    const endPos = jailNoticeForEnd
      ? (latestState.players?.[playerId]?.position ?? jailNoticeForEnd.pos ?? startPos)
      : Number.isInteger(arrival?.pos)
        ? arrival.pos
        : (latestState.players?.[playerId]?.position ?? state.players[playerId]?.position ?? startPos);
    const safeSteps = Math.max(0, Number(manualSteps) || roll?.sum || 0);
    const path = Array.from({ length: safeSteps }, (_, idx) => (startPos + idx + 1) % (state.board?.tiles?.length ?? 40));
    window.setTimeout(() => {
      setBoardTurn((prev) => prev ? { ...prev, phase: 'moving', roll, arrival, card, endPos, path } : prev);
      let delay = 0;
      path.forEach((pathPos, idx) => {
        const prevPos = idx === 0 ? startPos : path[idx - 1];
        const cornerPause = [0, 10, 20, 30].includes(pathPos) || Math.abs(boardDirection(prevPos) - boardDirection(pathPos)) > 0;
        delay += cornerPause ? 245 : 155;
        window.setTimeout(() => {
          setBoardTurn((current) => current ? { ...current, phase: 'moving', displayPos: pathPos } : current);
        }, delay);
      });
    }, 180);
    const arrivalDelay = Math.max(980, 360 + path.length * 175);
    window.setTimeout(() => {
      setBoardTurn((prev) => prev ? { ...prev, phase: 'arrived', roll, arrival, card, endPos, displayPos: endPos } : prev);
      window.setTimeout(() => {
      const toastMessage = buildArrivalToast({ state, events, playerId, arrival, pendingBuy, endPos });
      const isCardArrival = !!card;
      if (isCardArrival) setTurnResult(summarizeTurnResult(events, playerId, pendingBuy));
      const jailNotice = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail');
      const rentEvent = events.find((event) => (event.kind === 'arrive_property' && event.type === 'rent') || event.kind === 'rent' || (event.kind === 'arrive_hub' && event.type === 'rent_forced'));
      const endTileForNotice = state.board?.tiles?.[endPos];
      const stationEvent = events.find((event) => event.kind === 'arrive_station') ?? ((endTileForNotice?.type === 'railroad') ? { kind: 'arrive_station', pos: endPos, collected: 0 } : null);
      const propertyEvent = events.find((event) => event.kind === 'arrive_property');
      const playerName = displayPlayerName(turnPlayer, turnBaseMeta.name);
      if (propertyEvent && !pendingBuy && !rentEvent && !isCardArrival && !jailNotice) {
        const propertyName = tileNameForPos(state, propertyEvent.pos ?? endPos);
        const isOwn = propertyEvent.type === 'own';
        const isMortgaged = propertyEvent.type === 'mortgaged';
        pushGlobalNotice({
          kind: 'property',
          speaker: '사회자',
          hostText: isOwn ? `${playerName}님, ${propertyName}에 도착했습니다. 여긴 이미 내 땅입니다 🏠` : `${playerName}님, ${propertyName}에 도착했습니다. 권리증을 확인해볼게요 👀`,
          title: `${propertyName}\n도착`,
          text: isOwn ? '내가 보유한 권리증입니다. 이번엔 정산 없이 지나갑니다.' : isMortgaged ? '담보 설정된 권리증이라 통행료 정산은 없습니다.' : '도착 처리를 확인했습니다.',
          icon: isOwn ? '🏠' : '📍',
          previewPos: propertyEvent.pos ?? endPos,
          color: turnBaseMeta.color,
          cta: '터치해서 닫기',
        });
      }
      if (stationEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        const stationName = tileNameForPos(state, stationEvent.pos ?? endPos);
        const collected = stationEvent.collected ?? 0;
        pushGlobalNotice({
          kind: 'station',
          speaker: '사회자',
          hostText: `${playerName}님, ${stationName}에 도착했습니다. 오늘부터 새 역장입니다 🚉`,
          title: `${stationName}\n역장 부임!`,
          text: collected > 0 ? `쌓여 있던 역 적립금 ${collected}만을 수령했습니다.` : '아직 적립금은 없지만, 역장 자리는 접수했습니다.',
          icon: '🚉',
          amount: collected,
          cash: state.players?.[playerId]?.cash,
          previewPos: stationEvent.pos ?? endPos,
          color: '#2f75c9',
          cta: collected > 0 ? `+${fmt(collected)}만 수령 · 터치해서 닫기` : '역장 부임 · 터치해서 닫기',
        });
      }
      if (rentEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        const ownerId = rentEvent.ownerId;
        const owner = state.players?.[ownerId];
        const ownerBase = CHAR_META[owner?.character] ?? { name: `${(ownerId ?? 0) + 1}P`, color: '#d83b2f' };
        const ownerName = displayPlayerName(owner, ownerBase.name);
        const rentTileName = tileNameForPos(state, rentEvent.pos ?? endPos);
        const rentAmount = rentEvent.rent ?? rentEvent.fee ?? rentEvent.amount ?? 0;
        pushGlobalNotice({
          kind: 'rent',
          speaker: '사회자',
          hostText: rentEmceeLine({ visitor: playerName, owner: ownerName, tile: rentTileName, amount: rentAmount }),
          title: '통행료 정산',
          text: `${ownerName}님의 ${rentTileName}`,
          icon: '💸',
          amount: -rentAmount,
          visitorName: playerName,
          ownerName,
          tileName: rentTileName,
          visitorCharacter: turnPlayer?.character,
          ownerCharacter: owner?.character,
          ownerColor: ownerBase.color,
        });
      }
      if (pendingBuy || jailNotice || isCardArrival) {
        pushGlobalNotice({
          kind: pendingBuy ? 'buy' : jailNotice ? 'jail_sent' : 'card_arrival',
          speaker: '사회자',
          title: pendingBuy ? `좋은 땅인데\n매입하시겠어요? 호호` : jailNotice ? `${playerName} 감옥 수감!` : '카드를 뒤집어주세요',
          hostText: pendingBuy ? `부동산 아주머니가 ${tileNameForPos(state, pendingBuy.pos)} 권리증을 슬쩍 내밉니다 🧑‍💼` : undefined,
          text: pendingBuy ? `${tileNameForPos(state, pendingBuy.pos)}` : isCardArrival ? '무슨 카드가 나올까요? 두근두근합니다 👀' : (toastMessage ?? '감옥으로 이동합니다 😭'),
          icon: pendingBuy ? '🧑‍💼' : jailNotice ? '🚓' : '💡',
          cta: pendingBuy ? '매입 / 스킵' : isCardArrival ? '카드를 뒤집어주세요' : '터치해서 닫기',
          previewPos: pendingBuy?.pos,
          price: pendingBuy?.buyPrice,
          color: pendingBuy ? turnBaseMeta.color : undefined,
          onBuy: pendingBuy ? () => handleBuyProperty(playerId, pendingBuy.pos) : undefined,
          onPass: pendingBuy ? () => { setPendingPurchase(null); closePropertyModal?.(); } : undefined,
        });
      }
      }, 1400);
    }, arrivalDelay);
    window.setTimeout(() => {
      const nextResult = summarizeTurnResult(events, playerId, pendingBuy);
      setTurnResult(nextResult);
      const hubEvent = events.find((event) => event.kind === 'arrive_hub' && ['self_teleport_free', 'stay_no_fee'].includes(event.type));
      if (!ai && hubEvent) {
        setHubTeleport({
          playerId,
          fromPos: hubEvent.pos,
          fee: hubEvent.type === 'stay_no_fee' ? HUB_TELEPORT_FEE : 0,
          title: hubEvent.type === 'stay_no_fee' ? '환승 선택' : '무료 환승',
        });
      }
      const lifeChangeEvent = events.find((event) => event.kind === 'chance_draw' && event.cardId === 'life_change');
      if (ai) {
        if (lifeChangeEvent) skipLifeChangeAction?.(playerId);
        if (pendingBuy) buyProperty?.(playerId, pendingBuy.pos);
        const summary = buildAiTurnSummary({ state, playerId, events, pendingBuy, cashBefore: cashBeforeMove });
        setAiTurnSummary(summary);
        setBoardTurn(null);
      } else {
        window.setTimeout(() => setBoardTurn(null), 820);
      }
    }, arrivalDelay + 520);
  };

  const rollAppDice = () => {
    if (diceLocked || boardTurn || state?.finished) return;
    setDiceLocked(true);
    const finalD1 = Math.floor(Math.random() * 6) + 1;
    const finalD2 = Math.floor(Math.random() * 6) + 1;
    const delays = [42, 46, 52, 60, 72, 88, 110, 138, 174, 220, 280];
    let tick = 0;
    const spin = () => {
      if (tick >= delays.length) {
        setLastDiceRoll({ d1: finalD1, d2: finalD2, sum: finalD1 + finalD2, rolling: false, nonce: Date.now() });
        window.setTimeout(() => runManualDiceMove(finalD1 + finalD2, { allowLocked: true }), 220);
        return;
      }
      setLastDiceRoll({
        d1: Math.floor(Math.random() * 6) + 1,
        d2: Math.floor(Math.random() * 6) + 1,
        rolling: true,
        nonce: Date.now(),
      });
      const delay = delays[tick];
      tick += 1;
      window.setTimeout(spin, delay);
    };
    spin();
  };

  const handleBoardDiceRoll = (manualSteps) => {
    if (!boardTurn || boardTurn.phase !== 'ready') return;
    runManualDiceMove(manualSteps);
  };

  const unlockDiceInput = () => {
    if (diceSnapshotRef.current) restoreSnapshot?.(diceSnapshotRef.current);
    diceSnapshotRef.current = null;
    setDiceLocked(false);
    setTurnMovedKey(null);
    setPendingPurchase(null);
    setTurnResult(null);
    setBoardTurn(null);
    setHubTeleport(null);
  };

  const closeBoardToStatus = () => {
    setBoardTurn(null);
  };

  const resolveHubTeleport = (destPos) => {
    if (!hubTeleport) return false;
    const ok = hubTeleportAction?.(hubTeleport.playerId, destPos, hubTeleport.fee ?? 0);
    if (!ok) {
      addToast?.({ message: '환승 목적지가 잘못됐거나 이동할 수 없습니다.', tone: 'warn' });
      return false;
    }
    const tile = state?.board?.tiles?.[destPos];
    setTurnResult({
      kind: 'arrival',
      title: hubTeleport.fee > 0 ? '환승 완료' : '무료 환승 완료',
      text: `${tile?.names?.ko ?? tile?.name ?? '선택한 칸'}(으)로 이동`,
      icon: '🧭',
    });
    setHubTeleport(null);
    return true;
  };

  const stayHubTeleport = () => {
    setHubTeleport(null);
    addToast?.({ message: '환승하지 않고 현재 역에 머무릅니다.', tone: 'success' });
  };

  const handleLifeChange = async (targetId) => {
    const holderId = state?.pendingLifeChange?.playerId;
    if (holderId == null || targetId == null || holderId === targetId) return false;
    const holder = state.players?.[holderId];
    const target = state.players?.[targetId];
    const ok = await dialog.confirm({
      title: '인생체인지',
      badgeText: `${holder?.name ?? `${holderId + 1}P`} ↔ ${target?.name ?? `${targetId + 1}P`}`,
      message: '시그니처 색, nP, 캐릭터, 현재 위치는 그대로 두고 현금·부동산·대출·패시브/카드 상태만 맞바꿉니다.',
      okText: '체인지',
      cancelText: '취소',
      tone: 'danger',
    });
    if (!ok) return false;
    let useDefense = false;
    if ((target?.defenseCards ?? 0) > 0) {
      useDefense = await dialog.confirm({
        title: '방어카드',
        badgeText: `${target?.name ?? `${targetId + 1}P`} 보유 ${(target?.defenseCards ?? 0)}장`,
        message: '방어카드를 사용해 인생체인지를 막겠습니까?',
        okText: '방어',
        cancelText: '그냥 당하기',
        tone: 'warn',
      });
    }
    const changed = lifeChangeAction?.(holderId, targetId, { useDefense });
    if (changed) setViewPlayerIndex(null);
    return changed;
  };

  useEffect(() => {
    if (!state || state.finished || turnPlayer?.controller !== 'ai') return undefined;
    if (boardTurn || diceLocked || aiTurnSummary || hubTeleport || modalProperty || modalTrade || modalTradeSelect || modalEvent || modalYearEnd || modalDeathmatch || modalRecovery || modalLoan) return undefined;
    const timer = window.setTimeout(() => {
      const steps = Math.floor(Math.random() * 12) + 1;
      runManualDiceMove(steps, { ai: true });
    }, 750);
    return () => window.clearTimeout(timer);
  }, [state?.round, state?.turnIndex, turnPlayer?.controller, boardTurn, diceLocked, aiTurnSummary, modalProperty, modalTrade, modalTradeSelect, modalEvent, modalYearEnd, modalDeathmatch, modalRecovery, modalLoan]);

  useEffect(() => {
    if (!state?.finished) return;
    setBoardTurn(null);
    setAiTurnSummary(null);
    setHubTeleport(null);
    setPendingPurchase(null);
    setTurnResult(null);
    setGlobalNotice(null);
    setDiceLocked(false);
    setViewPlayerIndex(null);
    closePropertyModal?.();
    closeTradeModal?.();
    closeTradeSelect?.();
    closeRecoveryModal?.();
    closeLoanModal?.();
    confirmDeathmatch?.();
  }, [state?.finished]);

  if (state.finished) {
    return (
      <>
        <div className="fixed inset-0 bg-parchment-100" style={{ zIndex: 2147483400 }} />
        <GameEndOverlay
          state={state}
          onRestart={() => {
            restartSameGame?.();
          }}
          onQuit={onExit}
        />
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(255,251,238,0.04),rgba(6,116,82,0.08))]" />

      <div className="relative flex h-full min-h-dvh flex-col gap-1.5 overflow-hidden p-1.5 md:min-h-full md:gap-1.5 md:p-2">
        {/* === STAGE === */}
        <div className="hidden flex-1 min-h-0 md:flex">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={state}
            hostLine={hostLine}
            turnBriefing={turnBriefing}
            activeEvent={modalEvent && showEventModal ? modalEvent : null}
            onCloseEvent={confirmEvent}
            year={state.year}
            loanRate={state.loanRate}
            onStep={handleStep}
            onDiceRoll={runManualDiceMove}
            diceMode={diceMode}
            onDiceModeChange={setDiceMode}
            onAppDiceRoll={rollAppDice}
            lastDiceRoll={lastDiceRoll}
            onShowNoticeLog={showNoticeLog}
            hasNoticeLog={noticeLog.length > 0}
            diceLocked={diceInputLocked}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            turnResult={turnResult}
            onOpenResultCard={handleOpenResultCard}
            onExit={onExit}
            onOpenBoard={() => { setBoardTurn({ phase: 'inspect', playerId: turnIndex, startPos: turnPlayer?.position ?? 0, displayPos: turnPlayer?.position ?? 0, nonce: Date.now() }); }}
            pendingPurchase={pendingPurchase}
            hideSkipOverlay={jailDialogOpen || skipDialogOpen || turnPlayer?.controller === 'ai'}
            bgmEnabled={bgmEnabled}
            onToggleBgm={handleToggleBgm}
          />
        </div>
        <div className="flex flex-1 min-h-0 md:hidden">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={state}
            hostLine={hostLine}
            turnBriefing={turnBriefing}
            activeEvent={modalEvent && showEventModal ? modalEvent : null}
            onCloseEvent={confirmEvent}
            year={state.year}
            loanRate={state.loanRate}
            onStep={handleStep}
            onDiceRoll={runManualDiceMove}
            diceMode={diceMode}
            onDiceModeChange={setDiceMode}
            onAppDiceRoll={rollAppDice}
            lastDiceRoll={lastDiceRoll}
            onShowNoticeLog={showNoticeLog}
            hasNoticeLog={noticeLog.length > 0}
            diceLocked={diceInputLocked}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            turnResult={turnResult}
            onOpenResultCard={handleOpenResultCard}
            onExit={onExit}
            onOpenLoan={openLoanModal}
            onOpenBoard={() => { setBoardTurn({ phase: 'inspect', playerId: turnIndex, startPos: turnPlayer?.position ?? 0, displayPos: turnPlayer?.position ?? 0, nonce: Date.now() }); }}
            pendingPurchase={pendingPurchase}
            compact
            hideSkipOverlay={jailDialogOpen || skipDialogOpen || turnPlayer?.controller === 'ai'}
            bgmEnabled={bgmEnabled}
            onToggleBgm={handleToggleBgm}
          />
        </div>

        {/* === FOOTER === */}
        <OtherPlayersStrip
          state={state}
          onStep={handleEndTurn}
          onViewPlayer={(playerIndex) => setViewPlayerIndex(playerIndex)}
          finished={state.finished}
          winnerIndex={state.winner}
          readyToEnd={diceInputLocked}
        />

        {viewPlayerIndex != null && state.players?.[viewPlayerIndex] && (
          <PlayerCardSlotOverlay
            state={state}
            playerIndex={viewPlayerIndex}
            currentIndex={turnIndex}
            turnBriefing={turnBriefing}
            turnResult={turnResult}
            diceLocked={diceInputLocked}
            onDiceRoll={runManualDiceMove}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            onOpenResultCard={handleOpenResultCard}
            onOpenBoard={() => { setBoardTurn({ phase: 'inspect', playerId: turnIndex, startPos: turnPlayer?.position ?? 0, displayPos: turnPlayer?.position ?? 0, nonce: Date.now() }); }}
            onBack={() => setViewPlayerIndex(null)}
            onOpenLoan={openLoanModal}
            canLifeChange={state.pendingLifeChange?.playerId != null && viewPlayerIndex !== state.pendingLifeChange.playerId}
            onLifeChange={() => handleLifeChange(viewPlayerIndex)}
          />
        )}

        {!state.finished && boardTurn && (
          <BoardTurnOverlay
            state={state}
            replay={boardTurn}
            onRoll={handleBoardDiceRoll}
            onClose={closeBoardToStatus}
          />
        )}

        {!state.finished && aiTurnSummary && (
          <AiTurnSummaryModal summary={aiTurnSummary} onContinue={finishAiTurnSummary} />
        )}

        {!state.finished && showInitialDeal && (
          <InitialDealOverlay
            players={state.players}
            turnIndex={state.turnIndex}
            cards={initialDealCards}
            onReady={() => {
              setShowInitialDeal(false);
              if (state) state._initialDealShown = true;
            }}
          />
        )}

        {!state.finished && hubTeleport && (
          <HubTeleportModal
            state={state}
            request={hubTeleport}
            onSelect={resolveHubTeleport}
            onStay={stayHubTeleport}
          />
        )}

        {/* === MODALS === */}
        {!state.finished && modalProperty && (
          <PropertyModal
            open
            onClose={closePropertyModal}
            pos={modalProperty.pos}
            visitorId={modalProperty.visitorId}
            onBuy={handleBuyProperty}
          />
        )}
        {!state.finished && modalTrade && (
          <TradeModal
            open
            onClose={closeTradeModal}
            fromId={modalTrade.fromId}
            toId={modalTrade.toId}
            initialGetPos={modalTrade.initialGetPos}
          />
        )}
        {!state.finished && modalTradeSelect && (
          <TradeSelectModal
            open
            onClose={closeTradeSelect}
            fromId={modalTradeSelect.fromId}
          />
        )}
        {false && modalEvent && showEventModal && (
          <EventModal
            open
            onClose={confirmEvent}
            eventId={modalEvent.eventId}
            description={modalEvent.description}
            affected={modalEvent.affected}
          />
        )}
        {!state.finished && modalYearEnd && (
          <YearEndModal
            open
            onClose={confirmYearEnd}
            year={modalYearEnd.year}
            summary={modalYearEnd.summary}
          />
        )}
        {!state.finished && modalDeathmatch && <DeathmatchModal open onClose={confirmDeathmatch} />}
        {!state.finished && modalRecovery && (
          <RecoveryModal
            open
            onClose={closeRecoveryModal}
            playerId={modalRecovery.playerId}
            needAmount={modalRecovery.needAmount}
          />
        )}
        {!state.finished && modalLoan && (
          <LoanModal
            open
            onClose={closeLoanModal}
            playerId={modalLoan.playerId}
          />
        )}

        <GlobalNoticeBand notice={globalNotice} onDismiss={(item) => { setGlobalNotice(null); item?.action?.(); }} />
        {cardSettlementPending && turnResult?.kind === 'card' && (
          <CardRevealOverlay card={turnResult} onReveal={() => handleOpenResultCard(turnResult)} />
        )}
        <PropertyShatterOverlay effect={propertyShatter} state={state} />
      </div>
    </>
  );
}



const CARD_REVEAL_TONE = {
  chance: { label: 'Chance', mark: '💡', from: '#090A0D', mid: '#181A20', to: '#C89421', glow: 'rgba(255,211,77,0.52)' },
  welfare: { label: 'Daily', mark: '🏠', from: '#EAF8F2', mid: '#7BC9B1', to: '#245D5E', glow: 'rgba(82,211,178,0.42)' },
  event: { label: 'Event', mark: '🌪️', from: '#100D24', mid: '#392365', to: '#7B4CE0', glow: 'rgba(139,92,246,0.54)' },
};

function CardRevealOverlay({ card, onReveal }) {
  const [flipped, setFlipped] = useState(false);
  if (!card || typeof document === 'undefined') return null;
  const tone = CARD_REVEAL_TONE[card.cardKind] ?? CARD_REVEAL_TONE.chance;
  const layer = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-ink/66 p-3 backdrop-blur-[5px]"
      style={{ zIndex: 2147483250, touchAction: 'none' }}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="w-[min(90vw,390px)] overflow-hidden rounded-[24px] border border-white/30 bg-white/14 p-3 text-center text-white shadow-[0_18px_54px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-[18px]">
        <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/58">card reveal</div>
        <div className="mt-1 font-board text-[24px] leading-none text-white">카드를 뒤집어주세요</div>
        <div className="mt-1 font-board text-[14px] text-white/62">결과는 뒤집기 전까지 비밀</div>
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="mx-auto mt-3 block [perspective:1100px]"
        >
          <motion.div
            className="relative h-[250px] w-[180px] rounded-2xl [transform-style:preserve-3d]"
            animate={{ rotateY: flipped ? 180 : 0, y: flipped ? 0 : [0, -4, 0], rotate: flipped ? 0 : [-1.2, 1.2, -1.2] }}
            transition={{ rotateY: { type: 'spring', stiffness: 210, damping: 22 }, y: { duration: 0.9, repeat: flipped ? 0 : Infinity }, rotate: { duration: 1.1, repeat: flipped ? 0 : Infinity } }}
          >
            <div
              className="absolute inset-0 grid place-items-center overflow-hidden rounded-2xl border border-white/34 text-white shadow-[0_16px_38px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.24)] [backface-visibility:hidden] backdrop-blur-[10px]"
              style={{
                background: `radial-gradient(circle at 50% 24%, rgba(255,255,255,0.28) 0%, transparent 23%), linear-gradient(145deg, ${tone.from} 0%, ${tone.mid} 52%, ${tone.to} 100%)`,
                boxShadow: `0 8px 0 #0F0C0A, 0 20px 42px rgba(0,0,0,0.42), 0 0 42px ${tone.glow}`,
              }}
            >
              <div className="absolute inset-3 rounded-[18px] border border-white/24" />
              <div className="relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/48 bg-white/16 text-[34px] shadow-[0_0_26px_rgba(255,255,255,0.18)]">{tone.mark}</div>
                <div className="mt-5 font-display text-[9px] font-black uppercase tracking-[0.28em] text-white/62">The RealLife</div>
                <div className="mt-2 font-board text-[31px] leading-[0.86] drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]">{tone.label}<br />Card</div>
                <div className="mx-auto mt-4 h-px w-20 bg-white/30" />
                <div className="mt-3 font-display text-[8px] font-black uppercase tracking-[0.2em] text-white/58">tap to reveal</div>
              </div>
            </div>
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/34 bg-white/18 text-ink shadow-[0_16px_38px_rgba(0,0,0,0.36)] [backface-visibility:hidden] [transform:rotateY(180deg)] backdrop-blur-[10px]">
              {card?.cardKind ? (
                <CardArtwork type={card.cardKind} id={String(card.cardId ?? card.eventId ?? '')} className="absolute inset-0 h-full w-full rounded-none" framed={false} />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-white/12 text-[72px]">{card.icon ?? '🎴'}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,12,10,0)_0%,rgba(15,12,10,0.72)_34%,rgba(15,12,10,0.92)_100%)] px-3 pb-3 pt-14 text-white">
                <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-white/62">{card.cardKind ?? 'card'}</div>
                <div className="mt-1 font-board text-[24px] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">{card.cardName ?? card.title ?? '카드 공개'}</div>
                <div className="mt-2 line-clamp-2 font-board text-[13px] leading-snug text-white/82">{card.revealText ?? '카드 효과를 정산합니다.'}</div>
              </div>
            </div>
          </motion.div>
        </button>
        <button
          type="button"
          onClick={onReveal}
          disabled={!flipped}
          className="mt-3 h-11 w-full rounded-xl border border-white/34 bg-white/18 font-board text-[18px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] active:translate-y-0.5 disabled:opacity-45 disabled:grayscale"
        >
          {flipped ? '카드 확인 · 정산 공개' : '먼저 카드를 뒤집어주세요'}
        </button>
      </div>
    </div>
  );
  return createPortal(layer, document.body);
}

function PropertyShatterOverlay({ effect, state }) {
  if (!effect || typeof document === 'undefined') return null;
  const tile = state?.board?.tiles?.[effect.pos];
  const title = tile?.names?.ko ?? tile?.name ?? '권리증';
  const pieces = Array.from({ length: 18 }, (_, idx) => {
    const col = idx % 6;
    const row = Math.floor(idx / 6);
    const angle = -90 + idx * 11;
    const distance = 120 + ((idx * 37) % 90);
    return { idx, col, row, x: Math.cos(angle * Math.PI / 180) * distance, y: Math.sin(angle * Math.PI / 180) * distance + 30, r: -160 + ((idx * 47) % 320) };
  });
  const layer = (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483200 }}>
      <div className="absolute inset-0 bg-black/18 backdrop-blur-[1px]" />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative h-[240px] w-[190px]"
      >
        <motion.div
          className="absolute left-1/2 top-1/2 z-10 w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-xl border-[4px] border-red-950 bg-red-600 px-4 py-2 text-center font-board text-3xl text-white shadow-[0_5px_0_#0F0C0A,0_0_30px_rgba(220,38,38,0.62)]"
          initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
          animate={{ scale: [0.7, 1.12, 1], rotate: [-8, 3, -2], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.95, times: [0, 0.18, 0.7, 1] }}
        >
          파괴!
          <div className="mt-1 truncate font-display text-[10px] font-black uppercase tracking-[0.18em]">{title}</div>
        </motion.div>
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-xl border-[3px] border-ink-line bg-white shadow-[0_5px_0_#0F0C0A]"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: [1, 1, 0], scale: [1, 0.98, 0.9] }}
          transition={{ duration: 0.38, times: [0, 0.5, 1] }}
        >
          <PropertyDeedMini pos={effect.pos} />
        </motion.div>
        {pieces.map((piece) => (
          <motion.div
            key={`${effect.id}-${piece.idx}`}
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-sm border border-ink/20 bg-white shadow-[0_2px_5px_rgba(0,0,0,0.28)]"
            style={{ width: 32, height: 44 }}
            initial={{ x: -16, y: -22, rotate: 0, opacity: 0 }}
            animate={{ x: piece.x, y: piece.y, rotate: piece.r, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.95, delay: 0.12 + piece.idx * 0.006, ease: 'easeOut' }}
          >
            <div
              className="h-[240px] w-[190px]"
              style={{ transform: `translate(${-piece.col * 32}px, ${-piece.row * 44}px)` }}
            >
              <PropertyDeedMini pos={effect.pos} />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
  return createPortal(layer, document.body);
}

function GlobalNoticeBand({ notice, onDismiss }) {
  if (!notice || typeof document === 'undefined') return null;
  const amount = Number(notice.amount);
  const showAmount = Number.isFinite(amount) && amount !== 0;
  const accent = notice.color ?? '#22c55e';
  const isBuy = notice.kind === 'buy' && notice.previewPos != null;
  const isStationNotice = notice.kind === 'station' && notice.previewPos != null;
  const isPropertyNotice = notice.kind === 'property' && notice.previewPos != null;
  const isRent = notice.kind === 'rent';
  const hostText = notice.hostText ?? notice.text;
  const noticeStyle = notice.color ? {
    background: `linear-gradient(135deg, rgba(15,12,10,0.92) 0%, ${accent}88 58%, rgba(255,255,255,0.18) 100%)`,
    boxShadow: `0 6px 0 #0F0C0A, 0 22px 54px rgba(0,0,0,0.46), 0 0 0 2px ${accent}aa, 0 0 42px ${accent}8f, inset 0 0 30px ${accent}22`,
  } : undefined;
  const visitorImg = notice.visitorCharacter ? getCharacterImg(notice.visitorCharacter) : null;
  const ownerImg = notice.ownerCharacter ? getCharacterImg(notice.ownerCharacter) : null;
  const avatarStyle = (character, img, fallbackColor = '#d83b2f') => ({
    backgroundImage: img ? `url(${img})` : undefined,
    backgroundSize: AVATAR_SIZE[character] ?? '155%',
    backgroundPosition: AVATAR_POSITION[character] ?? 'center 22%',
    backgroundRepeat: 'no-repeat',
    backgroundColor: `${fallbackColor}22`,
  });
  const absorbPointer = (event) => { event.preventDefault(); event.stopPropagation(); };
  const dismiss = (event) => { event.preventDefault(); event.stopPropagation(); onDismiss?.(notice); };
  const layer = (
    <div
      className="pointer-events-auto fixed inset-0 flex items-center justify-center px-3"
      style={{ zIndex: 2147483000, touchAction: 'none' }}
      onPointerDown={absorbPointer}
      onClick={dismiss}
    >
      <motion.div
        key={`${notice.kind}-${notice.title}-${notice.text}`}
        className="flex w-full max-w-[920px] flex-col items-center"
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {hostText && (
          <div className="mb-[5px] flex max-w-[860px] items-center justify-center gap-2 rounded-[18px] border border-emerald-200/75 bg-[linear-gradient(180deg,rgba(236,253,245,0.78),rgba(16,185,129,0.34))] px-4 py-2 text-center text-[#08372b] shadow-[0_12px_28px_-22px_rgba(6,95,70,0.78),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-[16px]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">🎙️</span>
            <span className="font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>{hostText}</span>
          </div>
        )}
        <div
          className={cn('mx-auto grid w-full overflow-hidden rounded-[24px] border-[3px] border-ink-line p-3 text-center text-white shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46)] backdrop-blur-[1px]', notice.subtle ? 'min-h-[18vh] max-w-[720px] grid-rows-[1fr] bg-[linear-gradient(135deg,rgba(15,12,10,0.86)_0%,rgba(70,34,22,0.82)_55%,rgba(128,83,20,0.82)_100%)]' : 'min-h-[calc(30vh-30px)] max-w-[920px] grid-rows-[1fr_auto] bg-[linear-gradient(135deg,rgba(15,12,10,0.91)_0%,rgba(70,34,22,0.88)_45%,rgba(128,83,20,0.86)_100%)]')}
          style={noticeStyle}
        >
          {isBuy || isStationNotice || isPropertyNotice ? (
            <div className="grid min-h-0 grid-cols-[minmax(120px,190px)_1fr] items-center gap-4 px-2 text-left">
              <div className="mx-auto h-[190px] w-[150px] scale-[0.92] overflow-hidden rounded-xl border-[3px] bg-white shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: `${accent}cc`, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${accent}80` }}>
                {isStationNotice ? <StationRoleCard notice={notice} /> : <PropertyDeedMini pos={notice.previewPos} />}
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <motion.span className="text-[46px] leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.36)]" animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{notice.icon ?? '🧑‍💼'}</motion.span>
                  <div className="whitespace-pre-line font-board text-[clamp(30px,4.5vw,54px)] leading-[0.98] drop-shadow-[0_4px_0_rgba(0,0,0,0.42)]">{notice.title}</div>
                </div>
                <div className="mt-2 font-board text-[clamp(17px,2.4vw,26px)] leading-tight text-white/86">{notice.text}</div>
                {isBuy ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); notice.onBuy?.(); onDismiss?.(); }} className="rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#efe2c5_100%)] px-3 py-3 font-board text-2xl text-ink shadow-[0_4px_0_#0F0C0A] active:translate-y-1 active:shadow-none">매입</button>
                    <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); notice.onPass?.(); onDismiss?.(); }} className="rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#efe2c5_100%)] px-3 py-3 font-board text-2xl text-ink shadow-[0_4px_0_#0F0C0A] active:translate-y-1 active:shadow-none">스킵</button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/28 bg-white/12 px-4 py-3 font-board text-[22px] leading-tight text-white/90">
                    {notice.cta ?? '터치해서 닫기'}
                  </div>
                )}
              </div>
            </div>
          ) : isRent ? (
            <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 px-4">
              <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/62">통행료 정산</div>
              <div className="font-board text-[clamp(24px,4vw,44px)] font-extrabold leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.38)]">{notice.text}</div>
              <div className="mt-1 flex items-center justify-center gap-5">
                <div className="relative flex flex-col items-center gap-1">
                  <motion.div className="absolute -top-8 rounded-full bg-red-500 px-3 py-1 font-display text-[18px] font-black text-white shadow-[0_3px_0_#0F0C0A]" animate={{ y: [10, -8, -16], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1 }}>-{fmt(Math.abs(amount))}만</motion.div>
                  <div className="relative h-20 w-20 rounded-full border-3 border-white bg-white/70 shadow-[0_4px_0_#0F0C0A]" style={avatarStyle(notice.visitorCharacter, visitorImg, '#d83b2f')}><span className="absolute -right-2 -top-3 text-3xl">😭</span></div>
                  <div className="max-w-[120px] truncate font-board text-[15px] text-white/86">{notice.visitorName}</div>
                </div>
                <div className="font-display text-[34px] text-monopoly-gold">→</div>
                <div className="relative flex flex-col items-center gap-1">
                  <motion.div className="absolute -top-8 rounded-full bg-emerald-500 px-3 py-1 font-display text-[18px] font-black text-white shadow-[0_3px_0_#0F0C0A]" animate={{ y: [10, -8, -16], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: 1 }}>+{fmt(Math.abs(amount))}만</motion.div>
                  <motion.div className="relative h-20 w-20 rounded-full border-3 border-white bg-white/70 shadow-[0_4px_0_#0F0C0A]" animate={{ x: [-3, 4, -2, 3, 0], rotate: [-2, 2, -2, 2, 0] }} transition={{ duration: 0.9, repeat: 2 }} style={avatarStyle(notice.ownerCharacter, ownerImg, notice.ownerColor ?? '#22c55e')}><span className="absolute -right-2 -top-3 text-3xl">😏</span></motion.div>
                  <div className="max-w-[120px] truncate font-board text-[15px] text-white/86">{notice.ownerName}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 items-center justify-center gap-3">
              <motion.span className={cn('leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.36)]', notice.subtle ? 'text-[34px]' : 'text-[46px]')} animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{notice.icon ?? '📣'}</motion.span>
              <div className="min-w-0">
                <div className={cn('font-board leading-[0.95] drop-shadow-[0_4px_0_rgba(0,0,0,0.42)]', notice.subtle ? 'text-[clamp(24px,4.2vw,46px)]' : 'text-[clamp(30px,6vw,74px)]')}>{notice.title}</div>
                <div className={cn('mt-1 line-clamp-1 font-display font-black uppercase tracking-[0.18em] text-monopoly-gold/78', notice.subtle ? 'text-[10px]' : 'text-[12px]')}>{notice.cta ?? 'tap to close'}</div>
              </div>
            </div>
          )}
          {!isBuy && !isRent && (
            <div className={cn('flex items-start justify-center gap-3 font-board', notice.subtle ? 'hidden' : 'text-[clamp(18px,3vw,34px)]')}>
              {showAmount && <span className={amount >= 0 ? 'text-emerald-200' : 'text-red-200'}>{signedMoney(amount)}</span>}
              {notice.cash != null && <span className="text-monopoly-gold">내 예금 {Number(notice.cash).toLocaleString('ko-KR')}만</span>}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
  return createPortal(layer, document.body);
}

function StationRoleCard({ notice }) {
  const title = String(notice?.title ?? '역장 부임!').replace(/\n/g, ' ');
  const text = notice?.amount > 0 ? `+${fmt(notice.amount)}만` : '역장 부임';
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border-2 border-[#0F0C0A] bg-[linear-gradient(160deg,rgba(15,36,78,0.98),rgba(47,117,201,0.92)_52%,rgba(255,217,102,0.92)_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.28),transparent_36%)]" />
      <div className="relative border-b-2 border-[#0F0C0A] bg-black/22 px-2 py-1 text-center font-display text-[7px] font-black uppercase tracking-[0.18em] text-white/70">station master</div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-2 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/80 bg-white/18 text-[38px] shadow-[0_4px_0_rgba(15,12,10,0.55),0_0_22px_rgba(255,221,102,0.55)]">🚉</div>
        <div className="mt-3 whitespace-pre-line font-board text-[25px] leading-[0.92] drop-shadow-[0_3px_0_rgba(0,0,0,0.42)]">역장\n부임</div>
        <div className="mt-2 max-w-full truncate rounded-full border border-white/40 bg-black/18 px-2 py-1 font-board text-[12px] text-white/88">{title}</div>
      </div>
      <div className="relative border-t-2 border-[#0F0C0A] bg-black/24 px-2 py-1 text-center font-board text-[14px] text-[#ffe483]">{text}</div>
    </div>
  );
}

function buildArrivalToast({ state, events, playerId, arrival, pendingBuy, endPos }) {
  const tile = state?.board?.tiles?.[endPos ?? arrival?.pos];
  const tileName = tile?.names?.ko ?? tile?.name ?? '도착칸';
  const playerName = state?.players?.[playerId]?.name ?? `${playerId + 1}P`;
  if (pendingBuy) return `${tileName}에 도착했습니다. 주인이 없는 땅인데 구매할까요?`;
  const rentEvent = events?.find((event) => (event.kind === 'arrive_property' && event.type === 'rent') || (event.kind === 'arrive_hub' && event.type === 'rent_forced') || event.kind === 'rent');
  if (rentEvent) {
    const amount = rentEvent.rent ?? rentEvent.fee ?? rentEvent.amount ?? 0;
    const ownerName = state?.players?.[rentEvent.ownerId]?.name ?? `${(rentEvent.ownerId ?? 0) + 1}P`;
    return `아… ${ownerName}님 땅을 밟았습니다 😭 ${tileName} 통행료 ${amount}만 나갑니다.`;
  }
  if (arrival?.kind === 'arrive_station') return `${tileName} 적립금 ${arrival.collected ?? 0}만 수령! 새 역장 부임입니다 🎉`;
  if (arrival?.kind === 'parking_jackpot') return `무료주차 대박입니다 🎉 적립금 ${arrival.amt ?? 0}만 챙겨갑니다.`;
  if (arrival?.kind === 'go_to_jail') return `${playerName}님 감옥행입니다 😭 다음 차례부터 출소 시도합니다.`;
  if (events?.some((event) => event.kind === 'three_doubles_jail')) return `${playerName}님 3연속 더블… 이건 감옥입니다 😭`;
  if (arrival?.kind === 'income_tax' || arrival?.kind === 'luxury_tax') return `${tileName}입니다 😅 ${arrival.amt ?? 0}만 납부합니다.`;
  if (arrival?.card || arrival?.kind === 'chance_draw' || arrival?.kind === 'welfare_draw' || arrival?.kind === 'event_card') return `${tileName} 카드 도착! 결과는 뒤집어봐야 압니다 👀`;
  return `${playerName}님 ${tileName} 도착했습니다.`;
}

function buildAiTurnSummary({ state, playerId, events, pendingBuy, cashBefore }) {
  const player = state.players?.[playerId];
  const meta = CHAR_META[player?.character] ?? { name: `${playerId + 1}P`, color: '#D32F2F' };
  const name = displayPlayerName(player, meta.name);
  const tileName = (pos) => state.board?.tiles?.[pos]?.names?.ko ?? state.board?.tiles?.[pos]?.name ?? `${pos}번 칸`;
  const roll = events.find((event) => event.kind === 'roll' || event.kind === 'jail_turn');
  const arrival = [...events].reverse().find((event) => ['arrive_property', 'arrive_hub', 'arrive_station', 'arrive_institution', 'income_tax', 'luxury_tax', 'chance_draw', 'welfare_draw', 'parking_jackpot', 'go_to_jail'].includes(event.kind));
  const card = events.find((event) => event.kind === 'chance_draw' || event.kind === 'welfare_draw' || event.kind === 'event_card' || event.card);
  const bought = pendingBuy && state.tileState?.[pendingBuy.pos]?.owner === playerId
    ? { name: tileName(pendingBuy.pos), price: pendingBuy.buyPrice ?? 0 }
    : null;
  const moneyRows = [];
  const pushMoney = (label, amount, { showZero = false } = {}) => {
    const safe = Number(amount) || 0;
    if (safe !== 0 || showZero) moneyRows.push({ label, amount: safe });
  };

  for (const event of events) {
    switch (event.kind) {
      case 'go_pass':
      case 'go_exact':
        pushMoney(event.kind === 'go_exact' ? '출발 보너스' : '월급', event.amt);
        break;
      case 'institution_pay':
        pushMoney('기관 월급', event.amt);
        break;
      case 'apartment_income':
        pushMoney('아파트 월세 수입', event.amt);
        break;
      case 'arrive_property':
        if (event.type === 'rent') pushMoney(`${tileName(event.pos)} 통행료`, -event.rent);
        break;
      case 'income_tax':
      case 'luxury_tax':
        pushMoney(event.kind === 'luxury_tax' ? '사치세' : '소득세', -event.amt);
        break;
      case 'chance_draw':
        pushMoney(`찬스카드 ${event.card ?? ''} · ${event.effectText ?? event.description ?? ''}`.trim(), event.delta ?? 0, { showZero: event.upgraded != null || event.delta == null });
        break;
      case 'welfare_draw':
        pushMoney(`일상카드 ${event.card ?? ''} · ${event.effectText ?? event.description ?? ''}`.trim(), event.delta ?? event.allDelta ?? event.collected ?? 0, { showZero: event.upgraded != null });
        break;
      case 'event_card':
        pushMoney(`이벤트카드 ${event.card ?? ''} · ${event.effectText ?? event.description ?? ''}`.trim(), event.sale ?? 0, { showZero: true });
        break;
      case 'parking_jackpot':
        pushMoney('무료주차 보너스', event.amt);
        break;
      case 'arrive_station':
        pushMoney(`${tileName(event.pos)} 역장 적립금`, event.collected ?? 0);
        break;
      case 'arrive_hub':
        if (event.fee) pushMoney(`${tileName(event.pos)} 허브 통행료`, -event.fee);
        if (event.price) pushMoney(`${tileName(event.pos)} 허브 매입`, -event.price);
        break;
      case 'hub_teleport':
        pushMoney(`${tileName(event.destPos)} 환승 이동`, -(event.fee ?? 0), { showZero: true });
        break;
      default:
        break;
    }
  }
  if (bought) pushMoney(`${bought.name} 매입`, -bought.price);

  const cashAfter = player?.cash ?? cashBefore;
  return {
    playerName: name,
    color: meta.color,
    roll: roll ? `${roll.d1 ?? '?'} + ${roll.d2 ?? '?'} = ${roll.sum ?? roll.dice?.sum ?? '?'}${roll.isDouble ? ' · 더블' : ''}` : '주사위 정보 없음',
    arrival: arrival?.pos != null ? tileName(arrival.pos) : describeArrival(arrival, state.board?.tiles?.[player?.position ?? 0]),
    arrivalText: describeArrival(arrival, arrival?.pos != null ? state.board?.tiles?.[arrival.pos] : state.board?.tiles?.[player?.position ?? 0]),
    card: card ? (card.card ?? card.description ?? (card.kind === 'chance_draw' ? '찬스 카드' : '카드')) : null,
    bought,
    moneyRows,
    totalDelta: (cashAfter ?? 0) - (cashBefore ?? 0),
  };
}

function HubTeleportModal({ state, request, onSelect, onStay }) {
  const fromTile = state.board?.tiles?.[request.fromPos];
  const player = state.players?.[request.playerId];
  const playerMeta = CHAR_META[player?.character] ?? { name: `${(request.playerId ?? 0) + 1}P`, color: '#D32F2F' };
  const destinations = (state.board?.tiles ?? []).filter((tile) => tile.pos !== request.fromPos);
  const fee = request.fee ?? 0;
  return (
    <div className="fixed inset-0 z-[97] flex items-center justify-center bg-ink/62 p-3 backdrop-blur-[5px]" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="flex max-h-[88vh] w-[min(94vw,720px)] flex-col overflow-hidden rounded-2xl border-[3px] border-ink-line bg-[#fff7df] shadow-[0_6px_0_#0F0C0A,0_24px_52px_-20px_rgba(0,0,0,0.82)]">
        <div className="border-b-2 border-ink-line bg-[linear-gradient(180deg,#fff7df_0%,#e9c56f_100%)] px-4 py-3 text-center">
          <div className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-ink/50">station transfer</div>
          <div className="font-board text-[25px] leading-none text-ink">🚉 {request.title ?? '환승 선택'}</div>
          <div className="mt-1 font-board text-[14px] text-ink/64">
            {player?.name ?? playerMeta.name} · {fromTile?.names?.ko ?? fromTile?.name ?? '환승역'}에서 원하는 칸으로 이동
            {fee > 0 ? ` · 요금 ${fee}만` : ' · 요금 무료'}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {destinations.map((tile) => {
              const ownerId = state.tileState?.[tile.pos]?.owner;
              const owner = Number.isInteger(ownerId) ? state.players?.[ownerId] : null;
              const ownerMeta = owner ? CHAR_META[owner.character] : null;
              return (
                <button
                  key={tile.pos}
                  type="button"
                  onClick={() => onSelect?.(tile.pos)}
                  className="min-h-[78px] rounded-xl border-2 border-ink-line bg-white px-2 py-2 text-left font-board text-ink shadow-[0_3px_0_#0F0C0A] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:shadow-none"
                >
                  <div className="mb-1 h-2 rounded-full" style={{ backgroundColor: tile.color ?? (tile.type === 'railroad' ? '#3b3b3b' : tile.type === 'tax' ? '#d83b2f' : '#d6b15d') }} />
                  <div className="text-[16px] leading-tight">{tile.names?.ko ?? tile.name ?? `${tile.pos}번`}</div>
                  <div className="mt-1 flex items-center justify-between gap-1 font-display text-[8px] font-black uppercase tracking-[0.12em] text-ink/42">
                    <span>{tile.pos}번 칸</span>
                    {owner && <span style={{ color: ownerMeta?.color ?? '#D32F2F' }}>{owner.name ?? `${ownerId + 1}P`} 소유</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 border-t-2 border-ink-line bg-[#f0e0b6] p-3">
          <button type="button" onClick={onStay} className="h-12 flex-1 rounded-xl border-2 border-ink-line bg-white font-board text-[18px] text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none">
            여기 머무르기
          </button>
          <div className="flex flex-[1.2] items-center justify-center rounded-xl border-2 border-ink-line bg-[#fffaf0] px-3 text-center font-board text-[15px] leading-snug text-ink/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            원하는 목적지를 고른 뒤 실제 말을 해당 칸으로 옮겨주세요
          </div>
        </div>
      </div>
    </div>
  );
}

function AiTurnSummaryModal({ summary, onContinue }) {
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/62 p-3 backdrop-blur-[4px]" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="w-[min(94vw,520px)] overflow-hidden rounded-2xl border-[3px] border-ink-line bg-[#fff7df] shadow-[0_6px_0_#0F0C0A,0_22px_44px_-18px_rgba(0,0,0,0.78)]">
        <div className="border-b-2 border-ink-line bg-[linear-gradient(180deg,#fff7df_0%,#e9c56f_100%)] px-4 py-3 text-center">
          <div className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-ink/50">AI TURN SUMMARY</div>
          <div className="font-board text-[22px] leading-none text-ink" style={{ color: summary.color }}>{summary.playerName} 턴 요약</div>
        </div>
        <div className="space-y-2 p-4 font-board text-ink">
          <div className="rounded-xl border-2 border-ink-line bg-white px-3 py-2 shadow-[0_2px_0_#0F0C0A]">🎲 주사위: <b>{summary.roll}</b></div>
          <div className="rounded-xl border-2 border-ink-line bg-white px-3 py-2 shadow-[0_2px_0_#0F0C0A]">📍 도착: <b>{summary.arrival}</b><div className="mt-0.5 text-[13px] text-ink/62">{summary.arrivalText}</div></div>
          {summary.card && <div className="rounded-xl border-2 border-ink-line bg-[#f5ecff] px-3 py-2 shadow-[0_2px_0_#0F0C0A]">🎴 카드: <b>{summary.card}</b></div>}
          {summary.bought && <div className="rounded-xl border-2 border-ink-line bg-[#e9fff4] px-3 py-2 shadow-[0_2px_0_#0F0C0A]">🏠 매입: <b>{summary.bought.name}</b> · {summary.bought.price}만</div>}
          <div className="rounded-xl border-2 border-ink-line bg-white px-3 py-2 shadow-[0_2px_0_#0F0C0A]">
            <div className="mb-1 font-board text-[15px] text-ink/72">돈 흐름</div>
            {summary.moneyRows.length ? summary.moneyRows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 text-[15px]">
                <span>{row.label}</span>
                <b className={row.amount >= 0 ? 'text-emerald-700' : 'text-red-700'}>{signedMoney(row.amount)}</b>
              </div>
            )) : <div className="text-[14px] text-ink/48">돈 변동 없음</div>}
            <div className="mt-2 flex items-center justify-between border-t border-ink-line/20 pt-2 text-[17px]">
              <span>합계</span>
              <b className={summary.totalDelta >= 0 ? 'text-emerald-700' : 'text-red-700'}>{signedMoney(summary.totalDelta)}</b>
            </div>
          </div>
        </div>
        <div className="border-t-2 border-ink-line bg-[#f0e0b6] p-3">
          <button type="button" onClick={onContinue} className="h-12 w-full rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#ffe8a8_52%,#f1b84d_100%)] font-board text-[20px] text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none">
            확인 · 다음 턴
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCardSlotOverlay({ state, playerIndex, currentIndex, turnBriefing, turnResult, diceLocked, onDiceRoll, onUnlockDice, onOpenResultCard, onOpenBoard, onBack, onOpenLoan, canLifeChange = false, onLifeChange }) {
  const player = state.players[playerIndex];
  const current = state.players[currentIndex];
  const base = CHAR_META[player?.character] ?? { name: `${playerIndex + 1}P`, color: '#D32F2F' };
  const currentBase = CHAR_META[current?.character] ?? { name: `${currentIndex + 1}P`, color: '#D32F2F' };
  const name = displayPlayerName(player, base.name);
  const currentName = displayPlayerName(current, currentBase.name);
  return (
    <div className="fixed inset-0 z-[86] flex items-center justify-center bg-ink/58 p-2 backdrop-blur-[4px]" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="relative flex h-[min(92vh,760px)] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-xl border-[3px] border-ink-line bg-parchment-100 shadow-[0_6px_0_#0F0C0A,0_24px_48px_-18px_rgba(0,0,0,0.75)]">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b-2 border-ink-line bg-[linear-gradient(180deg,#fff8dc_0%,#f0d48f_100%)] px-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="rounded-md border-2 border-ink-line bg-white px-2.5 py-1 shadow-[0_2px_0_#0F0C0A]">
              <div className="font-display text-[8px] font-extrabold uppercase tracking-[0.16em] text-ink/45">현재 턴</div>
              <div className="font-board text-[15px] font-extrabold leading-none text-ink">{currentIndex + 1}P · {currentName}</div>
            </div>
            <div className="font-display text-[18px] font-extrabold text-ink/35">→</div>
            <div className="rounded-md border-2 border-ink-line bg-[#fff2b8] px-2.5 py-1 shadow-[0_2px_0_#0F0C0A]">
              <div className="font-display text-[8px] font-extrabold uppercase tracking-[0.16em] text-ink/45">보유 카드슬롯</div>
              <div className="font-board text-[15px] font-extrabold leading-none text-ink">{playerIndex + 1}P · {name}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canLifeChange && (
              <button
                type="button"
                onClick={onLifeChange}
                className="rounded-md border-2 border-ink-line bg-[linear-gradient(180deg,#fff7df_0%,#ffcf4a_100%)] px-4 py-2 font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-ink shadow-[0_2px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none"
              >
                체인지
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border-2 border-ink-line bg-monopoly-red px-4 py-2 font-display text-[12px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_2px_0_#0F0C0A] transition active:translate-y-1 active:shadow-none"
            >
              돌아가기
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-2">
          <CurrentPlayerStage
            player={player}
            index={playerIndex}
            state={state}
            hostLine="보유 카드 확인"
            turnBriefing={turnBriefing}
            activeEvent={null}
            year={state.year}
            loanRate={state.loanRate}
            onOpenLoan={onOpenLoan}
            onOpenBoard={onOpenBoard}
            pendingPurchase={null}
            turnResult={turnResult}
            onDiceRoll={onDiceRoll}
            diceLocked={diceLocked}
            onUnlockDice={onUnlockDice}
            onOpenResultCard={onOpenResultCard}
            hideSkipOverlay={current?.controller === 'ai'}
          />
        </div>
      </div>
    </div>
  );
}

function BoardTurnOverlay({ state, replay, onRoll, onClose }) {
  const tiles = state.board?.tiles ?? [];
  const player = state.players?.[replay.playerId];
  const playerColor = player ? (CHAR_META[player.character]?.color ?? '#d83b2f') : '#d83b2f';
  const tileByPos = Object.fromEntries(tiles.map((tile) => [tile.pos, tile]));
  const pos = replay.displayPos ?? replay.startPos ?? player?.position ?? 0;
  const activeTile = tileByPos[pos];
  const endTile = tileByPos[replay.endPos ?? pos];
  const rollSum = replay.roll?.sum ?? replay.roll?.dice?.sum;
  const startTile = tileByPos[replay.startPos ?? player?.position ?? 0];
  const startName = startTile?.names?.ko ?? startTile?.name ?? '현재 위치';
  const endName = endTile?.names?.ko ?? endTile?.name ?? '도착칸';
  const phaseText = replay.phase === 'ready'
    ? '현재 위치 확인 후 중앙 주사위판을 눌러주세요'
    : replay.phase === 'rolling'
      ? '말을 이동할 경로를 보는 중...'
      : replay.phase === 'moving'
        ? `${startName} → ${endName}`
        : replay.phase === 'arrived'
          ? `${endName} 도착`
          : '';

  const closeOnTouch = replay.phase === 'inspect' || replay.phase === 'arrived';
  const cameraGrid = boardGridStyle(pos);
  const cameraCol = Number(cameraGrid.gridColumn) || 6;
  const cameraRow = Number(cameraGrid.gridRow) || 6;
  const cameraActive = replay.phase === 'moving';
  const cameraZoom = cameraActive ? 1.18 : 1;
  const rawCameraX = cameraActive ? (6 - cameraCol) * 5.1 : 0;
  const rawCameraY = cameraActive ? (6 - cameraRow) * 5.1 : 0;
  const cameraX = Math.max(-22, Math.min(22, rawCameraX));
  const cameraY = Math.max(-22, Math.min(22, rawCameraY));

  return (
    <div
      className="board-turn-layer absolute inset-0 z-[85] flex items-center justify-center bg-transparent p-2"
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={closeOnTouch ? (event) => { event.preventDefault(); event.stopPropagation(); onClose?.(); } : (event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="board-turn-shell relative grid h-full w-full grid-rows-[1fr] overflow-hidden rounded-[18px] border-2 border-[#17120c] bg-[#efe1bb] shadow-[0_5px_0_#17120c,0_20px_40px_-26px_rgba(0,0,0,0.82)]">
        <div className="relative min-h-0 overflow-hidden p-3 md:p-4">
          <div
            className="board-turn-grid mx-auto grid h-full max-h-full aspect-square grid-cols-11 grid-rows-11 gap-0.5 rounded-[16px] border-2 border-[#17120c] bg-[#4e8b62] p-1.5 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.13),0_10px_28px_rgba(0,0,0,0.25)] will-change-transform"
            style={{ transform: `translate(${cameraX}%, ${cameraY}%) scale(${cameraZoom})`, transition: replay.phase === 'moving' ? 'transform 190ms cubic-bezier(.2,.8,.2,1)' : 'transform 360ms ease-out' }}
          >
            {tiles.map((tile) => {
              const grid = boardGridStyle(tile.pos);
              const isActive = tile.pos === pos;
              const isEnd = replay.endPos === tile.pos && replay.phase === 'arrived';
              const ownerId = state.tileState?.[tile.pos]?.owner;
              const owner = typeof ownerId === 'number' ? state.players?.[ownerId] : null;
              const ownerColor = owner ? (CHAR_META[owner.character]?.color ?? '#d83b2f') : null;
              const isCenterSpecial = ['go', 'free_parking', 'jail', 'go_to_jail', 'chance', 'community_chest', 'tax'].includes(tile.type);
              return (
                <div
                  key={tile.pos}
                  className={cn('board-turn-tile relative overflow-hidden rounded-md border border-[#17120c] bg-[#fff7df] p-1 text-center shadow-[0_1px_0_rgba(0,0,0,0.42)]', isActive && 'board-turn-tile-current', isEnd && 'board-turn-tile-arrived')}
                  style={grid}
                >
                  {owner && <div className="board-turn-owner-bookmark" style={{ backgroundColor: ownerColor }} title={`${owner.name || `${ownerId + 1}P`} 소유`} />}
                  {!isCenterSpecial && <div className="h-1.5 rounded-sm" style={{ backgroundColor: tile.color ?? (tile.type === 'tax' ? '#e44' : tile.type === 'community_chest' ? '#4f7edb' : '#d6b15d') }} />}
                  <div className={cn('board-turn-tile-name', isCenterSpecial && 'board-turn-tile-name-special')} title={tile.names?.ko ?? tile.name ?? String(tile.pos)}>{isCenterSpecial ? specialTileContent(tile) : shortTileName(tile.names?.ko ?? tile.name ?? tile.pos)}</div>
                  <div className="board-turn-pieces">
                    {state.players.map((piecePlayer, pieceIndex) => {
                      const renderPos = pieceIndex === replay.playerId ? pos : (piecePlayer.position ?? 0);
                      if (renderPos !== tile.pos || piecePlayer.bankrupt) return null;
                      const pieceColor = CHAR_META[piecePlayer.character]?.color ?? '#d83b2f';
                      const pieceImg = getCharacterImg(piecePlayer.character);
                      return (
                        <div
                          key={pieceIndex}
                          className={cn('board-turn-piece overflow-hidden', pieceIndex === replay.playerId && 'is-current')}
                          style={{ '--piece-color': pieceColor, '--piece-index': pieceIndex, backgroundColor: pieceImg ? '#fffaf0' : pieceColor }}
                          title={piecePlayer.name || `${pieceIndex + 1}P`}
                        >
                          {pieceImg ? <img src={pieceImg} alt="" className="h-full w-full scale-125 object-cover object-top" draggable={false} /> : pieceIndex + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className={cn('col-start-3 col-end-10 row-start-3 row-end-10 grid place-items-center rounded-[16px] border-2 border-[#17120c] bg-[linear-gradient(135deg,#fffaf0_0%,#ead8ad_100%)] p-2 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.55)]', cameraActive && 'opacity-30')}>
              <div className="space-y-3">
                {replay.phase === 'arrived' ? (
                  <BoardArrivalCard state={state} pos={replay.endPos ?? pos} event={replay.arrival} playerColor={playerColor} />
                ) : replay.phase === 'ready' ? (
                  <div className="board-turn-number-pad">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <button key={num} type="button" onClick={() => onRoll(num)} className="board-turn-number-button">
                        {num}
                      </button>
                    ))}
                  </div>
                ) : replay.phase === 'inspect' ? null : (
                  <div className={cn('board-turn-manual-result scale-75', replay.phase === 'rolling' && 'is-rolling')}>
                    {rollSum ?? replay.manualSteps ?? '?'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function BoardArrivalCard({ state, pos, event, playerColor = '#d83b2f' }) {
  const isJailArrival = event?.kind === 'go_to_jail' || event?.kind === 'three_doubles_jail';
  if (isJailArrival) return <JailArrivalCard reason={event.kind === 'three_doubles_jail' ? '3연속 더블' : '감옥행 칸'} />;
  const tile = state?.board?.tiles?.[pos];
  if (!tile) return <FallbackArrivalCard title="도착 처리" icon="📍" text="도착 정보를 확인했습니다." />;
  const ts = state.tileState?.[pos] ?? {};
  const owner = Number.isInteger(ts.owner) ? state.players?.[ts.owner] : null;
  const ownerMeta = owner ? CHAR_META[owner.character] : null;
  const name = tile.names?.ko ?? tile.name ?? `${pos}번 칸`;
  const isProperty = tile.type === 'property';
  const isStation = tile.type === 'railroad';
  const isCard = tile.type === 'chance' || tile.type === 'community_chest';
  const color = tile.color ?? (isStation ? '#2f75c9' : isCard ? '#7c3aed' : playerColor);
  const propertyPrice = ts.price ?? tile.price ?? 0;
  const propertyMarketPrice = ts.marketPrice ?? ts.currentPrice ?? ts.price ?? tile.price ?? 0;
  const subtitle = isProperty
    ? `매입가 ${fmt(propertyPrice)}만 · 시세 ${fmt(propertyMarketPrice)}만`
    : isStation
      ? `역 적립금 ${fmt(ts.fund ?? 0)}만`
      : tile.type === 'tax'
        ? '세금 정산 칸'
        : isCard
          ? (tile.type === 'chance' ? '찬스 카드 칸' : '일상 카드 칸')
          : `${pos}번 칸`;

  return (
    <motion.div
      className="board-arrival-card-slot mx-auto w-[min(52vw,250px)] rounded-2xl border-[3px] border-[#17120c] bg-[#fff7df] p-2 text-ink shadow-[0_6px_0_#17120c,0_16px_34px_rgba(0,0,0,0.32)]"
      initial={{ y: 18, scale: 0.84, opacity: 0, rotate: -2 }}
      animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <div className="font-display text-[8px] font-black uppercase tracking-[0.22em] text-ink/42">arrival card</div>
      <div className="mt-1 h-[235px] overflow-hidden rounded-xl border-2 border-[#17120c] bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {isProperty ? (
          <div className="relative flex h-full w-full flex-col justify-center overflow-hidden rounded-lg border-2 border-red-700 bg-[#fff8e8] px-3 py-4 text-center shadow-[inset_0_0_0_4px_rgba(220,38,38,0.08)]">
            <div className="absolute left-[-24px] top-4 rotate-[-12deg] bg-red-700 px-8 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_3px_0_#17120c]">속보</div>
            <div className="mx-auto rounded-md border-2 border-red-700 bg-white px-3 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] text-red-700 shadow-[0_2px_0_#7f1d1d]">부동산 급매 찌라시</div>
            <div className="mt-5 whitespace-nowrap font-board text-[34px] font-black leading-none text-red-700 drop-shadow-[0_2px_0_rgba(23,18,12,0.22)]">{name} 도착</div>
            <div className="mt-5 rounded-xl border-[3px] border-red-700 bg-white px-3 py-3 font-board text-[20px] font-black leading-tight text-red-700 shadow-[0_4px_0_#7f1d1d]">
              {name} 매입가 , 시세 : {fmt(propertyMarketPrice)}만
            </div>
            <div className="mt-3 font-board text-[14px] font-bold text-red-800/80">권리증 확인 후 매입 여부 결정</div>
            {owner && <div className="mx-auto mt-3 rounded-full border-2 border-red-700 bg-white px-3 py-1 font-board text-[13px] font-black text-red-700">{owner.name ?? `${ts.owner + 1}P`} 소유</div>}
          </div>
        ) : (
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border-2 border-[#17120c] bg-[#fffaf0]">
            <div className="h-14 border-b-2 border-[#17120c]" style={{ background: `linear-gradient(135deg, ${color}, #fff2a8)` }} />
            <div className="flex flex-1 flex-col items-center justify-center px-3 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#17120c] bg-white text-[34px] shadow-[0_3px_0_#17120c]">
                {isStation ? '🚉' : tile.type === 'chance' ? '💡' : tile.type === 'community_chest' ? '🏠' : tile.type === 'tax' ? '💸' : '📍'}
              </div>
              <div className="mt-4 font-board text-[28px] leading-none">{name}</div>
              <div className="mt-2 font-board text-[15px] text-ink/62">{subtitle}</div>
              {owner && <div className="mt-3 rounded-full border-2 border-[#17120c] bg-white px-3 py-1 font-board text-[13px]" style={{ color: ownerMeta?.color ?? color }}>{owner.name ?? `${ts.owner + 1}P`} 소유</div>}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 font-board text-[18px] leading-none" style={{ color }}>{name}</div>
      <div className="mt-1 font-display text-[8px] font-black uppercase tracking-[0.18em] text-ink/44">터치하면 닫기</div>
    </motion.div>
  );
}

function JailArrivalCard({ reason = '감옥행' }) {
  return <FallbackArrivalCard title="감옥 수감" icon="🚓" text={`${reason} · 다음 차례부터 출소 시도`} tone="jail" />;
}

function FallbackArrivalCard({ title, icon = '📍', text, tone = 'default' }) {
  const color = tone === 'jail' ? '#2563eb' : '#7c3aed';
  return (
    <motion.div
      className="board-arrival-card-slot mx-auto w-[min(52vw,250px)] rounded-2xl border-[3px] border-[#17120c] bg-[#fff7df] p-2 text-ink shadow-[0_6px_0_#17120c,0_16px_34px_rgba(0,0,0,0.32)]"
      initial={{ y: 18, scale: 0.84, opacity: 0, rotate: -2 }}
      animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <div className="font-display text-[8px] font-black uppercase tracking-[0.22em] text-ink/42">arrival card</div>
      <div className="mt-1 flex h-[235px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-[#17120c] bg-[linear-gradient(160deg,#f8fafc_0%,#dbeafe_52%,#93c5fd_100%)] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-[#17120c] bg-white text-[42px] shadow-[0_4px_0_#17120c]">{icon}</div>
        <div className="mt-5 font-board text-[31px] leading-none" style={{ color }}>{title}</div>
        <div className="mt-3 font-board text-[15px] leading-snug text-ink/68">{text}</div>
      </div>
      <div className="mt-2 font-board text-[18px] leading-none" style={{ color }}>{title}</div>
      <div className="mt-1 font-display text-[8px] font-black uppercase tracking-[0.18em] text-ink/44">터치하면 닫기</div>
    </motion.div>
  );
}

function boardGridStyle(pos) {
  if (pos <= 10) return { gridRow: 11, gridColumn: 11 - pos };
  if (pos <= 20) return { gridRow: 21 - pos, gridColumn: 1 };
  if (pos <= 30) return { gridRow: 1, gridColumn: pos - 19 };
  return { gridRow: pos - 29, gridColumn: 11 };
}

function boardDirection(pos) {
  if (pos <= 10) return 0;
  if (pos <= 20) return 1;
  if (pos <= 30) return 2;
  return 3;
}

function diceFace(n) {
  return String(n);
}

function specialTileContent(tile) {
  const name = tile?.names?.ko ?? tile?.name ?? '';
  const make = (icon, lines) => (
    <span className="special-tile-stack">
      {icon && <span className="special-tile-icon">{icon}</span>}
      <span className="special-tile-text">{Array.isArray(lines) ? lines.join('\n') : lines}</span>
    </span>
  );
  if (tile?.type === 'go') return make('🏁', '출발');
  if (tile?.type === 'free_parking') return make('🅿️', '무료주차');
  if (tile?.type === 'jail') return make('🚓', '감옥');
  if (tile?.type === 'go_to_jail') return make('🚔', '감옥행');
  if (tile?.type === 'chance') return make('💡', '찬스');
  if (tile?.type === 'community_chest') return make('🏠', '일상');
  if (tile?.type === 'tax') return tile.taxKind === 'luxury' ? make('💎', '사치세') : make('🧾', '소득세');
  return name;
}

function shortTileName(name) {
  const text = String(name ?? '');
  if (text.length <= 4) return text;
  return `${text.slice(0, 4)}…`;
}

function describeArrival(event, tile) {
  const name = tile?.names?.ko ?? tile?.name ?? '도착칸';
  if (!event) return `${name}에 도착했습니다.`;
  if (event.kind === 'arrive_property') {
    if (event.type === 'unowned') return `${name} 매입 가능`;
    if (event.type === 'rent') return `${name} 통행료 ${event.rent}만`;
    if (event.type === 'own') return `내 땅 ${name} 방문`;
  }
  if (event.kind === 'income_tax' || event.kind === 'luxury_tax') return `${name} 세금 납부`;
  if (event.kind === 'chance_draw') return `${name} · ${event.card ?? '찬스 카드'}`;
  if (event.kind === 'welfare_draw') return `${name} 카드 공개`;
  if (event.kind === 'parking_jackpot') return `${name} 보너스 수령`;
  if (event.kind === 'go_to_jail') return '감옥으로 이동';
  return `${name} 도착`;
}

function InitialDealOverlay({ players, turnIndex = 0, cards, onReady }) {
  const [targets, setTargets] = useState({});
  const [phase, setPhase] = useState('start');
  const [startImageReady, setStartImageReady] = useState(false);
  const [portalCharged, setPortalCharged] = useState(false);
  const introVisible = phase === 'intro';
  const dealVisible = phase === 'deal';

  useEffect(() => {
    document.documentElement.classList.toggle('initial-deal-pending', introVisible);
    document.documentElement.classList.toggle('initial-deal-live', dealVisible);
    return () => {
      document.documentElement.classList.remove('initial-deal-pending');
      document.documentElement.classList.remove('initial-deal-live');
    };
  }, [introVisible, dealVisible]);

  useEffect(() => {
    if (!dealVisible) return undefined;
    const timer = window.setTimeout(() => onReady?.(), 1900);
    return () => window.clearTimeout(timer);
  }, [dealVisible, onReady]);

  useEffect(() => {
    if (phase !== 'start' || !startImageReady) return undefined;
    setPortalCharged(false);
    const timer = window.setTimeout(() => setPortalCharged(true), 1900);
    return () => window.clearTimeout(timer);
  }, [phase, startImageReady]);

  useEffect(() => {
    const readTargets = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const next = {};
      cards.forEach((card) => {
        const selector = card.playerIndex === turnIndex
          ? '[data-current-player-deal-target]'
          : `[data-player-strip-index="${card.playerIndex}"]`;
        const el = document.querySelector(selector);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        next[`${card.playerIndex}-${card.cardIndex}`] = {
          x: rect.left + rect.width / 2 - centerX,
          y: rect.top + rect.height / 2 - centerY,
          w: Math.max(52, Math.min(84, rect.width * 0.72)),
          h: Math.max(72, Math.min(112, rect.height * 0.82)),
        };
      });
      setTargets(next);
    };
    readTargets();
    window.addEventListener('resize', readTargets);
    return () => window.removeEventListener('resize', readTargets);
  }, [cards, turnIndex]);

  const fallbackTargets = players.length === 2
    ? [{ x: -220, y: -120 }, { x: 220, y: 160 }]
    : players.length === 3
      ? [{ x: -250, y: -130 }, { x: 250, y: -130 }, { x: 0, y: 190 }]
      : [{ x: -260, y: -130 }, { x: 260, y: -130 }, { x: -260, y: 180 }, { x: 260, y: 180 }];

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-[80] overflow-hidden rounded-[18px]', phase === 'start' && 'bg-[#eef1ed]')}>
      {phase === 'start' && (
        <>
          <div className="absolute inset-0 overflow-hidden rounded-[18px] bg-[#eef1ed]" aria-hidden="true">
            <img
              src="/backgrounds/initial-start.png"
              alt=""
              className="h-full w-full object-cover object-center"
              onLoad={() => setStartImageReady(true)}
              draggable={false}
            />
          </div>

          {!startImageReady ? (
            <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center rounded-[18px] bg-[#eef1ed]/72 backdrop-blur-[6px]">
              <div className="rounded-[22px] border border-white/70 bg-white/70 px-6 py-4 text-center shadow-[0_18px_38px_-28px_rgba(0,0,0,0.72)]">
                <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-ink/48">loading</div>
                <div className="mt-1 font-board text-[22px] font-extrabold text-ink">무대 준비 중...</div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => portalCharged && setPhase('intro')}
                className={cn('pointer-events-auto absolute left-1/2 top-[calc(62%+82px)] z-30 -translate-x-1/2 rounded-full border border-white/55 px-12 py-4 font-board text-[26px] font-black leading-none shadow-[0_20px_42px_-20px_rgba(118,13,20,0.9),inset_0_1px_0_rgba(255,255,255,0.58),inset_0_-10px_24px_rgba(96,0,10,0.28)] backdrop-blur-[12px] transition active:translate-y-0.5 active:scale-[0.99]', portalCharged ? 'initial-start-button-pulse bg-[linear-gradient(180deg,rgba(255,92,92,0.92),rgba(168,23,31,0.94))] text-white' : 'initial-start-button-loading cursor-wait bg-[linear-gradient(180deg,#ffe682_0%,#f4b72f_56%,#b86a09_100%)] text-[#4a2200]')}
              >
                {portalCharged ? '시작하기' : '로딩중..'}
              </button>
              {!portalCharged && (
                <div className="initial-start-loading-panel pointer-events-none absolute left-1/2 top-[calc(62%+128px)] z-30 w-[min(82vw,740px)] -translate-x-1/2 text-center">
                  <div className="initial-start-loading-content">
                    <div className="initial-start-loading-bar h-full overflow-hidden rounded-[3px] bg-[#09050d] shadow-[inset_0_2px_5px_rgba(0,0,0,0.92),0_0_10px_rgba(255,230,150,0.18)]">
                      <div className="initial-start-loading-fill h-full" onAnimationEnd={() => setPortalCharged(true)} />
                    </div>
                    <span className="initial-start-loading-percent">100%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {introVisible && (
        <button
          type="button"
          onClick={() => setPhase('deal')}
          className="pointer-events-auto absolute left-1/2 top-[47%] z-30 w-[min(88vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.78),rgba(16,185,129,0.36))] px-5 py-4 text-left text-[#08372b] shadow-[0_18px_42px_-24px_rgba(6,95,70,0.72),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-[16px] transition active:translate-y-[calc(-50%+1px)]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-xl text-white">🎙️</span>
            <div>
              <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-emerald-900/62">사회자</div>
              <div className="font-board text-[clamp(18px,2.4vw,25px)] font-extrabold leading-tight">자, 첫 출발은 권리증부터 나눠드릴게요 👀</div>
              <div className="mt-1 font-board text-[14px] font-extrabold text-emerald-950/54">터치하면 내 첫 권리증이 펼쳐집니다</div>
            </div>
          </div>
        </button>
      )}

      {dealVisible && cards.map((card, dealIndex) => {
        const targetKey = `${card.playerIndex}-${card.cardIndex}`;
        const fallback = fallbackTargets[card.playerIndex] ?? fallbackTargets[0];
        const target = targets[targetKey] ?? { ...fallback, w: 68, h: 96 };
        return (
          <div
            key={`${card.playerIndex}-${card.cardIndex}-${card.pos}`}
            className="initial-deal-card absolute left-1/2 top-1/2 rounded-lg border-[3px] border-[#17120c] bg-[#fff7df] shadow-[0_4px_0_#17120c,0_16px_22px_-15px_rgba(0,0,0,0.72)]"
            style={{
              width: `${target.w}px`,
              height: `${target.h}px`,
              '--deal-delay': `${card.recipientOrder * 0.72 + card.cardIndex * 0.095}s`,
              '--deal-x': `${target.x}px`,
              '--deal-y': `${target.y}px`,
              '--deal-stack-x': `${(card.cardIndex - 1.5) * 18}px`,
              '--deal-stack-y': `${(card.cardIndex % 2) * 4}px`,
              '--deal-rot': `${(card.cardIndex - 1.5) * 2.2}deg`,
              '--deed-color': '#17120c',
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-[5px] bg-[#17120c] p-[2px]">
              <PropertyDeedMini pos={card.pos} className="scale-[0.96]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const rWorthFallback = (state, playerId) => {
  const ranked = state.ranking?.find((r) => r.i === playerId);
  return ranked?.worth ?? state.players[playerId]?.cash ?? 0;
};

function GameEndOverlay({ state, onRestart, onQuit }) {
  const ranking = state.ranking?.length
    ? state.ranking
    : state.players
        .map((p, i) => ({ i, worth: p.cash ?? 0, bankrupt: p.bankrupt }))
        .sort((a, b) => {
          if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
          return b.worth - a.worth;
        });

  const winner = ranking[0];
  const winnerPlayer = state.players[winner?.i];
  const winnerBase = CHAR_META[winnerPlayer?.character] ?? { name: `${(winner?.i ?? 0) + 1}P`, color: '#D32F2F' };
  const winnerName = displayPlayerName(winnerPlayer, winnerBase.name);
  const teamMode = !!state.options?.teamMode;
  const teamRanking = state.teamRanking?.length
    ? state.teamRanking
    : ['human', 'ai']
        .map((team) => {
          const members = state.players
            .map((p, i) => ({ p, i, worth: rWorthFallback(state, i) }))
            .filter(({ p }) => (p.team ?? p.controller) === team);
          return { team, worth: members.reduce((sum, member) => sum + member.worth, 0), members };
        })
        .sort((a, b) => b.worth - a.worth);
  const winnerTeam = state.winnerTeam ?? teamRanking[0]?.team;
  const winnerTeamName = winnerTeam === 'ai' ? 'AI팀' : '플레이어팀';

  const overlay = (
    <div className="fixed inset-0 flex items-center justify-center bg-ink/72 p-3 backdrop-blur-[5px]" style={{ zIndex: 2147483500 }}>
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="flex max-h-[94dvh] w-[min(94vw,620px)] flex-col overflow-hidden rounded-lg border-[3px] border-ink-line bg-parchment-50 shadow-[0_5px_0_0_#0F0C0A,0_18px_38px_-12px_rgba(0,0,0,0.7)]"
      >
        <div className="bg-[linear-gradient(180deg,#d83b2f_0%,#a61f1a_100%)] px-5 py-4 text-center text-white">
          <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.32em] opacity-80">
            최종 결과
          </div>
          <div className="mt-1 font-board text-[29px] font-extrabold leading-none">
            🏆 {teamMode ? `${winnerTeamName} 승리!` : `${winnerName} 승리!`}
          </div>
          <div className="mt-2 inline-flex items-center rounded-full border border-white/45 bg-white/15 px-3 py-1 font-display text-[13px] font-extrabold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            {teamMode ? `팀 총자산 ${fmt(teamRanking[0]?.worth)}만` : `총자산 ${fmt(winner?.worth)}만`}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 no-scrollbar">
          {teamMode && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {teamRanking.map((team, idx) => (
                <div
                  key={team.team}
                  className={cn(
                    'rounded-md border-2 border-ink-line px-3 py-2 text-center shadow-[0_2px_0_0_#0F0C0A]',
                    idx === 0 ? 'bg-[#fff2b8]' : 'bg-white',
                  )}
                >
                  <div className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/55">
                    {team.team === 'ai' ? 'AI팀' : '플레이어팀'}
                  </div>
                  <div className="mt-1 font-display text-[21px] font-extrabold tabular-nums text-ink">
                    {fmt(team.worth)}<span className="text-[10px] text-ink/45">만</span>
                  </div>
                  {idx === 0 && <div className="mt-1 font-board text-[12px] font-extrabold text-monopoly-red">승리</div>}
                </div>
              ))}
            </div>
          )}
          <div className="mb-1 flex items-center justify-between font-display text-[9px] font-extrabold uppercase tracking-[0.18em] text-ink/50">
            <span>순위</span>
            <span>총자산</span>
          </div>
          {ranking.map((r, idx) => {
            const player = state.players[r.i];
            const base = CHAR_META[player?.character] ?? { name: `${r.i + 1}P`, color: '#666' };
            const name = displayPlayerName(player, base.name);
            return (
              <div
                key={r.i}
                className={cn(
                  'flex items-center gap-3 rounded-md border-2 border-ink-line px-3 py-2 shadow-[0_2px_0_0_#0F0C0A]',
                  idx === 0 ? 'bg-[#fff2b8]' : 'bg-white',
                )}
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink-line font-display text-[13px] font-extrabold text-white"
                  style={{ backgroundColor: idx === 0 ? '#D32F2F' : base.color }}
                >
                  {idx === 0 ? '??' : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: base.color }}>
                      {r.i + 1}P
                    </span>
                    <span className="truncate font-board text-[17px] font-extrabold text-ink">
                      {name}
                    </span>
                    {idx === 0 && (
                      <span className="rounded-full bg-monopoly-red px-2 py-0.5 font-display text-[8px] font-extrabold uppercase tracking-[0.12em] text-white">
                        우승
                      </span>
                    )}
                    {r.bankrupt && (
                      <span className="font-display text-[9px] font-bold text-ink/40">파산</span>
                    )}
                  </div>
                </div>
                <span className="font-display text-[18px] font-extrabold tabular-nums text-ink">
                  {fmt(r.worth)}
                  <span className="ml-0.5 text-[10px] font-bold text-ink/45">만</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t-2 border-ink-line bg-parchment-100 px-5 py-4">
          <button
            type="button"
            onClick={onQuit}
            className="rounded-md border-2 border-ink-line bg-neutral-200 px-4 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-ink shadow-[0_3px_0_0_#0F0C0A] transition hover:bg-neutral-100 active:translate-y-px"
          >
            그만하기
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-md border-2 border-ink-line bg-monopoly-red px-4 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_3px_0_0_#0F0C0A] transition hover:bg-monopoly-deep active:translate-y-px"
          >
            다시하기
          </button>
        </div>
      </motion.div>
    </div>
  );
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
}

// === 이벤트 라벨 / 정산 유틸 ===
function pickLine(path) {
  let cur = voicelines;
  for (const k of path) {
    if (!cur || cur[k] == null) return null;
    cur = cur[k];
  }
  if (Array.isArray(cur)) return cur[Math.floor(Math.random() * cur.length)];
  return typeof cur === 'string' ? cur : null;
}

const EVENT_CARD_LABELS = {
  income_tax: '\uC18C\uB4DD\uC138 \uB0A9\uBD80',
  property_tax: '\uC7AC\uC0B0\uC138 \uB0A9\uBD80',
  earned_income_tax_credit: '\uADFC\uB85C\uC7A5\uB824\uAE08',
  golden_key: '\uD669\uAE08\uCE74\uB4DC',
};

function cardLabel(id) {
  return EVENT_CARD_LABELS[id] ?? String(id ?? '\uC774\uBCA4\uD2B8').replaceAll('_', ' ');
}

const signedMoney = (amount) => {
  const safe = Number(amount);
  if (!Number.isFinite(safe) || safe === 0) return '0만';
  return `${safe >= 0 ? '+' : '-'}${Math.abs(safe).toLocaleString('ko-KR')}만`;
};

function buildTurnBriefing(turn, state) {
  const rows = [];
  let rowOrder = 0;
  const push = (label, amount, { showZero = false, priority = null } = {}) => {
    if (!amount && !showZero) return;
    const safeAmount = Number(amount) || 0;
    const computedPriority = priority ?? (safeAmount > 0 ? 20 : safeAmount < 0 ? 40 : 60);
    rows.push({ label, amount: safeAmount, priority: computedPriority, order: rowOrder++ });
  };
  const tileName = (pos) => state?.board?.tiles?.[pos]?.names?.ko ?? state?.board?.tiles?.[pos]?.name ?? '부동산';
  const playerName = (id) => state?.players?.[id]?.name || `${(id ?? 0) + 1}P`;

  for (const event of turn.events ?? []) {
    switch (event.kind) {
      case 'go_pass':
      case 'go_exact':
        push('월급', event.amt);
        break;
      case 'institution_pay':
        push('기관 월급', event.amt, { priority: 10 });
        break;
      case 'apartment_income':
        push('아파트 월세', event.amt, { priority: 11 });
        break;
      case 'living':
        push('생활비', -event.amt, { priority: 0 });
        break;
      case 'mortgage_interest':
        push('담보 이자', -event.amt);
        break;
      case 'credit_interest':
        push('신용 이자', -(event.paid ?? 0));
        break;
      case 'loanshark_interest':
        push('사채 이자', -(event.paid ?? 0));
        break;
      case 'income_tax':
      case 'luxury_tax':
      case 'property_tax':
      case 'tax':
        if (event.playerId == null || event.playerId === turn.playerId) push('세금', -event.amt);
        break;
      case 'arrive_property':
        if (event.type === 'rent') push(`${playerName(event.ownerId)} → ${tileName(event.pos)}`, -event.rent);
        else if (event.type === 'own') push(`내 땅 ${tileName(event.pos)} 방문`, 0);
        break;
      case 'rent':
        push(`${playerName(event.ownerId)}에게 통행료`, -event.rent);
        break;
      case 'buy_property':
        push(`${tileName(event.pos)} 매입`, -event.price);
        break;
      case 'develop_property': {
        const label = event.toStage > event.fromStage
          ? event.toStage === 5 ? '아파트 건설' : `건물 ${event.toStage}단계 건설`
          : event.toStage === 0 ? '건물 철거' : `건물 ${event.toStage}단계 조정`;
        push(`${tileName(event.pos)} ${label}`, event.amount);
        break;
      }
      case 'parking_jackpot':
        push('무료주차 보너스', event.amt);
        break;
      case 'arrive_station':
        if (event.collected) push(`${tileName(event.pos)} 적립금`, event.collected);
        break;
      case 'arrive_hub':
        if (event.type === 'buy') push(`${tileName(event.pos)} 매입`, -event.price);
        if (event.type === 'self_repair') push(`${tileName(event.pos)} 수리비`, -event.fee);
        if (event.type === 'rent_forced') push(`${playerName(event.ownerId)} 허브 통행료`, -event.fee);
        break;
      case 'hub_teleport':
        push(`${tileName(event.destPos)} 환승 이동`, -(event.fee ?? 0), { showZero: true });
        break;
      case 'chance_draw':
        push(`찬스카드 ${event.card} · ${event.effectText ?? event.description ?? ''}`.trim(), event.delta ?? 0, { showZero: event.upgraded != null || event.delta == null });
        break;
      case 'welfare_draw':
        push(`일상카드 ${event.card} · ${event.effectText ?? event.description ?? ''}`.trim(), event.delta ?? event.allDelta ?? event.collected ?? 0, { showZero: event.upgraded != null });
        break;
      case 'event_card':
        push(`이벤트카드 ${event.card} · ${event.effectText ?? event.description ?? ''}`.trim(), event.sale ?? 0, { showZero: true });
        break;
      case 'credit_auto_repay':
        push('신용대출 자동상환', -event.amt);
        break;
      case 'recover_pre_turn':
      case 'recover_arrival':
      case 'recover':
        for (const item of event.log ?? []) {
          if (item.step === 'mortgage') push(`${tileName(item.pos)} 담보대출`, item.amt);
          else if (item.step === 'sell_house') push(`${tileName(item.pos)} 건물 매각`, item.refund);
          else if (item.step === 'sell_bank') push(`${tileName(item.pos)} 은행매각`, item.net);
          else if (item.step === 'credit') push('신용대출', item.amt);
          else if (item.step === 'loanshark') push('사채', item.amt);
        }
        break;
      default:
        break;
    }
  }

  const eventCard = (turn.events ?? []).find((event) => event.card && ['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate'].includes(event.kind));
  const total = (turn.cashAfter ?? 0) - (turn.cashBefore ?? 0);
  const visibleTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const hiddenDelta = total - visibleTotal;
  if (hiddenDelta !== 0) push('표시 외 현금 변동', hiddenDelta);
  const sortedRows = [...rows]
    .sort((a, b) => {
      const priorityDiff = (a.priority ?? 50) - (b.priority ?? 50);
      if (priorityDiff) return priorityDiff;
      const amountDiff = Math.abs(b.amount) - Math.abs(a.amount);
      return amountDiff || a.order - b.order;
    })
    .map(({ label, amount }) => ({ label, amount }));
  return {
    title: '이번 턴 정산',
    rows: sortedRows,
    total: sortedRows.reduce((sum, row) => sum + row.amount, 0),
    event: eventCard ? `${eventCard.card} 이벤트 발생` : null,
  };
}

function summarizeEvent(e) {
  if (!e) return '';
  switch (e.kind) {
    case 'roll':
      return '\uC8FC\uC0AC\uC704 ' + e.d1 + '+' + e.d2 + '=' + e.sum + (e.isDouble ? ' · \uB354\uBE14!' : '');
    case 'buy_property':
      return '매입 완료입니다 🎉 ' + e.price + '만짜리 권리증 챙겼습니다.';
    case 'rent':
      return '아… 통행료 ' + e.rent + '만입니다 😭 ' + (e.ownerId + 1) + 'P에게 지출됐습니다.';
    case 'go_pass':
      return pickLine(['realtor', 'go_pass']) ?? ('\uC6D4\uAE09 ' + e.amt + '\uB9CC\uC744 \uBC1B\uC558\uC2B5\uB2C8\uB2E4.');
    case 'go_exact':
      return pickLine(['realtor', 'go_exact']) ?? ('\uCD9C\uBC1C\uC9C0 \uB3C4\uCC29 \uBCF4\uB108\uC2A4 ' + e.amt + '\uB9CC.');
    case 'event_card':
      return '사회자 알림 ⚡ ' + cardLabel(e.card) + ' 카드가 터졌습니다.';
    case 'income_tax':
      return '소득세입니다 😅 ' + e.amt + '만 납부합니다.';
    case 'year_end':
      return e.year + '\uB144\uCC28 \uC815\uC0B0\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4.';
    case 'parking_jackpot':
      return '무료주차 대박 🎉 보너스 ' + e.amt + '만 받았습니다.';
    case 'arrive_station':
      return '역장 자리입니다 🎉 적립금 ' + e.collected + '만이 쌓였습니다.';
    case 'arrive_hub':
      return '\uD658\uC2B9 \uD5C8\uBE0C\uC5D0 \uB3C4\uCC29\uD588\uC2B5\uB2C8\uB2E4.';
    case 'hub_teleport':
      return '환승 이동을 완료했습니다.';
    case 'go_to_jail':
      return '감옥행입니다… 이건 아픕니다 😭';
    case 'deathmatch_start':
      return '\uB370\uC2A4\uB9E4\uCE58\uAC00 \uC2DC\uC791\uB410\uC2B5\uB2C8\uB2E4.';
    case 'game_end':
      return '\uC6B0\uC2B9\uC790\uB294 ' + (e.winner + 1) + 'P\uC785\uB2C8\uB2E4.';
    case 'credit_loan':
      return '\uC2E0\uC6A9\uB300\uCD9C 1,000\uB9CC\uC744 \uC2E0\uCCAD\uD588\uC2B5\uB2C8\uB2E4.';
    case 'tax':
      return '세금입니다 😅 ' + e.amt + '만 지출됩니다.';
    default:
      return String(e.kind ?? '\uC774\uBCA4\uD2B8').replaceAll('_', ' ');
  }
}



