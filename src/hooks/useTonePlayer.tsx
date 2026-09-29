import useMetronome from './useMetronome';
import { DRUM_VOICES } from '../audio/metronome/voices';
import { MetronomeNote } from '../audio/metronome/types';

interface TonePlayerProps {
  bpm: number;
  volume: number;
  beat: '4' | '8' | '16';
  callback: (completedMeasures: number) => void;
  totalMeasures?: number;
}

const PATTERNS = {
  '4': ['kick', 'hihat', 'snare', 'last'],
  '8': ['kick', 'hihat', 'snare', 'hihat', 'kick', 'hihat', 'snare', 'last'],
  '16': [
    'kick',
    'hihat',
    null,
    'hihat',
    'snare',
    'hihat',
    null,
    'hihat',
    'kick',
    'hihat',
    null,
    'hihat',
    'snare',
    'hihat',
    'tom',
    'last',
  ],
};

const NOTES: Record<string, MetronomeNote> = {
  kick: { voice: 'kick', pitch: 'C1', durationBeats: 0.5 },
  snare: { voice: 'snare', pitch: 'E1', durationBeats: 0.5 },
  hihat: { voice: 'hihat', pitch: 'G1', durationBeats: 0.25 },
  tom: { voice: 'tom', pitch: 'A1', durationBeats: 0.5 },
  last: { voice: 'last', pitch: 'A1', durationBeats: 0.5 },
};

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
      const voice = PATTERNS[beat][step];
      return voice ? NOTES[voice] : null;
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
