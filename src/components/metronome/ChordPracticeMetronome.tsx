import React, { useEffect, useRef, useState } from 'react';
import MetronomeControls from './MetronomeControls';
import useTonePlayer from '../../hooks/useTonePlayer';

export interface ChordPracticeMetronomeProps {
  /** 메트로놈이 플레이 중일 때 호출되는 콜백 (마디가 끝날 때마다) */
  onMeasureComplete?: (completedMeasures: number) => void;
  /** 메트로놈 상태 변경 시 호출되는 콜백 */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** 현재 마디 번호 (1-16) */
  currentMeasure?: number;
  /** 전체 마디 수 (기본값: 16) */
  totalMeasures?: number;
  /** 부모에서 재생을 강제로 중단시키기 위한 신호 (값이 변할 때마다 정지) */
  stopSignal?: number;
  onCountdownChange?: (countdown: number | null) => void;
}

const ChordPracticeMetronome: React.FC<ChordPracticeMetronomeProps> = ({
  onMeasureComplete,
  onPlayStateChange,
  currentMeasure = 0,
  totalMeasures = 16,
  stopSignal,
  onCountdownChange,
}) => {
  const [bpm, setBpm] = useState<number>(60);
  const [volume, setVolume] = useState(10);
  const [beat, setBeat] = useState<'4' | '8' | '16'>('4');
  const {
    handlePlay,
    handleStop,
    isPlaying,
    isBusy,
    countdown,
    position,
    error,
  } = useTonePlayer({
    bpm,
    volume,
    beat,
    totalMeasures,
    callback: (completedMeasures) => onMeasureComplete?.(completedMeasures),
  });
  const playStateCallbackRef = useRef(onPlayStateChange);
  playStateCallbackRef.current = onPlayStateChange;
  const previousStopSignal = useRef(stopSignal);

  useEffect(() => {
    if (!isPlaying || position?.tick === 0) {
      playStateCallbackRef.current?.(isPlaying);
    }
  }, [isPlaying, position?.tick]);

  useEffect(() => {
    if (previousStopSignal.current !== stopSignal) {
      previousStopSignal.current = stopSignal;
      handleStop();
    }
  }, [stopSignal, handleStop]);

  useEffect(() => {
    onCountdownChange?.(countdown);
  }, [countdown, onCountdownChange]);

  const handleStartMetronome = () => {
    void handlePlay(3);
  };

  return (
    <MetronomeControls
      bpm={bpm}
      maxBpm={300}
      onBpmChange={setBpm}
      beat={Number(beat)}
      onBeatChange={(value) => setBeat(String(value) as '4' | '8' | '16')}
      volume={volume}
      onVolumeChange={setVolume}
      isBusy={isBusy}
      onToggle={isBusy ? handleStop : handleStartMetronome}
      status={
        countdown !== null
          ? `${countdown}초 후 시작`
          : isPlaying
            ? `${currentMeasure + 1} / ${totalMeasures} 마디`
            : '3초 카운트다운 후 시작'
      }
      error={error}
    />
  );
};

export default ChordPracticeMetronome;
