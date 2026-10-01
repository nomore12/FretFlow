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
import { guideToneMidi } from './guideTone';
import { SLOTS_PER_BAR, StrumNote, strumEvents } from './strum';
import { TimelineBar } from './timeline';

export const GUITAR_VOICE = 'guitar';
export const GUIDE_VOICE = 'guide';
const GUIDE_VELOCITY = 0.7;
export const DRUM_VOICE_NAMES = ['kick', 'snare', 'hihat', 'tom', 'last'];
export const STEPS_PER_BEAT = 2; // 8분음표 칸

export interface PlaybackBar {
  spoken: boolean; // 반주·드럼 모두 쉰다
  strums: StrumNote[]; // N.C.면 비어 있고 드럼만 친다
  guide: number | null; // 가이드 톤 MIDI. 말로·N.C. 마디는 null
}

export interface StepOptions {
  guideTone?: boolean;
}

/** 타임라인 마디마다 연주할 스트로크를 미리 계산한다. */
export function buildPlaybackBars(
  song: Song,
  timeline: TimelineBar[],
  lookup: ShapeLookup,
): PlaybackBar[] {
  const shape = shapeKey(song.key, song.capo);
  return timeline.map(({ bar, sectionId }) => {
    if (bar.spoken) return { spoken: true, strums: [], guide: null };
    if (!bar.chord) return { spoken: false, strums: [], guide: null };
    const voicing = voiceChord(bar.chord, shape, song.capo, lookup);
    return {
      spoken: false,
      strums: strumEvents(song.sections[sectionId].strum, voicing),
      guide: guideToneMidi(bar.chord, song.key),
    };
  });
}

/** 한 칸(8분음표)에서 칠 드럼과 기타 음, 그리고 켜져 있으면 가이드 톤. */
export function notesAtStep(
  bar: PlaybackBar,
  step: number,
  { guideTone = false }: StepOptions = {},
): MetronomeNote[] {
  if (bar.spoken) return [];
  const drum = DRUM_PATTERNS['8'][step % SLOTS_PER_BAR];
  const notes: MetronomeNote[] = drum ? [DRUM_NOTES[drum]] : [];
  if (guideTone && step === 0 && bar.guide !== null) {
    // 마디 내내 울려 그 위에서 음을 잡을 수 있게 한다.
    notes.push({
      voice: GUIDE_VOICE,
      pitch: midiToNoteName(bar.guide),
      durationBeats: SLOTS_PER_BAR / STEPS_PER_BEAT,
      velocity: GUIDE_VELOCITY,
    });
  }
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
