// 관리자 페이지 — 일러스트 슬롯 갈아끼우기
// 진입: URL 해시 #admin
// 슬롯별로 파일 업로드 → localStorage에 dataURL 저장 → 즉시 반영
//
// 기능:
//   - 카테고리 탭 전환
//   - 슬롯 카드: 미리보기 + 업로드 + 초기화
//   - 전체 내보내기/불러오기 (JSON)
//   - 전체 초기화

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn.js';
import { useAssetStore, fileToDataURL } from '@/stores/assetStore.js';
import {
  ASSET_SLOTS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  slotsByCategory,
} from '@/lib/assetSlots.js';
import AssetFrame from '@/components/AssetFrame.jsx';

export default function AdminAssets({ onExit }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  const overrides = useAssetStore((s) => s.overrides);
  const clearAll = useAssetStore((s) => s.clearAll);
  const exportJSON = useAssetStore((s) => s.exportJSON);
  const importJSON = useAssetStore((s) => s.importJSON);
  const usageKB = useAssetStore((s) => s.getUsageKB());
  const importInputRef = useRef(null);

  const overrideCount = Object.keys(overrides).length;
  const totalSlots = ASSET_SLOTS.length;
  const slots = slotsByCategory(activeCategory);

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reallife-assets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importJSON(text);
    if (result.ok) {
      alert(`✅ ${result.count}개 슬롯 불러옴`);
    } else {
      alert(`❌ 불러오기 실패: ${result.error}`);
    }
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (confirm(`정말 모든 오버라이드(${overrideCount}개)를 초기화할까요?`)) {
      clearAll();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">🖼 자산 관리자</h1>
            <p className="text-xs text-neutral-500">
              {overrideCount}/{totalSlots} 슬롯 오버라이드 · {usageKB} KB 사용
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              내보내기
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              불러오기
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={handleClearAll}
              disabled={overrideCount === 0}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              전체 초기화
            </button>
            <button
              onClick={onExit}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
            >
              ← 게임으로
            </button>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="border-b border-neutral-200 bg-white px-4">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto">
          {CATEGORY_ORDER.map((cat) => {
            const count = slotsByCategory(cat).length;
            const overridden = slotsByCategory(cat).filter((s) => overrides[s.id]).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-sm transition',
                  activeCategory === cat
                    ? 'border-monopoly-red font-semibold text-monopoly-red'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900',
                )}
              >
                {CATEGORY_LABEL[cat]}
                <span className="ml-1.5 text-xs text-neutral-400">
                  {overridden}/{count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slots Grid */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {slots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} />
          ))}
        </div>
      </main>
    </div>
  );
}

function SlotCard({ slot }) {
  const setOverride = useAssetStore((s) => s.setOverride);
  const removeOverride = useAssetStore((s) => s.removeOverride);
  const isOverridden = useAssetStore((s) => Boolean(s.overrides[slot.id]));
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 가능');
      return;
    }
    // 1MB 넘으면 경고 (localStorage 5MB 한도 의식)
    if (file.size > 1_048_576) {
      const ok = confirm(
        `${(file.size / 1024).toFixed(0)}KB는 큰 편이에요. (저장 한도 5MB)\n계속할까요?`,
      );
      if (!ok) {
        e.target.value = '';
        return;
      }
    }
    setBusy(true);
    try {
      const dataURL = await fileToDataURL(file);
      setOverride(slot.id, dataURL);
    } catch (err) {
      alert(`업로드 실패: ${err.message}`);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm transition',
        isOverridden ? 'border-monopoly-red' : 'border-neutral-200',
      )}
    >
      <AssetFrame slot={slot.id} className="w-full" framed />

      <div className="min-h-[2.5rem]">
        <p className="text-sm font-semibold leading-tight">{slot.label}</p>
        <p className="break-all font-mono text-[10px] text-neutral-400">{slot.id}</p>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? '...' : isOverridden ? '교체' : '업로드'}
        </button>
        {isOverridden && (
          <button
            onClick={() => removeOverride(slot.id)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
            title="기본 이미지로 복귀"
          >
            ↺
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
