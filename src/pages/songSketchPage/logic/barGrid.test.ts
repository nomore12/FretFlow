import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { Song } from '../types';
import { suggestChordsForBar } from './nextChords';
import {
  distributeLyrics,
  duplicateBar,
  insertBar,
  materializeSong,
} from './songEdits';
import { readSongData } from './songIO';

const sample = (): Song => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'sample', 0);
};

describe('마디 삽입·복제', () => {
  it('앞에 삽입: 그 자리 마디의 코드를 따르고 가사는 비운다', () => {
    const song = insertBar(sample(), 'verse', 1);
    const bars = song.sections.verse.bars;
    expect(bars).toHaveLength(9);
    expect(bars[1]).toEqual({ chord: { degree: 4, quality: 'major' } });
    expect(bars[2].lyric).toBe('연재분 정주행');
  });

  it('끝에 삽입하면 마지막 마디의 코드를 따른다', () => {
    const song = insertBar(sample(), 'intro', 4);
    expect(song.sections.intro.bars[4]).toEqual({
      chord: { degree: 6, quality: 'minor' },
    });
  });

  it('마디 하나 복제는 바로 뒤에 같은 내용으로', () => {
    const song = duplicateBar(sample(), 'chorus', 4);
    const bars = song.sections.chorus.bars;
    expect(bars).toHaveLength(8);
    expect(bars[5]).toEqual(bars[4]);
    expect(bars[5]).not.toBe(bars[4]);
    expect(bars[5].spoken).toBe(true);
  });
});

describe('여러 줄 가사 나눠 넣기', () => {
  it('붙여 넣은 마디부터 한 줄씩 채운다', () => {
    const { song, filled, added } = distributeLyrics(
      sample(),
      'intro',
      1,
      '첫째 줄\n둘째 줄\r\n셋째 줄',
    );
    expect([filled, added]).toEqual([3, 0]);
    expect(song.sections.intro.bars.map((bar) => bar.lyric)).toEqual([
      undefined,
      '첫째 줄',
      '둘째 줄',
      '셋째 줄',
    ]);
  });

  it('줄이 남으면 마지막 코드로 마디를 덧붙인다', () => {
    const { song, added } = distributeLyrics(
      sample(),
      'intro',
      3,
      '가\n나\n다',
    );
    expect(added).toBe(2);
    const bars = song.sections.intro.bars;
    expect(bars).toHaveLength(6);
    expect(bars[5]).toEqual({
      chord: { degree: 6, quality: 'minor' },
      lyric: '다',
    });
  });

  it('앞뒤 빈 줄과 줄 끝 공백은 무시하고, 코드·말로는 유지한다', () => {
    const { song, filled } = distributeLyrics(
      sample(),
      'chorus',
      4,
      '\n\n  다른 대사  \n\n',
    );
    expect(filled).toBe(1);
    expect(song.sections.chorus.bars[4]).toEqual({
      chord: null,
      lyric: '다른 대사',
      spoken: true,
    });
  });

  it('빈 텍스트는 아무것도 바꾸지 않는다', () => {
    const original = sample();
    const result = distributeLyrics(original, 'verse', 0, '\n \n');
    expect(result).toEqual({ song: original, filled: 0, added: 0 });
  });
});

describe('마디에 어울리는 코드 추천', () => {
  it('앞 마디 코드 다음에 자주 오는 코드', () => {
    const bars = sample().sections.verse.bars;
    // 6마디(C) 앞은 5마디 G(I)
    const { previous, suggestions } = suggestChordsForBar(bars, 5, 'major');
    expect(previous).toEqual({ degree: 1, quality: 'major' });
    expect(
      suggestions.map((s) => `${s.chord.degree}${s.chord.quality}`),
    ).toEqual(['4major', '5major', '6minor', '2minor']);
  });

  it('섹션 첫 마디, 말로·N.C. 다음은 시작 후보', () => {
    const chorus = sample().sections.chorus.bars;
    expect(suggestChordsForBar(chorus, 0, 'major').previous).toBeNull();
    // 6마디 앞은 말로 마디
    const after = suggestChordsForBar(chorus, 5, 'major');
    expect(after.previous).toBeNull();
    expect(after.suggestions[0].chord).toEqual({ degree: 1, quality: 'major' });
  });
});
