import { useCallback, useEffect, useRef, useState } from 'react';
import { Take, takeWindow } from './takes';

export type TakePlayMode = 'solo' | 'backing';

interface Playing {
  take: Take;
  mode: TakePlayMode;
}

/**
 * 테이크 재생. 'solo'는 바로 재생하고, 'backing'은 반주의 첫 마디선
 * (barStarted(0))에 맞춰 프리롤을 건너뛴 위치부터 재생한다.
 */
export default function useTakePlayer(onEnded: (mode: TakePlayMode) => void) {
  const [playing, setPlaying] = useState<Playing | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const playingRef = useRef<Playing | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const release = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    playingRef.current = null;
    setPlaying(null);
  }, []);

  const finish = useCallback(() => {
    const mode = playingRef.current?.mode;
    release();
    if (mode) onEndedRef.current(mode);
  }, [release]);

  const begin = (audio: HTMLAudioElement, take: Take) => {
    const { start } = takeWindow(take);
    audio.currentTime = start;
    audio.play().catch((error) => {
      console.error('테이크 재생 오류:', error);
      finish();
    });
  };

  const load = (take: Take, mode: TakePlayMode) => {
    release();
    const url = URL.createObjectURL(take.blob);
    const audio = new Audio(url);
    const { end } = takeWindow(take);
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= end) finish();
    });
    audio.addEventListener('ended', finish);
    audioRef.current = audio;
    urlRef.current = url;
    playingRef.current = { take, mode };
    setPlaying({ take, mode });
    return audio;
  };

  const playSolo = (take: Take) => begin(load(take, 'solo'), take);

  /** 반주와 함께: 준비만 하고, 반주 첫 마디선에서 시작한다. */
  const prepareWithBacking = (take: Take) => load(take, 'backing');

  const barStarted = (measure: number) => {
    const current = playingRef.current;
    if (current?.mode === 'backing' && measure === 0 && audioRef.current) {
      begin(audioRef.current, current.take);
    }
  };

  useEffect(() => release, [release]);

  return {
    playingId: playing?.take.id ?? null,
    playingMode: playing?.mode ?? null,
    playSolo,
    prepareWithBacking,
    barStarted,
    stop: release,
  };
}
