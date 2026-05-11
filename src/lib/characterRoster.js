import charactersData from '@/data/characters.json';
import { getCustomCharactersSnapshot } from '@/stores/customCharacterStore.js';

export const CHARACTER_GROUPS = [
  { key: 'modernCelebrity', label: '현대유명인' },
  { key: 'threeKingdoms', label: '삼국지' },
  { key: 'joseon', label: '조선시대' },
  { key: 'anime', label: '만화/애니' },
  { key: 'japaneseWarriors', label: '일본장수' },
  { key: 'preJoseon', label: '조선시대 이전' },
  { key: 'modernKorea', label: '근현대사' },
  { key: 'custom', label: '커스텀' },
  { key: 'etc', label: '기타' },
];

const BASE_CHARACTERS = charactersData.korea ?? [];
const PAGE_LOAD_SHUFFLE_SEED = Math.floor(Math.random() * 4294967295);

const seededRandom = (seed) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const shuffleWithSeed = (items, seed) => {
  const result = [...items];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const getGroupCounts = (items) =>
  items.reduce((counts, character) => {
    const group = character.group ?? 'etc';
    counts[group] = (counts[group] ?? 0) + 1;
    return counts;
  }, {});

const sortByGroup = (items) => {
  const groupCounts = getGroupCounts(items);
  const firstSeen = new Map();
  items.forEach((character, index) => {
    const group = character.group ?? 'etc';
    if (!firstSeen.has(group)) firstSeen.set(group, index);
  });

  const groups = [...firstSeen.keys()].sort((groupA, groupB) => {
    const countDiff = (groupCounts[groupB] ?? 0) - (groupCounts[groupA] ?? 0);
    if (countDiff !== 0) return countDiff;
    return (firstSeen.get(groupA) ?? 0) - (firstSeen.get(groupB) ?? 0);
  });

  return groups.flatMap((group, groupIndex) => {
    const bucket = items.filter((character) => (character.group ?? 'etc') === group);
    return shuffleWithSeed(bucket, PAGE_LOAD_SHUFFLE_SEED + groupIndex * 9973);
  });
};

export const getBaseCharacters = () =>
  sortByGroup(BASE_CHARACTERS).map((c) => ({
    ...c,
    source: 'base',
    imageDataUrl: null,
  }));

export const getCustomCharacters = () =>
  getCustomCharactersSnapshot().map((c) => ({
    ...c,
    group: 'custom',
    groupLabel: '커스텀',
    source: 'custom',
    slot: null,
    color: '#7C3AED',
    emoji: '★',
  }));

export const getAvailableCharacters = () => [
  ...getBaseCharacters(),
  ...getCustomCharacters(),
];

export const findCharacter = (id) =>
  getAvailableCharacters().find((c) => c.id === id) ?? null;
