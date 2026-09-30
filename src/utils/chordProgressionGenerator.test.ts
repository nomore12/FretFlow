import { describe, expect, it } from 'vitest';
import chordProgressions from '../data/chordProgressions.json';
import { DifficultyLevel, degreeToChord } from './chordProgressionGenerator';

const progression = (id: string) =>
  Object.values(chordProgressions.progressions)
    .flat()
    .find((p) => p.id === id)!;

const chordsOf = (id: string, key: string) =>
  progression(id).pattern.map((chord) =>
    degreeToChord(chord, key, DifficultyLevel.WITH_SPECIAL),
  );

describe('degreeToChord accidental', () => {
  it('Rock Progression은 C 키에서 C–Bb–F–C', () => {
    expect(chordsOf('prog_4_3', 'C')).toEqual(['C', 'Bb', 'F', 'C']);
  });

  it('G 키의 b7은 F', () => {
    expect(chordsOf('prog_4_3', 'G')).toEqual(['G', 'F', 'C', 'G']);
  });

  it('Modal Interchange의 bVII도 반음 아래로 계산한다', () => {
    expect(chordsOf('prog_8_10', 'C')).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'C',
      'Bb',
      'F',
      'C',
    ]);
  });

  it('임시표 없는 진행은 그대로다', () => {
    expect(chordsOf('prog_4_1', 'D')).toEqual(['D', 'A', 'Bm', 'G']);
    expect(chordsOf('prog_4_9', 'Am')).toEqual(['Am', 'G', 'F', 'E']);
  });
});
