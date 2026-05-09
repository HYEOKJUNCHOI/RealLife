import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const CUSTOM_CHARACTER_STORAGE_KEY = 'reallife.custom-characters.v1';

const PROMPT_TEMPLATE = `[인물 이름]을 The RealLife 게임 캐릭터로 그려줘.

스타일:
- 어린이가 좋아할 만한 고급 모바일 보드게임 캐릭터
- 역사 위인 피규어 같은 귀여운 3D 일러스트
- 전신이 보이는 정면 포즈
- 큰 머리와 또렷한 표정, 작은 몸 비율
- 깨끗한 밝은 배경 또는 투명 배경 느낌
- 카드 안에서 잘 보이도록 중앙 배치
- 과하게 무섭거나 정치 선전처럼 보이지 않게
- 현대 서울 부동산 게임에 타임머신을 타고 온 인물 분위기

출력:
- 정사각형 이미지
- 캐릭터 1명만
- 글자, 로고, 말풍선 없음`;

const sanitizeIdPart = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'character';

const createCharacterId = (name) =>
  `custom-${sanitizeIdPart(name)}-${Date.now().toString(36)}`;

export const buildCharacterPrompt = (name) =>
  PROMPT_TEMPLATE.replace('[인물 이름]', name?.trim() || '[인물 이름]');

export const normalizeCharacterImage = (file) =>
  new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('이미지 파일만 첨부할 수 있어요.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'));
      img.onload = () => {
        const size = 640;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const bg = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size / 1.2);
        bg.addColorStop(0, '#fffaf0');
        bg.addColorStop(0.72, '#f7ecd0');
        bg.addColorStop(1, '#ead8a8');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);

        const scale = Math.min((size * 0.86) / img.width, (size * 0.9) / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const dx = (size - drawWidth) / 2;
        const dy = (size - drawHeight) / 2 + size * 0.025;
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export const getCustomCharactersSnapshot = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CHARACTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = parsed?.state?.characters;
    return Array.isArray(list) ? list.filter((c) => c?.active !== false) : [];
  } catch {
    return [];
  }
};

export const useCustomCharacterStore = create(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: ({ name, imageDataUrl }) => {
        const cleanName = name.trim();
        const character = {
          id: createCharacterId(cleanName),
          name: cleanName,
          imageDataUrl,
          active: true,
          createdAt: Date.now(),
        };
        set((state) => ({ characters: [...state.characters, character] }));
        return character;
      },

      updateCharacter: (id, patch) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...patch, name: patch.name?.trim() || c.name } : c,
          ),
        })),

      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
        })),

      clearCharacters: () => set({ characters: [] }),

      getActiveCharacters: () => get().characters.filter((c) => c.active !== false),
    }),
    {
      name: CUSTOM_CHARACTER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
