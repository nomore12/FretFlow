import useMetronome from './useMetronome';
import { DRUM_VOICES } from '../audio/metronome/voices';
import { DRUM_NOTES, DRUM_PATTERNS } from '../audio/metronome/drumPatterns';

interface TonePlayerProps {
  bpm: number;
  volume: number;
  beat: '4' | '8' | '16';
  callback: (completedMeasures: number) => void;
  totalMeasures?: number;
}

// 기존 코드 연습 화면은 패턴만 제공하고 재생 수명주기는 공통 훅에 맡긴다.
const useTonePlayer = ({
  bpm,
  volume,
  beat,
  callback,
  totalMeasures,
}: TonePlayerProps) => {
  const playback = useMetronome({
    bpm,
    volumeDb: volume,
    beatsPerMeasure: 4,
    subdivisions: beat === '16' ? 4 : beat === '8' ? 2 : 1,
    voices: DRUM_VOICES,
    totalMeasures,
    getNote: ({ step }) => {
      const voice = DRUM_PATTERNS[beat][step];
      return voice ? DRUM_NOTES[voice] : null;
    },
    onMeasureComplete: callback,
  });

  return {
    ...playback,
    isSoundLoaded: true,
    handlePlay: playback.start,
    handleStop: playback.stop,
  };
};

export default useTonePlayer;
