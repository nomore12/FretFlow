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
import {
  MELODY_STEPS_PER_BAR,
  MELODY_STEPS_PER_BEAT,
  melodyPitchMidi,
} from './melody';
import { StrumNote, strumEvents } from './strum';
import { TimelineBar } from './timeline';

export const GUITAR_VOICE = 'guitar';
export const GUIDE_VOICE = 'guide';
export const MELODY_VOICE = 'melody';
const GUIDE_VELOCITY = 0.7;
const MELODY_VELOCITY = 0.8;
export const DRUM_VOICE_NAMES = ['kick', 'snare', 'hihat', 'tom', 'last'];
// 재생 격자는 멜로디에 맞춰 16분음표. 드럼·스트럼(8분)은 짝수 칸에서 친다.
export const STEPS_PER_BEAT = MELODY_STEPS_PER_BEAT;
const STEPS_PER_STRUM_SLOT = 2;
const STRUM_SLOT_BEATS = 0.5;

export interface PlaybackMelodyNote {
  step: number;
  length: number;
  midi: number;
}

export interface PlaybackBar {
  spoken: boolean; // 반주·드럼·멜로디 모두 쉰다
  strums: StrumNote[]; // N.C.면 비어 있고 드럼만 친다
  guide: number | null; // 가이드 톤 MIDI. 말로·N.C. 마디는 null
  melody: PlaybackMelodyNote[];
}

export interface StepOptions {
  guideTone?: boolean;
  melody?: boolean; // 멜로디를 함께 재생 (기본 켬)
  backing?: boolean; // 드럼·기타 반주 (끄면 멜로디만)
}

/** 타임라인 마디마다 연주할 스트로크·가이드 톤·멜로디를 미리 계산한다. */
export function buildPlaybackBars(
  song: Song,
  timeline: TimelineBar[],
  lookup: ShapeLookup,
): PlaybackBar[] {
  const shape = shapeKey(song.key, song.capo);
  return timeline.map(({ bar, sectionId, barIndex }) => {
    if (bar.spoken) {
      return { spoken: true, strums: [], guide: null, melody: [] };
    }
    const section = song.sections[sectionId];
    // 멜로디는 실제로 들리는 키 기준 (카포 무관)
    const melody = (section.melody ?? [])
      .filter((note) => note.bar === barIndex)
      .map((note) => ({
        step: note.step,
        length: note.length,
        midi: melodyPitchMidi(note, song.key),
      }));
    if (!bar.chord) return { spoken: false, strums: [], guide: null, melody };
    const voicing = voiceChord(bar.chord, shape, song.capo, lookup);
    return {
      spoken: false,
      strums: strumEvents(section.strum, voicing),
      guide: guideToneMidi(bar.chord, song.key),
      melody,
    };
  });
}

/** 한 칸(16분음표)에서 칠 드럼과 기타, 켜져 있으면 가이드 톤과 멜로디. */
export function notesAtStep(
  bar: PlaybackBar,
  step: number,
  { guideTone = false, melody = true, backing = true }: StepOptions = {},
): MetronomeNote[] {
  if (bar.spoken) return [];
  const notes: MetronomeNote[] = [];
  const onStrumSlot = step % STEPS_PER_STRUM_SLOT === 0;
  const slot = step / STEPS_PER_STRUM_SLOT;

  if (backing && onStrumSlot) {
    const drum = DRUM_PATTERNS['8'][slot];
    if (drum) notes.push(DRUM_NOTES[drum]);
  }
  if (guideTone && step === 0 && bar.guide !== null) {
    // 마디 내내 울려 그 위에서 음을 잡을 수 있게 한다.
    notes.push({
      voice: GUIDE_VOICE,
      pitch: midiToNoteName(bar.guide),
      durationBeats: MELODY_STEPS_PER_BAR / STEPS_PER_BEAT,
      velocity: GUIDE_VELOCITY,
    });
  }
  if (backing && onStrumSlot) {
    for (const strum of bar.strums) {
      if (strum.slot !== slot) continue;
      notes.push({
        voice: GUITAR_VOICE,
        pitch: midiToNoteName(strum.midi),
        durationBeats: strum.durationSlots * STRUM_SLOT_BEATS,
        velocity: strum.velocity,
        delaySeconds: strum.delayMs / 1000,
      });
    }
  }
  if (melody) {
    for (const note of bar.melody) {
      if (note.step !== step) continue;
      notes.push({
        voice: MELODY_VOICE,
        pitch: midiToNoteName(note.midi),
        durationBeats: note.length / STEPS_PER_BEAT,
        velocity: MELODY_VELOCITY,
      });
    }
  }
  return notes;
}
