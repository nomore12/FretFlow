import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputBase,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { MoreHoriz } from '@mui/icons-material';
import { Bar } from '../types';
import { BarLyricInfo, SYLLABLE_DEVIATION_THRESHOLD } from '../logic/lyrics';

export type BarMenuAction =
  | 'insertBefore'
  | 'duplicate'
  | 'toggleSpoken'
  | 'delete';

const TINY_CHIP = { height: 18, fontSize: '0.68rem' };

interface BarCellProps {
  sectionId: string;
  index: number;
  bar: Bar;
  chordName: string;
  degree: string;
  info: BarLyricInfo;
  averageSyllables: number | null;
  playing: boolean; // 지금 재생 중인 마디
  selected: boolean; // 코드 선택 창이 열린 마디
  canDelete: boolean;
  onOpenChord: (index: number, anchor: HTMLElement) => void;
  onLyricChange: (index: number, lyric: string) => void;
  onLyricKeyDown: (index: number, event: React.KeyboardEvent) => void;
  onLyricPaste: (index: number, event: React.ClipboardEvent) => void;
  onMenu: (index: number, action: BarMenuAction) => void;
  registerChordButton: (index: number, element: HTMLElement | null) => void;
  registerLyricInput: (index: number, element: HTMLInputElement | null) => void;
}

/** 악보 모양 편집기의 마디 한 칸: 위에 코드, 가운데 가사, 아래 음절·경고. */
function BarCell({
  sectionId,
  index,
  bar,
  chordName,
  degree,
  info,
  averageSyllables,
  playing,
  selected,
  canDelete,
  onOpenChord,
  onLyricChange,
  onLyricKeyDown,
  onLyricPaste,
  onMenu,
  registerChordButton,
  registerLyricInput,
}: BarCellProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const runMenu = (action: BarMenuAction) => {
    setMenuAnchor(null);
    onMenu(index, action);
  };

  return (
    <Box
      data-bar-key={`${sectionId}:${index}`}
      sx={{
        position: 'relative',
        bgcolor: playing ? '#f0edff' : 'white',
        border: '2px solid',
        borderColor: playing || selected ? '#7664bb' : 'transparent',
        borderStyle: selected && !playing ? 'dashed' : 'solid',
        borderRadius: 1.5,
        px: 1,
        pt: 0.75,
        pb: 0.5,
        minHeight: 84,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        transition: 'background-color .15s',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 14, textAlign: 'right', fontSize: '0.7rem' }}
        >
          {index + 1}
        </Typography>
        <Button
          ref={(element) => registerChordButton(index, element)}
          size="small"
          variant={selected ? 'contained' : 'outlined'}
          onClick={(event) => onOpenChord(index, event.currentTarget)}
          aria-label={`${index + 1}마디 코드 ${chordName}`}
          sx={{
            minWidth: 0,
            px: 1.25,
            py: 0,
            height: 30,
            textTransform: 'none',
            fontWeight: 800,
            fontSize: '1rem',
          }}
        >
          {chordName}
        </Button>
        <Typography variant="caption" color="text.secondary" noWrap>
          {degree}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          aria-label={`${index + 1}마디 메뉴`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{ p: 0.25, color: 'text.secondary' }}
        >
          <MoreHoriz fontSize="small" />
        </IconButton>
      </Stack>

      <InputBase
        inputRef={(element: HTMLInputElement | null) =>
          registerLyricInput(index, element)
        }
        value={bar.lyric ?? ''}
        placeholder="가사"
        onChange={(event) => onLyricChange(index, event.target.value)}
        onKeyDown={(event) => onLyricKeyDown(index, event)}
        onPaste={(event) => onLyricPaste(index, event)}
        inputProps={{ 'aria-label': `${index + 1}마디 가사` }}
        sx={{
          fontSize: '0.95rem',
          fontStyle: bar.spoken ? 'italic' : 'normal',
          color: bar.spoken ? 'text.secondary' : 'text.primary',
          borderBottom: '1px solid transparent',
          '&.Mui-focused': { borderBottomColor: 'primary.main' },
          '& input': { py: 0.25, px: 0.25 },
        }}
      />

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ minHeight: 18 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: '0.7rem' }}
        >
          {bar.spoken ? '말로 · 반주 쉼' : `${info.syllables}음절`}
        </Typography>
        {info.hardToHold && (
          <Tooltip title="줄 끝 글자에 받침이 있어 길게 끌기 어렵습니다.">
            <Chip size="small" color="info" label="받침" sx={TINY_CHIP} />
          </Tooltip>
        )}
        {info.deviates && (
          <Tooltip
            title={`섹션 평균(${averageSyllables?.toFixed(1)}음절)에서 ${SYLLABLE_DEVIATION_THRESHOLD}음절 이상 벗어납니다.`}
          >
            <Chip size="small" color="warning" label="편차" sx={TINY_CHIP} />
          </Tooltip>
        )}
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => runMenu('insertBefore')}>
          <ListItemText>앞에 마디 삽입</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runMenu('duplicate')}>
          <ListItemText>이 마디 복제</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runMenu('toggleSpoken')}>
          <ListItemText>
            {bar.spoken ? '말로 끄기' : '말로 하기 (반주 쉼)'}
          </ListItemText>
        </MenuItem>
        <MenuItem disabled={!canDelete} onClick={() => runMenu('delete')}>
          <ListItemText sx={{ color: 'error.main' }}>마디 삭제</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default React.memo(BarCell);
