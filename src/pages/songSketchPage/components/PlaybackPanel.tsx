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
import { FiberManualRecord, PlayArrow, Stop } from '@mui/icons-material';
import { SongKey } from '../../../utils/pitch';
import { Song } from '../types';
import { chordLabel } from '../logic/chordSheet';
import { TimelineBar } from '../logic/timeline';
import { PlaybackMode, VOLUME_MIN_DB } from '../useSongPlayback';
import { RecorderStatus } from '../recording/TakeRecorder';
import { ChordShape } from './ChordPicker';

const VOLUME_MAX_DB = 0;

export interface RecordingControls {
  status: RecorderStatus;
  supported: boolean;
  error: string | null;
  blockedReason: string | null; // 지금 녹음할 수 없는 이유
  onRecord: () => void;
  onStopRecord: () => void;
  onClearError: () => void;
}

const RECORD_STATUS_TEXT: Record<RecorderStatus, string> = {
  idle: '',
  requesting: '마이크 확인 중…',
  armed: '다음 마디선부터 녹음합니다',
  recording: '녹음 중 · 정지하면 이 마디 끝에서 끝납니다',
  finishing: '이 마디 끝에서 녹음을 끝냅니다',
  saving: '저장 중…',
};

function RecordControls({ recording }: { recording: RecordingControls }) {
  const { status, supported, blockedReason } = recording;
  const active = status !== 'idle';
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {active ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            disabled={status === 'finishing' || status === 'saving'}
            onClick={recording.onStopRecord}
          >
            녹음 정지
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<FiberManualRecord sx={{ color: '#ff5a5f' }} />}
            disabled={!supported || blockedReason !== null}
            onClick={recording.onRecord}
          >
            녹음
          </Button>
        )}
        <Typography
          variant="body2"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontWeight: status === 'recording' ? 700 : 400,
          }}
        >
          {status === 'recording' && (
            <FiberManualRecord
              fontSize="small"
              sx={{
                color: '#ff5a5f',
                animation: 'songRecBlink 1s steps(2) infinite',
                '@keyframes songRecBlink': { '50%': { opacity: 0.2 } },
              }}
            />
          )}
          {active
            ? RECORD_STATUS_TEXT[status]
            : !supported
              ? '이 브라우저는 녹음을 지원하지 않습니다.'
              : blockedReason ??
                '버튼을 누른 뒤 오는 첫 마디가 테이크의 시작입니다.'}
        </Typography>
      </Stack>
      {recording.error && (
        <Alert severity="error" onClose={recording.onClearError}>
          {recording.error}
        </Alert>
      )}
    </Stack>
  );
}

interface PlaybackPanelProps {
  song: Song;
  shapeKey: SongKey;
  mode: PlaybackMode;
  sectionId: string | null;
  bpm: number;
  locked: boolean; // 녹음·테이크 재생 중에는 모드와 섹션을 바꾸지 않는다
  recording: RecordingControls;
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
  bpm,
  locked,
  recording,
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
          disabled={locked}
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
              disabled={locked}
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
        <Typography variant="body2">{bpm} BPM</Typography>
      </Stack>

      <RecordControls recording={recording} />

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
