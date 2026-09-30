import React from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import { SongKey } from '../../../utils/pitch';
import { Song } from '../types';
import { chordLabel } from '../logic/chordSheet';
import { TimelineBar } from '../logic/timeline';
import { PlaybackMode, VOLUME_MIN_DB } from '../useSongPlayback';
import { ChordShape } from './ChordPicker';

const VOLUME_MAX_DB = 0;

interface PlaybackPanelProps {
  song: Song;
  shapeKey: SongKey;
  mode: PlaybackMode;
  sectionId: string | null;
  drumVolumeDb: number;
  chordVolumeDb: number;
  isBusy: boolean;
  isPlaying: boolean;
  error: string | null;
  current: TimelineBar | null;
  next: TimelineBar | null;
  onModeChange: (mode: PlaybackMode) => void;
  onSectionChange: (sectionId: string) => void;
  onDrumVolumeChange: (db: number) => void;
  onChordVolumeChange: (db: number) => void;
  onStart: () => void;
  onStop: () => void;
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (db: number) => void;
}) {
  return (
    <Box sx={{ minWidth: 160, flex: 1 }}>
      <Typography variant="caption">
        {label} {value <= VOLUME_MIN_DB ? '꺼짐' : `${value} dB`}
      </Typography>
      <Slider
        size="small"
        min={VOLUME_MIN_DB}
        max={VOLUME_MAX_DB}
        value={value}
        onChange={(_, db) => onChange(db as number)}
        aria-label={`${label} 음량`}
      />
    </Box>
  );
}

export default function PlaybackPanel({
  song,
  shapeKey,
  mode,
  sectionId,
  drumVolumeDb,
  chordVolumeDb,
  isBusy,
  isPlaying,
  error,
  current,
  next,
  onModeChange,
  onSectionChange,
  onDrumVolumeChange,
  onChordVolumeChange,
  onStart,
  onStop,
}: PlaybackPanelProps) {
  const sections = Object.values(song.sections);
  const currentSection = current ? song.sections[current.sectionId] : null;

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Button
          variant="contained"
          color={isBusy ? 'error' : 'inherit'}
          startIcon={isBusy ? <Stop /> : <PlayArrow />}
          onClick={isBusy ? onStop : onStart}
          sx={isBusy ? undefined : { color: '#5b4a9e' }}
        >
          {isBusy ? '정지' : '재생'}
        </Button>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value: PlaybackMode | null) => {
            if (value) onModeChange(value);
          }}
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,.8)',
              borderColor: 'rgba(255,255,255,.4)',
            },
            '& .MuiToggleButton-root.Mui-selected': {
              color: 'white',
              bgcolor: 'rgba(255,255,255,.2)',
            },
          }}
        >
          <ToggleButton value="section">섹션 반복</ToggleButton>
          <ToggleButton value="song">곡 전체</ToggleButton>
        </ToggleButtonGroup>
        {mode === 'section' && (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="loop-section">반복할 섹션</InputLabel>
            <Select
              labelId="loop-section"
              label="반복할 섹션"
              value={sectionId ?? ''}
              onChange={(event) => onSectionChange(event.target.value)}
            >
              {sections.map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="body2">{song.bpm} BPM</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
        <VolumeSlider
          label="드럼"
          value={drumVolumeDb}
          onChange={onDrumVolumeChange}
        />
        <VolumeSlider
          label="코드"
          value={chordVolumeDb}
          onChange={onChordVolumeChange}
        />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* 재생 전후로 높이가 바뀌어 아래 편집기가 밀리지 않도록 자리를 항상 둔다. */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ minHeight: 132 }}
      >
        {isPlaying && current && currentSection ? (
          <>
            <Box>
              <Typography variant="caption" sx={{ display: 'block' }}>
                지금 · {currentSection.name} {current.barIndex + 1}마디
              </Typography>
              {current.bar.spoken ? (
                <Typography fontStyle="italic">(말로)</Typography>
              ) : (
                <ChordShape
                  name={chordLabel(current.bar.chord, shapeKey)}
                  focused
                />
              )}
            </Box>
            {next && (
              <Box sx={{ opacity: 0.75 }}>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  다음
                </Typography>
                {next.bar.spoken ? (
                  <Typography fontStyle="italic">(말로)</Typography>
                ) : (
                  <ChordShape name={chordLabel(next.bar.chord, shapeKey)} />
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            재생하면 지금 칠 코드와 다음 코드가 여기에 나옵니다.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
