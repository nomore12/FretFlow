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
