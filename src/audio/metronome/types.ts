import type * as Tone from 'tone';

export interface MembraneVoice {
  kind: 'membrane';
  options?: ConstructorParameters<typeof Tone.MembraneSynth>[0];
}

export interface NoiseVoice {
  kind: 'noise';
  options?: ConstructorParameters<typeof Tone.NoiseSynth>[0];
}

// 짧은 어택과 빠른 감쇠로 기타 줄처럼 들리게 쓰는 화음 음색.
export interface PolyVoice {
  kind: 'poly';
  options?: ConstructorParameters<typeof Tone.Synth>[0];
  maxPolyphony?: number;
}

export interface MetronomeNote {
  voice: string;
  pitch?: string;
  durationBeats: number;
  velocity?: number;
  delaySeconds?: number; // 스트로크처럼 줄마다 조금씩 늦게 칠 때
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
  voices: Record<string, MembraneVoice | NoiseVoice | PolyVoice>;
  getNote: (
    position: MetronomePosition,
  ) => MetronomeNote | MetronomeNote[] | null;
  volumeDb?: number;
  voiceVolumesDb?: Record<string, number>; // 음색별 음량 (드럼·코드 따로)
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
