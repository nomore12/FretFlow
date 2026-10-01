import {
  SCALE_STEPS,
  SongKey,
  chromaticDegrees,
  degreeRootName,
  degreeRootPitchClass,
  parseNote,
} from '../../../utils/pitch';
import { MelodyNote, SongChord } from '../types';

// 멜로디: 16분음표 격자, 한 번에 한 음. 음높이는 도수 + 옥타브로 저장한다.

export const MELODY_STEPS_PER_BAR = 16;
export const MELODY_STEPS_PER_BEAT = 4;
export const DEFAULT_NOTE_LENGTH = 2; // 8분음표
// 피아노 롤에 보이는 음역 (부르기 편한 두 옥타브): E3 ~ E5
export const MELODY_LOW = 52;
export const MELODY_HIGH = 76;

export type MelodyPitch = Pick<MelodyNote, 'degree' | 'accidental' | 'octave'>;

const mod12 = (value: number) => ((value % 12) + 12) % 12;

/**
 * 기준 옥타브의 으뜸음 MIDI. F#3(54)~F4(65) 사이에 오게 해서, 키를 바꿀 때
 * 멜로디가 대부분 가까운 쪽으로 움직인다 (예: G→A는 2반음 위, C→B는 1반음 아래).
 */
export function referenceTonicMidi(key: SongKey): number {
  const tonic = parseNote(key.tonic);
  if (tonic === null) throw new Error(`Unknown tonic: ${key.tonic}`);
  return 54 + mod12(tonic - 6);
}

export function melodyPitchMidi(pitch: MelodyPitch, key: SongKey): number {
  return (
    referenceTonicMidi(key) +
    12 * pitch.octave +
    SCALE_STEPS[key.mode][pitch.degree - 1] +
    (pitch.accidental ?? 0)
  );
}

/** MIDI → 이 키에서의 도수·임시표·옥타브. 음계 밖 음은 흔한 표기(b7, #4 등)로. */
export function midiToMelodyPitch(midi: number, key: SongKey): MelodyPitch {
  const relative = midi - referenceTonicMidi(key);
  const within = mod12(relative);
  const { degree, accidental } = chromaticDegrees(key.mode)[within];
  const pitch: MelodyPitch = {
    degree,
    octave: Math.floor((relative - within) / 12),
  };
  if (accidental === -1 || accidental === 1) pitch.accidental = accidental;
  // 도수 계단을 넘는 임시표(예: 마이너 #7)는 옥타브 계산이 어긋나지 않게 보정한다.
  const back = melodyPitchMidi(pitch, key);
  if (back !== midi) pitch.octave += Math.round((midi - back) / 12);
  return pitch;
}

/** 'C#5'처럼 이 키에 맞는 표기로 쓴 음 이름. */
export function melodyNoteName(midi: number, key: SongKey): string {
  const pitch = midiToMelodyPitch(midi, key);
  const name = degreeRootName(
    { degree: pitch.degree, quality: 'major', accidental: pitch.accidental },
    key,
  );
  return `${name}${Math.floor(midi / 12) - 1}`;
}

export function isInScale(midi: number, key: SongKey): boolean {
  const tonic = parseNote(key.tonic) ?? 0;
  return SCALE_STEPS[key.mode].includes(mod12(midi - tonic));
}

/** 피아노 롤의 줄(MIDI), 높은 음부터. scaleOnly면 키에 맞는 음만. */
export function melodyRows(key: SongKey, scaleOnly: boolean): number[] {
  const rows: number[] = [];
  for (let midi = MELODY_HIGH; midi >= MELODY_LOW; midi--) {
    if (!scaleOnly || isInScale(midi, key)) rows.push(midi);
  }
  return rows;
}

const CHORD_INTERVALS: Record<SongChord['quality'], number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
};

/** 코드 구성음의 피치 클래스. 실제로 들리는 키 기준 (카포 무관). */
export function chordTonePitchClasses(
  chord: SongChord | null,
  actualKey: SongKey,
): number[] {
  if (!chord) return [];
  const root = degreeRootPitchClass(chord, actualKey);
  return CHORD_INTERVALS[chord.quality].map((interval) =>
    mod12(root + interval),
  );
}

export const sortNotes = (notes: MelodyNote[]) =>
  [...notes].sort((a, b) => a.bar - b.bar || a.step - b.step);

