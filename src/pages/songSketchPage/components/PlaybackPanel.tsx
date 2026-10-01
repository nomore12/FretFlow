import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  FiberManualRecord,
  PlayArrow,
  Stop,
  VolumeUp,
} from '@mui/icons-material';
import { SongKey } from '../../../utils/pitch';
import { Song } from '../types';
import { NO_CHORD, SPOKEN_MARK, chordLabel } from '../logic/chordSheet';
import { TimelineBar } from '../logic/timeline';
import { PlaybackMode, VOLUME_MIN_DB } from '../useSongPlayback';
import { RecorderStatus } from '../recording/TakeRecorder';
import { ChordShape } from './ChordPicker';

const VOLUME_MAX_DB = 0;
// 재생 전후로 높이가 바뀌어 아래 편집기가 밀리지 않도록 지금 연주 줄의 높이를 고정한다.
const NOW_PLAYING_HEIGHT = 72;
const MINI_SHAPE_SCALE = 0.45;

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

function RecordButton({ recording }: { recording: RecordingControls }) {
  const { status, supported, blockedReason } = recording;
  const active = status !== 'idle';
  const hint = active
    ? RECORD_STATUS_TEXT[status]
    : !supported
      ? '이 브라우저는 녹음을 지원하지 않습니다.'
      : blockedReason ?? '버튼을 누른 뒤 오는 첫 마디가 테이크의 시작입니다.';

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ minWidth: 0, flex: '1 1 220px' }}
    >
      {active ? (
        <Button
          size="small"
          variant="contained"
          color="error"
          startIcon={<Stop />}
          disabled={status === 'finishing' || status === 'saving'}
          onClick={recording.onStopRecord}
          sx={{ flexShrink: 0 }}
        >
          녹음 정지
        </Button>
      ) : (
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<FiberManualRecord sx={{ color: '#ff5a5f' }} />}
          disabled={!supported || blockedReason !== null}
          onClick={recording.onRecord}
          sx={{ flexShrink: 0 }}
        >
          녹음
        </Button>
      )}
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
      <Tooltip title={hint}>
        <Typography
          variant="caption"
          noWrap
          sx={{
            minWidth: 0,
            opacity: active ? 1 : 0.85,
            fontWeight: status === 'recording' ? 700 : 400,
          }}
        >
          {hint}
        </Typography>
      </Tooltip>
    </Stack>
  );
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
    <Box>
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

/** 지금(또는 다음) 마디의 코드와 가사. 말로 하는 마디는 코드 대신 (말로). */
function BarLine({
  song,
  shapeKey,
  bar,
  label,
  emphasis,
}: {
  song: Song;
  shapeKey: SongKey;
  bar: TimelineBar;
  label: string;
  emphasis: boolean;
}) {
  const chord = bar.bar.spoken
    ? SPOKEN_MARK
    : chordLabel(bar.bar.chord, shapeKey);
  const lyric = bar.bar.lyric ?? '';
  const showShape = emphasis && !bar.bar.spoken && chord !== NO_CHORD;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      alignItems="center"
      sx={{ minWidth: 0, opacity: emphasis ? 1 : 0.75 }}
    >
      {showShape && (
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            bgcolor: 'white',
            borderRadius: 1,
          }}
        >
          <ChordShape name={chord} scale={MINI_SHAPE_SCALE} focused />
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" noWrap sx={{ display: 'block' }}>
          {label} · {song.sections[bar.sectionId]?.name} {bar.barIndex + 1}마디
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="baseline">
          <Typography
            noWrap
            sx={{
              fontWeight: 800,
              fontSize: emphasis ? '1.5rem' : '1.1rem',
              lineHeight: 1.2,
              flexShrink: 0,
              fontStyle: bar.bar.spoken ? 'italic' : 'normal',
            }}
          >
            {chord}
          </Typography>
          <Typography
            noWrap
            sx={{
              minWidth: 0,
              fontSize: emphasis ? '1.15rem' : '0.95rem',
              fontWeight: emphasis ? 600 : 400,
              fontStyle: bar.bar.spoken ? 'italic' : 'normal',
            }}
          >
            {lyric || ' '}
          </Typography>
        </Stack>
      </Box>
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
  const [volumeAnchor, setVolumeAnchor] = useState<HTMLElement | null>(null);

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Button
          size="small"
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
              py: 0.25,
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="loop-section">반복할 섹션</InputLabel>
            <Select
              labelId="loop-section"
              label="반복할 섹션"
              disabled={locked}
              value={sectionId ?? ''}
              onChange={(event) => onSectionChange(event.target.value)}
              sx={{ '& .MuiSelect-select': { py: 0.75 } }}
            >
              {sections.map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {bpm} BPM
        </Typography>
        <Tooltip title="드럼·코드 음량">
          <IconButton
            size="small"
            color="inherit"
            aria-label="음량"
            onClick={(event) => setVolumeAnchor(event.currentTarget)}
          >
            <VolumeUp fontSize="small" />
          </IconButton>
        </Tooltip>
        <RecordButton recording={recording} />
      </Stack>

      <Popover
        open={volumeAnchor !== null}
        anchorEl={volumeAnchor}
        onClose={() => setVolumeAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1} sx={{ p: 2, width: 240 }}>
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
      </Popover>

      {error && <Alert severity="error">{error}</Alert>}
      {recording.error && (
        <Alert severity="error" onClose={recording.onClearError}>
          {recording.error}
        </Alert>
      )}

      <Box
        sx={{
          height: { xs: 'auto', sm: NOW_PLAYING_HEIGHT },
          minHeight: { xs: 56 },
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: '3fr 2fr' },
          alignItems: 'center',
          gap: { xs: 0.5, sm: 2 },
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,.12)',
        }}
      >
        {isPlaying && current ? (
          <>
            <BarLine
              song={song}
              shapeKey={shapeKey}
              bar={current}
              label="지금"
              emphasis
            />
            {next ? (
              <BarLine
                song={song}
                shapeKey={shapeKey}
                bar={next}
                label="다음"
                emphasis={false}
              />
            ) : (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                마지막 마디입니다
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            재생하면 지금 칠 코드와 가사, 다음 마디가 여기에 나옵니다.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
