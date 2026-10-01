import React from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { SongKey } from '../../../utils/pitch';
import { SongChord } from '../types';
import { chordKeyAction } from '../logic/chordKeys';
import { ChordSuggestion } from '../logic/nextChords';
import { ChordChooser, diatonicChords } from './ChordPicker';

interface ChordPopoverProps {
  anchorEl: HTMLElement | null;
  title: string;
  value: SongChord | null;
  shapeKey: SongKey;
  previousName: string | null;
  suggestions: ChordSuggestion[];
  canPrev: boolean;
  canNext: boolean;
  // viaKey: 숫자키로 골랐으면 다음 마디로 넘어가 이어서 고를 수 있게 한다
  onPick: (chord: SongChord | null, viaKey: boolean) => void;
  onMove: (delta: -1 | 1) => void;
  onClose: () => void;
}

/**
 * 마디 칸에 붙어 열리는 코드 선택 창. 휴대폰에서는 아래에서 올라오는 시트.
 * 1–7 다이어토닉, 0 N.C., ←/→ 옆 마디, Esc 닫기.
 */
export default function ChordPopover({
  anchorEl,
  title,
  value,
  shapeKey,
  previousName,
  suggestions,
  canPrev,
  canNext,
  onPick,
  onMove,
  onClose,
}: ChordPopoverProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const open = anchorEl !== null;

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const action = chordKeyAction({
      key: event.key,
      isComposing: event.nativeEvent.isComposing,
      targetTag: target.tagName,
      targetRole: target.getAttribute('role'),
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
    if (!action) return;
    event.preventDefault();
    if (action.type === 'diatonic') {
      onPick(diatonicChords(shapeKey)[action.index], true);
    } else if (action.type === 'noChord') {
      onPick(null, true);
    } else {
      onMove(action.delta);
    }
  };

  const header = (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography fontWeight={800} sx={{ flex: 1 }}>
        {title}
      </Typography>
      <Button size="small" disabled={!canPrev} onClick={() => onMove(-1)}>
        ‹ 앞
      </Button>
      <Button size="small" disabled={!canNext} onClick={() => onMove(1)}>
        뒤 ›
      </Button>
      <IconButton size="small" aria-label="닫기" onClick={onClose}>
        <Close fontSize="small" />
      </IconButton>
    </Stack>
  );

  const body = (
    <Stack spacing={1.25}>
      {header}
      <ChordChooser
        value={value}
        shapeKey={shapeKey}
        previousName={previousName}
        suggestions={suggestions}
        compact={phone}
        onPick={(chord) => onPick(chord, false)}
      />
      {!phone && (
        <Typography variant="caption" color="text.secondary" textAlign="right">
          1–7 선택 · 0 N.C. · ←/→ 옆 마디 · Esc 닫기
        </Typography>
      )}
    </Stack>
  );

  if (phone) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          onKeyDown,
          sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2 },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
            mx: 'auto',
            mb: 1,
          }}
        />
        {body}
      </Drawer>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        onKeyDown,
        sx: {
          width: 460,
          maxWidth: 'calc(100vw - 32px)',
          p: 2,
          borderRadius: 3,
        },
      }}
    >
      {body}
    </Popover>
  );
}
