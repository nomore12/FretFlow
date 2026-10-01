import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { ShapeLookup } from '../../../utils/voicing';
import { Song } from '../types';
import {
  GUIDE_VOICE,
  GUITAR_VOICE,
  buildPlaybackBars,
  notesAtStep,
} from './playback';
import { materializeSong } from './songEdits';
import { readSongData } from './songIO';
import { buildSectionTimeline } from './timeline';

const noShapes: ShapeLookup = () => null;

const sample = (): Song => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'sample', 0);
};

describe('마디 → 재생 음', () => {
  const song = sample();
  const chorus = buildPlaybackBars(
    song,
    buildSectionTimeline(song, 'chorus'),
    noShapes,
  );

  it('spoken 마디는 반주와 드럼을 모두 멈춘다', () => {
    expect(chorus[4].spoken).toBe(true);
    for (let step = 0; step < 8; step++) {
      expect(notesAtStep(chorus[4], step)).toEqual([]);
    }
  });

  it('다음 마디에서 다시 시작한다', () => {
    const notes = notesAtStep(chorus[5], 0);
    expect(notes.some((note) => note.voice === 'kick')).toBe(true);
    expect(notes.filter((note) => note.voice === GUITAR_VOICE)).toHaveLength(6);
  });

  it('N.C.(말로 아님)는 드럼만 친다', () => {
    const nc = { spoken: false, strums: [], guide: null };
    expect(notesAtStep(nc, 0).map((note) => note.voice)).toEqual(['kick']);
  });

  it('down8 섹션은 8분마다 다운 스트로크, 줄마다 늦게 친다', () => {
    const notes = notesAtStep(chorus[0], 1).filter(
      (note) => note.voice === GUITAR_VOICE,
    );
    // Em(E형 폴백): E2 B2 E3 G3 B3 E4
    expect(notes.map((note) => note.pitch)).toEqual([
      'E2',
      'B2',
      'E3',
      'G3',
      'B3',
      'E4',
    ]);
    expect(notes[1].delaySeconds).toBeGreaterThan(notes[0].delaySeconds!);
    expect(notes[0].durationBeats).toBe(0.5);
  });

  it('카포를 끼우면 모양 키로 보이싱하고 카포만큼 올려 재생한다', () => {
    const inA = {
      ...song,
      key: { tonic: 'A', mode: 'major' as const },
      capo: 2,
    };
    const bars = buildPlaybackBars(
      inA,
      buildSectionTimeline(inA, 'chorus'),
      noShapes,
    );
    const pitches = notesAtStep(bars[0], 0)
      .filter((note) => note.voice === GUITAR_VOICE)
      .map((note) => note.pitch);
    // Em 모양 + 2 = F#m
    expect(pitches).toEqual(['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4']);
  });
});

describe('가이드 톤 재생', () => {
  const song = sample();
  const chorus = buildPlaybackBars(
    song,
    buildSectionTimeline(song, 'chorus'),
    noShapes,
  );
  const guideNotes = (bar: (typeof chorus)[number], step: number, on = true) =>
    notesAtStep(bar, step, { guideTone: on }).filter(
      (note) => note.voice === GUIDE_VOICE,
    );

  it('켜면 마디 첫 박에만 한 마디 길이로 울린다', () => {
    // 후렴 1마디 Em (G 키) → 3음 G, 가운데 음역 G4
    expect(guideNotes(chorus[0], 0)).toEqual([
      expect.objectContaining({ pitch: 'G4', durationBeats: 4 }),
    ]);
    expect(guideNotes(chorus[0], 1)).toEqual([]);
  });

  it('끄면 울리지 않는다 (기본값)', () => {
    expect(guideNotes(chorus[0], 0, false)).toEqual([]);
    expect(
      notesAtStep(chorus[0], 0).some((note) => note.voice === GUIDE_VOICE),
    ).toBe(false);
  });

  it('말로 마디와 N.C. 마디는 울리지 않는다', () => {
    expect(chorus[4].guide).toBeNull();
    expect(guideNotes(chorus[4], 0)).toEqual([]);
  });
});
