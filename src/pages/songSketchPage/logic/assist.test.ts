import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { SongKey } from '../../../utils/pitch';
import { ShapeLookup } from '../../../utils/voicing';
import { Song, SongChord } from '../types';
import { capoOptions, playedChords, recommendCapo } from './capo';
import {
  DEFAULT_TRANSITIONS,
  suggestNextChords,
  transitionKey,
  validateTransitions,
} from './nextChords';
import { buildPlaybackBars } from './playback';
import { applyKeyAndCapo, materializeSong, setNextBarChord } from './songEdits';
import { readSongData } from './songIO';
import { buildTimeline } from './timeline';

const sample = (): Song => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'sample', 0);
};

const major = (tonic: string): SongKey => ({ tonic, mode: 'major' });
const chord = (degree: number, quality: SongChord['quality']): SongChord => ({
  degree,
  quality,
});
const I = chord(1, 'major');
const IV = chord(4, 'major');
const V = chord(5, 'major');
const vi = chord(6, 'minor');

describe('키·카포 계산기', () => {
  it('A로 부르고 싶으면 카포 2 + G 모양 (쉬운 코드 100%)', () => {
    const best = recommendCapo(playedChords(sample()), major('A'));
    expect(best).toMatchObject({ capo: 2, shapeLabel: 'G', easyRatio: 1 });
    expect(best.chordNames).toEqual(['Em', 'C', 'D', 'G']);
  });

  it('카포마다 모양 키와 비율을 계산한다', () => {
    const options = capoOptions([I, V, vi, IV], major('A'));
    expect(options).toHaveLength(8);
    // 카포 0: A E F#m D → F#m만 어렵다
    expect(options[0]).toMatchObject({ shapeLabel: 'A', easyRatio: 0.75 });
    // 카포 1: Ab 모양은 하나도 쉽지 않다
    expect(options[1]).toMatchObject({ shapeLabel: 'Ab', easyRatio: 0 });
  });

  it('비율이 같으면 카포가 낮은 쪽', () => {
    // I–IV만 쓰는 곡을 D로: 카포 0(D G)·5(A D)·7(G C) 모두 100% → 카포 0
    expect(recommendCapo([I, IV], major('D')).capo).toBe(0);
    // E로 부를 때 I–IV: 카포 0(E A) 100%, 카포 2(D G) 100%, 카포 4(C F) 50% → 카포 0
    expect(recommendCapo([I, IV], major('E')).capo).toBe(0);
    // F로 부를 때: 카포 0(F Bb) 0%, 카포 1(E A) 100% → 카포 1
    expect(recommendCapo([I, IV], major('F')).capo).toBe(1);
  });

  it('치는 코드는 order를 따르고 말로·N.C. 마디는 뺀다', () => {
    const chords = playedChords(sample());
    const bars = buildTimeline(sample());
    const spokenOrNc = bars.filter((b) => b.bar.spoken || !b.bar.chord).length;
    expect(chords).toHaveLength(bars.length - spokenOrNc);
  });

  it('추천을 적용해도 곡은 같은 키로 들린다', () => {
    const noShapes: ShapeLookup = () => null;
    const pitchClasses = (song: Song) =>
      buildPlaybackBars(song, buildTimeline(song), noShapes).map((bar) =>
        [...new Set(bar.strums.map((s) => s.midi % 12))].sort((a, b) => a - b),
      );
    const song = applyKeyAndCapo(sample(), 'A', 0);
    const best = recommendCapo(playedChords(song), song.key);
    const applied = applyKeyAndCapo(song, 'A', best.capo);
    expect(applied.capo).toBe(2);
    expect(pitchClasses(applied)).toEqual(pitchClasses(song));
  });
});

describe('다음 코드 추천', () => {
  it('전이 테이블 형식이 올바르다 (메이저·마이너)', () => {
    expect(validateTransitions(DEFAULT_TRANSITIONS)).toEqual([]);
  });

  it('테이블 키', () => {
    expect(transitionKey(null)).toBe('start');
    expect(transitionKey(V)).toBe('5');
    expect(transitionKey({ degree: 7, quality: 'major', accidental: -1 })).toBe(
      'b7',
    );
  });

  it('메이저 5도 다음은 1도(안정)가 가장 많고 비율 합은 1', () => {
    const suggestions = suggestNextChords(V, 'major');
    expect(suggestions[0]).toMatchObject({
      chord: I,
      tag: 'stable',
      tagLabel: '안정',
    });
    expect(suggestions.length).toBeLessThanOrEqual(4);
    const total = suggestions.reduce((sum, s) => sum + s.share, 0);
    expect(total).toBeCloseTo(1);
    expect(suggestions.some((s) => s.tagLabel === '애틋함')).toBe(true);
  });

  it('마이너 모드와 같은 코드 제외', () => {
    const suggestions = suggestNextChords(chord(1, 'minor'), 'minor');
    expect(suggestions[0].chord).toEqual(chord(6, 'major'));
    expect(
      suggestions.every(
        (s) => !(s.chord.degree === 1 && s.chord.quality === 'minor'),
      ),
    ).toBe(true);
  });

  it('N.C.나 테이블에 없는 코드 다음에는 시작 후보', () => {
    expect(suggestNextChords(null, 'major')[0].chord).toEqual(I);
    expect(
      suggestNextChords(
        { degree: 6, quality: 'major', accidental: -1 },
        'major',
      )[0].chord,
    ).toEqual(I);
  });

  it('클릭하면 다음 마디에 적용하고, 마지막 마디면 새 마디를 붙인다', () => {
    let song = setNextBarChord(sample(), 'intro', 0, V);
    expect(song.sections.intro.bars[1].chord).toEqual(V);
    song = setNextBarChord(song, 'intro', 3, I);
    expect(song.sections.intro.bars).toHaveLength(5);
    expect(song.sections.intro.bars[4]).toEqual({ chord: I });
    // 가사는 유지
    const verse = setNextBarChord(sample(), 'verse', 0, vi);
    expect(verse.sections.verse.bars[1]).toEqual({
      chord: vi,
      lyric: '연재분 정주행',
    });
  });
});
