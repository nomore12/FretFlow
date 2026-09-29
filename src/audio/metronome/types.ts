import type * as Tone from 'tone';

export interface MembraneVoice {
  kind: 'membrane';
  options?: ConstructorParameters<typeof Tone.MembraneSynth>[0];
}

export interface NoiseVoice {
  kind: 'noise';
  options?: ConstructorParameters<typeof Tone.NoiseSynth>[0];
}

export interface MetronomeNote {
  voice: string;
  pitch?: string;
  durationBeats: number;
  velocity?: number;
}

export interface MetronomePosition {
  tick: number;
  measure: number;
  step: number;
  beat: number;
  subdivision: number;
}

export interface MetronomeOptions {
  bpm: number;
  beatsPerMeasure: number;
  subdivisions: 1 | 2 | 4;
  voices: Record<string, MembraneVoice | NoiseVoice>;
  getNote: (position: MetronomePosition) => MetronomeNote | null;
  volumeDb?: number;
  totalMeasures?: number;
  sequenceKey?: unknown;
  onTick?: (position: MetronomePosition) => void;
  onMeasureComplete?: (completedMeasures: number) => void;
}

export interface MetronomeSnapshot {
  status: 'stopped' | 'starting' | 'countdown' | 'playing';
  countdown: number | null;
  position: MetronomePosition | null;
  error: string | null;
}
