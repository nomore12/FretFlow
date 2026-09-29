import React, { useEffect, useState } from 'react';
import useMetronome from '../../hooks/useMetronome';
import { FRETBOARD_VOICES } from '../../audio/metronome/voices';
import MetronomeControls from './MetronomeControls';

const Metronome: React.FC<{
  onCountdownChange?: (countdown: number | null) => void;
}> = ({ onCountdownChange }) => {
  const [bpm, setBpm] = useState(120);
  const [beatType, setBeatType] = useState(4);
  const { isBusy, countdown, start, stop, position, error } = useMetronome({
    bpm,
    beatsPerMeasure: 4,
    subdivisions: beatType === 16 ? 4 : beatType === 8 ? 2 : 1,
    voices: FRETBOARD_VOICES,
    getNote: ({ step }) =>
      step === 0
        ? { voice: 'strong', pitch: 'E3', durationBeats: 0.5 }
        : { voice: 'weak', durationBeats: 0.25 },
  });
  useEffect(() => {
    onCountdownChange?.(countdown);
  }, [countdown, onCountdownChange]);

  const count = position?.step ?? 0;

  return (
    <MetronomeControls
      bpm={bpm}
      maxBpm={240}
      onBpmChange={setBpm}
      beat={beatType}
      onBeatChange={setBeatType}
      isBusy={isBusy}
      onToggle={() => (isBusy ? stop() : void start(3))}
      status={
        countdown !== null
          ? `${countdown}초 후 시작`
          : isBusy
            ? `${count + 1} / ${beatType} 박`
            : '3초 카운트다운 후 시작'
      }
      error={error}
    />
  );
};

export default Metronome;