const overlaps = (a: MelodyNote, start: number, end: number) =>
  a.step < end && start < a.step + a.length;

/**
 * 음표를 놓는다. 한 번에 한 음이므로 같은 마디에서 시간이 겹치는 음표는 지운다.
 * 길이는 마디 끝을 넘지 않게 자른다.
 */
export function placeNote(notes: MelodyNote[], note: MelodyNote): MelodyNote[] {
  const step = Math.max(0, Math.min(MELODY_STEPS_PER_BAR - 1, note.step));
  const length = Math.max(
    1,
    Math.min(MELODY_STEPS_PER_BAR - step, Math.round(note.length)),
  );
  const placed = { ...note, step, length };
  return sortNotes([
    ...notes.filter(
      (other) =>
        other.bar !== placed.bar || !overlaps(other, step, step + length),
    ),
    placed,
  ]);
}

export function findNoteIndex(notes: MelodyNote[], bar: number, step: number) {
  return notes.findIndex((note) => note.bar === bar && note.step === step);
}

export function removeNote(
  notes: MelodyNote[],
  bar: number,
  step: number,
): MelodyNote[] {
  return notes.filter((note) => !(note.bar === bar && note.step === step));
}

/** (bar, step)의 음표를 바꾼다 (이동·길이·음높이). 겹치는 다른 음표는 지운다. */
export function updateNote(
  notes: MelodyNote[],
  bar: number,
  step: number,
  patch: Partial<MelodyNote>,
): MelodyNote[] {
  const index = findNoteIndex(notes, bar, step);
  if (index === -1) return notes;
  const rest = notes.filter((_, i) => i !== index);
  return placeNote(rest, { ...notes[index], ...patch });
}

// ---- 마디 편집에 맞춰 멜로디를 옮긴다 ----

/** index 앞에 마디가 끼워지면 그 뒤 음표를 한 마디씩 민다. */
export function melodyAfterInsertBar(notes: MelodyNote[], index: number) {
  return notes.map((note) =>
    note.bar >= index ? { ...note, bar: note.bar + 1 } : note,
  );
}

/** 마디를 지우면 그 마디 음표는 없애고 뒤 음표를 당긴다. */
export function melodyAfterRemoveBar(notes: MelodyNote[], index: number) {
  return notes
    .filter((note) => note.bar !== index)
    .map((note) => (note.bar > index ? { ...note, bar: note.bar - 1 } : note));
}

/** 마디를 바로 뒤에 복제하면 그 마디 음표도 복제한다. */
export function melodyAfterDuplicateBar(notes: MelodyNote[], index: number) {
  const shifted = melodyAfterInsertBar(notes, index + 1);
  const copies = notes
    .filter((note) => note.bar === index)
    .map((note) => ({ ...note, bar: index + 1 }));
  return sortNotes([...shifted, ...copies]);
}

/** 마디 전체를 한 번 더 이어 붙이면 멜로디도 이어 붙인다. */
export function melodyAfterDuplicateAll(notes: MelodyNote[], barCount: number) {
  return sortNotes([
    ...notes,
    ...notes
      .filter((note) => note.bar < barCount)
      .map((note) => ({ ...note, bar: note.bar + barCount })),
  ]);
}

/** 마디 수가 줄면 남지 않는 마디의 음표를 버린다. */
export function melodyWithinBars(notes: MelodyNote[], barCount: number) {
  return notes.filter((note) => note.bar < barCount);
}

// ---- 가사 음절 맞추기 ----

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function lyricSyllables(lyric: string): string[] {
  return [...lyric].filter((char) => {
    const code = char.codePointAt(0)!;
    return code >= HANGUL_START && code <= HANGUL_END;
  });
}

export interface SyllableAlignment {
  labels: string[]; // 마디 안 음표(시간순)마다 붙는 음절. 음절이 모자라면 ''
  leftover: string[]; // 음표가 모자라 남은 음절
  noteCount: number;
  syllableCount: number;
}

/** 마디의 음표에 가사 음절을 순서대로 붙인다. */
export function alignSyllables(
  lyric: string,
  barNotes: MelodyNote[],
): SyllableAlignment {
  const syllables = lyricSyllables(lyric);
  const count = barNotes.length;
  return {
    labels: barNotes.map((_, index) => syllables[index] ?? ''),
    leftover: syllables.slice(count),
    noteCount: count,
    syllableCount: syllables.length,
  };
}
