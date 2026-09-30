import { useMemo } from 'react';
import useMetronome from '../../hooks/useMetronome';
import { SONG_VOICES } from '../../audio/metronome/voices';
import {
  DifficultyLevel,
  getChordData,
} from '../../utils/chordProgressionGenerator';
import { ChordShapeData, ShapeLookup } from '../../utils/voicing';
import { Song } from './types';
import {
  DRUM_VOICE_NAMES,
  GUITAR_VOICE,
  STEPS_PER_BEAT,
  buildPlaybackBars,
  notesAtStep,
} from './logic/playback';
import {
  TimelineBar,
  buildSectionTimeline,
  buildTimeline,
} from './logic/timeline';

export type PlaybackMode = 'section' | 'song';

export const COUNTDOWN_SECONDS = 3;
export const VOLUME_MIN_DB = -30; // 슬라이더 최솟값 = 끔

const toGainDb = (db: number) => (db <= VOLUME_MIN_DB ? -Infinity : db);

// 운지 조회는 코드 생성 로그가 많아 이름별로 한 번만 한다.
const shapeCache = new Map<string, ChordShapeData | null>();
const lookupShape: ShapeLookup = (name) => {
  if (!shapeCache.has(name)) {
    shapeCache.set(name, getChordData(name, DifficultyLevel.WITH_SPECIAL));
  }
  return shapeCache.get(name)!;
};

interface SongPlaybackOptions {
  song: Song;
  mode: PlaybackMode;
  sectionId: string | null; // 섹션 반복일 때
  drumVolumeDb: number;
  chordVolumeDb: number;
}

/** 섹션 반복 / 곡 전체 재생. 오디오 수명주기는 useMetronome이 맡는다. */
export default function useSongPlayback({
  song,
  mode,
  sectionId,
  drumVolumeDb,
  chordVolumeDb,
}: SongPlaybackOptions) {
  const timeline: TimelineBar[] = useMemo(
    () =>
      mode === 'section'
        ? sectionId
          ? buildSectionTimeline(song, sectionId)
          : []
        : buildTimeline(song),
    [song, mode, sectionId],
  );
  const bars = useMemo(
    () => buildPlaybackBars(song, timeline, lookupShape),
    [song, timeline],
  );
  const voiceVolumesDb = useMemo(
    () => ({
      ...Object.fromEntries(
        DRUM_VOICE_NAMES.map((name) => [name, toGainDb(drumVolumeDb)]),
      ),
      [GUITAR_VOICE]: toGainDb(chordVolumeDb),
    }),
    [drumVolumeDb, chordVolumeDb],
  );

  const playback = useMetronome({
    bpm: song.bpm,
    beatsPerMeasure: 4,
    subdivisions: STEPS_PER_BEAT,
    voices: SONG_VOICES,
    voiceVolumesDb,
    // 모드나 반복할 섹션이 바뀌면 처음부터 다시 재생한다.
    sequenceKey: `${mode}:${mode === 'section' ? sectionId : ''}`,
    getNote: ({ measure, step }) => {
      if (bars.length === 0) return null;
      if (mode === 'song' && measure >= bars.length) return null;
      return notesAtStep(bars[measure % bars.length], step);
    },
    onMeasureComplete: (completed) => {
      // 곡 전체 재생은 마지막 마디가 끝나면 멈춘다.
      if (mode === 'song' && completed >= bars.length) playback.stop();
    },
  });

  const measure = playback.position?.measure;
  const current =
    measure === undefined || timeline.length === 0
      ? null
      : mode === 'song' && measure >= timeline.length
        ? null
        : timeline[measure % timeline.length];
  const next =
    current && timeline.length > 0
      ? mode === 'song' && current.index + 1 >= timeline.length
        ? null
        : timeline[(current.index + 1) % timeline.length]
      : null;

  return {
    ...playback,
    timeline,
    current,
    next,
    start: () => playback.start(COUNTDOWN_SECONDS),
  };
}
