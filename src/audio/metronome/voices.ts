import { MetronomeOptions } from './types';

export const DRUM_VOICES: MetronomeOptions['voices'] = {
  kick: { kind: 'membrane' },
  snare: { kind: 'membrane' },
  hihat: { kind: 'membrane' },
  tom: { kind: 'membrane' },
  last: { kind: 'membrane' },
};

export const FRETBOARD_VOICES: MetronomeOptions['voices'] = {
  strong: {
    kind: 'membrane',
    options: {
      pitchDecay: 0.01,
      octaves: 2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.05 },
    },
  },
  weak: {
    kind: 'noise',
    options: {
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    },
  },
};

export const CHROMATIC_VOICES: MetronomeOptions['voices'] = {
  strong: {
    kind: 'membrane',
    options: {
      pitchDecay: 0.008,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    },
  },
  weak: {
    kind: 'noise',
    options: {
      noise: { type: 'white', playbackRate: 1.5 },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.05 },
    },
  },
};

export const RHYTHM_VOICES: MetronomeOptions['voices'] = {
  note: {
    kind: 'membrane',
    options: {
      pitchDecay: 0.01,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
    },
  },
  rest: {
    kind: 'noise',
    options: {
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.03 },
      volume: -8,
    },
  },
};

// 송 스케치패드 반주: 드럼 + 기타 줄처럼 짧게 튕기고 빨리 사라지는 화음 음색.
export const SONG_VOICES: MetronomeOptions['voices'] = {
  ...DRUM_VOICES,
  guitar: {
    kind: 'poly',
    maxPolyphony: 32,
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.8, sustain: 0.02, release: 0.25 },
      volume: -8,
    },
  },
  // 가이드 톤: 기타와 섞이지 않게 부드럽게 시작해 마디 동안 은은하게 남는 단음.
  guide: {
    kind: 'poly',
    maxPolyphony: 4,
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.03, decay: 0.4, sustain: 0.5, release: 0.4 },
      volume: -6,
    },
  },
};
