// 반음 단위 음높이 계산. 도수 → 실제 코드 이름 변환과 전조의 기준이 된다.

export type Mode = 'major' | 'minor';

export type Quality =
  | 'major'
  | 'minor'
  | '7'
  | 'maj7'
  | 'm7'
  | 'dim'
  | 'm7b5'
  | 'sus4'
  | 'sus2';

export interface Degree {
  degree: number; // 1~7
  quality: string;
  accidental?: number; // 반음 단위 (-1 = 플랫, +1 = 샤프)
}

export interface SongKey {
  tonic: string;
  mode: Mode;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PITCH: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const SCALE_STEPS: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // 자연단음계
};

const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];
const FLAT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

// 전조 후 으뜸음 표기. 기타에서 흔히 쓰는 쪽을 고른다.
const TONIC_NAMES: Record<Mode, string[]> = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** 'C', 'F#', 'Bb' 같은 음 이름을 0~11 피치 클래스로 바꾼다. */
export function parseNote(name: string): number | null {
  const match = /^([A-G])(#*|b*)$/.exec(name);
  if (!match) return null;
  const [, letter, accidentals] = match;
  const shift = accidentals.startsWith('#')
    ? accidentals.length
    : -accidentals.length;
  return mod12(LETTER_PITCH[letter] + shift);
}

export function pitchClassName(pitchClass: number, preferFlats: boolean) {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[mod12(pitchClass)];
}

function requireTonic(key: SongKey) {
  const tonic = parseNote(key.tonic);
  if (tonic === null) throw new Error(`Unknown tonic: ${key.tonic}`);
  return tonic;
}

/** 도수의 근음 피치 클래스. accidental은 반음 단위로 더한다. */
export function degreeRootPitchClass(chord: Degree, key: SongKey): number {
  const steps = SCALE_STEPS[key.mode];
  const index = chord.degree - 1;
  if (!Number.isInteger(chord.degree) || index < 0 || index >= 7) {
    throw new Error(`Invalid degree: ${chord.degree}`);
  }
  return mod12(requireTonic(key) + steps[index] + (chord.accidental ?? 0));
}

/**
 * 도수의 근음 이름. 음계 글자(으뜸음 글자 + 도수)를 기준으로 표기해
 * C 키의 b7이 A#이 아니라 Bb가 되게 한다. 겹임시표나 E#·Cb처럼
 * 코드 이름으로 어색한 표기는 단순한 이명동음으로 바꾼다.
 */
export function degreeRootName(chord: Degree, key: SongKey): string {
  const pitchClass = degreeRootPitchClass(chord, key);
  const tonicLetter = key.tonic[0];
  const letter =
    LETTERS[(LETTERS.indexOf(tonicLetter as never) + chord.degree - 1) % 7];
  const diff = mod12(pitchClass - LETTER_PITCH[letter]);
  const shift = diff > 6 ? diff - 12 : diff;
  const name =
    shift === 0
      ? letter
      : shift > 0
        ? letter + '#'.repeat(shift)
        : letter + 'b'.repeat(-shift);

  const awkward =
    Math.abs(shift) > 1 || ['E#', 'B#', 'Fb', 'Cb'].includes(name);
  if (!awkward) return name;

  const accidental = chord.accidental ?? 0;
  const preferFlats =
    accidental < 0 || (accidental === 0 && key.tonic.includes('b'));
  return pitchClassName(pitchClass, preferFlats);
}

export function qualitySuffix(quality: string): string {
  switch (quality) {
    case 'minor':
      return 'm';
    case 'maj7':
    case 'major7':
      return 'maj7';
    case 'dim':
    case 'diminished':
      return 'dim';
    case '7':
    case 'm7':
    case 'm7b5':
    case 'dim7':
    case 'sus4':
    case 'sus2':
      return quality;
    default:
      return '';
  }
}

export function degreeToChordName(chord: Degree, key: SongKey): string {
  return degreeRootName(chord, key) + qualitySuffix(chord.quality);
}

/** 키의 으뜸음을 반음 단위로 옮긴다. 모드는 유지한다. */
export function transposeKey(key: SongKey, semitones: number): SongKey {
  return {
    tonic: TONIC_NAMES[key.mode][mod12(requireTonic(key) + semitones)],
    mode: key.mode,
  };
}

/** 카포를 끼웠을 때 손으로 잡는 코드 모양의 키. */
export function shapeKey(key: SongKey, capo: number): SongKey {
  return transposeKey(key, -capo);
}

const DIATONIC_QUALITIES: Record<Mode, Quality[]> = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'],
  minor: ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'],
};

/** 모드의 1~7도 다이어토닉 코드. */
export function diatonicDegrees(mode: Mode): Degree[] {
  return DIATONIC_QUALITIES[mode].map((quality, index) => ({
    degree: index + 1,
    quality,
  }));
}
