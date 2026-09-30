import { describe, expect, it } from 'vitest';
import chordProgressions from '../data/chordProgressions.json';
import {
  Degree,
  SongKey,
  degreeToChordName,
  diatonicDegrees,
  parseNote,
  shapeKey,
  transposeKey,
} from './pitch';

const names = (chords: Degree[], key: SongKey) =>
  chords.map((chord) => degreeToChordName(chord, key));

describe('parseNote', () => {
  it('음 이름을 피치 클래스로 바꾼다', () => {
    expect(parseNote('C')).toBe(0);
    expect(parseNote('F#')).toBe(6);
    expect(parseNote('Gb')).toBe(6);
    expect(parseNote('Cb')).toBe(11);
    expect(parseNote('H')).toBeNull();
    expect(parseNote('Am')).toBeNull();
  });
});

describe('다이어토닉 코드', () => {
  it('메이저 키', () => {
    expect(
      names(diatonicDegrees('major'), { tonic: 'G', mode: 'major' }),
    ).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
    expect(
      names(diatonicDegrees('major'), { tonic: 'Eb', mode: 'major' }),
    ).toEqual(['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim']);
  });

  it('마이너 키는 자연단음계 기준', () => {
    expect(
      names(diatonicDegrees('minor'), { tonic: 'A', mode: 'minor' }),
    ).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(
      names(diatonicDegrees('minor'), { tonic: 'E', mode: 'minor' }),
    ).toEqual(['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D']);
  });

  it('keySignatures의 음 표기와 일치한다', () => {
    for (const [name, info] of Object.entries(
      chordProgressions.keySignatures,
    )) {
      const key: SongKey = {
        tonic: name.replace(/m$/, ''),
        mode: info.type as SongKey['mode'],
      };
      const roots = diatonicDegrees(key.mode).map((chord) =>
        degreeToChordName({ ...chord, quality: 'major' }, key),
      );
      expect(roots, name).toEqual(info.notes);
    }
  });
});

describe('accidental은 반음 단위', () => {
  it('C 키의 b7은 Bb', () => {
    expect(
      degreeToChordName(
        { degree: 7, quality: 'major', accidental: -1 },
        {
          tonic: 'C',
          mode: 'major',
        },
      ),
    ).toBe('Bb');
  });

  it('G 키의 b7은 F, b3는 Bb, #4는 C#', () => {
    const key: SongKey = { tonic: 'G', mode: 'major' };
    expect(
      degreeToChordName({ degree: 7, quality: 'major', accidental: -1 }, key),
    ).toBe('F');
    expect(
      degreeToChordName({ degree: 3, quality: 'major', accidental: -1 }, key),
    ).toBe('Bb');
    expect(
      degreeToChordName({ degree: 4, quality: 'dim', accidental: 1 }, key),
    ).toBe('C#dim');
  });

  it('겹임시표와 어색한 이명동음을 단순하게 표기한다', () => {
    expect(
      degreeToChordName(
        { degree: 4, quality: 'major', accidental: -1 },
        {
          tonic: 'Bb',
          mode: 'major',
        },
      ),
    ).toBe('D');
    expect(
      degreeToChordName(
        { degree: 7, quality: 'dim' },
        { tonic: 'F#', mode: 'major' },
      ),
    ).toBe('Fdim');
    expect(
      degreeToChordName(
        { degree: 6, quality: 'major' },
        { tonic: 'Eb', mode: 'minor' },
      ),
    ).toBe('B');
  });

  it('마이너 키에서 accidental', () => {
    // A 마이너의 #7(화성단음계 이끎음) = G#
    expect(
      degreeToChordName(
        { degree: 7, quality: 'dim', accidental: 1 },
        {
          tonic: 'A',
          mode: 'minor',
        },
      ),
    ).toBe('G#dim');
  });
});

describe('전조와 카포', () => {
  const chorus: Degree[] = [
    { degree: 6, quality: 'minor' },
    { degree: 4, quality: 'major' },
    { degree: 5, quality: 'major' },
    { degree: 1, quality: 'major' },
  ];

  it('키를 G에서 A로 바꾸면 모든 코드가 전조된다', () => {
    const g: SongKey = { tonic: 'G', mode: 'major' };
    expect(names(chorus, g)).toEqual(['Em', 'C', 'D', 'G']);
    expect(names(chorus, transposeKey(g, 2))).toEqual(['F#m', 'D', 'E', 'A']);
  });

  it('A 키에 카포 2면 G 모양으로 잡는다', () => {
    const a: SongKey = { tonic: 'A', mode: 'major' };
    expect(shapeKey(a, 2)).toEqual({ tonic: 'G', mode: 'major' });
    expect(names(chorus, shapeKey(a, 2))).toEqual(['Em', 'C', 'D', 'G']);
  });

  it('전조한 으뜸음은 모드별로 흔한 표기를 쓴다', () => {
    expect(transposeKey({ tonic: 'C', mode: 'major' }, 1).tonic).toBe('Db');
    expect(transposeKey({ tonic: 'C', mode: 'minor' }, 1).tonic).toBe('C#');
    expect(transposeKey({ tonic: 'C', mode: 'major' }, -2).tonic).toBe('Bb');
    expect(transposeKey({ tonic: 'E', mode: 'minor' }, 12).tonic).toBe('E');
  });
});
