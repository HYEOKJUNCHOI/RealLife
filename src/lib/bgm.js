const BGM_PREF_KEY = 'reallife:bgmEnabled';
const BGM_SRC = '/audio/bgm.mp3';

let audio = null;

export function getBgmPreference() {
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem(BGM_PREF_KEY) === '1';
}

export function setBgmPreference(enabled) {
  if (typeof window === 'undefined') return;
  window.localStorage?.setItem(BGM_PREF_KEY, enabled ? '1' : '0');
}

export function getBgmAudio() {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    audio.loop = true;
    audio.volume = 0.34;
    audio.src = BGM_SRC;
  }
  return audio;
}

export async function playBgm() {
  const target = getBgmAudio();
  if (!target) return false;
  await target.play();
  setBgmPreference(true);
  return true;
}

export function pauseBgm() {
  const target = getBgmAudio();
  target?.pause();
  setBgmPreference(false);
}

export function isBgmPlaying() {
  return Boolean(audio && !audio.paused && !audio.ended);
}
