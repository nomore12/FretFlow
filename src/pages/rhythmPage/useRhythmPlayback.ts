import { useMemo } from 'react';
import { Bar, RhythmEvent } from './types';
import { SLOTS_PER_BEAT } from './rhythmUtils';
import useMetronome from '../../hooks/useMetronome';
import { RHYTHM_VOICES } from '../../audio/metronome/voices';

export interface ActivePosition {
  barIndex: number;
  beatIndex: number;
  slotInBeat: number;
  slotIndex: number;
}

interface UseRhythmPlaybackOptions {
  bars: Bar[];
  beatsPerBar: number;
  bpm: number;
  restAccentEnabled: boolean;
}

const useRhythmPlayback = ({
  bars,
  beatsPerBar,
  bpm,
  restAccentEnabled,
}: UseRhythmPlaybackOptions) => {
  const slotsPerBar = beatsPerBar * SLOTS_PER_BEAT;
  const totalSlots = slotsPerBar * bars.length;
  const slotEventMap = useMemo(() => {
    const map = new Map<number, RhythmEvent[]>();
    bars.forEach((bar, barIndex) => {
      bar.events.forEach((event) => {
        const slotIndex = barIndex * slotsPerBar + event.start;
        const events = map.get(slotIndex) ?? [];
        events.push(event);
        map.set(slotIndex, events);
      });
    });
    return map;
  }, [bars, slotsPerBar]);

  const playback = useMetronome({
    bpm,
    volumeDb: 18,
    beatsPerMeasure: beatsPerBar,
    subdivisions: 4,
    voices: RHYTHM_VOICES,
    sequenceKey: bars,
    getNote: ({ tick }) => {
      const events = slotEventMap.get(tick % totalSlots) ?? [];
      if (events.some((event) => event.kind === 'note')) {
        return {
          voice: 'note',
          pitch: 'E1',
          durationBeats: 0.25,
          velocity: 0.8,
        };
      }
      if (restAccentEnabled && events.some((event) => event.kind === 'rest')) {
        return { voice: 'rest', durationBeats: 0.25, velocity: 0.5 };
      }
      return null;
    },
  });

  const slotIndex = (playback.position?.tick ?? 0) % totalSlots;
  const slotInBar = slotIndex % slotsPerBar;
  const activePosition: ActivePosition | null =
    playback.position && totalSlots > 0
      ? {
          barIndex: Math.floor(slotIndex / slotsPerBar),
          beatIndex: Math.floor(slotInBar / SLOTS_PER_BEAT),
          slotInBeat: slotInBar % SLOTS_PER_BEAT,
          slotIndex,
        }
      : null;

  return { ...playback, activePosition };
};

export default useRhythmPlayback;
