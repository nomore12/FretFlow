import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Slider,
  Typography,
} from '@mui/material';
import {
  Delete,
  PlayArrow,
  QueueMusic,
  Star,
  StarBorder,
  Stop,
} from '@mui/icons-material';
import { Song } from '../types';
import {
  SYNC_OFFSET_LIMIT_MS,
  SYNC_OFFSET_STEP_MS,
  Take,
  TakePatch,
  formatDuration,
  groupTakes,
} from '../recording/takes';
import { TakePlayMode } from '../recording/useTakePlayer';

interface TakesPanelProps {
  song: Song;
  takes: Take[];
  error: string | null;
  usage: { usage: number; quota: number } | null;
  playingId: string | null;
  playingMode: TakePlayMode | null;
  onPlay: (take: Take, mode: TakePlayMode) => void;
  onStop: () => void;
  onUpdate: (id: string, patch: TakePatch) => void;
  onDelete: (id: string) => void;
  onClearError: () => void;
}

const formatTime = (time: number) =>
  new Date(time).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

export function syncLabel(ms: number) {
  if (ms === 0) return '싱크 0ms';
  return `싱크 ${ms > 0 ? '+' : ''}${ms}ms (목소리 ${ms > 0 ? '늦게' : '앞당김'})`;
}

/** 반주와 함께 들을 때 목소리 위치를 ±200ms 안에서 10ms 단위로 맞춘다. */
function SyncOffsetSlider({
  take,
  onSave,
}: {
  take: Take;
  onSave: (syncOffsetMs: number) => void;
}) {
  const [value, setValue] = useState(take.syncOffsetMs);
  useEffect(() => setValue(take.syncOffsetMs), [take.syncOffsetMs]);
  return (
    <Tooltip title="반주와 함께 들을 때 목소리가 박자보다 빠르거나 느리면 조절하세요. 다음 재생부터 반영됩니다.">
      <Box sx={{ width: 190, px: 1, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ display: 'block' }}>
          {syncLabel(value)}
        </Typography>
        <Slider
          size="small"
          min={-SYNC_OFFSET_LIMIT_MS}
          max={SYNC_OFFSET_LIMIT_MS}
          step={SYNC_OFFSET_STEP_MS}
          marks={[{ value: 0 }]}
          value={value}
          aria-label="싱크 보정"
          onChange={(_, next) => setValue(next as number)}
          onChangeCommitted={(_, next) => {
            if (next !== take.syncOffsetMs) onSave(next as number);
          }}
        />
      </Box>
    </Tooltip>
  );
}

function MemoField({
  take,
  onSave,
}: {
  take: Take;
  onSave: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(take.memo);
  useEffect(() => setMemo(take.memo), [take.memo]);
  return (
    <TextField
      size="small"
      placeholder="메모"
      value={memo}
      onChange={(event) => setMemo(event.target.value)}
      onBlur={() => {
        if (memo !== take.memo) onSave(memo);
      }}
      sx={{ flex: 1, minWidth: 160 }}
    />
  );
}

export default function TakesPanel({
  song,
  takes,
  error,
  usage,
  playingId,
  playingMode,
  onPlay,
  onStop,
  onUpdate,
  onDelete,
  onClearError,
}: TakesPanelProps) {
  const [deleting, setDeleting] = useState<Take | null>(null);
  const groups = groupTakes(takes, song);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h6">테이크</Typography>
        {usage && usage.quota > 0 && (
          <Typography variant="caption" color="text.secondary">
            브라우저 저장소 {megabytes(usage.usage)} / {megabytes(usage.quota)}{' '}
            사용
          </Typography>
        )}
      </Stack>
      {error && (
        <Alert severity="error" onClose={onClearError}>
          {error}
        </Alert>
      )}
      {groups.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          섹션 반복 재생 중에 녹음 버튼을 누르면 흥얼거림이 섹션별로 저장됩니다.
        </Typography>
      )}
      {groups.map((group) => (
        <Box key={group.sectionId}>
          <Typography
            variant="subtitle2"
            color={group.deleted ? 'text.secondary' : 'text.primary'}
            gutterBottom
          >
            {group.name} · {group.takes.length}개
          </Typography>
          <Stack spacing={1}>
            {group.takes.map((take) => {
              const isPlaying = playingId === take.id;
              return (
                <Stack
                  key={take.id}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: isPlaying ? '#f0edff' : 'rgba(255,255,255,.7)',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={take.starred ? '별표 해제' : '별표'}>
                      <IconButton
                        size="small"
                        aria-label="별표"
                        onClick={() =>
                          onUpdate(take.id, { starred: !take.starred })
                        }
                      >
                        {take.starred ? (
                          <Star sx={{ color: '#f5a623' }} />
                        ) : (
                          <StarBorder />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" sx={{ minWidth: 190 }}>
                      {formatTime(take.createdAt)} ·{' '}
                      {formatDuration(take.durationMs)} · {take.bpm} BPM
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={
                        isPlaying && playingMode === 'solo'
                          ? 'contained'
                          : 'outlined'
                      }
                      startIcon={
                        isPlaying && playingMode === 'solo' ? (
                          <Stop />
                        ) : (
                          <PlayArrow />
                        )
                      }
                      onClick={() =>
                        isPlaying && playingMode === 'solo'
                          ? onStop()
                          : onPlay(take, 'solo')
                      }
                    >
                      듣기
                    </Button>
                    <Tooltip
                      title={
                        group.deleted
                          ? '섹션이 지워져 반주를 함께 틀 수 없습니다.'
                          : `녹음 당시 템포(${take.bpm} BPM)로 반주를 함께 틉니다.`
                      }
                    >
                      <span>
                        <Button
                          size="small"
                          disabled={group.deleted}
                          variant={
                            isPlaying && playingMode === 'backing'
                              ? 'contained'
                              : 'outlined'
                          }
                          startIcon={
                            isPlaying && playingMode === 'backing' ? (
                              <Stop />
                            ) : (
                              <QueueMusic />
                            )
                          }
                          onClick={() =>
                            isPlaying && playingMode === 'backing'
                              ? onStop()
                              : onPlay(take, 'backing')
                          }
                        >
                          반주와 함께
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                  <SyncOffsetSlider
                    take={take}
                    onSave={(syncOffsetMs) =>
                      onUpdate(take.id, { syncOffsetMs })
                    }
                  />
                  <MemoField
                    take={take}
                    onSave={(memo) => onUpdate(take.id, { memo })}
                  />
                  <IconButton
                    size="small"
                    aria-label="테이크 삭제"
                    onClick={() => setDeleting(take)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      ))}

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>테이크 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            이 테이크를 삭제할까요? 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleting) {
                if (deleting.id === playingId) onStop();
                onDelete(deleting.id);
              }
              setDeleting(null);
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
