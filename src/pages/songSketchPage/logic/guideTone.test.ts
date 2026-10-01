import { describe, expect, it } from 'vitest';
import { SongKey } from '../../../utils/pitch';
import { midiToNoteName } from '../../../utils/voicing';
import { SongChord } from '../types';
import { GUIDE_RANGE_HIGH, GUIDE_RANGE_LOW, guideToneMidi } from './guideTone';

const G: SongKey = { tonic: 'G', mode: 'major' };
const name = (chord: SongChord, key: SongKey) =>
  midiToNoteName(guideToneMidi(chord, key));

describe('가이드 톤', () => {
  it('메이저·마이너는 3음', () => {
    expect(name({ degree: 1, quality: 'major' }, G)).toBe('B3'); // G의 3음
    expect(name({ degree: 6, quality: 'minor' }, G)).toBe('G4'); // Em의 ♭3
    expect(name({ degree: 5, quality: '7' }, G)).toBe('F#4'); // D7의 3음
  });

  it('sus 코드는 대체음, dim은 ♭3', () => {
    expect(name({ degree: 5, quality: 'sus4' }, G)).toBe('G4'); // Dsus4 → 4음
    expect(name({ degree: 5, quality: 'sus2' }, G)).toBe('E4'); // Dsus2 → 2음
    expect(name({ degree: 7, quality: 'dim' }, G)).toBe('A3'); // F#dim → ♭3
  });

  it('카포와 상관없이 실제로 들리는 키 기준', () => {
    // 키 A(카포 2로 G 모양): I 코드는 실제로 A → 3음 C#
    const A: SongKey = { tonic: 'A', mode: 'major' };
    expect(name({ degree: 1, quality: 'major' }, A)).toBe('C#4');
  });

  it('항상 가운데 음역 (A3~G#4) 안', () => {
    for (let tonic = 0; tonic < 12; tonic++) {
      const key: SongKey = {
        tonic: [
          'C',
          'Db',
          'D',
          'Eb',
          'E',
          'F',
          'F#',
          'G',
          'Ab',
          'A',
          'Bb',
          'B',
        ][tonic],
        mode: 'major',
      };
      for (let degree = 1; degree <= 7; degree++) {
        const midi = guideToneMidi({ degree, quality: 'major' }, key);
        expect(midi).toBeGreaterThanOrEqual(GUIDE_RANGE_LOW);
        expect(midi).toBeLessThanOrEqual(GUIDE_RANGE_HIGH);
      }
    }
  });
});
