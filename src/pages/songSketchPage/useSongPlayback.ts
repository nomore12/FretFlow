import { useMemo } from 'react';
import * as Tone from 'tone';
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
  GUIDE_VOICE,
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

/**
 * 오디오 시계 시각을 "스피커에서 실제로 들리는" performance.now() 시각으로 바꾼다.
 * 화면 콜백이 늦게 불려도 마디선 시각이 흔들리지 않는다.
 */
export function heardAtMs(audioTime: number): number {
  const context = Tone.getContext().rawContext as AudioContext;
  if (typeof context.getOutputTimestamp === 'function') {
    const { contextTime, performanceTime } = context.getOutputTimestamp();
    if (contextTime !== undefined && performanceTime) {
      return performanceTime + (audioTime - contextTime) * 1000;
    }
  }
  const latency = (context.outputLatency || 0) + (context.baseLatency || 0);
  return performance.now() + (audioTime - context.currentTime + latency) * 1000;
}

interface SongPlaybackOptions {
  song: Song;
  mode: PlaybackMode;
  sectionId: string | null; // 섹션 반복일 때
  drumVolumeDb: number;
  chordVolumeDb: number;
  guideTone?: boolean; // 마디 첫 박에 코드의 3음을 함께 울린다
  guideVolumeDb?: number;
  bpm?: number; // 테이크를 녹음 당시 템포로 반주할 때
  // 마디가 시작될 때 (첫 마디 포함). heardAt은 그 마디선이 들리는 performance.now() 시각.
  onBarStart?: (measure: number, heardAt: number) => void;
}

/** 섹션 반복 / 곡 전체 재생. 오디오 수명주기는 useMetronome이 맡는다. */
export default function useSongPlayback({
  song,
  mode,
  sectionId,
  drumVolumeDb,
  chordVolumeDb,
  guideTone = false,
  guideVolumeDb = 0,
  bpm = song.bpm,
  onBarStart,
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
      [GUIDE_VOICE]: toGainDb(guideVolumeDb),
    }),
    [drumVolumeDb, chordVolumeDb, guideVolumeDb],
  );

  const playback = useMetronome({
    bpm,
    beatsPerMeasure: 4,
    subdivisions: STEPS_PER_BEAT,
    voices: SONG_VOICES,
    voiceVolumesDb,
    // 모드나 반복할 섹션이 바뀌면 처음부터 다시 재생한다.
    sequenceKey: `${mode}:${mode === 'section' ? sectionId : ''}`,
    getNote: ({ measure, step }) => {
      if (bars.length === 0) return null;
      if (mode === 'song' && measure >= bars.length) return null;
      return notesAtStep(bars[measure % bars.length], step, { guideTone });
    },
    onTick: ({ measure, step }, time) => {
      if (step === 0) onBarStart?.(measure, heardAtMs(time));
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
    start: (countdownSeconds = COUNTDOWN_SECONDS) =>
      playback.start(countdownSeconds),
  };
}
