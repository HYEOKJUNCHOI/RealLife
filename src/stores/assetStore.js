// 사용자 일러스트 오버라이드 저장소
// 관리자 페이지에서 슬롯별로 파일 업로드 → dataURL로 localStorage에 저장
// 코드를 안 만지고 일러스트만 갈아끼우는 게 목적

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'reallife.asset-overrides.v1';

export const useAssetStore = create(
  persist(
    (set, get) => ({
      // { [slotId]: 'data:image/png;base64,...' }
      overrides: {},

      setOverride: (slotId, dataURL) =>
        set((s) => ({ overrides: { ...s.overrides, [slotId]: dataURL } })),

      removeOverride: (slotId) =>
        set((s) => {
          const next = { ...s.overrides };
          delete next[slotId];
          return { overrides: next };
        }),

      clearAll: () => set({ overrides: {} }),

      // JSON 파일로 내보내기 (백업)
      exportJSON: () => JSON.stringify(get().overrides, null, 2),

      // JSON 파일에서 불러오기 (복원/공유)
      importJSON: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          if (typeof data !== 'object' || data === null) throw new Error('잘못된 형식');
          set({ overrides: data });
          return { ok: true, count: Object.keys(data).length };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },

      // localStorage 사용량 (대략) — base64 dataURL은 무거우니 표시
      getUsageKB: () => {
        const total = Object.values(get().overrides).reduce((sum, v) => sum + (v?.length || 0), 0);
        return Math.round(total / 1024);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// 파일 → dataURL 변환 헬퍼
export const fileToDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
