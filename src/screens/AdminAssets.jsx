import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn.js';
import { useAssetStore, fileToDataURL } from '@/stores/assetStore.js';
import {
  ASSET_SLOTS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  slotsByCategory,
} from '@/lib/assetSlots.js';
import {
  buildCharacterPrompt,
  normalizeCharacterImage,
  useCustomCharacterStore,
} from '@/stores/customCharacterStore.js';
import AssetFrame from '@/components/AssetFrame.jsx';
import { useGameDialog } from '@/components/GameDialog.jsx';

export default function AdminAssets({ onExit }) {
  const [mode, setMode] = useState('characters');

  return (
    <div className="min-h-screen bg-[#f4ead0] text-[#160f0a]">
      <header className="sticky top-0 z-20 border-b-2 border-[#0f0c0a] bg-[#fff8e8]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <h1 className="font-board text-3xl">RealLife 관리자</h1>
            <p className="text-sm font-bold text-[#79684f]">
              캐릭터 생성과 기존 이미지 교체를 관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('characters')}
              className={cn(
                'rounded-md border-2 border-[#0f0c0a] px-4 py-2 font-board text-lg',
                mode === 'characters' ? 'bg-[#df2f35] text-white' : 'bg-white',
              )}
            >
              캐릭터 생성
            </button>
            <button
              type="button"
              onClick={() => setMode('assets')}
              className={cn(
                'rounded-md border-2 border-[#0f0c0a] px-4 py-2 font-board text-lg',
                mode === 'assets' ? 'bg-[#df2f35] text-white' : 'bg-white',
              )}
            >
              이미지 교체
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-md border-2 border-[#0f0c0a] bg-[#160f0a] px-4 py-2 font-board text-lg text-white"
            >
              게임으로
            </button>
          </div>
        </div>
      </header>

      {mode === 'characters' ? <CharacterManager /> : <AssetManager />}
    </div>
  );
}

