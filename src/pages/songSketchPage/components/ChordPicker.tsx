import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
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
import { ChordSuggestion, FeelTag } from '../logic/nextChords';

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

export const sameChord = (a: SongChord | null, b: SongChord | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.degree === b.degree &&
    a.quality === b.quality &&
    (a.accidental ?? 0) === (b.accidental ?? 0));

/** 코드 이름 옆에 작은 운지 다이어그램. 운지 데이터가 없으면 이름만. */
// ChordDisplay 원래 크기 (px)
const SHAPE_WIDTH = 108;
const SHAPE_HEIGHT = 154;

export function ChordShape({
  name,
  focused = false,
  scale = 0.7,
}: {
  name: string;
  focused?: boolean;
  scale?: number;
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
        width: Math.round(SHAPE_WIDTH * scale),
        height: Math.round(SHAPE_HEIGHT * scale),
        overflow: 'hidden',
        flexShrink: 0,
        '& > div': {
          width: SHAPE_WIDTH,
          transform: `scale(${scale})`,
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

export const TAG_COLORS: Record<
  FeelTag,
  'success' | 'error' | 'secondary' | 'info'
> = {
  stable: 'success',
  tension: 'error',
  wistful: 'secondary',
  open: 'info',
};

/** 이 키의 다이어토닉 코드 7개. 숫자키 1–7 순서와 같다. */
export function diatonicChords(shapeKey: SongKey): SongChord[] {
  return diatonicDegrees(shapeKey.mode).map(toSongChord);
}

interface ChordChooserProps {
  value: SongChord | null;
  shapeKey: SongKey; // 코드 이름·운지는 손 모양 기준
  previousName: string | null; // 추천 기준이 된 앞 마디 코드
  suggestions: ChordSuggestion[];
  compact?: boolean; // 휴대폰: 운지 그림 없이 작게
  onPick: (chord: SongChord | null) => void;
}

/**
 * 코드 선택 내용: 앞 마디 기준 추천, 다이어토닉 7개와 N.C., 더 보기.
 * 마디 칸에 붙는 창과 휴대폰 아래 시트가 함께 쓴다.
 */
export function ChordChooser({
  value,
  shapeKey,
  previousName,
  suggestions,
  compact = false,
  onPick,
}: ChordChooserProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [rootIndex, setRootIndex] = useState(0);
  const [quality, setQuality] = useState<Quality>('major');
  const roots = chromaticDegrees(shapeKey.mode);
  const diatonic = diatonicChords(shapeKey);
  const custom = toSongChord({ ...roots[rootIndex], quality });
  const customName = chordLabel(custom, shapeKey);

  return (
    <Stack spacing={1.25}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">
        여기에 어울리는 코드 ·{' '}
        {previousName
          ? `앞 마디 ${previousName} 다음에 자주 와요`
          : '시작 후보'}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          gap: 0.5,
        }}
      >
        {suggestions.map((suggestion) => {
          const selected = sameChord(suggestion.chord, value);
          return (
            <Button
              key={`${suggestion.chord.accidental ?? 0}-${suggestion.chord.degree}-${suggestion.chord.quality}`}
              variant="outlined"
              color={selected ? 'primary' : 'inherit'}
              onClick={() => onPick(suggestion.chord)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                gap: 1,
                py: 0.5,
                minHeight: 40,
                borderColor: selected ? undefined : 'divider',
                bgcolor: selected ? 'rgba(25,118,210,.08)' : 'transparent',
              }}
            >
              <Typography
                fontWeight={800}
                sx={{ minWidth: 40, textAlign: 'left' }}
              >
                {chordLabel(suggestion.chord, shapeKey)}
              </Typography>
              {!compact && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 28 }}
                >
                  {degreeLabel(suggestion.chord)}
                </Typography>
              )}
              <Chip
                size="small"
                label={suggestion.tagLabel}
                color={TAG_COLORS[suggestion.tag]}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {Math.round(suggestion.share * 100)}%
              </Typography>
            </Button>
          );
        })}
      </Box>

      <Typography variant="caption" fontWeight={700} color="text.secondary">
        이 키의 코드{compact ? '' : ' (숫자키로 선택)'}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 0.75,
        }}
      >
        {[...diatonic, null].map((chord, index) => {
          const name = chordLabel(chord, shapeKey);
          const selected = sameChord(chord, value);
          return (
            <Button
              key={index}
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => onPick(chord)}
              sx={{
                flexDirection: 'column',
                textTransform: 'none',
                position: 'relative',
                py: 0.5,
                minHeight: 44,
                gap: 0.25,
              }}
            >
              {!compact && (
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: 2,
                    left: 6,
                    opacity: 0.7,
                    fontSize: '0.65rem',
                  }}
                >
                  {chord ? index + 1 : 0}
                </Typography>
              )}
              <Typography fontWeight={800} lineHeight={1.2}>
                {name}
              </Typography>
              {!compact && chord && (
                <Box sx={{ bgcolor: 'white', borderRadius: 0.5 }}>
                  <ChordShape name={name} scale={0.4} />
                </Box>
              )}
              <Typography
                variant="caption"
                sx={{ opacity: 0.75, lineHeight: 1.1 }}
              >
                {chord ? degreeLabel(chord) : '코드 없음'}
              </Typography>
            </Button>
          );
        })}
      </Box>

      <Button
        size="small"
        onClick={() => setMoreOpen((open) => !open)}
        endIcon={
          <ExpandMore
            sx={{ transform: moreOpen ? 'rotate(180deg)' : 'none' }}
          />
        }
        sx={{ alignSelf: 'flex-start' }}
      >
        더 보기
      </Button>
      <Collapse in={moreOpen} unmountOnExit>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
          <Button
            variant="contained"
            size="small"
            onClick={() => onPick(custom)}
          >
            {customName} 선택
          </Button>
        </Stack>
      </Collapse>
    </Stack>
  );
}
