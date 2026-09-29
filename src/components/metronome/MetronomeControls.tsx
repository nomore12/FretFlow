import React, { useId } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';

interface Props {
  bpm: number;
  maxBpm: number;
  onBpmChange: (value: number) => void;
  beat: number;
  onBeatChange: (value: number) => void;
  volume?: number;
  onVolumeChange?: (value: number) => void;
  isBusy: boolean;
  onToggle: () => void;
  status: string;
  error: string | null;
}

export default function MetronomeControls({
  bpm,
  maxBpm,
  onBpmChange,
  beat,
  onBeatChange,
  volume,
  onVolumeChange,
  isBusy,
  onToggle,
  status,
  error,
}: Props) {
  const id = useId();
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
      >
        <Typography component="h2" fontWeight={600}>
          메트로놈
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {status}
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Box sx={{ flex: 1, minWidth: 100, px: 1 }}>
          <Typography id={`${id}-bpm`} variant="body2" gutterBottom>
            BPM: {bpm}
          </Typography>
          <Slider
            aria-labelledby={`${id}-bpm`}
            value={bpm}
            onChange={(_, value) => onBpmChange(value as number)}
            min={40}
            max={maxBpm}
            valueLabelDisplay="auto"
          />
        </Box>
        {volume !== undefined && onVolumeChange && (
          <Box sx={{ flex: 1, minWidth: 100, px: 1 }}>
            <Typography id={`${id}-volume`} variant="body2" gutterBottom>
              볼륨: {volume}
            </Typography>
            <Slider
              aria-labelledby={`${id}-volume`}
              value={volume}
              onChange={(_, value) => onVolumeChange(value as number)}
              min={0}
              max={30}
              valueLabelDisplay="auto"
            />
          </Box>
        )}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id={`${id}-beat`}>비트</InputLabel>
          <Select
            labelId={`${id}-beat`}
            label="비트"
            value={beat}
            onChange={(event) => onBeatChange(Number(event.target.value))}
          >
            {[4, 8, 16].map((value) => (
              <MenuItem key={value} value={value}>
                {value}비트
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          color={isBusy ? 'error' : 'success'}
          startIcon={isBusy ? <Stop /> : <PlayArrow />}
          onClick={onToggle}
          sx={{ minWidth: 120, minHeight: 44, fontWeight: 600, boxShadow: 3 }}
        >
          {isBusy ? '정지' : '시작'}
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
