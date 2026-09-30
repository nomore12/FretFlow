import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { transposeKey } from '../../../utils/pitch';
import { Song } from '../types';
import { buildChordSheet, chordSheetToText } from './chordSheet';
import {
  addSection,
  appendToOrder,
  applyProgression,
  duplicateBars,
  materializeSong,
  moveInOrder,
  removeFromOrder,
  removeSection,
  updateBar,
} from './songEdits';
import { parseSongJson, readSongData, serializeSong } from './songIO';
import { buildSectionTimeline, buildTimeline } from './timeline';

const loadSample = (): Song => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'sample', 0);
};

const sheetChords = (song: Song) =>
  buildChordSheet(song).blocks.map((block) =>
    block.bars.map((bar) => bar.chordName).join(' '),
  );

describe('timeline', () => {
  it('order를 펼치고 같은 섹션 반복을 orderIndex로 구분한다', () => {
    const song = loadSample();
    const timeline = buildTimeline(song);
    expect(timeline).toHaveLength(4 + 8 + 7 + 5 + 7);
    expect(timeline.map((bar) => bar.index)).toEqual(
      timeline.map((_, index) => index),
    );
    const choruses = timeline.filter((bar) => bar.sectionId === 'chorus');
    expect(new Set(choruses.map((bar) => bar.orderIndex))).toEqual(
      new Set([2, 4]),
    );
    expect(timeline[12]).toMatchObject({
      sectionId: 'chorus',
      barIndex: 0,
      orderIndex: 2,
    });
  });

  it('order에 없는 섹션 id는 건너뛴다', () => {
    const song = { ...loadSample(), order: ['intro', 'ghost', 'intro'] };
    expect(buildTimeline(song)).toHaveLength(8);
  });

  it('섹션 루프 타임라인', () => {
    const bars = buildSectionTimeline(loadSample(), 'chorus');
    expect(bars.map((bar) => bar.barIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(bars[4].bar.spoken).toBe(true);
  });
});

describe('코드 악보', () => {
  it('샘플 곡은 G 키 코드로 표시된다', () => {
    expect(sheetChords(loadSample())).toEqual([
      'Em C D Em',
      'G C D G G C D G',
      'Em C D Em N.C. G N.C.',
      'Em C Em C D',
      'Em C D Em N.C. G N.C.',
    ]);
  });

  it('키를 G → A로 바꾸면 모든 코드가 전조된다', () => {
    const song = loadSample();
    const inA = { ...song, key: transposeKey(song.key, 2) };
    expect(inA.key.tonic).toBe('A');
    expect(sheetChords(inA)[1]).toBe('A D E A A D E A');
    expect(sheetChords(inA)[2]).toBe('F#m D E F#m N.C. A N.C.');
  });

  it('A 키 카포 2는 G 모양으로 보이고 실제 키는 A', () => {
    const song = loadSample();
    const sheet = buildChordSheet({
      ...song,
      key: { tonic: 'A', mode: 'major' },
      capo: 2,
    });
    expect(sheet.actualKey).toBe('A');
    expect(sheet.shapeKey).toBe('G');
    expect(
      sheetChords({ ...song, key: { tonic: 'A', mode: 'major' }, capo: 2 }),
    ).toEqual(sheetChords(song));
  });

  it('텍스트 복사는 코드 줄 / 가사 줄 형식이고 spoken에 (말로)를 붙인다', () => {
    const text = chordSheetToText(buildChordSheet(loadSample()));
    const lines = text.split('\n');
    expect(lines[0]).toBe('나는 화산의 검객');
    expect(lines[1]).toBe('카포 0, 실제 키 G');
    // 인트로는 가사가 없어 코드 줄만 있다
    expect(lines.slice(3, 5)).toEqual(['[인트로]', 'Em  C  D  Em']);
    expect(text).toContain('(말로) 이번 정거장은 을지로, 을지로입니다');
    // 한글은 두 칸으로 계산해 코드가 가사 시작 위치에 맞는다
    const verseChords = lines[lines.indexOf('[벌스]') + 1];
    const verseLyrics = lines[lines.indexOf('[벌스]') + 2];
    expect(verseLyrics.startsWith('새벽 두 시 반까지')).toBe(true);
    const lyricWidth = '새벽 두 시 반까지'.length + 7; // 한글 7자는 두 칸
    expect(verseChords.indexOf('C')).toBe(lyricWidth + 2);
  });
});

describe('곡 편집', () => {
  it('같은 섹션을 order에 여러 번 넣고, 옮기고, 뺄 수 있다', () => {
    let song = loadSample();
    song = appendToOrder(song, 'verse');
    expect(song.order.slice(-2)).toEqual(['chorus', 'verse']);
    song = moveInOrder(song, song.order.length - 1, 0);
    expect(song.order[0]).toBe('verse');
    song = removeFromOrder(song, 0);
    expect(song.order).toEqual(loadSample().order);
  });

  it('섹션을 지우면 order에서도 모두 빠진다', () => {
    const song = removeSection(loadSample(), 'chorus');
    expect(song.sections.chorus).toBeUndefined();
    expect(song.order).toEqual(['intro', 'verse', 'bridge']);
  });

  it('새 섹션은 종류 이름에 번호를 붙여 order 끝에 추가된다', () => {
    const song = addSection(loadSample(), 'verse', 'v2');
    expect(song.sections.v2.name).toBe('벌스 2');
    expect(song.order[song.order.length - 1]).toBe('v2');
  });

  it('마디 전체 복제(×2)', () => {
    const song = duplicateBars(loadSample(), 'bridge');
    expect(song.sections.bridge.bars).toHaveLength(10);
    expect(song.sections.bridge.bars[5]).toEqual(song.sections.bridge.bars[0]);
    expect(song.sections.bridge.bars[5]).not.toBe(song.sections.bridge.bars[0]);
  });

  it('프리셋 적용은 마디 수를 맞추고 겹치는 가사를 유지한다', () => {
    const song = applyProgression(loadSample(), 'intro', [
      { degree: 1, quality: 'major' },
      { degree: 7, quality: 'major', accidental: -1 },
    ]);
    expect(song.sections.intro.bars).toEqual([
      { chord: { degree: 1, quality: 'major' } },
      { chord: { degree: 7, quality: 'major', accidental: -1 } },
    ]);
    const verse = applyProgression(loadSample(), 'verse', [
      { degree: 6, quality: 'minor' },
    ]);
    expect(verse.sections.verse.bars).toEqual([
      { chord: { degree: 6, quality: 'minor' }, lyric: '새벽 두 시 반까지' },
    ]);
  });

  it('빈 가사와 꺼진 spoken은 저장하지 않는다', () => {
    let song = updateBar(loadSample(), 'chorus', 4, {
      lyric: '',
      spoken: false,
    });
    expect(song.sections.chorus.bars[4]).toEqual({ chord: null });
    song = updateBar(song, 'chorus', 4, {
      chord: { degree: 2, quality: 'm7' },
    });
    expect(song.sections.chorus.bars[4].chord).toEqual({
      degree: 2,
      quality: 'm7',
    });
  });

  it('편집은 원본을 바꾸지 않는다', () => {
    const song = loadSample();
    const before = JSON.stringify(song);
    duplicateBars(song, 'verse');
    updateBar(song, 'verse', 0, { lyric: '바뀜' });
    removeSection(song, 'intro');
    expect(JSON.stringify(song)).toBe(before);
  });
});

describe('내보내기·가져오기', () => {
  it('내보낸 JSON을 다시 가져오면 같은 곡이 된다 (id·시각 제외)', () => {
    const song = loadSample();
    const json = serializeSong(song);
    expect(json).not.toContain('"id": "sample"');
    const result = parseSongJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(materializeSong(result.data, 'sample', 0)).toEqual(song);
    }
  });

  it('schemaVersion이 다르면 거부한다', () => {
    const data = { ...sampleSongs[0], schemaVersion: 2 };
    const result = parseSongJson(JSON.stringify(data));
    expect(result).toEqual({
      ok: false,
      error: '지원하지 않는 곡 파일 버전입니다 (파일: 2, 지원: 1).',
    });
  });

  it('잘못된 파일을 이유와 함께 거부한다', () => {
    expect(parseSongJson('{').ok).toBe(false);
    const badChord = structuredClone(sampleSongs[0]) as any;
    badChord.sections.verse.bars[0].chord = { degree: 9, quality: 'major' };
    const result = readSongData(badChord);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('섹션 verse 1마디');
    const badOrder = { ...sampleSongs[0], order: ['intro', 'nope'] };
    expect(readSongData(badOrder)).toEqual({
      ok: false,
      error: '재생 순서에 없는 섹션이 있습니다: nope',
    });
  });
});
