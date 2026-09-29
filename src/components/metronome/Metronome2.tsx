import React, { useState } from 'react';
import useMetronome from '../../hooks/useMetronome';
import { FRETBOARD_VOICES } from '../../audio/metronome/voices';
import {
  Alert,
  Box,
  Button,
  Slider,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  const [beatType, setBeatType] = useState(4);
  const { isBusy, start, stop, position, error } = useMetronome({
    bpm,
    beatsPerMeasure: 4,
    subdivisions: beatType === 16 ? 4 : beatType === 8 ? 2 : 1,
    voices: FRETBOARD_VOICES,
    getNote: ({ step }) =>
      step === 0
        ? { voice: 'strong', pitch: 'E3', durationBeats: 0.5 }
        : { voice: 'weak', durationBeats: 0.25 },
  });
  const count = position?.step ?? 0;

  return (
    <Box
      sx={{
        width: 300,
        p: 3,
        textAlign: 'center',
        border: '1px solid #ddd',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6">Metronome</Typography>

      {/* BPM 조절 슬라이더 */}
      <Typography gutterBottom>BPM: {bpm}</Typography>
      <Slider
        value={bpm}
        onChange={(e, newValue) => setBpm(newValue as number)}
        min={40}
        max={240}
        step={1}
        aria-labelledby="bpm-slider"
      />

      {/* 비트 선택 드롭다운 */}
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Beat Type</InputLabel>
        <Select
          value={beatType}
          onChange={(e) => setBeatType(Number(e.target.value))}
        >
          <MenuItem value={4}>4비트</MenuItem>
          <MenuItem value={8}>8비트</MenuItem>
          <MenuItem value={16}>16비트</MenuItem>
        </Select>
      </FormControl>

      {/* 시작/스톱 버튼 */}
      <Button
        variant="contained"
        color={isBusy ? 'error' : 'primary'}
        onClick={() => (isBusy ? stop() : void start())}
        sx={{ mt: 3 }}
      >
        {isBusy ? 'Stop' : 'Start'}
      </Button>

      {error && <Alert severity="error">{error}</Alert>}

      {/* 현재 박자 표시 */}
      <Typography sx={{ mt: 2 }}>
        Count: {count + 1} / {beatType}
      </Typography>
    </Box>
  );
};

export default Metronome;
