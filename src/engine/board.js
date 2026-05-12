// 보드 데이터 정규화 & 칸 분류 헬퍼
// 원본 board-korea.json 의 가격은 ×2(매입가) / 건설비 원가 변환을 적용한다.
// 역장(춘천·광주) vs 환승 허브(서울·부산) 분기, 한전·수자원 정규화도 여기서.

import { PRICE_SCALE, HOUSE_COST_SCALE } from './constants.js';
import koreaRaw from '../boards/korea.json' with { type: 'json' };

// 환승 허브 위치 (서울역 / 부산역)
const HUB_NAMES = new Set(['서울역', '부산역']);
// 역장 자리 (춘천역 / 광주역)
const STATION_NAMES = new Set(['춘천역', '광주역']);

const normalizeTile = (raw) => {
  const t = { ...raw };
  if (t.type === 'property') {
    t.basePrice = Math.round(raw.price * PRICE_SCALE); // 매입가 ×2
    t.houseCost = Math.round(raw.houseCost * HOUSE_COST_SCALE); // 건설비 원가
  } else if (t.type === 'railroad') {
    const name = raw.names?.ko ?? '';
    if (HUB_NAMES.has(name)) {
      t.subType = 'hub'; // 환승 허브 — 매입형
      t.basePrice = Math.round(raw.price * PRICE_SCALE); // 400만
    } else if (STATION_NAMES.has(name)) {
      t.subType = 'station'; // 역장 자리 — 매입 X
    }
  } else if (t.type === 'utility') {
    // 한전·수자원 — 매입 X, 권리 이전형
    t.subType = 'institution';
    // 게임 내 표시 이름 매핑
    const ukind = raw.utilityKind;
    t.displayName =
      ukind === 'electric' ? '한전' : ukind === 'water' ? '수자원공사' : raw.names?.ko;
  } else if (t.type === 'community_chest') {
    // 룰 문서상 "복지" 카드 풀과 매핑 (한국 복지 정책)
    t.subType = 'welfare';
  } else if (t.type === 'tax') {
    // pos 4 = 소득세, pos 38 = 사치세 (한국판)
    t.taxKind = raw.names?.ko === '소득세' ? 'income' : 'luxury';
  } else if (t.type === 'free_parking') {
    t.subType = 'jackpot'; // 휴게소 로또
  }
  return t;
};

export const loadBoard = (boardId = 'korea') => {
  // MVP는 korea만. (V2 확장은 boardId 분기)
  if (boardId !== 'korea') throw new Error(`unsupported board: ${boardId}`);
  const tiles = koreaRaw.tiles.map(normalizeTile);
  return {
    boardId,
    name: koreaRaw.name,
    tiles,
    size: tiles.length,
  };
};

// 분류 헬퍼
export const isProperty = (tile) => tile.type === 'property';
export const isHub = (tile) => tile.type === 'railroad' && tile.subType === 'hub';
export const isStation = (tile) => tile.type === 'railroad' && tile.subType === 'station';
export const isInstitution = (tile) => tile.type === 'utility';

// 컬러 → tile pos 배열
export const groupByColor = (tiles) => {
  const m = {};
  for (const t of tiles) {
    if (isProperty(t)) {
      m[t.color] ??= [];
      m[t.color].push(t.pos);
    }
  }
  return m;
};

// 일반 부동산 22칸 pos 리스트 (사전 분배 대상)
export const propertyPositions = (tiles) =>
  tiles.filter(isProperty).map((t) => t.pos);

// 환승 허브 pos
export const hubPositions = (tiles) => tiles.filter(isHub).map((t) => t.pos);
// 역장 자리 pos
export const stationPositions = (tiles) => tiles.filter(isStation).map((t) => t.pos);
// 한전·수자원 pos
export const institutionPositions = (tiles) =>
  tiles.filter(isInstitution).map((t) => t.pos);
