// 코드를 기타처럼 들리는 실제 음높이(MIDI 번호)로 바꾼다.
// 운지 데이터가 있으면 그대로 따르고, 없으면 E형·A형 코드 모양 규칙으로 쌓는다.

import {
  Degree,
  SongKey,
  degreeRootPitchClass,
  degreeToChordName,
} from './pitch';

export interface ChordShapeData {
  fingers: number[][]; // [줄 번호(1 = 1번 줄 E4), 프렛]
  mute: number[];
}

// 줄 번호 → 개방현 MIDI. 6번 줄 E2(40)부터 1번 줄 E4(64)까지.
export const STANDARD_TUNING: Record<number, number> = {
  6: 40,
  5: 45,
  4: 50,
  3: 55,
  2: 59,
  1: 64,
};

/** 운지 데이터를 낮은 줄부터 실제 음으로 바꾼다. 뮤트 줄은 뺀다. */
export function notesFromShape(shape: ChordShapeData): number[] {
  const frets = new Map<number, number>();
  // 한 줄에 여러 손가락(바레 + 운지)이 있으면 가장 높은 프렛이 소리 난다.
  for (const [string, fret] of shape.fingers) {
    frets.set(string, Math.max(frets.get(string) ?? 0, fret));
  }
  const notes: number[] = [];
  for (let string = 6; string >= 1; string--) {
    if (shape.mute.includes(string)) continue;
    notes.push(STANDARD_TUNING[string] + (frets.get(string) ?? 0));
  }
  return notes;
}

// 근음에서의 반음 거리. 8도는 0으로 두고 "바로 위 같은 음"으로 쌓는다.
const I = {
  root: 0,
  b3: 3,
  third: 4,
  fourth: 5,
  second: 2,
  b5: 6,
  fifth: 7,
  b7: 10,
  seventh: 11,
};

type Form = 'E' | 'A';

// 낮은 줄부터 쌓는 순서. 3도(또는 sus 대체음)는 항상 들어간다.
const FORMS: Record<string, Partial<Record<Form, number[]>>> = {
  major: {
    E: [I.root, I.fifth, I.root, I.third, I.fifth, I.root],
    A: [I.root, I.fifth, I.root, I.third, I.fifth],
  },
  minor: {
    E: [I.root, I.fifth, I.root, I.b3, I.fifth, I.root],
    A: [I.root, I.fifth, I.root, I.b3, I.fifth],
  },
  '7': {
    E: [I.root, I.fifth, I.b7, I.third, I.fifth, I.root],
    A: [I.root, I.fifth, I.b7, I.third, I.fifth],
  },
  m7: {
    E: [I.root, I.fifth, I.b7, I.b3, I.fifth, I.root],
    A: [I.root, I.fifth, I.b7, I.b3, I.fifth],
  },
  maj7: { A: [I.root, I.fifth, I.seventh, I.third, I.fifth] },
  sus4: {
    E: [I.root, I.fifth, I.root, I.fourth, I.fifth, I.root],
    A: [I.root, I.fifth, I.root, I.fourth, I.fifth],
  },
  sus2: {
    E: [I.root, I.fifth, I.root, I.second, I.fifth, I.root],
    A: [I.root, I.fifth, I.root, I.second, I.fifth],
  },
  dim: { A: [I.root, I.b5, I.root, I.b3] },
  m7b5: { A: [I.root, I.b5, I.b7, I.b3] },
};

// 6번 줄 근음 프렛이 이보다 크면 5번 줄 근음(A형)을 쓴다.
const MAX_E_FORM_FRET = 7;

const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** 운지 데이터가 없을 때 E형·A형 코드 모양 규칙으로 쌓은 음. */
export function fallbackVoicing(rootPitchClass: number, quality: string) {
  const forms = FORMS[quality] ?? FORMS.major;
  const eFret = mod12(rootPitchClass - STANDARD_TUNING[6]);
  const form: Form =
    forms.E && (!forms.A || eFret <= MAX_E_FORM_FRET) ? 'E' : 'A';
  const intervals = forms[form]!;
  const root =
    form === 'E'
      ? STANDARD_TUNING[6] + eFret
      : STANDARD_TUNING[5] + mod12(rootPitchClass - STANDARD_TUNING[5]);

  const notes = [root];
  for (const interval of intervals.slice(1)) {
    // 앞 음보다 높은 음 중 가장 가까운 같은 음이름
    const previous = notes[notes.length - 1];
    const step = mod12(root + interval - previous) || 12;
    notes.push(previous + step);
  }
  return notes;
}

export type ShapeLookup = (chordName: string) => ChordShapeData | null;

/**
 * 곡의 코드 하나를 재생할 음으로 바꾼다. 이름과 운지는 카포를 뺀 모양 키
 * 기준으로 찾고, 결과를 카포만큼 올려 실제로 들리는 음을 돌려준다.
 */
export function voiceChord(
  chord: Degree,
  shapeKey: SongKey,
  capo: number,
  lookup: ShapeLookup,
): number[] {
  const shape = lookup(degreeToChordName(chord, shapeKey));
  const shapeNotes = shape ? notesFromShape(shape) : [];
  const notes =
    shapeNotes.length > 0
      ? shapeNotes
      : fallbackVoicing(degreeRootPitchClass(chord, shapeKey), chord.quality);
  return notes.map((note) => note + capo);
}

const NOTE_NAMES = [
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

/** MIDI 번호 → 'C#4' 같은 과학적 음이름. */
export function midiToNoteName(midi: number): string {
  return `${NOTE_NAMES[mod12(midi)]}${Math.floor(midi / 12) - 1}`;
}
