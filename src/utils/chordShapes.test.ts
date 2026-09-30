import { describe, expect, it } from 'vitest';
import { findChordEnhanced } from './chordGenerator';
import { DifficultyLevel, getChordData } from './chordProgressionGenerator';
import { parseNote } from './pitch';
import { ChordShapeData, notesFromShape } from './voicing';

// 코드 이름 접미사 → 근음에서의 반음 거리 (구성음)
const CHORD_TONES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim7: [0, 3, 6, 9],
};

// 17개 근음 표기 (이명동음 포함)
const ROOTS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
];

const cases = ROOTS.flatMap((root) =>
  Object.keys(CHORD_TONES).map((suffix) => [`${root}${suffix}`, root, suffix]),
);

const PERFECT_FIFTH = 7;

/**
 * 운지의 음 집합이 구성음과 같고 가장 낮은 음이 근음인지 검사한다.
 * 기타 보이싱 관례에 따라 완전5도는 생략해도 된다 (예: 오픈 C7 x32310).
 */
function expectChordTones(shape: ChordShapeData, root: string, suffix: string) {
  const notes = notesFromShape(shape);
  const rootPc = parseNote(root)!;
  const tone = (interval: number) => (rootPc + interval) % 12;
  const expected = new Set(CHORD_TONES[suffix].map(tone));
  const actual = new Set(notes.map((n) => n % 12));
  if (!actual.has(tone(PERFECT_FIFTH))) expected.delete(tone(PERFECT_FIFTH));
  expect(actual).toEqual(expected);
  expect(Math.min(...notes) % 12).toBe(rootPc);
}

describe('운지 데이터의 실제 음', () => {
  it.each(cases)(
    '%s: 구성음이 맞고 가장 낮은 음이 근음',
    (name, root, suffix) => {
      const shape = getChordData(name, DifficultyLevel.WITH_SPECIAL);
      expect(shape, `${name} 운지 없음`).not.toBeNull();
      expectChordTones(shape!, root, suffix);
    },
  );

  // 코드 트레이닝(/exercise-chords)은 후보 중 가장 쉬운 운지를 고르므로 후보 전체를 본다.
  it.each(cases)('%s: 생성된 후보 운지도 모두 맞다', (name, root, suffix) => {
    for (const position of findChordEnhanced(name, true)) {
      expectChordTones(position, root, suffix);
    }
  });
});
