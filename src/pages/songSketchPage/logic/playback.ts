import {
  DRUM_NOTES,
  DRUM_PATTERNS,
} from '../../../audio/metronome/drumPatterns';
import { MetronomeNote } from '../../../audio/metronome/types';
import { shapeKey } from '../../../utils/pitch';
import {
  ShapeLookup,
  midiToNoteName,
  voiceChord,
} from '../../../utils/voicing';
import { Song } from '../types';
import { SLOTS_PER_BAR, StrumNote, strumEvents } from './strum';
import { TimelineBar } from './timeline';

export const GUITAR_VOICE = 'guitar';
export const DRUM_VOICE_NAMES = ['kick', 'snare', 'hihat', 'tom', 'last'];
export const STEPS_PER_BEAT = 2; // 8분음표 칸

export interface PlaybackBar {
  spoken: boolean; // 반주·드럼 모두 쉰다
  strums: StrumNote[]; // N.C.면 비어 있고 드럼만 친다
}

/** 타임라인 마디마다 연주할 스트로크를 미리 계산한다. */
export function buildPlaybackBars(
  song: Song,
  timeline: TimelineBar[],
  lookup: ShapeLookup,
): PlaybackBar[] {
  const shape = shapeKey(song.key, song.capo);
  return timeline.map(({ bar, sectionId }) => {
    if (bar.spoken) return { spoken: true, strums: [] };
    if (!bar.chord) return { spoken: false, strums: [] };
    const voicing = voiceChord(bar.chord, shape, song.capo, lookup);
    return {
      spoken: false,
      strums: strumEvents(song.sections[sectionId].strum, voicing),
    };
  });
}

/** 한 칸(8분음표)에서 칠 드럼과 기타 음. */
export function notesAtStep(bar: PlaybackBar, step: number): MetronomeNote[] {
  if (bar.spoken) return [];
  const drum = DRUM_PATTERNS['8'][step % SLOTS_PER_BAR];
  const notes: MetronomeNote[] = drum ? [DRUM_NOTES[drum]] : [];
  for (const strum of bar.strums) {
    if (strum.slot !== step) continue;
    notes.push({
      voice: GUITAR_VOICE,
      pitch: midiToNoteName(strum.midi),
      durationBeats: strum.durationSlots / STEPS_PER_BEAT,
      velocity: strum.velocity,
      delaySeconds: strum.delayMs / 1000,
    });
  }
  return notes;
}
