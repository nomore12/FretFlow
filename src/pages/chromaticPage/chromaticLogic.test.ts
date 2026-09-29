import { describe, expect, it } from 'vitest';
import { generateChromaticNotesArray, PracticeMode } from './chromaticLogic';

const permutations = (values: number[]): number[][] =>
  values.length === 0
    ? [[]]
    : values.flatMap((value, index) =>
        permutations(values.filter((_, i) => i !== index)).map((rest) => [
          value,
          ...rest,
        ]),
      );

describe('크로매틱 역방향 연주', () => {
  it('3214를 4123 순서로 연주하고 프렛별 순서 숫자를 2341로 표시한다', () => {
    const notes = generateChromaticNotesArray(
      1,
      [3, 2, 1, 4],
      [3, 2, 1, 4],
      'traverse_with_repeat',
      true,
    );
    expect(notes.map((note) => note.flatNumber)).toEqual([4, 1, 2, 3]);
    expect(notes.map((note) => note.chromaticNumber)).toEqual([4, 1, 2, 3]);
    expect(
      [1, 2, 3, 4].map(
        (fret) => notes.findIndex((note) => note.flatNumber === fret) + 1,
      ),
    ).toEqual([2, 3, 4, 1]);
  });

  for (const pattern of permutations([1, 2, 3, 4])) {
    it(`${pattern.join('')}의 프렛·손가락 연결과 입력 배열을 유지하며 역순으로 연주한다`, () => {
      const sequence = pattern.map((finger) => finger + 4);
      const originalSequence = [...sequence];
      const originalPattern = [...pattern];
      const forward = generateChromaticNotesArray(
        6,
        sequence,
        pattern,
        'traverse_with_repeat',
        false,
      );
      const backward = generateChromaticNotesArray(
        6,
        sequence,
        pattern,
        'traverse_with_repeat',
        true,
      );
      expect(forward.map((note) => note.flatNumber)).toEqual(sequence);
      expect(backward).toEqual([...forward].reverse());
      expect(
        backward.every(
          (note) =>
            note.flatNumber === note.chromaticNumber + 4 &&
            note.lineNumber === 6 &&
            note.chord === String(note.chromaticNumber),
        ),
      ).toBe(true);
      expect(sequence).toEqual(originalSequence);
      expect(pattern).toEqual(originalPattern);
    });
  }

  it.each<PracticeMode>(['loop', 'traverse_6th_start', 'traverse_1st_start'])(
    '%s 모드의 연주 순서는 변경하지 않는다',
    (mode) => {
      const pattern = [3, 2, 1, 4];
      expect(
        generateChromaticNotesArray(6, pattern, pattern, mode, true),
      ).toEqual(generateChromaticNotesArray(6, pattern, pattern, mode, false));
    },
  );
});
