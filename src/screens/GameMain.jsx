// 메인 게임 화면 — 실제 보드 + 실제 주사위 입력 흐름
// 중앙 스테이지, 우측 정산/카드 패널, 하단 플레이어 스트립으로 구성
// 카드/정산/환승/감옥 UX는 실제 플레이 진행을 방해하지 않도록 작게 제어한다.




import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore.js';
import { HUB_TELEPORT_FEE, JAIL_BAIL, JAIL_TURNS } from '@/engine/constants.js';
import { currentPrice } from '@/engine/inflation.js';
import charactersData from '@/data/characters.json';
import voicelines from '@/data/voicelines.json';

import CurrentPlayerStage from '@/components/CurrentPlayerStage.jsx';
import OtherPlayersStrip from '@/components/OtherPlayersStrip.jsx';
import PropertyModal from '@/components/modals/PropertyModal.jsx';
import PropertyDeedMini from '@/components/PropertyDeedMini.jsx';
import CardArtwork from '@/components/CardArtwork.jsx';
import AssetFrame from '@/components/AssetFrame.jsx';
import AnimatedCash from '@/components/AnimatedCash.jsx';
import CashDeltaFloat from '@/components/CashDeltaFloat.jsx';
import TradeModal from '@/components/modals/TradeModal.jsx';
import TradeSelectModal from '@/components/modals/TradeSelectModal.jsx';
import EventModal from '@/components/modals/EventModal.jsx';
import YearEndModal from '@/components/modals/YearEndModal.jsx';
import DeathmatchModal from '@/components/modals/DeathmatchModal.jsx';
import RecoveryModal from '@/components/modals/RecoveryModal.jsx';
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
const PLAYER_SIGNATURE_COLORS = ['#DC2626', '#2563EB', '#F97316', '#16A34A'];
const playerColor = (playerId, fallback = '#DC2626') => PLAYER_SIGNATURE_COLORS[playerId] ?? fallback;

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
  const startTurn = useGameStore((s) => s.startTurn);
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
  const settleLottoRoll = useGameStore((s) => s.settleLottoRoll);
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
  const tickClock = useGameStore((s) => s.tickClock);
  const hubTeleportAction = useGameStore((s) => s.hubTeleport);
  const lifeChangeAction = useGameStore((s) => s.lifeChange);
  const skipLifeChangeAction = useGameStore((s) => s.skipLifeChange);
  const resignStationAction = useGameStore((s) => s.resignStation);
  const initialDealPlayedRef = useRef(false);
  const prevTurnIndexRef = useRef(null);
  const loanReturnPurchaseRef = useRef(null);
  const jailPromptKeyRef = useRef(null);
  const skipPromptKeyRef = useRef(null);
  const [showInitialDeal, setShowInitialDeal] = useState(false);
  const [initialDealPhase, setInitialDealPhase] = useState(null);
  const [initialDealPlayerIndex, setInitialDealPlayerIndex] = useState(0);
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
  const [cardEffectNotice, setCardEffectNotice] = useState(null);
  const [settlementLocked, setSettlementLocked] = useState(false);
  const [turnStartNoticeKey, setTurnStartNoticeKey] = useState(null);
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
      if (!tile || tile.type !== 'property') return;
      byPlayer[owner].push({ pos: Number(pos), title: tile.name, color: tile.color ?? '#d9b45f' });
    });
    byPlayer.forEach((items) => items.sort((a, b) => a.pos - b.pos));
    const maxCards = Math.max(...byPlayer.map((items) => Math.min(items.length, 4)), 0);
    const dealCards = [];
    for (let playerIndex = 0; playerIndex < byPlayer.length; playerIndex += 1) {
      byPlayer[playerIndex].slice(0, maxCards).forEach((card, cardIndex) => {
        dealCards.push({
          ...card,
          playerIndex,
          cardIndex,
          dealOrder: playerIndex * maxCards + cardIndex,
        });
      });
    }
    return dealCards;
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
    const active = showInitialDeal && initialDealPhase === 'deal';
    document.documentElement.classList.toggle('initial-deal-live', active);
    return () => document.documentElement.classList.remove('initial-deal-live');
  }, [initialDealPhase, showInitialDeal]);

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
    });
    return undefined;
  }, [bgmEnabled]);

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
    });
  }, [bgmEnabled]);


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
    setCardEffectNotice(null);
    setSettlementLocked(false);
    setLastDiceRoll(null);
    setBoardTurn(null);
    setPendingPurchase(null);
    setHubTeleport(null);
    setAiTurnSummary(null);
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
    diceSnapshotRef.current = null;
    const key = `${state?.round ?? 0}-${state?.turnIndex ?? 0}`;
    if (activePlayer && turnStartNoticeKey !== key) {
      setTurnStartNoticeKey(key);
      setGlobalNotice({
        id: Date.now() + Math.random(),
        kind: 'turn_start',
        speaker: '사회자',
        title: `${activeName} 님의 차례 입니다.`,
        text: '주사위를 굴려주세요!',
        icon: '🎲',
        color: playerColor(state?.turnIndex ?? 0, activeBaseMeta.color),
        playerCharacter: activePlayer.character,
        cta: '터치해서 시작',
        action: () => startTurn?.(state?.turnIndex ?? 0),
      });
    }
  }, [state?.round, state?.turnIndex, showInitialDeal, turnStartNoticeKey]);

  const pushGlobalNotice = (notice) => {
    if (!notice) return;
    setGlobalNotice({ ...notice, id: Date.now() + Math.random() });
  };

  const triggerPropertyShatter = (pos, label = '권리증 파괴') => {
    if (pos == null) return;
    setPropertyShatter({ pos, label, id: Date.now() + Math.random() });
    window.setTimeout(() => setPropertyShatter((current) => current?.pos === pos ? null : current), 1150);
  };

  // 수술적 수정: lastTurn 의존성 제거 (턴 종료 시 키 변경으로 인한 루프 방지)
  const cardSettlementKey = turnResult?.kind === 'card'
    ? `${turnResult.playerId ?? ''}|${turnResult.cardKind ?? ''}|${turnResult.cardId ?? ''}|${turnResult.eventId ?? ''}|${JSON.stringify(turnResult.text ?? '')}`
    : null;
  const cardSettlementPending = !!cardSettlementKey && cardSettlementSeenKey !== cardSettlementKey;

  const turnBriefing = useMemo(() => {
    const settlementBlocked = settlementLocked || cardSettlementPending || modalProperty || boardTurn || globalNotice || cardEffectNotice || hubTeleport || aiTurnSummary;
    if (settlementBlocked) return null;
    if (lastTurn?.playerId !== state?.turnIndex) return null;
    if (lastTurn?.events?.length && state) return buildTurnBriefing(lastTurn, state);
    return null;
  }, [lastTurn, state, settlementLocked, cardSettlementPending, modalProperty, boardTurn, globalNotice, cardEffectNotice, hubTeleport, aiTurnSummary]);

  const handleOpenResultCard = (card) => {
    if (card?.kind === 'buy') {
      openPropertyModal?.(card.pos, card.visitorId);
      return;
    }
    if (card?.kind === 'card' && cardSettlementKey) {
      if (cardSettlementSeenKey === cardSettlementKey) return; // 중복 방지 가드

      const playerId = card.playerId ?? state?.turnIndex ?? 0;
      const cashBefore = card.cashBefore ?? useGameStore.getState().state?.players?.[playerId]?.cash ?? 0;
      const revealedEvent = card.rawEvent ?? card;
      
      if (revealedEvent?.requiresLottoRoll || (revealedEvent?.cardId === 'lotto' && Array.isArray(revealedEvent?.lottoNumbers) && !revealedEvent?.lottoResolved)) {
        setCardSettlementSeenKey(cardSettlementKey);
        dialog.lottoTurn({
          title: card.cardName ?? '로또 찬스',
          badgeText: card.cardKind === 'welfare' ? '휴게소 로또' : '로또 찬스',
          numbers: revealedEvent.lottoNumbers,
          prize: revealedEvent.lottoPrize ?? 500,
          onRoll: () => {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2;
            const settled = settleLottoRoll?.(playerId, revealedEvent, { d1, d2, sum });
            return { d1, d2, sum, hit: !!settled?.hit, prize: settled?.prize ?? revealedEvent.lottoPrize ?? 500 };
          },
        }).then(() => {
          const latest = useGameStore.getState().state;
          setCardEffectNotice({
            id: Date.now() + Math.random(),
            card,
            event: revealedEvent,
            playerId,
            cashBefore,
            cashAfter: latest?.players?.[playerId]?.cash ?? cashBefore,
          });
        });
        return;
      }

      // 수술적 수정: revealCardEffect 호출 전 상태 확정 및 가드
      setCardSettlementSeenKey(cardSettlementKey);
      revealCardEffect?.(playerId, revealedEvent);

      if (revealedEvent?.cardId === 'teleport') {
        const fromPos = useGameStore.getState().state?.players?.[playerId]?.position ?? revealedEvent.fromPos ?? state?.players?.[playerId]?.position ?? 0;
        setBoardTurn({
          phase: 'teleport_select',
          playerId,
          startPos: fromPos,
          displayPos: fromPos,
          endPos: fromPos,
          card,
          arrival: revealedEvent,
          nonce: Date.now(),
        });
        setHubTeleport({ playerId, fromPos, fee: 0, title: '찬스 환승', source: 'chance', card });
        return;
      }
      const showEffectNotice = () => {
        const latest = useGameStore.getState().state;
        // 수술적 수정: 순환 참조 방지를 위해 직렬화 가능한 데이터만 추출
        setCardEffectNotice({
          id: Date.now() + Math.random(),
          card: {
            cardKind: card.cardKind,
            cardId: card.cardId,
            cardName: card.cardName,
            title: card.title,
            icon: card.icon,
          },
          event: {
            kind: revealedEvent.kind,
            cardId: revealedEvent.cardId,
            effectText: revealedEvent.effectText,
            description: revealedEvent.description,
            skipTurns: revealedEvent.skipTurns,
            amt: revealedEvent.amt,
          },
          playerId,
          cashBefore,
          cashAfter: latest?.players?.[playerId]?.cash ?? cashBefore,
        });
      };
      if (revealedEvent?.moveSteps && revealedEvent?.fromPos != null && revealedEvent?.toPos != null) {
        const boardSize = state?.board?.tiles?.length ?? 40;
        const dir = revealedEvent.moveSteps > 0 ? 1 : -1;
        const steps = Math.abs(revealedEvent.moveSteps);
        const path = Array.from({ length: steps }, (_, idx) => ((revealedEvent.fromPos + dir * (idx + 1)) % boardSize + boardSize) % boardSize);
        setBoardTurn((prev) => ({
          ...(prev ?? {}),
          phase: 'moving',
          playerId,
          startPos: revealedEvent.fromPos,
          displayPos: revealedEvent.fromPos,
          endPos: revealedEvent.toPos,
          path,
          nonce: Date.now(),
        }));
        path.forEach((pathPos, idx) => {
          window.setTimeout(() => {
            setBoardTurn((prev) => prev ? { ...prev, phase: 'moving', displayPos: pathPos } : prev);
          }, 220 + idx * 210);
        });
        window.setTimeout(() => {
          setBoardTurn((prev) => prev ? { ...prev, phase: 'arrived', displayPos: revealedEvent.toPos, endPos: revealedEvent.toPos } : prev);
          showEffectNotice();
        }, 320 + steps * 230);
      } else {
        showEffectNotice();
      }
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
        }, 520);
      }
    }
  };

  const handleBuyProperty = (playerId, pos) => {
    const tile = state?.board?.tiles?.[pos];
    const price = tile ? (tile.basePrice ?? tile.price ?? state.tileState?.[pos]?.price ?? 0) : 0;
    const ownedPropertyCount = Object.entries(state?.tileState ?? {}).filter(([ownedPos, tileState]) => {
      const ownedTile = state?.board?.tiles?.[Number(ownedPos)];
      return ownedTile?.type === 'property' && tileState?.owner === playerId;
    }).length;
    if (ownedPropertyCount >= 8) {
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
    setBoardTurn(null);
    closePropertyModal?.();
    return true;
  };

  const openLoanForPurchase = (purchase, playerId) => {
    if (!purchase) return;
    loanReturnPurchaseRef.current = purchase;
    openLoanModal?.(playerId);
  };

  const handlePurchaseLoanSigned = () => {
    const purchase = loanReturnPurchaseRef.current;
    if (!purchase) return;
    loanReturnPurchaseRef.current = null;
    closeLoanModal?.();
    window.setTimeout(() => reopenPurchaseNotice(purchase), 180);
  };

  const reopenPurchaseNotice = (purchase = pendingPurchase) => {
    if (!purchase || !state) return;
    const playerId = purchase.visitorId ?? state.turnIndex ?? 0;
    const baseMeta = CHAR_META[state.players?.[playerId]?.character] ?? CHAR_META.sejong;
    const tile = state.board?.tiles?.[purchase.pos];
    const price = tile?.basePrice ?? tile?.price ?? state.tileState?.[purchase.pos]?.price ?? 0;
    const cash = state.players?.[playerId]?.cash ?? 0;
    pushGlobalNotice({
      kind: 'buy',
      speaker: '부동산 아주머니',
      title: buyOfferLine(purchase.pos),
      hostText: cash < price ? loanOfferLine(purchase.pos) : undefined,
      text: '',
      icon: '🧓',
      cta: '매입 / 스킵',
      previewPos: purchase.pos,
      price,
      cash,
      loanHint: cash < price,
      color: playerColor(playerId, baseMeta.color),
      onBuy: () => handleBuyProperty(playerId, purchase.pos),
      onLoan: () => openLoanForPurchase(purchase, playerId),
      onPass: () => { setBoardTurn(null); closePropertyModal?.(); },
    });
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
    return <div className="min-h-dvh bg-parchment-100" />;
  }

  const initialDealActive = showInitialDeal && initialDealPhase === 'deal';
  const stageState = initialDealActive ? { ...state, turnIndex: initialDealPlayerIndex } : state;
  const turnIndex = stageState.turnIndex;
  const turnPlayer = stageState.players[turnIndex];
  const initialDealStageCards = initialDealActive
    ? initialDealCards.filter((card) => card.playerIndex === initialDealPlayerIndex).sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0))
    : [];
  const initialDealStageStatus = initialDealActive ? {
    active: true,
    playerOrder: initialDealPlayerIndex + 1,
    totalPlayers: state.players.length,
    cards: initialDealStageCards,
  } : null;
  const turnBaseMeta = turnPlayer
    ? CHAR_META[turnPlayer.character] ?? { name: turnPlayer.character, color: '#666' }
    : { name: '-', color: '#666' };
  const turnMeta = turnPlayer
    ? { ...turnBaseMeta, name: displayPlayerName(turnPlayer, turnBaseMeta.name) }
    : turnBaseMeta;

  // 수술적 수정: 1인칭 시선 이동 제어용 변수 복구
  const isGazeBlocked = !!globalNotice;
  const effectiveTurnResult = isGazeBlocked ? null : turnResult;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.style.setProperty('--active-player-color', playerColor(turnIndex, turnMeta?.color ?? '#d83b2f'));
    return undefined;
  }, [turnIndex, turnMeta?.color]);
  useEffect(() => {
    if (!modalEvent) {
      setShowEventModal(false);
      return undefined;
    }
    setShowEventModal(false);
    const timer = window.setTimeout(() => setShowEventModal(true), 1650);
    return () => window.clearTimeout(timer);
  }, [modalEvent]);

  const buildJailTurnResult = (events, choice) => {
    const jail = events.find((event) => event.kind === 'jail_turn');
    if (!jail) return null;
    const diceText = jail.d1 != null && jail.d2 != null ? `${jail.d1} + ${jail.d2} = ${jail.sum}` : '보석금 납부';
    const forced = jail.released && jail.bailPaid > 0 && choice !== 'bail';
    return {
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
    };
  };

  const showJailTurnResult = (events, choice) => {
    const result = buildJailTurnResult(events, choice);
    if (result) setTurnResult(result);
    return result;
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
        const result = buildJailTurnResult(events, choice);
        if (result) setTurnResult(result);
        return result;
      };

      await dialog.jailTurn({
        title: '감옥 탈출 선택',
        badgeText: `남은 ${jailTurnsLeft}턴`,
        bailAmount: JAIL_BAIL,
        canPayBail: (turnPlayer.cash ?? 0) >= JAIL_BAIL,
        onBail: () => runJailChoice('bail'),
        onRoll: () => runJailChoice('roll'),
      });
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
    setCardEffectNotice(null);
    return endTurn?.();
  };

  const handleEndTurn = () => {
    if (hubTeleport) {
      return false;
    }
    if (!diceLocked && !hasMovedThisTurn) {
      return false;
    }

    // 수술적 수정: 다음 턴 시작 전 이전 결과 명시적 정리
    setTurnResult(null);
    setBoardTurn(null);
    setCardEffectNotice(null);
    setGlobalNotice(null);
    setSettlementLocked(false);
    
    diceSnapshotRef.current = null;
    const prevPlayerId = state?.turnIndex ?? 0;
    const prevPos = state?.players?.[prevPlayerId]?.position ?? 0;
    const cashBeforeEnd = state?.players?.[prevPlayerId]?.cash ?? 0;
    
    const events = endTurn?.();
    const eventCard = Array.isArray(events) ? events.find((event) => event.kind === 'event_card' || event.card) : null;
    
    if (eventCard) {
      const result = summarizeTurnResult(events, prevPlayerId, null);
      // 이벤트 카드가 있다면 해당 결과로 다시 설정
      setTurnResult({ ...result, playerId: prevPlayerId, cashBefore: cashBeforeEnd });
      setBoardTurn({ phase: 'arrived', playerId: prevPlayerId, startPos: prevPos, displayPos: prevPos, endPos: prevPos, card: result, arrival: eventCard, nonce: Date.now() });
    }
    return events;
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
    const jailSent = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail' || event.kind === 'jail_landed');
    if (jailSent) {
      return { kind: 'jail_sent', title: '감옥 수감', text: '경찰의 안내를 받아 감옥에 수감되었습니다. 다음 차례부터 출소 시도를 할 수 있습니다.', icon: '🚓', jailTurns: JAIL_TURNS };
    }
    const cardEvent = events.find((event) => event.kind === 'chance_draw' || event.kind === 'welfare_draw' || event.kind === 'event_card' || event.card);
    if (cardEvent) {
      const cardText = '카드를 뒤집기 전까지 결과는 비밀입니다.';
      const eventCardKinds = new Set(['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate']);
      const isEventCard = cardEvent.kind === 'event_card' || (cardEvent.card && eventCardKinds.has(cardEvent.kind));
      const cardTitle = cardEvent.kind === 'welfare_draw' ? '일상 카드' : isEventCard ? '이벤트 카드' : '찬스 카드';
      const cardKind = cardEvent.kind === 'welfare_draw' ? 'welfare' : isEventCard ? 'event' : 'chance';
      const cardId = isEventCard ? cardEvent.kind : (cardEvent.cardId ?? cardEvent.kind);
      return { kind: 'card', title: `${cardTitle} 도착`, cardName: cardEvent.card ?? cardEvent.description ?? cardTitle, revealText: cardText, text: '카드를 뒤집어야 결과가 공개됩니다.', icon: cardEvent.kind === 'welfare_draw' ? '🏠' : isEventCard ? '🌪️' : '💡', cardKind, cardId, eventId: cardEvent.kind, rawEvent: cardEvent };
    }
    const taxEvent = events.find((event) => event.kind === 'income_tax' || event.kind === 'luxury_tax');
    if (taxEvent) return { kind: 'tax', title: taxEvent.kind === 'luxury_tax' ? '사치세 고지서' : '소득세 고지서', text: '고지서가 아주 정확한 타이밍에 도착했습니다.', icon: taxEvent.kind === 'luxury_tax' ? '💎' : '🧾' };
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
    const arrival = [...events].reverse().find((event) => ['arrive_property', 'arrive_hub', 'arrive_station', 'arrive_institution', 'parking_jackpot', 'go_to_jail', 'jail_landed'].includes(event.kind));
    if (arrival) return { kind: 'arrival', title: '도착', text: arrival.tileName ?? arrival.name ?? '도착 처리 완료', icon: (arrival.kind === 'go_to_jail' || arrival.kind === 'jail_landed') ? '🚓' : '📍' };
    return { kind: 'ready', title: '턴 처리 확인', text: '보드 이동과 도착 처리를 확인하세요.', icon: '📍' };
  };

  const runManualDiceMove = async (manualSteps, { ai = false, allowLocked = false } = {}) => {
    const boardBlocksDice = boardTurn && !['inspect', 'ready'].includes(boardTurn.phase);
    if (!state || state.finished || boardBlocksDice || (!allowLocked && diceLocked)) return;
    const currentKey = `${state.round ?? 0}-${state.turnIndex ?? 0}`;
    if (turnMovedKey === currentKey) {
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
    setCardEffectNotice(null);
    setSettlementLocked(true);
    setBoardTurn({ phase: 'rolling', playerId, startPos, displayPos: startPos, manualSteps, nonce: Date.now() });
    const events = step({ manualSteps, deferPropertyModal: true, deferAdvance: true, deferCardEffects: !ai });
    const latestState = useGameStore.getState().state ?? state;
    const turnKey = `${state.round ?? 0}-${playerId}`;
    setTurnMovedKey(turnKey);
    const pendingBuy = events.find((event) => event.kind === 'arrive_property' && event.type === 'unowned');
    const buyState = pendingBuy ? { pos: pendingBuy.pos, visitorId: playerId, turnKey } : null;
    setPendingPurchase(buyState);
    const roll = events.find((event) => event.kind === 'roll' || event.kind === 'jail_turn');
    const arrival = [...events].reverse().find((event) => ['arrive_property', 'arrive_hub', 'arrive_station', 'arrive_institution', 'income_tax', 'luxury_tax', 'chance_draw', 'welfare_draw', 'parking_jackpot', 'go_to_jail', 'three_doubles_jail', 'jail_landed'].includes(event.kind));
    const card = events.find((event) => event.kind === 'chance_draw' || event.kind === 'welfare_draw' || event.kind === 'event_card' || event.card);
    const jailNoticeForEnd = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail' || event.kind === 'jail_landed');
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
      if (jailNoticeForEnd) {
        setBoardTurn((prev) => prev ? { ...prev, phase: 'moving', roll, arrival, card, endPos, displayPos: endPos } : prev);
        window.setTimeout(() => {
          setBoardTurn((prev) => prev ? { ...prev, phase: 'arrived', roll, arrival, card, endPos, displayPos: endPos } : prev);
        }, 720);
      } else {
        setBoardTurn((prev) => prev ? { ...prev, phase: 'arrived', roll, arrival, card, endPos, displayPos: endPos } : prev);
      }
      window.setTimeout(() => {
      const toastMessage = buildArrivalToast({ state, events, playerId, arrival, pendingBuy, endPos });
      const isCardArrival = !!card;
      if (isCardArrival) setTurnResult(summarizeTurnResult(events, playerId, pendingBuy));
      const jailNotice = events.find((event) => event.kind === 'go_to_jail' || event.kind === 'three_doubles_jail' || event.kind === 'jail_landed');
      const rentEvent = events.find((event) => (event.kind === 'arrive_property' && event.type === 'rent') || event.kind === 'rent' || (event.kind === 'arrive_hub' && event.type === 'rent_forced'));
      const endTileForNotice = state.board?.tiles?.[endPos];
      const stationEvent = events.find((event) => event.kind === 'arrive_station') ?? ((endTileForNotice?.type === 'railroad' && endTileForNotice?.subType === 'station') ? { kind: 'arrive_station', pos: endPos, collected: 0 } : null);
      const hubNoticeEvent = events.find((event) => event.kind === 'arrive_hub') ?? ((endTileForNotice?.type === 'railroad' && endTileForNotice?.subType === 'hub') ? { kind: 'arrive_hub', pos: endPos, type: 'visit' } : null);
      const institutionEvent = events.find((event) => event.kind === 'arrive_institution') ?? ((endTileForNotice?.type === 'utility') ? { kind: 'arrive_institution', pos: endPos } : null);
      const propertyEvent = events.find((event) => event.kind === 'arrive_property');
      const taxEvent = events.find((event) => event.kind === 'income_tax' || event.kind === 'luxury_tax');
      const parkingEvent = events.find((event) => event.kind === 'parking_jackpot');
      const goEvent = events.find((event) => event.kind === 'go_pass' || event.kind === 'go_exact');
      const playerName = displayPlayerName(turnPlayer, turnBaseMeta.name);
      if (jailNotice && !pendingBuy && !isCardArrival) {
        pushGlobalNotice({
          kind: 'jail_sent',
          speaker: '사회자',
          hostText: '아… 발걸음이 조금 무거워졌습니다. 잠깐 안쪽으로 모시겠습니다.',
          title: '감옥 수감!',
          text: '다음 차례부터 주사위 더블이나 보석금으로 출소를 시도할 수 있습니다.',
          icon: '🚓',
          color: playerColor(playerId, '#2563eb'),
        });
      }
      if (taxEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        const isLuxury = taxEvent.kind === 'luxury_tax';
        pushGlobalNotice({
          kind: 'tax',
          speaker: '사회자',
          hostText: '고지서가 아주 정확한 타이밍에 도착했습니다.',
          title: isLuxury ? '사치세 납부' : '소득세 납부',
          text: '지정된 세금이 예금에서 즉시 차감됩니다.',
          icon: isLuxury ? '💎' : '🧾',
          color: '#991b1b',
        });
      }
      if (parkingEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        pushGlobalNotice({
          kind: 'parking',
          speaker: '사회자',
          hostText: '잠깐 쉬어가려 했는데, 작은 행운이 따라왔습니다!',
          title: '휴게소 로또!',
          text: '지정 숫자 3개와 추가 주사위로 보너스를 확인합니다.',
          icon: '🎲',
          amount: parkingEvent.amt,
          color: '#16a34a',
          cta: '로또 확인',
        });
      }
      if (goEvent && !pendingBuy && !isCardArrival && !jailNotice && !taxEvent && !parkingEvent && !propertyEvent && !stationEvent && !hubNoticeEvent && !institutionEvent && !rentEvent) {
        const exactGo = goEvent.kind === 'go_exact';
        pushGlobalNotice({
          kind: 'go_reward',
          speaker: '사회자',
          hostText: exactGo ? '출발점에 정확히 착지했습니다. 오늘 발걸음이 아주 반듯하네요.' : '출발점을 지나쳤습니다. 월급 봉투 챙겨가겠습니다.',
          title: exactGo ? '출발칸 도착 보너스!' : '출발칸 통과!',
          text: exactGo ? '기본 월급에 정확 도착 보너스까지 더해 지급됩니다.' : '은행으로부터 기본 월급이 지급됩니다.',
          icon: '💰',
          amount: goEvent.amt,
          color: '#f59e0b',
        });
      }
      if (propertyEvent && !pendingBuy && !rentEvent && !isCardArrival && !jailNotice) {
        const propertyName = tileNameForPos(state, propertyEvent.pos ?? endPos);
        const isOwn = propertyEvent.type === 'own';
        const isMortgaged = propertyEvent.type === 'mortgaged';
        pushGlobalNotice({
          kind: 'property',
          speaker: '사회자',
          hostText: isOwn ? ownLandEmceeLine(propertyEvent.pos ?? endPos) : `${playerName}님, ${propertyName}에 도착했습니다. 권리증을 확인해볼게요 👀`,
          title: isOwn ? '내 땅 방문' : `${propertyName}\n도착`,
          text: isOwn ? '소유하신 권리증입니다. 이번 턴은 통행료 없이 편안하게 쉬어갑니다.' : isMortgaged ? '담보로 설정된 땅이라 통행료를 내지 않고 통과합니다.' : '도착 처리가 완료되었습니다.',
          icon: isOwn ? '🏠' : '📍',
          previewPos: propertyEvent.pos ?? endPos,
          propertyMode: isOwn ? 'own' : isMortgaged ? 'mortgaged' : 'arrival',
          color: playerColor(playerId, turnBaseMeta.color),
        });
      }
      if (hubNoticeEvent && !pendingBuy && !isCardArrival && !jailNotice && !rentEvent) {
        const hubName = tileNameForPos(state, hubNoticeEvent.pos ?? endPos);
        const hubType = hubNoticeEvent.type;
        const hubText = hubType === 'buy'
          ? '환승 허브 권리를 확보했습니다.'
          : hubType === 'self_repair'
            ? '내 환승 허브 수리비를 정산합니다.'
            : hubType === 'self_teleport_free'
              ? '무료 환승 선택권이 열렸습니다.'
              : hubType === 'unowned'
                ? '아직 주인이 없는 환승 허브입니다.'
                : '환승 허브에 도착했습니다.';
        pushGlobalNotice({
          kind: 'hub',
          speaker: '사회자',
          hostText: `${playerName}님, ${hubName}에 도착했습니다. 노선도가 살짝 빛나기 시작합니다.`,
          title: `${hubName}\n환승 허브 도착!`,
          text: hubText,
          icon: '🚆',
          amount: hubNoticeEvent.price ? -hubNoticeEvent.price : hubNoticeEvent.fee ? -hubNoticeEvent.fee : undefined,
          previewPos: hubNoticeEvent.pos ?? endPos,
          color: playerColor(playerId, '#2563eb'),
          cta: '환승 확인',
        });
      }
      if (stationEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        const stationName = tileNameForPos(state, stationEvent.pos ?? endPos);
        pushGlobalNotice({
          kind: 'station',
          speaker: '사회자',
          hostText: `${playerName}님, ${stationName}에 도착했습니다. 플랫폼 분위기가 바뀌네요.`,
          title: `${stationName}\n역장 자리 도착!`,
          text: '역장 권한을 확인합니다.',
          icon: '🚉',
          previewPos: stationEvent.pos ?? endPos,
          amount: stationEvent.collected,
          color: playerColor(playerId, '#2f75c9'),
          cta: '역장 확인',
        });
      }
      if (institutionEvent && !pendingBuy && !isCardArrival && !jailNotice) {
        const institutionName = tileNameForPos(state, institutionEvent.pos ?? endPos);
        pushGlobalNotice({
          kind: 'institution',
          speaker: '사회자',
          hostText: `${playerName}님, ${institutionName}에 도착했습니다. 오늘은 명함이 새로 나올 것 같습니다.`,
          title: `${institutionName}\n기관장 취임!`,
          text: '기관장이 되어 내 차례가 돌아올 때마다 정기적인 기관 월급이 들어옵니다.',
          icon: '🏛️',
          previewPos: institutionEvent.pos ?? endPos,
          color: playerColor(playerId, '#2563eb'),
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
          title: `${playerId + 1}P ${ownerName}의 땅을 밟았습니다.`,
          text: '통행료를 지불합니다.',
          icon: '💸',
          amount: -rentAmount,
          previewPos: rentEvent.pos ?? endPos,
          ownerId,
          visitorId: playerId,
          visitorName: playerName,
          ownerName,
          tileName: rentTileName,
          visitorCharacter: turnPlayer?.character,
          ownerCharacter: owner?.character,
          ownerColor: playerColor(ownerId, ownerBase.color),
        });
      }
      if (pendingBuy) {
        const buyCash = state.players?.[playerId]?.cash ?? 0;
        const buyPrice = pendingBuy.buyPrice ?? 0;
        pushGlobalNotice({
          kind: 'buy',
          speaker: '사회자',
          title: buyOfferLine(pendingBuy.pos),
          hostText: buyCash < buyPrice ? loanOfferLine(pendingBuy.pos) : `동네 부동산 아주머니가 권리증을 슬쩍 내밉니다 🧓`,
          text: '',
          icon: '🧓',
          cta: '매입 / 스킵',
          previewPos: pendingBuy.pos,
          price: buyPrice,
          cash: buyCash,
          loanHint: buyCash < buyPrice,
          color: playerColor(playerId, turnBaseMeta.color),
          onBuy: () => handleBuyProperty(playerId, pendingBuy.pos),
          onLoan: () => openLoanForPurchase({ pos: pendingBuy.pos, visitorId: playerId, turnKey }, playerId),
          onPass: () => { setBoardTurn(null); closePropertyModal?.(); },
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
      } else if (!pendingBuy && !card) {
        window.setTimeout(() => setBoardTurn(null), 820);
      }
    }, arrivalDelay + 520);
  };

  const rollAppDice = () => {
    const boardBlocksDice = boardTurn && !['inspect', 'ready'].includes(boardTurn.phase);
    if (diceLocked || boardBlocksDice || state?.finished) return;
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
    if (!boardTurn || !['ready', 'inspect'].includes(boardTurn.phase)) return;
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
    setCardEffectNotice(null);
    setSettlementLocked(false);
  };

  const closeBoardToStatus = () => {
    setBoardTurn(null);
    setSettlementLocked(false);
  };

  const toggleBoardInspect = () => {
    setBoardTurn((current) => current ? null : { phase: 'inspect', playerId: turnIndex, startPos: turnPlayer?.position ?? 0, displayPos: turnPlayer?.position ?? 0, nonce: Date.now() });
  };

  const resolveHubTeleport = (destPos) => {
    if (!hubTeleport) return false;
    const ok = hubTeleportAction?.(hubTeleport.playerId, destPos, hubTeleport.fee ?? 0);
    if (!ok) return false;
    const latest = useGameStore.getState().state ?? state;
    const boardSize = latest?.board?.tiles?.length ?? 40;
    const fromPos = hubTeleport.fromPos ?? latest?.players?.[hubTeleport.playerId]?.position ?? 0;
    const forwardSteps = (destPos - fromPos + boardSize) % boardSize;
    const path = Array.from({ length: forwardSteps || 1 }, (_, idx) => (fromPos + idx + 1) % boardSize);
    const tile = latest?.board?.tiles?.[destPos];
    const tileName = tile?.names?.ko ?? tile?.name ?? '선택한 칸';
    const isChanceTeleport = hubTeleport.source === 'chance';
    setHubTeleport(null);
    setTurnResult({
      kind: 'arrival',
      title: isChanceTeleport ? '찬스 환승 완료' : hubTeleport.fee > 0 ? '환승 완료' : '무료 환승 완료',
      text: `${tileName}(으)로 이동`,
      icon: isChanceTeleport ? '🎴' : '🧭',
    });
    setBoardTurn({
      phase: 'moving',
      playerId: hubTeleport.playerId,
      startPos: fromPos,
      displayPos: fromPos,
      endPos: destPos,
      path,
      arrival: { kind: 'hub_teleport', pos: destPos, tileName, source: hubTeleport.source },
      nonce: Date.now(),
    });
    path.forEach((pathPos, idx) => {
      window.setTimeout(() => setBoardTurn((prev) => prev ? { ...prev, phase: 'moving', displayPos: pathPos } : prev), 160 + idx * 115);
    });
    window.setTimeout(() => {
      setBoardTurn((prev) => prev ? { ...prev, phase: 'arrived', displayPos: destPos, endPos: destPos } : prev);
      pushGlobalNotice({
        kind: 'teleport_done',
        speaker: '사회자',
        hostText: isChanceTeleport ? `찬스 환승 성공! ${tileName}까지 말이 이동했습니다 🎴` : `환승 완료! ${tileName}까지 말이 이동했습니다 🚉`,
        title: isChanceTeleport ? '찬스 환승 완료' : '환승 완료',
        text: hubTeleport.fee > 0 ? `요금 ${hubTeleport.fee}만 정산 후 이동했습니다.` : '요금 없이 이동했습니다.',
        icon: isChanceTeleport ? '🎴' : '🚉',
        color: playerColor(hubTeleport.playerId, CHAR_META[latest?.players?.[hubTeleport.playerId]?.character]?.color ?? '#2f75c9'),
        cta: '터치해서 닫기',
      });
    }, 520 + path.length * 115);
    return true;
  };

  const stayHubTeleport = () => {
    setHubTeleport(null);
  };

  const handleStationResign = async () => {
    const stationTiles = (state?.board?.tiles ?? []).filter((tile) => tile.type === 'railroad' && tile.subType === 'station' && state.tileState?.[tile.pos]?.owner === turnIndex);
    const fund = stationTiles.reduce((sum, tile) => sum + (state.tileState?.[tile.pos]?.fund ?? 0), 0);
    const ok = await dialog.confirm({
      title: '퇴직신청서',
      badgeText: '역장 적립금',
      message: `퇴직금을 수령하고 역장 자리에서 물러나시겠습니까?\n\n예상 퇴직금 ${fmt(fund)}만`,
      okText: '수령하기',
      cancelText: '취소',
      tone: 'warn',
    });
    if (!ok) return false;
    const result = resignStationAction?.(turnIndex);
    if (result) {
      pushGlobalNotice({
        kind: 'station_resign',
        speaker: '사회자',
        title: '역장 퇴직 완료',
        text: `퇴직금 ${fmt(result.collected ?? 0)}만을 수령했습니다.`,
        icon: '🚉',
        amount: result.collected ?? 0,
        cta: '터치해서 닫기',
      });
    }
    return !!result;
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
    setCardEffectNotice(null);
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

      <div className="relative flex h-full min-h-dvh flex-col gap-1 overflow-hidden p-1.5 md:min-h-full md:gap-1 md:p-2">
        {/* === STAGE === */}
        <div className="hidden flex-1 min-h-0 md:flex">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={stageState}
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
            diceLocked={diceInputLocked}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            turnResult={effectiveTurnResult}
            onOpenResultCard={handleOpenResultCard}
            onExit={onExit}
            onOpenBoard={toggleBoardInspect}
            pendingPurchase={pendingPurchase}
            onPendingPurchaseContract={reopenPurchaseNotice}
            onLoanSigned={handlePurchaseLoanSigned}
            hideSkipOverlay={jailDialogOpen || skipDialogOpen || turnPlayer?.controller === 'ai'}
            bgmEnabled={bgmEnabled}
            onToggleBgm={handleToggleBgm}
            onStationResign={handleStationResign}
            hideDicePanel={initialDealActive}
            statusActions={initialDealActive ? <InitialDealStatusActions status={initialDealStageStatus} playerName={turnMeta.name} /> : null}
            initialDealStatus={initialDealStageStatus}
          />
        </div>
        <div className="flex flex-1 min-h-0 md:hidden">
          <CurrentPlayerStage
            player={turnPlayer}
            index={turnIndex}
            state={stageState}
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
            diceLocked={diceInputLocked}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            turnResult={effectiveTurnResult}
            onOpenResultCard={handleOpenResultCard}
            onExit={onExit}
            onOpenLoan={openLoanModal}
            onOpenBoard={toggleBoardInspect}
            pendingPurchase={pendingPurchase}
            onPendingPurchaseContract={reopenPurchaseNotice}
            onLoanSigned={handlePurchaseLoanSigned}
            compact
            hideSkipOverlay={jailDialogOpen || skipDialogOpen || turnPlayer?.controller === 'ai'}
            bgmEnabled={bgmEnabled}
            onToggleBgm={handleToggleBgm}
            onStationResign={handleStationResign}
            hideDicePanel={initialDealActive}
            statusActions={initialDealActive ? <InitialDealStatusActions status={initialDealStageStatus} playerName={turnMeta.name} /> : null}
            initialDealStatus={initialDealStageStatus}
          />
        </div>

        {/* === FOOTER === */}
        <OtherPlayersStrip
          state={stageState}
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
            turnResult={effectiveTurnResult}
            diceLocked={diceInputLocked}
            onDiceRoll={runManualDiceMove}
            onUnlockDice={['bought', 'rent', 'card', 'tax'].includes(turnResult?.kind) ? undefined : unlockDiceInput}
            onOpenResultCard={handleOpenResultCard}
            onOpenBoard={toggleBoardInspect}
            onBack={() => setViewPlayerIndex(null)}
            onOpenLoan={openLoanModal}
            onStationResign={handleStationResign}
            canLifeChange={state.pendingLifeChange?.playerId != null && viewPlayerIndex !== state.pendingLifeChange.playerId}
            onLifeChange={() => handleLifeChange(viewPlayerIndex)}
          />
        )}

        {!state.finished && boardTurn && (
          <BoardTurnOverlay
            state={state}
            replay={boardTurn}
            cardResult={cardSettlementPending && turnResult?.kind === 'card' ? turnResult : null}
            onRevealCard={() => handleOpenResultCard(turnResult)}
            onRoll={handleBoardDiceRoll}
            teleportRequest={hubTeleport?.source === 'chance' ? hubTeleport : null}
            onTeleportSelect={resolveHubTeleport}
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
            onPhaseChange={setInitialDealPhase}
            onPlayerChange={setInitialDealPlayerIndex}
            onReady={() => {
              setShowInitialDeal(false);
              setInitialDealPhase(null);
              setInitialDealPlayerIndex(0);
              if (state) state._initialDealShown = true;
              const activePlayer = state?.players?.[state?.turnIndex ?? 0];
              if (activePlayer) {
                const activeBaseMeta = CHAR_META[activePlayer.character] ?? { name: activePlayer.character, color: '#d83b2f' };
                const activeName = displayPlayerName(activePlayer, activeBaseMeta.name);
                const key = `${state?.round ?? 0}-${state?.turnIndex ?? 0}`;
                setTurnStartNoticeKey(key);
                setGlobalNotice({
                  id: Date.now() + Math.random(),
                  kind: 'turn_start',
                  speaker: '사회자',
                  title: `${activeName} 님의 차례 입니다.`,
                  text: '주사위를 굴려주세요!',
                  icon: '🎲',
                  color: playerColor(state?.turnIndex ?? 0, activeBaseMeta.color),
                  playerCharacter: activePlayer.character,
                  cta: '터치해서 시작',
                  action: () => startTurn?.(state?.turnIndex ?? 0),
                });
              }
            }}
          />
        )}

        {!state.finished && hubTeleport && hubTeleport.source !== 'chance' && (
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
        <GlobalNoticeBand notice={globalNotice} onDismiss={(item) => { setGlobalNotice(null); item?.action?.(); if (item?.kind !== 'turn_start') setSettlementLocked(false); }} />
        {cardEffectNotice && (
          <CardEffectNoticeOverlay notice={cardEffectNotice} onClose={() => { setCardEffectNotice(null); setBoardTurn(null); setSettlementLocked(false); }} />
        )}
        <PropertyShatterOverlay effect={propertyShatter} state={state} />
      </div>
    </>
  );
}



const CARD_REVEAL_TONE = {
  chance: { label: 'Chance', mark: '💡', from: '#020617', mid: '#111827', to: '#FACC15', glow: 'rgba(250,204,21,0.58)' },
  welfare: { label: 'Daily', mark: '🏠', from: '#EAF8F2', mid: '#7BC9B1', to: '#245D5E', glow: 'rgba(82,211,178,0.42)' },
  event: { label: 'Event', mark: '🌪️', from: '#050505', mid: '#7F1D1D', to: '#DC2626', glow: 'rgba(220,38,38,0.62)' },
};

function CardRevealOverlay({ card, onReveal }) {
  const [flipped, setFlipped] = useState(false);
  if (!card || typeof document === 'undefined') return null;
  const tone = CARD_REVEAL_TONE[card.cardKind] ?? CARD_REVEAL_TONE.chance;
  const reveal = () => {
    if (flipped) onReveal?.();
    else setFlipped(true);
  };
  const layer = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-ink/66 p-3 backdrop-blur-[5px]"
      style={{ zIndex: 2147483250, touchAction: 'none' }}
      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="w-[min(90vw,390px)] overflow-hidden rounded-[24px] border border-white/18 bg-[linear-gradient(145deg,rgba(3,7,18,0.88)_0%,rgba(15,23,42,0.78)_56%,rgba(0,0,0,0.72)_100%)] p-3 text-center text-white shadow-[0_18px_54px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-24px_60px_rgba(0,0,0,0.38)] backdrop-blur-[20px]">
        <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/58">card reveal</div>
        <div className="mt-1 font-board text-[24px] leading-none text-white">카드를 뒤집어주세요</div>
        <div className="mt-1 font-board text-[14px] text-white/62">결과는 뒤집기 전까지 비밀</div>
        <button
          type="button"
          onClick={reveal}
          className="mx-auto mt-3 block"
        >
          <motion.div
            className="relative h-[250px] w-[180px] overflow-hidden rounded-2xl border border-white/34 bg-slate-950 text-white shadow-[0_8px_0_#0F0C0A,0_20px_42px_rgba(0,0,0,0.42)]"
            animate={flipped ? { scale: [1, 1.08, 1], boxShadow: ['0 8px 0 #0F0C0A,0 20px 42px rgba(0,0,0,0.42)', `0 8px 0 #0F0C0A,0 0 54px ${tone.glow}`, '0 8px 0 #0F0C0A,0 20px 42px rgba(0,0,0,0.42)'] } : { y: [0, -4, 0], rotate: [-1.2, 1.2, -1.2] }}
            transition={flipped ? { duration: 0.42 } : { y: { duration: 0.9, repeat: Infinity }, rotate: { duration: 1.1, repeat: Infinity } }}
          >
            {!flipped ? (
              <div
                className="absolute inset-0 grid place-items-center text-white backdrop-blur-[10px]"
                style={{ background: `radial-gradient(circle at 50% 24%, rgba(255,255,255,0.28) 0%, transparent 23%), linear-gradient(145deg, ${tone.from} 0%, ${tone.mid} 52%, ${tone.to} 100%)` }}
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
            ) : (
              <div className="absolute inset-0 overflow-hidden bg-white text-ink">
                {card?.cardKind ? (
                  <CardArtwork type={card.cardKind} id={String(card.cardId ?? card.eventId ?? '')} className="absolute inset-0 h-full w-full rounded-none" framed={false} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-white text-[72px]">{card.icon ?? '🎴'}</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,12,10,0)_0%,rgba(15,12,10,0.72)_34%,rgba(15,12,10,0.92)_100%)] px-3 pb-3 pt-14 text-white">
                  <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-white/62">{card.cardKind ?? 'card'}</div>
                  <div className="mt-1 font-board text-[24px] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">{card.cardName ?? card.title ?? '카드 공개'}</div>
                  <div className="mt-2 line-clamp-2 font-board text-[13px] leading-snug text-white/82">{card.revealText ?? '카드 효과를 정산합니다.'}</div>
                </div>
              </div>
            )}
          </motion.div>
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

function NoticeIconCard({ notice, accent = '#22c55e' }) {
  const title = String(notice?.title ?? '알림').replace(/\n/g, ' ');
  let headerText = 'NOTICE';
  if (notice?.kind === 'go_to_jail' || notice?.kind === 'jail_sent') headerText = 'WARRANT';
  else if (notice?.kind === 'tax' || notice?.kind === 'income_tax' || notice?.kind === 'luxury_tax') headerText = 'BILL';
  else if (notice?.kind === 'station' || notice?.kind === 'institution') headerText = 'APPOINTMENT';
  else if (notice?.kind === 'parking_jackpot' || notice?.kind === 'go_reward') headerText = 'REWARD';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#fdfcf6] text-ink">
      <div className="relative flex min-h-[24px] items-center justify-center border-b-2 border-[#0F0C0A] px-2 py-0.5" style={{ backgroundColor: accent }}>
        <div className="relative font-display text-[9px] font-black uppercase tracking-[0.2em] text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
          {headerText}
        </div>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center p-2 text-center">
        <div className="relative flex h-[90px] w-[90px] items-center justify-center overflow-hidden rounded-xl border-2 border-ink-line bg-[#f0e6d2] shadow-inner">
          {notice?.image ? (
            <img src={notice.image} alt={title} className="h-full w-full object-cover object-center" />
          ) : (
            <span className="text-[54px] leading-none drop-shadow-[0_3px_0_rgba(0,0,0,0.22)]">{notice?.icon ?? '📜'}</span>
          )}
        </div>
        <div className="mt-3 w-full px-1 font-board text-[18px] font-black leading-tight text-ink drop-shadow-sm line-clamp-2">
          {title}
        </div>
      </div>
    </div>
  );
}

function GlobalNoticeBand({ notice, onDismiss }) {
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buyDeniedPulse, setBuyDeniedPulse] = useState(false);
  useEffect(() => {
    setBuySubmitting(false);
    setBuyDeniedPulse(false);
  }, [notice?.id]);
  if (!notice || typeof document === 'undefined') return null;
  const amount = Number(notice.amount);
  const showAmount = Number.isFinite(amount) && amount !== 0;
  let accent = notice.color;
  if (!accent) {
    if (notice.kind === 'go_to_jail' || notice.kind === 'jail_sent') accent = '#374151'; // 감옥: 다크 그레이
    else if (notice.kind === 'tax' || notice.kind === 'income_tax' || notice.kind === 'luxury_tax') accent = '#ea580c'; // 세금: 주황
    else if (notice.kind === 'station') accent = '#1e3a8a'; // 역장: 네이비
    else if (notice.kind === 'institution') accent = '#9333ea'; // 기관: 보라
    else if (notice.kind === 'parking_jackpot' || notice.kind === 'go_reward') accent = '#eab308'; // 보너스: 골드
    else if (notice.kind === 'chance_draw' || notice.kind === 'welfare_draw' || notice.kind === 'event_card') accent = '#9d174d'; // 찬스: 마젠타
    else accent = '#22c55e'; // 기본: 에메랄드
  }

  const isTurnStart = notice.kind === 'turn_start';
  const isBuy = notice.kind === 'buy' && notice.previewPos != null;
  const isStationNotice = notice.kind === 'station' && notice.previewPos != null;
  const isPropertyNotice = notice.kind === 'property' && notice.previewPos != null;
  const isRent = notice.kind === 'rent';
  const hostText = notice.hostText ?? notice.text;
  const noticeStyle = notice.color ? {
    background: isBuy
      ? 'linear-gradient(135deg,rgba(15,12,10,0.9)_0%,rgba(70,34,22,0.84)_48%,rgba(128,83,20,0.76)_100%)'
      : `linear-gradient(135deg, rgba(15,12,10,0.92) 0%, ${accent}88 58%, rgba(255,255,255,0.18) 100%)`,
    boxShadow: isBuy
      ? '0 4px 0 #0F0C0A, 0 16px 36px rgba(0,0,0,0.34)'
      : isTurnStart
        ? `0 0 0 4px ${accent}cc, 0 0 0 8px ${accent}35, 0 0 54px ${accent}b8, inset 0 0 34px ${accent}30`
        : `0 6px 0 #0F0C0A, 0 22px 54px rgba(0,0,0,0.46), 0 0 0 2px ${accent}aa, 0 0 42px ${accent}8f, inset 0 0 30px ${accent}22`,
  } : undefined;
  const visitorImg = notice.visitorCharacter ? getCharacterImg(notice.visitorCharacter) : null;
  const ownerImg = notice.ownerCharacter ? getCharacterImg(notice.ownerCharacter) : null;
  const noticePlayerImg = notice.playerCharacter ? getCharacterImg(notice.playerCharacter) : null;
  const avatarStyle = (character, img, fallbackColor = '#d83b2f') => ({
    backgroundImage: img ? `url(${img})` : undefined,
    backgroundSize: AVATAR_SIZE[character] ?? '155%',
    backgroundPosition: AVATAR_POSITION[character] ?? 'center 22%',
    backgroundRepeat: 'no-repeat',
    backgroundColor: `${fallbackColor}22`,
  });
  const absorbPointer = (event) => { event.preventDefault(); event.stopPropagation(); };
  const dismiss = (event) => { event.preventDefault(); event.stopPropagation(); onDismiss?.(notice); };
  const handleBuyClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (buySubmitting) return;
    const cash = Number(notice.cash) || 0;
    const price = Number(notice.price) || 0;
    if (price > cash) {
      setBuyDeniedPulse(false);
      window.setTimeout(() => setBuyDeniedPulse(true), 0);
      window.setTimeout(() => setBuyDeniedPulse(false), 760);
      return;
    }
    setBuySubmitting(true);
    window.setTimeout(() => {
      const bought = notice.onBuy?.();
      if (bought !== false) onDismiss?.(notice);
      else setBuySubmitting(false);
    }, 920);
  };
  const handleLoanClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    notice.onLoan?.();
    onDismiss?.(notice);
  };
  const layer = (
    <div
      className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-black/30 px-3 backdrop-blur-[3px]"
      style={{ zIndex: 2147483000, touchAction: 'none' }}
      onPointerDown={absorbPointer}
      onClick={isBuy ? absorbPointer : dismiss}
    >
      <motion.div
        key={`${notice.kind}-${notice.title}-${notice.text}`}
        className={cn('flex w-full flex-col items-center', isTurnStart ? 'max-w-[520px]' : 'max-w-[920px]')}
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {hostText && !isTurnStart && (
          <div className={cn('mb-[5px] flex w-full max-w-[960px] items-center gap-2 rounded-[18px] border px-5 py-2 text-center shadow-[0_12px_28px_-22px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-[16px]', isBuy ? 'justify-between border-emerald-200/42 bg-[linear-gradient(135deg,rgba(5,5,5,0.92)_0%,rgba(7,30,24,0.88)_42%,rgba(16,185,129,0.58)_100%)] text-white' : 'justify-center border-emerald-200/75 bg-[linear-gradient(135deg,rgba(5,5,5,0.9)_0%,rgba(7,30,24,0.82)_45%,rgba(16,185,129,0.42)_100%)] text-white')}>
            <div className="flex min-w-0 items-center justify-start gap-2">
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-white', isBuy ? 'border border-white/35 bg-black' : 'bg-emerald-500')}>🎙️</span>
              <span className={cn('font-board font-extrabold leading-tight', isBuy ? 'text-[clamp(14px,1.75vw,18px)]' : 'text-[clamp(15px,2vw,21px)]')} style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>{hostText}</span>
            </div>
            {isBuy && notice.loanHint && (
              <motion.button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={handleLoanClick}
                className="shrink-0 rounded-full border-2 border-emerald-950 bg-[linear-gradient(180deg,#ecfdf5_0%,#34d399_100%)] px-4 py-1.5 font-board text-[16px] font-black leading-none text-emerald-950 shadow-[0_2px_0_#064e3b] active:translate-y-1 active:shadow-none"
                animate={{ scale: [1, 1.06, 1], boxShadow: ['0 2px 0 #064e3b,0 0 0 rgba(16,185,129,0)', '0 2px 0 #064e3b,0 0 20px rgba(16,185,129,0.95)', '0 2px 0 #064e3b,0 0 0 rgba(16,185,129,0)'] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                대출상담
              </motion.button>
            )}
          </div>
        )}
        <div
          className={cn('mx-auto grid w-full overflow-hidden border-ink-line text-center text-white backdrop-blur-[1px]', isTurnStart ? 'min-h-[132px] max-w-[520px] grid-rows-[1fr_auto] rounded-[20px] border-0 bg-[#101216] p-3 shadow-none' : 'rounded-[24px] border-[3px] p-3 shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46)]', !isTurnStart && (notice.subtle ? 'min-h-[18vh] max-w-[720px] grid-rows-[1fr] bg-[linear-gradient(135deg,rgba(15,12,10,0.86)_0%,rgba(70,34,22,0.82)_55%,rgba(128,83,20,0.82)_100%)]' : 'min-h-[calc(30vh-30px)] max-w-[920px] grid-rows-[1fr_auto] bg-[linear-gradient(135deg,rgba(15,12,10,0.91)_0%,rgba(70,34,22,0.88)_45%,rgba(128,83,20,0.86)_100%)]'))}
          style={noticeStyle}
        >
          {isTurnStart ? (
            <div className="relative flex min-h-0 items-center justify-center gap-3">
              {notice.playerCharacter ? (
                <motion.div
                  className="absolute left-5 h-20 w-20 shrink-0 rounded-full border-2 border-white/75 bg-white/70 shadow-[0_0_0_4px_rgba(255,255,255,0.22),0_0_24px_rgba(255,255,255,0.34)]"
                  style={avatarStyle(notice.playerCharacter, noticePlayerImg, accent)}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.65 }}
                />
              ) : (
                <motion.span className={cn('leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.36)]', notice.subtle ? 'text-[34px]' : 'text-[46px]')} animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{notice.icon ?? '📣'}</motion.span>
              )}
              <div className={cn('min-w-0', 'translate-x-[45px]')}>
                <div className={cn('font-board font-black leading-[0.95] drop-shadow-[0_4px_0_rgba(0,0,0,0.42)]', 'text-[clamp(18px,2.55vw,27px)]')}>{notice.title}</div>
                <div className={cn('mt-1 line-clamp-1 font-board font-black tracking-normal text-monopoly-gold/86', 'text-[clamp(15px,2vw,21px)]')}>{notice.text}</div>
              </div>
            </div>
          ) : isBuy ? (
            <div className="grid min-h-0 grid-cols-[minmax(190px,250px)_1fr] items-center gap-5 px-2 text-left">
              <BuyOfferCard notice={notice} accent={accent} />
              <div className="flex min-w-0 flex-col justify-center text-center sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <motion.span className="text-[43px] leading-none drop-shadow-[0_3px_0_rgba(0,0,0,0.22)]" animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{notice.icon ?? '🧓'}</motion.span>
                  <div className="whitespace-nowrap font-board text-[clamp(18px,2.35vw,27px)] leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.28)]">{notice.title}</div>
                </div>
                {notice.cash != null && <BuyCashPreview cash={notice.cash} price={notice.price} active={buySubmitting} />}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    disabled={buySubmitting}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={handleBuyClick}
                    className={cn(
                      'rounded-xl border-2 border-ink-line px-3 py-3 font-board text-2xl font-black shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none disabled:opacity-55',
                      buyDeniedPulse
                        ? 'bg-monopoly-red text-white'
                        : 'bg-[linear-gradient(180deg,#ffffff_0%,#efe2c5_100%)] text-ink',
                    )}
                    animate={buyDeniedPulse ? { x: [-8, 8, -7, 7, -4, 4, 0], scale: [1, 1.04, 1], boxShadow: ['0 3px 0 #0F0C0A,0 0 0 rgba(239,68,68,0)', '0 3px 0 #7f1d1d,0 0 24px rgba(239,68,68,0.95)', '0 3px 0 #0F0C0A,0 0 0 rgba(239,68,68,0)'] } : { x: 0, scale: 1 }}
                    transition={{ duration: 0.72, ease: 'easeInOut' }}
                  >
                    {notice.loanHint ? '예금부족' : '매입'}
                  </motion.button>
                  <button type="button" disabled={buySubmitting} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); notice.onPass?.(); onDismiss?.(); }} className="rounded-xl border-2 border-ink-line bg-[linear-gradient(180deg,#ffffff_0%,#efe2c5_100%)] px-3 py-3 font-board text-2xl font-black text-ink shadow-[0_3px_0_#0F0C0A] active:translate-y-1 active:shadow-none disabled:opacity-55">스킵</button>
                </div>
              </div>
            </div>
          ) : isRent ? (
            <div className="grid min-h-[250px] grid-cols-[minmax(170px,248px)_1fr] items-center gap-5 px-2 text-left">
              <RentLandNoticeCard notice={notice} accent={notice.ownerColor ?? accent} />
              <div className="flex min-w-0 flex-col items-center justify-center gap-3 text-center">
                <div className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/62">통행료 정산</div>
                <div className="flex flex-wrap items-center justify-center gap-2 font-board text-[clamp(22px,3.1vw,34px)] font-extrabold leading-tight drop-shadow-[0_4px_0_rgba(0,0,0,0.38)]">
                  <PlayerNameCapsule playerId={notice.ownerId} name={notice.ownerName} color={notice.ownerColor ?? accent} />
                  <span>의 땅을 밟았습니다.</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/28 bg-white/12 px-4 py-2 font-board text-[clamp(16px,2vw,22px)] leading-tight text-white/90">
                  <span>통행료를</span>
                  <PlayerNameCapsule playerId={notice.ownerId} name={notice.ownerName} color={notice.ownerColor ?? accent} compact />
                  <span>님에게 지불합니다.</span>
                </div>
                <div className="mt-1 flex items-center justify-center gap-5">
                  <div className="relative flex flex-col items-center gap-1">
                    <div className="relative h-20 w-20 rounded-full border-3 border-white bg-white/70 shadow-[0_4px_0_#0F0C0A]" style={avatarStyle(notice.visitorCharacter, visitorImg, '#d83b2f')}>
                      <span className="absolute -right-2 -top-3 text-3xl">😭</span>
                      <motion.div className="absolute left-1/2 top-[45%] z-10 -translate-x-1/2 rounded-full bg-red-500 px-1.5 py-0.5 font-display text-[10px] font-black leading-none text-white shadow-[0_2px_0_#0F0C0A]" animate={{ scale: [0.9, 1.08, 0.96, 1.05, 1], opacity: [0, 1, 0, 1, 1] }} transition={{ duration: 1.7, ease: 'easeInOut' }}>-{fmt(Math.abs(amount))}만원</motion.div>
                    </div>
                    <PlayerNameCapsule playerId={notice.visitorId} name={notice.visitorName} color={playerColor(notice.visitorId ?? 0, '#d83b2f')} compact />
                  </div>
                  <div className="font-display text-[34px] text-monopoly-gold">→</div>
                  <div className="relative flex flex-col items-center gap-1">
                    <motion.div className="relative h-20 w-20 rounded-full border-3 border-white bg-white/70 shadow-[0_4px_0_#0F0C0A]" animate={{ x: [-3, 4, -2, 3, 0], rotate: [-2, 2, -2, 2, 0] }} transition={{ duration: 0.9, repeat: 2 }} style={avatarStyle(notice.ownerCharacter, ownerImg, notice.ownerColor ?? '#22c55e')}>
                      <span className="absolute -right-2 -top-3 text-3xl">😏</span>
                      <motion.div className="absolute left-1/2 top-[45%] z-10 -translate-x-1/2 rounded-full bg-emerald-500 px-1.5 py-0.5 font-display text-[10px] font-black leading-none text-white shadow-[0_2px_0_#0F0C0A]" animate={{ scale: [0.9, 1.08, 0.96, 1.05, 1], opacity: [0, 1, 0, 1, 1] }} transition={{ duration: 1.7, ease: 'easeInOut' }}>+{fmt(Math.abs(amount))}만원</motion.div>
                    </motion.div>
                    <PlayerNameCapsule playerId={notice.ownerId} name={notice.ownerName} color={notice.ownerColor ?? '#22c55e'} compact />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 grid-cols-[minmax(150px,236px)_1fr] items-center gap-5 px-2 text-left">
              {isPropertyNotice ? (
                notice.propertyMode === 'own' ? (
                  <OwnedLandNoticeCard notice={notice} accent={accent} />
                ) : (
                  <div className="mx-auto h-[190px] w-[150px] scale-[0.92] overflow-hidden rounded-xl border-[3px] bg-white shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: `${accent}cc`, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${accent}80` }}>
                    <PropertyDeedMini pos={notice.previewPos} />
                  </div>
                )
              ) : (
                <div className="mx-auto h-[190px] w-[150px] scale-[0.92] overflow-hidden rounded-xl border-[3px] bg-white shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: `${accent}cc`, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${accent}80` }}>
                  <NoticeIconCard notice={notice} accent={accent} />
                </div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <motion.span className="text-[46px] leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.36)]" animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{notice.icon ?? '📜'}</motion.span>
                  <div className="whitespace-pre-line font-board text-[clamp(28px,4.1vw,50px)] leading-[0.98] drop-shadow-[0_4px_0_rgba(0,0,0,0.42)]">{notice.title}</div>
                </div>
                <div className="mt-2 font-board text-[clamp(17px,2.4vw,26px)] leading-tight text-white/86">{notice.text}</div>
                <div className="mt-4 inline-block rounded-xl border border-white/28 bg-white/12 px-4 py-3 font-board text-[22px] leading-tight text-white/90">
                  {notice.cta ?? '터치해서 닫기'}
                </div>
              </div>
            </div>
          )}
          {!isBuy && !isRent && !isTurnStart && (
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

function buyOfferLine(seed = 0) {
  const lines = [
    '좋은 땅인데 매입하시겠어요? 호호',
    '이 땅 괜찮은데 잡아둘까요? 호호',
    '지금 사두면 든든하겠는데요? 호호',
    '이 정도면 탐나는 자리예요, 호호',
    '눈 딱 감고 하나 들이실래요? 호호',
  ];
  return lines[Math.abs(Number(seed) || 0) % lines.length];
}

function loanOfferLine(seed = 0) {
  const lines = [
    '조금만 보태면 바로 잡는 자리예요',
    '대출 살짝 끼면 이 땅 놓치기 아까워요',
    '지금은 부족해도 상담 한 번이면 돼요',
    '좋은 땅은 기다려주지 않아요',
    '예금 모자라면 대출로 잡아두면 되죠',
  ];
  return lines[Math.abs(Number(seed) || 0) % lines.length];
}

function PlayerNameCapsule({ playerId, name, color = '#22c55e', compact = false }) {
  const safeId = Number.isInteger(playerId) ? playerId : 0;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 overflow-hidden rounded-full border-2 border-white/82 font-board font-black leading-none text-white shadow-[0_2px_0_rgba(15,12,10,0.62),0_0_14px_rgba(255,255,255,0.16)]',
        compact ? 'px-2 py-1 text-[12px]' : 'px-3 py-1.5 text-[clamp(15px,2vw,20px)]',
      )}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 58%, rgba(15,12,10,0.42) 100%)` }}
    >
      <span className={cn('shrink-0 rounded-full border border-white/65 bg-black/24 px-1.5 font-display font-black text-white', compact ? 'text-[9px] leading-[13px]' : 'text-[11px] leading-[15px]')}>
        {safeId + 1}P
      </span>
      <span className={cn('min-w-0 truncate text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]', compact ? 'max-w-[76px]' : 'max-w-[126px]')}>
        {name ?? `${safeId + 1}P`}
      </span>
    </span>
  );
}

function BuyCashPreview({ cash = 0, price = 0, active = false }) {
  const safeCash = Number(cash) || 0;
  const safePrice = Number(price) || 0;
  const afterCash = Math.max(0, safeCash - safePrice);
  const displayCash = active ? afterCash : safeCash;
  return (
    <div className="relative mt-4 overflow-visible rounded-2xl border-2 border-white/40 bg-black/28 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
      <CashDeltaFloat value={displayCash} className="left-1/2 top-[18px] -translate-x-1/2 !text-[20px]" />
      <div className="inline-flex rounded-full border border-white/40 bg-emerald-500 px-3 py-1 font-board text-[13px] font-black leading-none text-white shadow-[0_2px_0_rgba(15,12,10,0.45)]">예금액</div>
      <div className="mt-2 flex min-h-[42px] items-center justify-center font-board leading-none">
        <AnimatedCash
          value={displayCash}
          duration={820}
          settleDelay={0}
          neutralClassName="text-white"
          className="text-[clamp(28px,4vw,43px)] font-black leading-none drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]"
        />
        <span className="ml-1 text-[clamp(13px,1.8vw,18px)] font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.32)]">만원</span>
      </div>
    </div>
  );
}

function BuyOfferCard({ notice, accent = '#22c55e' }) {
  const state = useGameStore((s) => s.state);
  const pos = notice?.previewPos;
  const tile = state?.board?.tiles?.[pos];
  const ts = state?.tileState?.[pos] ?? {};
  const name = tile?.names?.ko ?? tile?.name ?? notice?.text ?? '부동산';
  const price = notice?.price ?? ts.price ?? tile?.price ?? tile?.basePrice ?? 0;
  const skylineSlot = {
    brown: 'skyline.brown',
    lightblue: 'skyline.lightblue',
    pink: 'skyline.pink',
    orange: 'skyline.orange',
    red: 'skyline.red',
    yellow: 'skyline.yellow',
    green: 'skyline.green',
    darkblue: 'skyline.darkblue',
  }[tile?.color];
  const groupTiles = (state?.board?.tiles ?? []).filter((item) => item.type === 'property' && item.color === tile?.color);
  const slots = groupTiles.length ? groupTiles : [tile].filter(Boolean);
  const fallbackColor = {
    brown: '#955436',
    lightblue: '#49B8E8',
    pink: '#D93A96',
    orange: '#F7941D',
    red: '#ED1B24',
    yellow: '#D8B300',
    green: '#1FB25A',
    darkblue: '#0072BB',
  }[tile?.color] ?? accent;

  return (
    <div className="mx-auto w-full max-w-[236px] rounded-[18px] border-[3px] bg-[#fffaf0] p-2 text-[#17120c] shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: fallbackColor, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${fallbackColor}9a` }}>
      <div className="overflow-hidden rounded-[14px] border-2 border-[#17120c] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="relative h-[74px] overflow-hidden border-b-2 border-[#17120c]" style={{ background: `linear-gradient(135deg, ${fallbackColor}, #fff2a8)` }}>
          {skylineSlot ? (
            <AssetFrame slot={skylineSlot} rounded="rounded-none" className="absolute inset-0 !aspect-auto h-full w-full scale-110" style={{ opacity: 0.9 }} />
          ) : (
            <div className="grid h-full w-full place-items-center text-[48px]">🏙️</div>
          )}
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full border border-white/50 bg-black/54 px-3 py-1 font-display text-[8px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-[4px]">for sale</span>
          </div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="mx-auto max-w-full truncate font-board text-[21px] font-black leading-[1.08] text-[#17120c]">{name}</div>
          <div className="mx-auto mt-2 rounded-xl border-[3px] border-[#17120c] bg-[linear-gradient(180deg,#fff8dc_0%,#ffd56a_100%)] px-3 py-1.5 font-board text-[19px] font-black leading-none shadow-[0_2px_0_#0F0C0A]">
            매입가 {fmt(price)}만원
          </div>
          <div className={cn('mt-4 gap-1.5', slots.length === 2 ? 'flex justify-center' : 'grid grid-cols-3')}>
            {slots.slice(0, 3).map((groupTile) => {
              const ownerId = state?.tileState?.[groupTile.pos]?.owner;
              const owner = Number.isInteger(ownerId) ? state?.players?.[ownerId] : null;
              const ownerBase = owner ? CHAR_META[owner.character] : null;
              const ownerColor = owner ? playerColor(ownerId, ownerBase?.color ?? fallbackColor) : null;
              return (
                <div key={groupTile.pos} className={cn('relative flex h-10 min-w-0 items-center justify-center rounded-[6px] border-2 border-[#17120c] bg-[#fffaf0] px-0.5 font-board text-[10px] font-black leading-[1.08] text-[#17120c] shadow-[0_2px_0_rgba(15,12,10,0.58),0_4px_8px_rgba(15,12,10,0.14)]', slots.length === 2 && 'w-[54px]')} title={groupTile.names?.ko ?? groupTile.name}>
                  {owner && (
                    <span className="absolute left-1/2 -top-[9px] -translate-x-1/2 rounded-full border border-white px-1 font-display text-[7px] font-black leading-[11px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]" style={{ backgroundColor: ownerColor }}>
                      {ownerId + 1}P
                    </span>
                  )}
                  <span className="block max-w-full whitespace-nowrap leading-[1.08]">{groupTile.names?.ko ?? groupTile.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const PROPERTY_NOTICE_COLORS = {
  brown: '#955436',
  lightblue: '#49B8E8',
  pink: '#D93A96',
  orange: '#F7941D',
  red: '#ED1B24',
  yellow: '#D8B300',
  green: '#1FB25A',
  darkblue: '#0072BB',
};

function propertyGroupSlots(state, tile) {
  const groupTiles = (state?.board?.tiles ?? []).filter((item) => item.type === 'property' && item.color === tile?.color);
  return groupTiles.length ? groupTiles : [tile].filter(Boolean);
}

function LandGroupMarks({ state, tile, highlightOwnerId = null, accent = '#22c55e' }) {
  const slots = propertyGroupSlots(state, tile).slice(0, 3);
  return (
    <div className={cn('mt-3 gap-1.5', slots.length === 2 ? 'flex justify-center' : 'grid grid-cols-3')}>
      {slots.map((groupTile) => {
        const ownerId = state?.tileState?.[groupTile.pos]?.owner;
        const owner = Number.isInteger(ownerId) ? state?.players?.[ownerId] : null;
        const ownerBase = owner ? CHAR_META[owner.character] : null;
        const ownerColor = owner ? playerColor(ownerId, ownerBase?.color ?? accent) : null;
        const active = highlightOwnerId == null ? groupTile.pos === tile?.pos : ownerId === highlightOwnerId;
        return (
          <div
            key={groupTile.pos}
            className={cn('relative grid h-9 place-items-center rounded-[6px] border-2 border-[#17120c] px-0.5 shadow-[0_2px_0_rgba(15,12,10,0.58)]', slots.length === 2 && 'w-[56px]')}
            style={{ background: active ? accent : '#fffaf0', boxShadow: active ? `0 2px 0 rgba(15,12,10,0.58), 0 0 10px ${accent}aa` : '0 2px 0 rgba(15,12,10,0.58)' }}
            title={groupTile.names?.ko ?? groupTile.name}
          >
            {owner && (
              <span className="absolute left-1/2 -top-[10px] -translate-x-1/2 rounded-full border border-white px-1 font-display text-[7px] font-black leading-[11px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.45)]" style={{ backgroundColor: ownerColor }}>
                {ownerId + 1}P
              </span>
            )}
            <span className={cn('max-w-full truncate font-board text-[8px] font-black leading-none', active ? 'text-white' : 'text-[#17120c66]')}>
              {groupTile.names?.ko ?? groupTile.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BuildingMarks({ stage = 0, accent = '#22c55e' }) {
  const safeStage = Math.max(0, Math.min(5, Number(stage) || 0));
  return (
    <div className="mt-2 grid grid-cols-4 gap-1.5">
      {Array.from({ length: 4 }, (_, idx) => {
        const active = safeStage === 5 || idx < safeStage;
        return (
          <div
            key={idx}
            className="grid h-7 place-items-center rounded-[6px] border-2 border-[#17120c] font-display text-[10px] font-black text-white shadow-[0_2px_0_rgba(15,12,10,0.58)]"
            style={{ background: active ? accent : '#fffaf0', color: active ? '#fff' : '#17120c66' }}
          >
            {safeStage === 5 ? 'APT' : active ? 'B' : ''}
          </div>
        );
      })}
    </div>
  );
}

function OwnedLandNoticeCard({ notice, accent = '#22c55e' }) {
  const state = useGameStore((s) => s.state);
  const pos = notice?.previewPos;
  const tile = state?.board?.tiles?.[pos];
  const ts = state?.tileState?.[pos] ?? {};
  const name = tile?.names?.ko ?? tile?.name ?? '내 땅';
  const basePrice = tile?.basePrice ?? tile?.price ?? 0;
  const marketPrice = tile ? currentPrice(state, pos) : basePrice;
  const color = PROPERTY_NOTICE_COLORS[tile?.color] ?? accent;
  const skylineSlot = {
    brown: 'skyline.brown',
    lightblue: 'skyline.lightblue',
    pink: 'skyline.pink',
    orange: 'skyline.orange',
    red: 'skyline.red',
    yellow: 'skyline.yellow',
    green: 'skyline.green',
    darkblue: 'skyline.darkblue',
  }[tile?.color];

  return (
    <div className="mx-auto w-full max-w-[236px] rounded-[18px] border-[3px] bg-[#fffaf0] p-2 text-[#17120c] shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: color, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${color}9a` }}>
      <div className="overflow-hidden rounded-[14px] border-2 border-[#17120c] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="relative h-[68px] overflow-hidden border-b-2 border-[#17120c]" style={{ background: `linear-gradient(135deg, ${color}, #fff2a8)` }}>
          {skylineSlot ? <AssetFrame slot={skylineSlot} rounded="rounded-none" className="absolute inset-0 !aspect-auto h-full w-full scale-110" style={{ opacity: 0.9 }} /> : <div className="grid h-full w-full place-items-center text-[44px]">🏙️</div>}
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full border border-white/55 bg-black/58 px-3 py-1 font-display text-[8px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-[4px]">my land</span>
          </div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="mx-auto max-w-full truncate font-board text-[21px] font-black leading-[1.08] text-[#17120c]">{name}</div>
          <div className="mt-2 rounded-xl border-[3px] border-[#17120c] bg-[linear-gradient(180deg,#fff8dc_0%,#ffd56a_100%)] px-2 py-1.5 font-board text-[15px] font-black leading-none shadow-[0_2px_0_#0F0C0A]">
            매입가 {fmt(basePrice)}만원 <span className="text-[#17120c66]">|</span> 현시세 {fmt(marketPrice)}만원
          </div>
          <LandGroupMarks state={state} tile={tile} highlightOwnerId={ts.owner} accent={color} />
          <BuildingMarks stage={ts.stage ?? 0} accent={color} />
        </div>
      </div>
    </div>
  );
}

function RentLandNoticeCard({ notice, accent = '#22c55e' }) {
  const state = useGameStore((s) => s.state);
  const pos = notice?.previewPos;
  const tile = state?.board?.tiles?.[pos];
  const ts = state?.tileState?.[pos] ?? {};
  const name = tile?.names?.ko ?? tile?.name ?? notice?.tileName ?? '남의 땅';
  const rent = Math.abs(Number(notice?.amount) || 0);
  const color = PROPERTY_NOTICE_COLORS[tile?.color] ?? accent;
  const skylineSlot = {
    brown: 'skyline.brown',
    lightblue: 'skyline.lightblue',
    pink: 'skyline.pink',
    orange: 'skyline.orange',
    red: 'skyline.red',
    yellow: 'skyline.yellow',
    green: 'skyline.green',
    darkblue: 'skyline.darkblue',
  }[tile?.color];

  return (
    <div className="mx-auto w-full max-w-[236px] rounded-[18px] border-[3px] bg-[#fffaf0] p-2 text-[#17120c] shadow-[0_5px_0_#0F0C0A]" style={{ borderColor: color, boxShadow: `0 5px 0 #0F0C0A, 0 0 24px ${color}9a` }}>
      <div className="overflow-hidden rounded-[14px] border-2 border-[#17120c] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="relative h-[78px] overflow-hidden border-b-2 border-[#17120c]" style={{ background: `linear-gradient(135deg, ${color}, #111827)` }}>
          {skylineSlot ? <AssetFrame slot={skylineSlot} rounded="rounded-none" className="absolute inset-0 !aspect-auto h-full w-full scale-110" style={{ opacity: 0.82 }} /> : <div className="grid h-full w-full place-items-center text-[44px]">🏙️</div>}
          <div className="absolute inset-x-0 top-2 flex justify-center">
            <span className="rounded-full border border-white/55 bg-black/62 px-3 py-1 font-display text-[8px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-[4px]">toll</span>
          </div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="mx-auto max-w-full truncate font-board text-[21px] font-black leading-[1.08] text-[#17120c]">{name}</div>
          <div className="mt-2 rounded-xl border-[3px] border-[#17120c] bg-[linear-gradient(180deg,#fee2e2_0%,#fb7185_100%)] px-3 py-1.5 font-board text-[19px] font-black leading-none text-[#7f1d1d] shadow-[0_2px_0_#0F0C0A]">
            임대료 {fmt(rent)}만원
          </div>
          <LandGroupMarks state={state} tile={tile} highlightOwnerId={ts.owner} accent={color} />
        </div>
      </div>
    </div>
  );
}

function ownLandEmceeLine(seed = 0) {
  const lines = [
    '잠시 쉬어갑니다. 여유가 있다면 건물이라도 올려보시면 어떨까요?',
    '여긴 내 땅입니다. 오늘은 지갑보다 마음이 편한 칸이네요.',
    '안전지대 도착입니다. 숨 한 번 돌리고 건설 타이밍을 봐도 좋겠습니다.',
    '집주인이 직접 방문했네요. 빈손으로 보내긴 아까우니 개발 계획 한 번 보시죠.',
    '통행료 걱정은 없습니다. 대신 땅값 올릴 기회는 놓치지 마세요.',
  ];
  return lines[Math.abs(Number(seed) || 0) % lines.length];
}

function rentEmceeLine({ visitor = '플레이어', owner = '소유자', tile = '땅', amount = 0 } = {}) {
  const seed = Math.abs(String(`${visitor}${owner}${tile}${amount}`).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
  const lines = [
    `아이고 ${visitor}님… ${owner}님의 ${tile}입니다 😭 통행료 ${fmt(amount)}만원, 눈물 한 방울만 닦고 가시죠.`,
    `발끝이 살짝 선을 넘었습니다 😭 ${tile} 주인은 ${owner}님, 통행료 정산 들어갑니다.`,
    `${visitor}님, 오늘 길이 조금 비쌌습니다 😭 ${owner}님께 ${fmt(amount)}만원 지불합니다.`,
    `여기서 딱 걸렸네요 😭 ${owner}님 웃음소리가 들리는 듯하지만, 선은 지키겠습니다.`,
    `남의 땅은 역시 차갑습니다 😭 ${tile} 통행료 내고 다음 칸에서 복수합시다.`,
  ];
  return lines[seed % lines.length];
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
  if (arrival?.kind === 'go_to_jail' || arrival?.kind === 'jail_landed') return `${playerName}님 감옥행입니다 😭 다음 차례부터 출소 시도합니다.`;
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
  const pushMoney = (label, amount) => {
    const safe = Number(amount) || 0;
    if (safe !== 0) moneyRows.push({ label, amount: safe, order: moneyRows.length });
  };
  const developmentByPos = new Map();
  for (const event of events) {
    if (event.kind !== 'develop_property') continue;
    const key = event.pos ?? 'unknown';
    const prev = developmentByPos.get(key);
    developmentByPos.set(key, {
      pos: event.pos,
      firstStage: prev?.firstStage ?? event.fromStage,
      lastStage: event.toStage,
      amount: (prev?.amount ?? 0) + (Number(event.amount) || 0),
      order: prev?.order ?? moneyRows.length + developmentByPos.size,
    });
  }

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
        pushMoney(`찬스카드 ${event.card ?? ''}`, event.delta ?? 0);
        break;
      case 'welfare_draw':
        pushMoney(`일상카드 ${event.card ?? ''}`, event.delta ?? event.allDelta ?? event.collected ?? 0);
        break;
      case 'event_card':
        pushMoney(`이벤트카드 ${event.card ?? ''}`, event.sale ?? 0);
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
        pushMoney(`${tileName(event.destPos)} 환승 이동`, -(event.fee ?? 0));
        break;
      default:
        break;
    }
  }
  for (const item of developmentByPos.values()) {
    if (item.firstStage === item.lastStage || item.amount === 0) continue;
    const label = item.lastStage > item.firstStage
      ? `${tileName(item.pos)} 건설 최종 ${stageSummaryLabel(item.lastStage)}`
      : `${tileName(item.pos)} 철거 최종 ${stageSummaryLabel(item.lastStage)}`;
    moneyRows.push({ label, amount: item.amount, order: item.order });
  }
  if (bought) pushMoney(`${bought.name} 매입`, -bought.price);
  const mergedRows = new Map();
  for (const row of moneyRows) {
    const prev = mergedRows.get(row.label);
    if (prev) prev.amount += row.amount;
    else mergedRows.set(row.label, { ...row });
  }
  const finalMoneyRows = [...mergedRows.values()]
    .filter((row) => row.amount !== 0)
    .sort((a, b) => a.order - b.order)
    .map(({ label, amount }) => ({ label, amount }));

  const cashAfter = player?.cash ?? cashBefore;
  return {
    playerName: name,
    color: playerColor(playerId, meta.color),
    roll: roll ? `${roll.d1 ?? '?'} + ${roll.d2 ?? '?'} = ${roll.sum ?? roll.dice?.sum ?? '?'}${roll.isDouble ? ' · 더블' : ''}` : '주사위 정보 없음',
    arrival: arrival?.pos != null ? tileName(arrival.pos) : describeArrival(arrival, state.board?.tiles?.[player?.position ?? 0]),
    arrivalText: describeArrival(arrival, arrival?.pos != null ? state.board?.tiles?.[arrival.pos] : state.board?.tiles?.[player?.position ?? 0]),
    card: card ? (card.card ?? card.description ?? (card.kind === 'chance_draw' ? '찬스 카드' : '카드')) : null,
    bought,
    moneyRows: finalMoneyRows,
    totalDelta: finalMoneyRows.reduce((sum, row) => sum + row.amount, 0),
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
                    {owner && <span style={{ color: playerColor(ownerId, ownerMeta?.color ?? '#D32F2F') }}>{owner.name ?? `${ownerId + 1}P`} 소유</span>}
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
    <div className="absolute inset-x-0 top-[72px] bottom-[86px] z-[86] flex items-center justify-center bg-ink/38 p-2 backdrop-blur-[3px]" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="relative flex h-full max-h-[760px] w-[min(96vw,1040px)] flex-col overflow-hidden rounded-xl border-[3px] border-ink-line bg-parchment-100 shadow-[0_6px_0_#0F0C0A,0_24px_48px_-18px_rgba(0,0,0,0.75)]">
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

function BoardTurnOverlay({ state, replay, cardResult = null, onRevealCard, onRoll, teleportRequest = null, onTeleportSelect, onClose }) {
  const openTradeSelect = useGameStore((s) => s.openTradeSelect);
  const tiles = state.board?.tiles ?? [];
  const player = state.players?.[replay.playerId];
  const activePlayerColor = player ? playerColor(replay.playerId, CHAR_META[player.character]?.color ?? '#d83b2f') : '#d83b2f';
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

  const isTeleportSelect = replay.phase === 'teleport_select' && !!teleportRequest;
  const showCardPanel = replay.phase === 'arrived' && !!cardResult;
  const closeOnTouch = !showCardPanel && !isTeleportSelect && (replay.phase === 'inspect' || replay.phase === 'arrived');
  const cameraGrid = boardGridStyle(pos);
  const cameraCol = Number(cameraGrid.gridColumn) || 6;
  const cameraRow = Number(cameraGrid.gridRow) || 6;
  const cameraActive = replay.phase === 'moving';
  const boardScale = 0.95;
  const cameraZoom = (cameraActive ? 1.18 : 1) * boardScale;
  const rawCameraX = cameraActive ? (6 - cameraCol) * 5.1 : 0;
  const rawCameraY = cameraActive ? (6 - cameraRow) * 5.1 : 0;
  const cameraX = Math.max(-22, Math.min(22, rawCameraX));
  const cameraY = Math.max(-22, Math.min(22, rawCameraY));

  return (
    <div
      className="board-turn-layer absolute inset-x-2 top-[112px] bottom-[76px] z-[85] flex items-center justify-center bg-transparent p-2"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (closeOnTouch) onClose?.();
      }}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
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
              const ownerColor = owner ? playerColor(ownerId, CHAR_META[owner.character]?.color ?? '#d83b2f') : null;
              const isCenterSpecial = ['go', 'free_parking', 'jail', 'go_to_jail', 'chance', 'community_chest', 'tax', 'railroad', 'utility'].includes(tile.type);
              return (
                <div
                  key={tile.pos}
                  className={cn('board-turn-tile relative overflow-hidden rounded-md border border-[#17120c] bg-[#fff7df] p-1 text-center shadow-[0_1px_0_rgba(0,0,0,0.42)]', isActive && 'board-turn-tile-current', isEnd && 'board-turn-tile-arrived')}
                  style={grid}
                >
                  {owner && <div className="board-turn-owner-bookmark" style={{ backgroundColor: ownerColor }} title={`${owner.name || `${ownerId + 1}P`} 소유`} />}
                  {!isCenterSpecial && <div className="h-1.5 rounded-sm" style={{ backgroundColor: tile.color ?? (tile.type === 'tax' ? '#e44' : tile.type === 'community_chest' ? '#4f7edb' : '#d6b15d') }} />}
                  <div className={cn('board-turn-tile-name', isCenterSpecial && 'board-turn-tile-name-special')} title={tile.names?.ko ?? tile.name ?? String(tile.pos)}>{isCenterSpecial ? specialTileContent(tile) : shortTileName(tile.names?.ko ?? tile.name ?? tile.pos)}</div>
                  {isTeleportSelect && tile.pos !== teleportRequest.fromPos && (
                    <button
                      type="button"
                      className="absolute inset-0 z-20 rounded-md border-2 border-yellow-300/85 bg-yellow-200/16 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.24),0_0_14px_rgba(250,204,21,0.46)] transition hover:bg-yellow-200/34 active:scale-95"
                      title={`${tile.names?.ko ?? tile.name ?? tile.pos}로 환승`}
                      onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                      onClick={(event) => { event.preventDefault(); event.stopPropagation(); onTeleportSelect?.(tile.pos); }}
                    />
                  )}
                  <div className="board-turn-pieces">
                    {state.players.map((piecePlayer, pieceIndex) => {
                      const renderPos = pieceIndex === replay.playerId ? pos : (piecePlayer.position ?? 0);
                      if (renderPos !== tile.pos || piecePlayer.bankrupt) return null;
                      const pieceColor = playerColor(pieceIndex, CHAR_META[piecePlayer.character]?.color ?? '#d83b2f');
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
                {showCardPanel ? (
                  <BoardCardRevealPanel card={cardResult} onReveal={onRevealCard} />
                ) : isTeleportSelect ? (
                  <BoardTeleportSelectPanel request={teleportRequest} player={player} playerColor={activePlayerColor} />
                ) : replay.phase === 'arrived' ? (
                  <BoardArrivalCard state={state} pos={replay.endPos ?? pos} event={replay.arrival} activeColor={activePlayerColor} />
                ) : replay.phase === 'ready' ? (
                  <div className="board-turn-number-pad">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <button key={num} type="button" onClick={() => onRoll(num)} className="board-turn-number-button">
                        {num}
                      </button>
                    ))}
                  </div>
                ) : replay.phase === 'inspect' ? (
                  <div className="space-y-3">
                    <div className="board-turn-number-pad">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <button key={num} type="button" onClick={() => onRoll(num)} className="board-turn-number-button">
                          {num}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openTradeSelect?.(replay.playerId);
                      }}
                      className="rounded-xl border border-[#17120c]/45 bg-[linear-gradient(180deg,rgba(255,247,214,0.72)_0%,rgba(214,177,93,0.62)_100%)] px-5 py-2.5 font-board text-[20px] font-black leading-none text-[#4b3510] shadow-[0_2px_0_rgba(23,18,12,0.55),0_8px_16px_-14px_rgba(0,0,0,0.45)] transition active:translate-y-1 active:shadow-none"
                    >
                      거래 제의
                    </button>
                  </div>
                ) : (
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

function BoardTeleportSelectPanel({ request, player, playerColor = '#FACC15' }) {
  const name = player?.name ?? `${(request?.playerId ?? 0) + 1}P`;
  return (
    <div className="mx-auto w-[min(48vw,300px)] rounded-[20px] border-[3px] border-[#17120c] bg-[linear-gradient(145deg,#020617_0%,#111827_58%,#facc15_160%)] p-4 text-center text-white shadow-[0_6px_0_#17120c,0_0_26px_rgba(250,204,21,0.42)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-white/70 bg-white/16 text-[30px] shadow-[0_3px_0_rgba(0,0,0,0.45)]">🎴</div>
      <div className="mt-2 font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/54">chance transfer</div>
      <div className="mt-1 font-board text-[24px] leading-none" style={{ color: playerColor }}>환승역 찬스</div>
      <div className="mt-2 rounded-xl border border-white/18 bg-white/12 px-3 py-2 font-board text-[15px] leading-tight text-white/86">
        {name}님, 보드판에서 이동할 칸을 눌러주세요.
      </div>
      <div className="mt-2 font-display text-[10px] font-black uppercase tracking-[0.14em] text-yellow-200/80">노란빛 칸 선택 → 말 이동 → 정리 멘트</div>
    </div>
  );
}

function BoardCardRevealPanel({ card, onReveal }) {
  const [flipped, setFlipped] = useState(false);
  const tone = CARD_REVEAL_TONE[card?.cardKind] ?? CARD_REVEAL_TONE.chance;
  const hiddenCardLabel = card?.cardKind === 'welfare' ? '일상 카드' : card?.cardKind === 'event' ? '이벤트 카드' : '찬스 카드';
  const reveal = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (flipped) return;
    setFlipped(true);
    window.setTimeout(() => onReveal?.(), 620);
  };
  return (
    <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={reveal} className="mx-auto block w-[min(42vw,245px)] text-center focus:outline-none">
      <div className="mb-2 rounded-full border-2 border-[#17120c] bg-[#fff7df] px-3 py-1 font-board text-[15px] font-black text-[#17120c] shadow-[0_2px_0_#17120c]">
        {flipped ? '효과 발동 중' : '카드를 뒤집어 주세요'}
      </div>
      <motion.div
        className="relative mx-auto h-[250px] w-[178px] [perspective:900px]"
        animate={flipped
          ? { rotate: [0, -2, 2, 0], scale: [1, 1.05, 1] }
          : { rotate: [-1.6, 1.6, -1.1, 1.1, 0], y: [0, -3, 0, 2, 0] }}
        transition={flipped
          ? { duration: 0.42 }
          : { duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-[18px] border-[3px] border-[#17120c] bg-white text-ink shadow-[0_6px_0_#0F0C0A,0_0_24px_rgba(0,0,0,0.36)]"
          animate={flipped ? { boxShadow: [`0 6px 0 #0F0C0A,0 0 24px rgba(0,0,0,0.36)`, `0 6px 0 #0F0C0A,0 0 38px ${tone.glow}`, `0 6px 0 #0F0C0A,0 0 24px rgba(0,0,0,0.36)`] } : {}}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {flipped ? (
            <CardArtwork type={card?.cardKind ?? 'chance'} id={String(card?.cardId ?? card?.eventId ?? '')} className="absolute inset-0 h-full w-full rounded-none" framed={false} />
          ) : (
            <div
              className="absolute inset-0 grid place-items-center overflow-hidden text-white"
              style={{ background: `radial-gradient(circle at 50% 22%, rgba(255,255,255,0.30) 0%, transparent 26%), linear-gradient(145deg, ${tone.from} 0%, ${tone.mid} 54%, ${tone.to} 100%)` }}
            >
              <div className="absolute inset-3 rounded-[14px] border border-white/24" />
              <div className="relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/48 bg-white/16 text-[34px] shadow-[0_0_26px_rgba(255,255,255,0.18)]">{tone.mark}</div>
                <div className="mt-5 font-display text-[8px] font-black uppercase tracking-[0.24em] text-white/62">The RealLife</div>
                <div className="mt-2 rounded-full border border-white/36 bg-black/18 px-4 py-1 font-board text-[18px] font-black leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">{hiddenCardLabel}</div>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,12,10,0)_0%,rgba(15,12,10,0.72)_34%,rgba(15,12,10,0.92)_100%)] px-3 pb-3 pt-12 text-white">
            <div className="font-display text-[8px] font-black uppercase tracking-[0.2em] text-white/62">{card?.cardKind ?? 'card'}</div>
            <div className="mt-1 font-board text-[22px] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">{flipped ? (card?.cardName ?? card?.title ?? '카드 공개') : '결과는 비밀'}</div>
          </div>
        </motion.div>
      </motion.div>
      <div className="mt-2 font-board text-[14px] font-black text-[#17120c]/62">{flipped ? '바로 효과창으로 이어집니다' : '결과는 뒤집기 전까지 비밀'}</div>
    </button>
  );
}

function CashEffectCounter({ from = 0, to = 0 }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const timer = window.setTimeout(() => setValue(to), 120);
    return () => window.clearTimeout(timer);
  }, [to]);
  return (
    <div className="mt-2 font-board text-[34px] leading-none text-white">
      <AnimatedCash value={value} duration={900} settleDelay={0} rollingEffect={false} />만
    </div>
  );
}

function cardHostEmoji(notice) {
  const cardKind = notice?.card?.cardKind;
  const cardId = String(notice?.card?.cardId ?? notice?.event?.cardId ?? notice?.event?.id ?? '');
  const eventKind = String(notice?.event?.kind ?? notice?.card?.eventId ?? '');
  const title = `${notice?.card?.cardName ?? notice?.event?.card ?? notice?.event?.name ?? ''}`;
  const propertyRelated = ['subscription_win', '8', 'lottery_estate', 'redev', 'redevelopment', 'gtx'].includes(cardId)
    || ['lottery_estate', 'redev', 'redevelopment', 'gtx'].includes(eventKind)
    || title.includes('청약')
    || title.includes('부동산')
    || title.includes('재개발')
    || title.includes('GTX');
  if (propertyRelated) return '🧓';

  if (cardKind === 'event') {
    if (['war'].includes(eventKind)) return '🧑‍✈️';
    if (['fire'].includes(eventKind)) return '👨‍🚒';
    if (['multihouse', 'regulation'].includes(eventKind)) return '👮‍♀️';
    if (['bubble'].includes(eventKind)) return '😰';
    return '🧑‍💼';
  }

  const chanceHosts = {
    marriage: '👰',
    job_change: '🧑‍💼',
    promotion: '👨‍💼',
    startup: '👩‍💻',
    childbirth: '🤱',
    honor_retire: '👴',
    military: '🧑‍✈️',
    holiday_bonus: '🙇',
    accident: '👨‍⚕️',
    lotto: '🕺',
    teleport: '🧙',
    life_change: '🧑‍🎤',
    defense_card: '🛡️',
  };
  if (chanceHosts[cardId]) return chanceHosts[cardId];

  const welfareHosts = {
    1: '😷',
    2: '👷',
    3: '👵',
    4: '👩‍⚕️',
    5: '👴',
    6: '👨‍👩‍👧',
    7: '🤵',
    9: '🤱',
    10: '👮',
  };
  if (cardKind === 'welfare' && welfareHosts[cardId]) return welfareHosts[cardId];
  if (cardKind === 'welfare') return '🧑‍💼';
  return '🎙️';
}

function CardEffectNoticeOverlay({ notice, onClose }) {
  if (!notice || typeof document === 'undefined') return null;
  const amount = notice.cashAfter - notice.cashBefore;
  const isMoney = amount !== 0;
  const tone = CARD_REVEAL_TONE[notice.card?.cardKind] ?? CARD_REVEAL_TONE.chance;
  const title = notice.card?.cardName ?? notice.card?.title ?? '카드 효과';
  const text = notice.event?.effectText ?? notice.card?.revealText ?? notice.card?.text ?? '카드 효과가 발동되었습니다.';
  const hostEmoji = cardHostEmoji(notice);
  const militaryTurns = notice.event?.cardId === 'military' || notice.card?.cardId === 'military'
    ? Number(notice.event?.skipTurns ?? 3)
    : 0;
  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[2147483001] flex items-center justify-center bg-black/22 px-3 backdrop-blur-[2px]" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClose?.(); }}>
      <motion.div
        className={cn('w-[min(92vw,620px)] rounded-[24px] border-[3px] border-ink-line p-4 text-white shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46)]', notice.card?.cardKind === 'event' ? 'bg-[linear-gradient(135deg,rgba(5,5,5,0.96)_0%,rgba(69,10,10,0.94)_48%,rgba(220,38,38,0.88)_100%)]' : 'bg-[linear-gradient(135deg,rgba(15,12,10,0.93)_0%,rgba(70,34,22,0.90)_45%,rgba(128,83,20,0.88)_100%)]')}
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0, boxShadow: `0 6px 0 #0F0C0A, 0 0 34px ${tone.glow}` }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, boxShadow: { duration: 0.8, ease: "easeOut" } }}
      >
        <div className="min-w-0 text-center">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <motion.span className="text-[43px] leading-none drop-shadow-[0_3px_0_rgba(0,0,0,0.22)]" animate={{ rotate: [-4, 4, -2, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.65 }}>{hostEmoji}</motion.span>
            <div className="font-board text-[clamp(21px,3vw,34px)] leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.28)]">{title}</div>
          </div>
          <div className={cn('mt-3 rounded-xl border px-4 py-3 text-center sm:text-left', notice.card?.cardKind === 'event' ? 'border-red-200/65 bg-[linear-gradient(180deg,rgba(254,226,226,0.18),rgba(220,38,38,0.14))]' : 'border-emerald-200/65 bg-[linear-gradient(180deg,rgba(236,253,245,0.18),rgba(16,185,129,0.12))]')}>
            <div className={cn('font-display text-[9px] font-black uppercase tracking-[0.22em]', notice.card?.cardKind === 'event' ? 'text-red-100/85' : 'text-emerald-200/80')}>사회자 멘트</div>
            <div className="mt-1 font-board text-[clamp(16px,2.2vw,23px)] leading-tight text-white/90">{text}</div>
          </div>
          {militaryTurns > 0 && (
            <motion.div
              className="mt-4 flex items-center justify-center gap-3 rounded-2xl border-[3px] border-white/42 bg-[linear-gradient(135deg,rgba(47,58,32,0.96)_0%,rgba(107,125,56,0.92)_58%,rgba(215,196,106,0.88)_100%)] px-4 py-3 text-white shadow-[0_4px_0_#0F0C0A,0_0_24px_rgba(215,196,106,0.52)]"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
              transition={{ duration: 0.45 }}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] border-white bg-monopoly-red font-display text-[27px] font-black leading-none text-white shadow-[0_3px_0_#0F0C0A]">!</span>
              <span className="text-[30px] leading-none">🪖</span>
              <div className="text-left">
                <div className="font-board text-[25px] font-black leading-none">군입대 중!</div>
                <div className="mt-1 font-display text-[11px] font-black uppercase tracking-[0.14em] text-white/78">{militaryTurns}턴 동안 차례를 쉽니다</div>
              </div>
            </motion.div>
          )}
          {isMoney && (
            <div className="relative mt-4 overflow-visible rounded-2xl border-2 border-white/35 bg-black/24 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              <CashDeltaFloat value={amount} className="left-1/2 top-[14px] -translate-x-1/2 !text-[20px]" />
              <div className="inline-flex rounded-full border border-white/40 bg-emerald-500 px-3 py-1 font-board text-[13px] font-black leading-none text-white">예금액</div>
              <CashEffectCounter from={notice.cashBefore} to={notice.cashAfter} />
            </div>
          )}

        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

function BoardArrivalCard({ state, pos, event, activeColor = '#d83b2f' }) {
  const isJailArrival = event?.kind === 'go_to_jail' || event?.kind === 'three_doubles_jail' || event?.kind === 'jail_landed';
  if (isJailArrival) return <JailArrivalCard reason={event.kind === 'three_doubles_jail' ? '3연속 더블' : event.kind === 'jail_landed' ? '감옥 칸' : '감옥행 칸'} />;
  const tile = state?.board?.tiles?.[pos];
  if (!tile) return <FallbackArrivalCard title="도착 처리" icon="📍" text="도착 정보를 확인했습니다." />;
  const ts = state.tileState?.[pos] ?? {};
  const isRentArrival = (event?.kind === 'arrive_property' && event?.type === 'rent') || (event?.kind === 'arrive_hub' && event?.type === 'rent_forced') || event?.kind === 'rent';
  if (isRentArrival) {
    const ownerId = event.ownerId ?? ts.owner;
    const owner = Number.isInteger(ownerId) ? state.players?.[ownerId] : null;
    const ownerMeta = owner ? CHAR_META[owner.character] : null;
    return (
      <motion.div
        className="board-arrival-card-slot mx-auto w-[min(52vw,250px)]"
        initial={{ y: 18, scale: 0.84, opacity: 0, rotate: -2 }}
        animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        <RentLandNoticeCard
          notice={{
            previewPos: event.pos ?? pos,
            tileName: tile.names?.ko ?? tile.name,
            amount: -(event.rent ?? event.fee ?? event.amount ?? 0),
            ownerId,
            ownerName: owner?.name ?? (ownerId != null ? `${ownerId + 1}P` : '소유자'),
          }}
          accent={Number.isInteger(ownerId) ? playerColor(ownerId, ownerMeta?.color ?? activeColor) : activeColor}
        />
      </motion.div>
    );
  }
  const owner = Number.isInteger(ts.owner) ? state.players?.[ts.owner] : null;
  const ownerMeta = owner ? CHAR_META[owner.character] : null;
  const name = tile.names?.ko ?? tile.name ?? `${pos}번 칸`;
  const isProperty = tile.type === 'property';
  const isStation = tile.type === 'railroad';
  const isCard = tile.type === 'chance' || tile.type === 'community_chest';
  const color = tile.color ?? (isStation ? '#2f75c9' : isCard ? '#7c3aed' : activeColor);
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
              {owner && <div className="mt-3 rounded-full border-2 border-[#17120c] bg-white px-3 py-1 font-board text-[13px]" style={{ color: playerColor(ts.owner, ownerMeta?.color ?? color) }}>{owner.name ?? `${ts.owner + 1}P`} 소유</div>}
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
  if (tile?.type === 'railroad') return make('🚆', shortTileName(name));
  if (tile?.type === 'utility') return tile.utilityKind === 'water' ? make('🚰', '수도') : make('⚡', '전기');
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
  if (event.kind === 'go_to_jail' || event.kind === 'jail_landed') return '감옥으로 이동';
  return `${name} 도착`;
}

function InitialDealStatusActions({ status, playerName }) {
  if (!status?.active) return null;
  return (
    <div className="flex min-h-[92px] flex-col justify-center rounded-xl border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,248,220,0.66))] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
      <div className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-ink/50">
        INITIAL DEAL {status.playerOrder}/{status.totalPlayers}
      </div>
      <div className="mt-1 font-board text-[22px] leading-tight text-ink">
        {playerName} 권리증 분배중
      </div>
      <div className="mt-1 font-board text-[15px] leading-tight text-ink/62">
        받은 뒤 푸터 자리로 내려가고 다음 플레이어가 헤더로 올라옵니다.
      </div>
    </div>
  );
}

function InitialDealOverlay({ players, turnIndex = 0, cards, onReady, onPhaseChange, onPlayerChange }) {
  const [phase, setPhase] = useState('intro');
  const [activeDealPlayer, setActiveDealPlayer] = useState(0);
  const [startImageReady, setStartImageReady] = useState(false);
  const [portalCharged, setPortalCharged] = useState(false);
  const introVisible = phase === 'intro';
  const dealVisible = phase === 'deal';
  const onReadyRef = useRef(onReady);
  const dealPlayers = players.map((_, index) => index);
  const activePlayerIndex = dealPlayers[activeDealPlayer] ?? 0;
  const activePlayer = players[activePlayerIndex];
  const activeBase = activePlayer
    ? CHAR_META[activePlayer.character] ?? { name: activePlayer.character, color: '#d83b2f' }
    : { name: `${activePlayerIndex + 1}P`, color: '#d83b2f' };
  const activeName = activePlayer ? displayPlayerName(activePlayer, activeBase.name) : activeBase.name;
  const activeColor = playerColor(activePlayerIndex, activeBase.color);
  const activeCards = cards
    .filter((card) => card.playerIndex === activePlayerIndex)
    .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0));
  const cardsPerPlayer = cards.length > 0 ? Math.max(...cards.map((card) => card.cardIndex ?? 0)) + 1 : 0;

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    document.documentElement.classList.toggle('initial-deal-pending', introVisible);
    return () => {
      document.documentElement.classList.remove('initial-deal-pending');
      document.documentElement.classList.remove('initial-deal-live');
    };
  }, [introVisible]);

  useEffect(() => {
    if (!dealVisible) return undefined;
    setActiveDealPlayer(0);
    onPlayerChange?.(dealPlayers[0] ?? 0);
    const stepMs = 2050;
    const timers = dealPlayers.slice(1).map((playerIndex, index) => window.setTimeout(() => {
      setActiveDealPlayer(index + 1);
      onPlayerChange?.(playerIndex);
    }, stepMs * (index + 1)));
    const doneTimer = window.setTimeout(() => onReadyRef.current?.(), Math.max(1, dealPlayers.length) * stepMs + 650);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
    };
  }, [dealVisible, dealPlayers.length, onPlayerChange]);

  useEffect(() => {
    if (phase !== 'start' || !startImageReady) return undefined;
    setPortalCharged(false);
    return undefined;
  }, [phase, startImageReady]);

  const handleOverlayTap = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (phase === 'intro') setPhase('deal');
  };

  return (
    <div
      className={cn('absolute inset-0 z-[80] overflow-hidden rounded-[18px]', dealVisible ? 'pointer-events-none' : 'pointer-events-auto', phase === 'start' && 'bg-[#eef1ed]')}
      onPointerDown={(event) => { event.stopPropagation(); }}
      onClick={handleOverlayTap}
    >
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

          {startImageReady && (
            <>
              <button
                type="button"
                onPointerDown={(event) => { event.stopPropagation(); }}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPortalCharged(true); setPhase('intro'); }}
                className={cn('pointer-events-auto absolute left-1/2 top-[calc(62%+82px)] z-30 -translate-x-1/2 rounded-full border border-white/55 px-12 py-4 font-board text-[26px] font-black leading-none shadow-[0_20px_42px_-20px_rgba(118,13,20,0.9),inset_0_1px_0_rgba(255,255,255,0.58),inset_0_-10px_24px_rgba(96,0,10,0.28)] backdrop-blur-[12px] transition active:translate-y-0.5 active:scale-[0.99]', portalCharged ? 'initial-start-button-pulse bg-[linear-gradient(180deg,rgba(255,92,92,0.92),rgba(168,23,31,0.94))] text-white' : 'initial-start-button-loading cursor-wait bg-[linear-gradient(180deg,#ffe682_0%,#f4b72f_56%,#b86a09_100%)] text-[#4a2200]')}
              >
                시작하기
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
        <div className="pointer-events-none absolute left-1/2 top-[47%] z-30 flex w-full max-w-[920px] -translate-x-1/2 -translate-y-1/2 flex-col items-center px-3">
          <div className="mb-[5px] flex w-full max-w-[960px] items-center justify-center gap-2 rounded-[18px] border border-fuchsia-300/50 bg-[linear-gradient(135deg,rgba(5,5,5,0.9)_0%,rgba(49,10,54,0.85)_45%,rgba(219,39,119,0.45)_100%)] px-5 py-2 text-center text-white shadow-[0_12px_28px_-22px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-[16px]">
            <div className="flex min-w-0 items-center justify-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#d946ef_100%)] text-white shadow-[0_2px_0_#0f0c0a]">🎙️</span>
              <span className="font-board text-[clamp(15px,2vw,21px)] font-extrabold leading-tight" style={{ wordBreak: 'keep-all', overflowWrap: 'normal' }}>자, 첫 출발은 권리증부터 한 명씩 나눠드릴게요 👀</span>
            </div>
          </div>
          <div
            className="mx-auto grid w-full overflow-hidden rounded-[24px] border-[3px] border-ink-line bg-[linear-gradient(135deg,rgba(15,12,10,0.92)_0%,rgba(59,130,246,0.45)_30%,rgba(217,70,239,0.45)_65%,rgba(234,179,8,0.35)_100%)] p-3 text-center text-white shadow-[0_6px_0_#0F0C0A,0_22px_54px_rgba(0,0,0,0.46),0_0_0_2px_rgba(217,70,239,0.5),0_0_42px_rgba(59,130,246,0.4),inset_0_0_30px_rgba(234,179,8,0.15)] backdrop-blur-[3px]"
          >
            <div className="grid min-h-0 grid-cols-[minmax(150px,236px)_1fr] items-center gap-5 px-2 text-left">
              <div className="mx-auto h-[190px] w-[150px] scale-[0.92] overflow-hidden rounded-xl border-[3px] border-[#d946efcc] bg-white shadow-[0_5px_0_#0F0C0A,0_0_24px_rgba(217,70,239,0.5)]">
                <NoticeIconCard notice={{ kind: 'go_reward', icon: '📝', title: '초기 자산' }} accent="#d946ef" />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <span className="text-[46px] leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.36)]">📜</span>
                  <div className="whitespace-pre-line font-board text-[clamp(28px,4.1vw,50px)] leading-[0.98] drop-shadow-[0_4px_0_rgba(0,0,0,0.42)]">권리증<br />순차 분배</div>
                </div>
                <div className="mt-2 font-board text-[clamp(17px,2.4vw,26px)] leading-tight text-white/86">1P부터 차례대로 평소 화면에서 헤더로 올라와 권리증 {cardsPerPlayer}장을 받습니다.</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  style={{ backgroundColor: idx === 0 ? '#D32F2F' : playerColor(r.i, base.color) }}
                >
                  {idx === 0 ? '??' : idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: playerColor(r.i, base.color) }}>
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

function stageSummaryLabel(stage) {
  const safe = Number(stage) || 0;
  if (safe >= 5) return '아파트';
  if (safe <= 0) return '빈 땅';
  return `건물 ${safe}개`;
}

function buildTurnBriefing(turn, state) {
  const rows = [];
  let rowOrder = 0;
  const push = (label, amount, { showZero = false } = {}) => {
    if (!amount && !showZero) return;
    const safeAmount = Number(amount) || 0;
    rows.push({ label, amount: safeAmount, order: rowOrder++ });
  };
  const tileName = (pos) => state?.board?.tiles?.[pos]?.names?.ko ?? state?.board?.tiles?.[pos]?.name ?? '부동산';
  const playerName = (id) => state?.players?.[id]?.name || `${(id ?? 0) + 1}P`;
  const developmentByPos = new Map();
  for (const event of turn.events ?? []) {
    if (event.kind !== 'develop_property') continue;
    const key = event.pos ?? 'unknown';
    const prev = developmentByPos.get(key);
    developmentByPos.set(key, {
      pos: event.pos,
      firstStage: prev?.firstStage ?? event.fromStage,
      lastStage: event.toStage,
      amount: (prev?.amount ?? 0) + (Number(event.amount) || 0),
      order: prev?.order ?? rowOrder++,
    });
  }

  for (const event of turn.events ?? []) {
    switch (event.kind) {
      case 'go_pass':
      case 'go_exact':
        push('월급', event.amt);
        break;
      case 'institution_pay':
        push('기관 월급', event.amt);
        break;
      case 'apartment_income':
        push('아파트 월세', event.amt);
        break;
      case 'living':
        push('생활비', -event.amt);
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
        push('매입가', -event.price);
        break;
      case 'develop_property':
        break;
      case 'parking_jackpot':
        push('무료주차 보너스', event.amt);
        break;
      case 'arrive_station':
        if (event.collected) push(`${tileName(event.pos)} 적립금`, event.collected);
        break;
      case 'arrive_hub':
        if (event.type === 'buy') push('매입가', -event.price);
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
          else if (item.step === 'sell_house') push('매도 정산금', item.refund);
          else if (item.step === 'sell_bank') push('매도 정산금', item.net);
          else if (item.step === 'credit') push('신용대출', item.amt);
          else if (item.step === 'loanshark') push('사채', item.amt);
        }
        break;
      default:
        break;
    }
  }

  for (const item of developmentByPos.values()) {
    if (item.firstStage === item.lastStage || item.amount === 0) continue;
    const label = item.lastStage > item.firstStage
      ? `${tileName(item.pos)} 건설 최종 ${stageSummaryLabel(item.lastStage)}`
      : `${tileName(item.pos)} 철거 최종 ${stageSummaryLabel(item.lastStage)}`;
    rows.push({ label, amount: item.amount, order: item.order });
  }

  const eventCard = (turn.events ?? []).find((event) => event.card && ['war', 'multihouse', 'fire', 'bubble', 'redev', 'gtx', 'lottery_estate'].includes(event.kind));
  const total = (turn.cashAfter ?? 0) - (turn.cashBefore ?? 0);
  const visibleTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const hiddenDelta = total - visibleTotal;
  if (hiddenDelta !== 0) push('표시 외 현금 변동', hiddenDelta);
  const merged = new Map();
  for (const row of rows) {
    const prev = merged.get(row.label);
    if (prev) prev.amount += row.amount;
    else merged.set(row.label, { label: row.label, amount: row.amount, order: row.order });
  }
  const sortedRows = [...merged.values()]
    .filter((row) => row.amount !== 0)
    .sort((a, b) => a.order - b.order)
    .map(({ label, amount }) => ({ label, amount }));
  return {
    title: '이번 턴 정산',
    rows: sortedRows,
    total: sortedRows.reduce((sum, row) => sum + row.amount, 0),
    balance: turn.cashAfter ?? state?.players?.[turn.playerId]?.cash ?? 0,
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
    case 'jail_landed':
      return '감옥 칸에 도착했습니다… 다음 차례부터 출소를 시도합니다.';
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
