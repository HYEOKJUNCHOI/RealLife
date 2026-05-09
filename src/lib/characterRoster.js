import charactersData from '@/data/characters.json';
import { getCustomCharactersSnapshot } from '@/stores/customCharacterStore.js';

const BASE_CHARACTERS = charactersData.korea ?? [];

export const getBaseCharacters = () =>
  BASE_CHARACTERS.map((c) => ({
    ...c,
    source: 'base',
    imageDataUrl: null,
  }));

export const getCustomCharacters = () =>
  getCustomCharactersSnapshot().map((c) => ({
    ...c,
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
