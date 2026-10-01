import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { SongKey, transposeKey } from '../../../utils/pitch';
import { midiToNoteName } from '../../../utils/voicing';
import { MelodyNote, Song } from '../types';
import {
  MELODY_HIGH,
  MELODY_LOW,
  alignSyllables,
  chordTonePitchClasses,
  melodyNoteName,
  melodyPitchMidi,
  melodyRows,
  midiToMelodyPitch,
  placeNote,
  referenceTonicMidi,
  removeNote,
  updateNote,
} from './melody';
import {
  applyProgression,
  duplicateBar,
  duplicateBars,
  insertBar,
  materializeSong,
  removeBar,
  setSectionMelody,
} from './songEdits';
import { parseSongJson, readSongData, serializeSong } from './songIO';

const A: SongKey = { tonic: 'A', mode: 'major' };
const note = (
  bar: number,
  step: number,
  length: number,
  degree = 1,
  octave = 0,
): MelodyNote => ({
  bar,
  step,
  length,
  degree,
  octave,
});

const sample = (): Song => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'sample', 0);
};

describe('음높이 (도수 + 옥타브)', () => {
  it('기준 옥타브의 으뜸음은 F#3~F4 사이', () => {
    expect(midiToNoteName(referenceTonicMidi(A))).toBe('A3');
    expect(
      midiToNoteName(referenceTonicMidi({ tonic: 'C', mode: 'major' })),
    ).toBe('C4');
    expect(
      midiToNoteName(referenceTonicMidi({ tonic: 'F#', mode: 'major' })),
    ).toBe('F#3');
    expect(
      midiToNoteName(referenceTonicMidi({ tonic: 'F', mode: 'major' })),
    ).toBe('F4');
  });

  it('MIDI ↔ 도수 왕복 (음계 밖 음 포함, 메이저·마이너)', () => {
    for (const key of [
      A,
      { tonic: 'E', mode: 'minor' } as SongKey,
      { tonic: 'Bb', mode: 'major' } as SongKey,
    ]) {
      for (let midi = MELODY_LOW; midi <= MELODY_HIGH; midi++) {
        expect(melodyPitchMidi(midiToMelodyPitch(midi, key), key)).toBe(midi);
      }
    }
  });

  it('키를 바꾸면 멜로디가 같은 도수로 옮겨진다', () => {
    const third = midiToMelodyPitch(61, A); // C#4 = A 키의 3도
    expect(third).toEqual({ degree: 3, octave: 0 });
    const inB = transposeKey(A, 2);
    expect(midiToNoteName(melodyPitchMidi(third, inB))).toBe('D#4');
  });

  it('키에 맞는 표기로 음 이름을 쓴다', () => {
    expect(melodyNoteName(61, A)).toBe('C#4');
    expect(melodyNoteName(70, { tonic: 'F', mode: 'major' })).toBe('Bb4');
  });

  it('피아노 롤 줄: 키에 맞는 음만 또는 반음 전부, 높은 음부터', () => {
    const scale = melodyRows(A, true);
    expect(scale.map(midiToNoteName).slice(0, 3)).toEqual(['E5', 'D5', 'C#5']);
    expect(scale).toHaveLength(15); // E3~E5, A 메이저 음만
    expect(melodyRows(A, false)).toHaveLength(MELODY_HIGH - MELODY_LOW + 1);
  });

  it('코드 구성음은 실제 키 기준', () => {
    // A 키의 IV = D 코드 → D F# A
    expect(
      chordTonePitchClasses({ degree: 4, quality: 'major' }, A).sort(),
    ).toEqual([2, 6, 9]);
    expect(chordTonePitchClasses(null, A)).toEqual([]);
  });
});

