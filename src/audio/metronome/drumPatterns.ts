import { MetronomeNote } from './types';

// 코드 연습·송 스케치패드가 함께 쓰는 드럼 패턴 (칸마다 DRUM_VOICES 이름).
export const DRUM_PATTERNS: Record<'4' | '8' | '16', (string | null)[]> = {
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

export const DRUM_NOTES: Record<string, MetronomeNote> = {
  kick: { voice: 'kick', pitch: 'C1', durationBeats: 0.5 },
  snare: { voice: 'snare', pitch: 'E1', durationBeats: 0.5 },
  hihat: { voice: 'hihat', pitch: 'G1', durationBeats: 0.25 },
  tom: { voice: 'tom', pitch: 'A1', durationBeats: 0.5 },
  last: { voice: 'last', pitch: 'A1', durationBeats: 0.5 },
};
