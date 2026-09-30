import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Close, ExpandMore } from '@mui/icons-material';
import ChordDisplay from '../../exerciseChord/ChordDisplay';
import {
  DifficultyLevel,
  getChordData,
} from '../../../utils/chordProgressionGenerator';
import {
  QUALITIES,
  Quality,
  SongKey,
  chromaticDegrees,
  degreeRootName,
  diatonicDegrees,
} from '../../../utils/pitch';
import { SongChord } from '../types';
import { NO_CHORD, chordLabel } from '../logic/chordSheet';
import { toSongChord } from '../logic/songEdits';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function degreeLabel(chord: SongChord): string {
  const accidental =
    chord.accidental === -1 ? 'b' : chord.accidental === 1 ? '#' : '';
  const roman = ROMAN[chord.degree - 1];
  const minorish = ['minor', 'm7', 'dim', 'm7b5'].includes(chord.quality);
  return accidental + (minorish ? roman.toLowerCase() : roman);
}

const QUALITY_LABELS: Record<Quality, string> = {
  major: '메이저',
  minor: '마이너 (m)',
  '7': '7',
  maj7: 'maj7',
  m7: 'm7',
  dim: 'dim',
  m7b5: 'm7b5',
  sus4: 'sus4',
  sus2: 'sus2',
};

const sameChord = (a: SongChord | null, b: SongChord | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.degree === b.degree &&
    a.quality === b.quality &&
    (a.accidental ?? 0) === (b.accidental ?? 0));

/** 코드 이름 옆에 작은 운지 다이어그램. 운지 데이터가 없으면 이름만. */
export function ChordShape({
  name,
  focused = false,
}: {
  name: string;
  focused?: boolean;
}) {
  const data = useMemo(
    () =>
      name === NO_CHORD
        ? null
        : getChordData(name, DifficultyLevel.WITH_SPECIAL),
    [name],
  );
  return (
    <Box
      sx={{
        width: 76,
        height: 108,
        overflow: 'hidden',
        flexShrink: 0,
        '& > div': {
          width: 108,
          transform: 'scale(0.7)',
          transformOrigin: 'top left',
        },
      }}
    >
      {data ? (
        <ChordDisplay chord={data} focused={focused} />
      ) : (
        <Stack alignItems="center" sx={{ pt: 1 }}>
          <Typography fontWeight={700}>{name}</Typography>
          {name !== NO_CHORD && (
            <Typography variant="caption" color="text.secondary">
              운지 없음
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}

interface ChordPickerProps {
  open: boolean;
  title: string;
  value: SongChord | null;
  shapeKey: SongKey; // 코드 이름·운지는 손 모양 기준
  onSelect: (chord: SongChord | null) => void;
  onClose: () => void;
}

export default function ChordPicker({
  open,
  title,
  value,
  shapeKey,
  onSelect,
  onClose,
}: ChordPickerProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [rootIndex, setRootIndex] = useState(0);
  const [quality, setQuality] = useState<Quality>('major');
  const roots = chromaticDegrees(shapeKey.mode);
  const diatonic = diatonicDegrees(shapeKey.mode).map(toSongChord);
  const custom = toSongChord({ ...roots[rootIndex], quality });
  const customName = chordLabel(custom, shapeKey);

  const pick = (chord: SongChord | null) => {
    onSelect(chord);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          aria-label="닫기"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          이 키에서 자연스러운 코드 7개
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
            gap: 1,
          }}
        >
          {diatonic.map((chord) => {
            const name = chordLabel(chord, shapeKey);
            const selected = sameChord(chord, value);
            return (
              <Button
                key={chord.degree}
                variant={selected ? 'contained' : 'outlined'}
                onClick={() => pick(chord)}
                sx={{
                  flexDirection: 'column',
                  textTransform: 'none',
                  py: 1,
                }}
              >
                <Typography variant="caption">{degreeLabel(chord)}</Typography>
                <ChordShape name={name} />
              </Button>
            );
          })}
          <Button
            variant={value === null ? 'contained' : 'outlined'}
            onClick={() => pick(null)}
            sx={{ flexDirection: 'column', textTransform: 'none' }}
          >
            <Typography fontWeight={700}>N.C.</Typography>
            <Typography variant="caption">코드 없음</Typography>
          </Button>
        </Box>

        <Button
          onClick={() => setMoreOpen((open) => !open)}
          endIcon={
            <ExpandMore
              sx={{ transform: moreOpen ? 'rotate(180deg)' : 'none' }}
            />
          }
          sx={{ mt: 2 }}
        >
          더 보기
        </Button>
        <Collapse in={moreOpen}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mt: 1 }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="chord-root-label">근음</InputLabel>
              <Select
                labelId="chord-root-label"
                label="근음"
                value={rootIndex}
                onChange={(event) => setRootIndex(Number(event.target.value))}
              >
                {roots.map((root, index) => {
                  const chord = toSongChord({ ...root, quality: 'major' });
                  return (
                    <MenuItem key={index} value={index}>
                      {degreeRootName(chord, shapeKey)} ({degreeLabel(chord)})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="chord-quality-label">종류</InputLabel>
              <Select
                labelId="chord-quality-label"
                label="종류"
                value={quality}
                onChange={(event) => setQuality(event.target.value as Quality)}
              >
                {QUALITIES.map((q) => (
                  <MenuItem key={q} value={q}>
                    {QUALITY_LABELS[q]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ChordShape name={customName} />
            <Button variant="contained" onClick={() => pick(custom)}>
              {customName} 선택
            </Button>
          </Stack>
        </Collapse>
      </DialogContent>
    </Dialog>
  );
}