describe('음표 놓기 (한 번에 한 음)', () => {
  it('겹치는 음표는 지우고 시간순으로 정렬한다', () => {
    let notes = placeNote([], note(0, 4, 4, 1));
    notes = placeNote(notes, note(0, 0, 2, 3));
    notes = placeNote(notes, note(0, 6, 2, 5)); // 4~7과 겹침 → 앞 음표 지움
    expect(notes.map((n) => [n.step, n.degree])).toEqual([
      [0, 3],
      [6, 5],
    ]);
  });

  it('길이는 마디 끝을 넘지 않고 다른 마디는 건드리지 않는다', () => {
    const notes = placeNote([note(1, 0, 4)], note(0, 14, 8));
    expect(notes).toEqual([note(0, 14, 2), note(1, 0, 4)]);
  });

  it('지우기와 바꾸기', () => {
    const notes = [note(0, 0, 2), note(0, 4, 2)];
    expect(removeNote(notes, 0, 4)).toEqual([note(0, 0, 2)]);
    // 길이를 늘려 다음 음표와 겹치면 다음 음표가 지워진다
    expect(updateNote(notes, 0, 0, { length: 6 })).toEqual([note(0, 0, 6)]);
    expect(updateNote(notes, 0, 4, { degree: 5 })).toEqual([
      note(0, 0, 2),
      note(0, 4, 2, 5),
    ]);
  });
});

describe('마디 편집과 함께 움직이는 멜로디', () => {
  const withMelody = () =>
    setSectionMelody(sample(), 'intro', [
      note(0, 0, 2, 1),
      note(1, 0, 2, 2),
      note(3, 0, 2, 4),
    ]);
  const bars = (song: Song) =>
    song.sections.intro.melody?.map((n) => `${n.bar}:${n.degree}`);

  it('삽입하면 뒤 음표가 밀린다', () => {
    expect(bars(insertBar(withMelody(), 'intro', 1))).toEqual([
      '0:1',
      '2:2',
      '4:4',
    ]);
  });

  it('삭제하면 그 마디 음표가 사라지고 뒤가 당겨진다', () => {
    expect(bars(removeBar(withMelody(), 'intro', 1))).toEqual(['0:1', '2:4']);
  });

  it('마디 복제·전체 복제', () => {
    expect(bars(duplicateBar(withMelody(), 'intro', 1))).toEqual([
      '0:1',
      '1:2',
      '2:2',
      '4:4',
    ]);
    expect(bars(duplicateBars(withMelody(), 'intro'))).toEqual([
      '0:1',
      '1:2',
      '3:4',
      '4:1',
      '5:2',
      '7:4',
    ]);
  });

  it('프리셋으로 마디 수가 줄면 남지 않는 마디의 음표는 버린다', () => {
    const song = applyProgression(withMelody(), 'intro', [
      { degree: 1, quality: 'major' },
      { degree: 5, quality: 'major' },
    ]);
    expect(bars(song)).toEqual(['0:1', '1:2']);
  });

  it('멜로디를 모두 지우면 필드도 없어진다', () => {
    expect(
      setSectionMelody(withMelody(), 'intro', []).sections.intro.melody,
    ).toBeUndefined();
  });

  it('내보내기·가져오기에서 멜로디가 유지된다', () => {
    const song = withMelody();
    const result = parseSongJson(serializeSong(song));
    expect(result.ok && result.data.sections.intro.melody).toEqual(
      song.sections.intro.melody,
    );
  });

  it('잘못된 음표는 거부한다', () => {
    const data = JSON.parse(serializeSong(withMelody()));
    data.sections.intro.melody[0].length = 30;
    expect(parseSongJson(JSON.stringify(data))).toMatchObject({ ok: false });
  });
});

describe('가사 음절 맞추기', () => {
  it('음표 순서대로 음절을 붙이고 남는 음절을 알려준다', () => {
    const result = alignSyllables('"다음 화 결제하기"', [
      note(0, 0, 2),
      note(0, 2, 2),
      note(0, 4, 2),
    ]);
    expect(result).toEqual({
      labels: ['다', '음', '화'],
      leftover: ['결', '제', '하', '기'],
      noteCount: 3,
      syllableCount: 7,
    });
  });

  it('음표가 더 많으면 빈 음절', () => {
    expect(alignSyllables('가', [note(0, 0, 2), note(0, 2, 2)]).labels).toEqual(
      ['가', ''],
    );
  });
});