function CharacterManager() {
  const dialog = useGameDialog();
  const characters = useCustomCharacterStore((s) => s.characters);
  const addCharacter = useCustomCharacterStore((s) => s.addCharacter);
  const updateCharacter = useCustomCharacterStore((s) => s.updateCharacter);
  const removeCharacter = useCustomCharacterStore((s) => s.removeCharacter);
  const clearCharacters = useCustomCharacterStore((s) => s.clearCharacters);
  const fileRef = useRef(null);

  const [name, setName] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const prompt = useMemo(() => buildCharacterPrompt(name), [name]);
  const canCreate = name.trim().length > 0 && imageDataUrl;

  const copyPrompt = async () => {
    if (!name.trim()) {
      await dialog.alert({
        title: '이름 필요',
        message: '먼저 캐릭터 이름을 입력해주세요.',
        tone: 'warn',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      await dialog.alert({
        title: '프롬프트 복사 완료',
        message: 'GPT에 붙여넣고 마음에 드는 일러스트를 생성하세요.',
        tone: 'success',
      });
    } catch {
      await dialog.alert({
        title: '복사 실패',
        message: '브라우저가 복사를 막았어요.\n아래 프롬프트를 직접 선택해서 복사해주세요.',
        tone: 'warn',
      });
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await normalizeCharacterImage(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      await dialog.alert({
        title: '이미지 첨부 실패',
        message: err.message,
        tone: 'danger',
      });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const createCharacter = () => {
    if (!canCreate) return;
    addCharacter({ name, imageDataUrl });
    setName('');
    setImageDataUrl('');
  };

  const clearAll = async () => {
    if (characters.length === 0) return;
    const ok = await dialog.confirm({
      title: '추가 캐릭터 비우기',
      message: '로컬에 만든 추가 캐릭터를 모두 비울까요?',
      okText: '비우기',
      cancelText: '취소',
      tone: 'danger',
    });
    if (ok) clearCharacters();
  };

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-[420px_1fr] gap-5 px-4 py-6">
      <section className="rounded-md border-2 border-[#0f0c0a] bg-[#fff8e8] p-5 shadow-[0_5px_0_#0f0c0a]">
        <div className="mb-5">
          <p className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[#df2f35]">
            Local Character Maker
          </p>
          <h2 className="font-board text-4xl">캐릭터 만들기</h2>
          <p className="mt-1 text-sm font-bold text-[#79684f]">
            컴퓨터에서 만들고, 마음에 들면 나중에 정식 자산으로 승격합니다.
          </p>
        </div>

        <StepBlock n="1" title="이름 입력">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 맥아더 장군"
            className="w-full rounded-md border-2 border-[#0f0c0a] bg-white px-4 py-3 font-board text-2xl focus:outline-none"
          />
        </StepBlock>

        <StepBlock n="2" title="프롬프트 복사">
          <button
            type="button"
            onClick={copyPrompt}
            className="mb-2 w-full rounded-md border-2 border-[#0f0c0a] bg-[#df2f35] px-4 py-3 font-board text-2xl text-white shadow-[0_4px_0_#0f0c0a] active:translate-y-1 active:shadow-none"
          >
            프롬프트 복사
          </button>
          <textarea
            readOnly
            value={prompt}
            className="h-40 w-full resize-none rounded-md border border-[#d5c59d] bg-[#fffdf5] p-3 text-xs leading-relaxed text-[#564936]"
          />
        </StepBlock>

        <StepBlock n="3" title="이미지 첨부">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-md border-2 border-[#0f0c0a] bg-[#f1dfb5] px-4 py-3 font-board text-2xl shadow-[0_4px_0_#0f0c0a] active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {busy ? '보정 중...' : '이미지 첨부하기'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        </StepBlock>

        <StepBlock n="4" title="만들기">
          <button
            type="button"
            onClick={createCharacter}
            disabled={!canCreate}
            className={cn(
              'w-full rounded-md border-2 border-[#0f0c0a] px-4 py-4 font-board text-3xl shadow-[0_5px_0_#0f0c0a] active:translate-y-1 active:shadow-none',
              canCreate ? 'bg-[#0b7d5a] text-white' : 'cursor-not-allowed bg-[#d8caaa] text-[#8d816a]',
            )}
          >
            만들기
          </button>
        </StepBlock>
      </section>

      <section className="min-h-[620px] rounded-md border-2 border-[#0f0c0a] bg-[#fff8e8] p-5 shadow-[0_5px_0_#0f0c0a]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-board text-4xl">미리보기 / 추가 목록</h2>
            <p className="text-sm font-bold text-[#79684f]">
              저장하면 시작 화면 로스터에 바로 나타납니다.
            </p>
          </div>
          <button
            type="button"
            onClick={clearAll}
            disabled={characters.length === 0}
            className="rounded-md border-2 border-[#b92a2a] bg-white px-3 py-2 font-bold text-[#b92a2a] disabled:opacity-40"
          >
            전체 비우기
          </button>
        </div>

        <div className="mb-5 flex h-[230px] items-center justify-center rounded-md border-2 border-dashed border-[#c7b684] bg-[#f7ecd0]">
          {imageDataUrl ? (
            <CharacterPreview name={name || '새 캐릭터'} imageDataUrl={imageDataUrl} />
          ) : (
            <p className="font-board text-2xl text-[#9a8b70]">이미지를 첨부하면 여기에 보입니다.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {characters.map((character) => (
            <SavedCharacter
              key={character.id}
              character={character}
              onRename={(newName) => updateCharacter(character.id, { name: newName })}
              onRemove={() => removeCharacter(character.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function StepBlock({ n, title, children }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0f0c0a] bg-[#df2f35] font-board text-white">
          {n}
        </span>
        <h3 className="font-board text-2xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CharacterPreview({ name, imageDataUrl }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full border-[4px] border-[#d2ad50] bg-[#fff7df] p-2 shadow-[0_4px_0_#0f0c0a]">
        <img src={imageDataUrl} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="mt-2 rounded-full border-2 border-[#d2ad50] bg-[#f6e7bc] px-5 py-1 font-board text-2xl">
        {name}
      </div>
    </div>
  );
}

function SavedCharacter({ character, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(character.name);

  const save = () => {
    onRename(name);
    setEditing(false);
  };

  return (
    <div className="rounded-md border-2 border-[#0f0c0a] bg-[#fffdf5] p-3 shadow-[0_3px_0_#0f0c0a]">
      <CharacterPreview name={character.name} imageDataUrl={character.imageDataUrl} />
      {editing ? (
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded border border-[#c7b684] px-2 py-1 font-bold"
          />
          <button type="button" onClick={save} className="rounded bg-[#0b7d5a] px-2 py-1 text-sm font-bold text-white">
            저장
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="flex-1 rounded border border-[#c7b684] px-2 py-1 text-sm font-bold">
            이름 변경
          </button>
          <button type="button" onClick={onRemove} className="rounded border border-[#b92a2a] px-2 py-1 text-sm font-bold text-[#b92a2a]">
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function AssetManager() {
  const dialog = useGameDialog();
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  const overrides = useAssetStore((s) => s.overrides);
  const clearAll = useAssetStore((s) => s.clearAll);
  const exportJSON = useAssetStore((s) => s.exportJSON);
  const importJSON = useAssetStore((s) => s.importJSON);
  const importInputRef = useRef(null);

  const slots = slotsByCategory(activeCategory);
  const overrideCount = Object.keys(overrides).length;

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
    const result = importJSON(await file.text());
    await dialog.alert({
      title: result.ok ? '불러오기 완료' : '불러오기 실패',
      message: result.ok ? `${result.count}개를 불러왔어요.` : result.error,
      tone: result.ok ? 'success' : 'danger',
    });
    e.target.value = '';
  };

  const handleClearAll = async () => {
    const ok = await dialog.confirm({
      title: '이미지 교체 초기화',
      message: `${overrideCount}개 교체 이미지를 모두 비울까요?`,
      okText: '초기화',
      cancelText: '취소',
      tone: 'danger',
    });
    if (ok) clearAll();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'rounded-md border-2 border-[#0f0c0a] px-3 py-2 font-bold',
                activeCategory === cat ? 'bg-[#df2f35] text-white' : 'bg-white',
              )}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className="rounded-md border bg-white px-3 py-2 font-bold">
            내보내기
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()} className="rounded-md border bg-white px-3 py-2 font-bold">
            불러오기
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-md border border-[#b92a2a] bg-white px-3 py-2 font-bold text-[#b92a2a]"
          >
            전체 초기화
          </button>
          <input ref={importInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} />
        ))}
      </div>
    </main>
  );
}

function SlotCard({ slot }) {
  const dialog = useGameDialog();
  const setOverride = useAssetStore((s) => s.setOverride);
  const removeOverride = useAssetStore((s) => s.removeOverride);
  const isOverridden = useAssetStore((s) => Boolean(s.overrides[slot.id]));
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      await dialog.alert({
        title: '첨부 실패',
        message: '이미지 파일만 가능합니다.',
        tone: 'warn',
      });
      return;
    }
    setBusy(true);
    try {
      setOverride(slot.id, await fileToDataURL(file));
    } catch (err) {
      await dialog.alert({
        title: '업로드 실패',
        message: err.message,
        tone: 'danger',
      });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2 rounded-md border-2 bg-white p-3 shadow-sm', isOverridden ? 'border-[#df2f35]' : 'border-[#d8c9a9]')}>
      <AssetFrame slot={slot.id} className="w-full" framed />
      <div>
        <p className="text-sm font-bold">{slot.label}</p>
        <p className="break-all font-mono text-[10px] text-neutral-400">{slot.id}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex-1 rounded bg-[#160f0a] px-2 py-2 text-sm font-bold text-white">
          {busy ? '...' : isOverridden ? '교체' : '업로드'}
        </button>
        {isOverridden && (
          <button type="button" onClick={() => removeOverride(slot.id)} className="rounded border px-2 py-2 text-sm font-bold">
            삭제
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}
