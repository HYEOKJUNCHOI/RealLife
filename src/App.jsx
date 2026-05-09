import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/gameStore.js';
import Setup from '@/screens/Setup.jsx';
import GameMain from '@/screens/GameMain.jsx';
import AdminAssets from '@/screens/AdminAssets.jsx';
import TabletShell from '@/components/TabletShell.jsx';
import { GameDialogProvider } from '@/components/GameDialog.jsx';

// URL 해시 → 화면 결정 (#admin 이면 관리자 페이지)
const getScreenFromHash = () => (window.location.hash === '#admin' ? 'admin' : null);

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [hashScreen, setHashScreen] = useState(getScreenFromHash());
  const state = useGameStore((s) => s.state);

  useEffect(() => {
    if (window.matchMedia('(orientation: portrait)').matches) {
      console.log('[App] 세로모드 감지 — 가로모드 권장');
    }
    const onHash = () => setHashScreen(getScreenFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 관리자 페이지는 PC에서도 풀스크린 그대로 (작업 화면이라 mockup 불필요)
  if (hashScreen === 'admin') {
    return (
      <GameDialogProvider>
        <AdminAssets
          onExit={() => {
            window.location.hash = '';
          }}
        />
      </GameDialogProvider>
    );
  }

  // 게임 화면은 TabletShell 안에서 렌더 (PC면 태블릿 mockup, 모바일은 풀스크린)
  return (
    <TabletShell>
      <GameDialogProvider>
        {screen === 'setup' || !state ? (
          <Setup onStart={() => setScreen('game')} />
        ) : (
          <GameMain onExit={() => setScreen('setup')} />
        )}
      </GameDialogProvider>
    </TabletShell>
  );
}
