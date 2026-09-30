import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  SongKey,
  keyLabel,
  parseNote,
  tonicOptions,
} from '../../../utils/pitch';
import { Song, SongChord } from '../types';
import { EASY_OPEN_CHORDS, capoOptions, playedChords } from '../logic/capo';
import { chordLabel } from '../logic/chordSheet';
import { FeelTag, suggestNextChords } from '../logic/nextChords';
import { degreeLabel } from './ChordPicker';

export interface BarSelection {
  sectionId: string;
  barIndex: number;
}

const TAG_COLORS: Record<FeelTag, 'success' | 'error' | 'secondary' | 'info'> =
  {
    stable: 'success',
    tension: 'error',
    wistful: 'secondary',
    open: 'info',
  };

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

function KeyCapoCalculator({
  song,
  onApply,
}: {
  song: Song;
  onApply: (tonic: string, capo: number) => void;
}) {
  const [desired, setDesired] = useState<string | null>(null);
  const tonics = tonicOptions(song.key.mode);
  // 부르고 싶은 키를 고르기 전에는 지금 곡의 실제 키로 계산한다.
  const tonic =
    desired ?? tonics[parseNote(song.key.tonic) ?? 0] ?? song.key.tonic;
  const actualKey: SongKey = { tonic, mode: song.key.mode };
  const chords = useMemo(() => playedChords(song), [song]);
  const options = capoOptions(chords, actualKey);
  const best = options.reduce((a, b) => (b.easyRatio > a.easyRatio ? b : a));
  const isCurrent = (capo: number) =>
    parseNote(song.key.tonic) === parseNote(tonic) && song.capo === capo;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={700}>
        키·카포 계산기
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel id="desired-key">부를 키</InputLabel>
          <Select
            labelId="desired-key"
            label="부를 키"
            value={tonic}
            onChange={(event) => setDesired(event.target.value)}
          >
            {tonics.map((option) => (
              <MenuItem key={option} value={option}>
                {keyLabel({ tonic: option, mode: song.key.mode })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          실제로 들릴 키를 고르면, 쉬운 오픈 코드가 가장 많은 카포 위치를
          찾습니다.
        </Typography>
      </Stack>

      {chords.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          재생 순서에 코드가 있는 마디가 없습니다.
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,.8)',
              border: '2px solid #7664bb',
            }}
          >
            <Typography variant="body2">
              추천: <strong>카포 {best.capo}</strong> +{' '}
              <strong>{best.shapeLabel}</strong> 모양 · 쉬운 코드{' '}
              {percent(best.easyRatio)}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              sx={{ my: 1 }}
            >
              {best.chordNames.map((name) => (
                <Chip
                  key={name}
                  size="small"
                  label={name}
                  color={EASY_OPEN_CHORDS.has(name) ? 'success' : 'default'}
                  variant={EASY_OPEN_CHORDS.has(name) ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
            <Button
              size="small"
              variant="contained"
              disabled={isCurrent(best.capo)}
              onClick={() => onApply(tonic, best.capo)}
            >
              {isCurrent(best.capo) ? '지금 설정과 같습니다' : '곡에 적용'}
            </Button>
          </Box>

          <Stack spacing={0.5}>
            {options.map((option) => (
              <Stack
                key={option.capo}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Typography
                  variant="caption"
                  sx={{ width: 108, whiteSpace: 'nowrap' }}
                >
                  카포 {option.capo} · {option.shapeLabel}
                  {isCurrent(option.capo) && ' (현재)'}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={option.easyRatio * 100}
                  color={option.capo === best.capo ? 'secondary' : 'primary'}
                  sx={{ flex: 1, height: 6, borderRadius: 3 }}
                />
                <Typography
                  variant="caption"
                  sx={{ width: 34, textAlign: 'right' }}
                >
                  {percent(option.easyRatio)}
                </Typography>
                <Button
                  size="small"
                  sx={{ minWidth: 0, px: 1 }}
                  disabled={isCurrent(option.capo)}
                  onClick={() => onApply(tonic, option.capo)}
                >
                  적용
                </Button>
              </Stack>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            적용하면 곡의 실제 키가 {keyLabel(actualKey)}이 되고, 코드 악보는
            카포를 뺀 모양으로 바뀝니다. 들리는 소리는 {keyLabel(actualKey)}
            그대로입니다.
          </Typography>
        </>
      )}
    </Stack>
  );
}

function NextChordSuggestions({
  song,
  shapeKey,
  selection,
  onApply,
}: {
  song: Song;
  shapeKey: SongKey;
  selection: BarSelection | null;
  onApply: (selection: BarSelection, chord: SongChord) => void;
}) {
  const section = selection ? song.sections[selection.sectionId] : undefined;
  const bar = section?.bars[selection?.barIndex ?? -1];

  if (!selection || !section || !bar) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          다음 코드 추천
        </Typography>
        <Typography variant="body2" color="text.secondary">
          편집기에서 마디를 누르면 그 다음에 자주 오는 코드를 보여줍니다.
        </Typography>
      </Stack>
    );
  }

  const suggestions = suggestNextChords(bar.chord, song.key.mode);
  const isLast = selection.barIndex === section.bars.length - 1;

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" fontWeight={700}>
        다음 코드 추천
      </Typography>
      <Typography variant="body2">
        {section.name} {selection.barIndex + 1}마디 ·{' '}
        <strong>{chordLabel(bar.chord, shapeKey)}</strong> 다음에 자주 오는 코드
      </Typography>
      {suggestions.map((suggestion) => (
        <Button
          key={`${suggestion.chord.accidental ?? 0}-${suggestion.chord.degree}-${suggestion.chord.quality}`}
          variant="outlined"
          onClick={() => onApply(selection, suggestion.chord)}
          sx={{ justifyContent: 'flex-start', textTransform: 'none', gap: 1 }}
        >
          <Typography fontWeight={700} sx={{ minWidth: 52, textAlign: 'left' }}>
            {chordLabel(suggestion.chord, shapeKey)}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ minWidth: 30 }}
          >
            {degreeLabel(suggestion.chord)}
          </Typography>
          <Chip
            size="small"
            label={suggestion.tagLabel}
            color={TAG_COLORS[suggestion.tag]}
          />
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {percent(suggestion.share)}
          </Typography>
        </Button>
      ))}
      <Typography variant="caption" color="text.secondary">
        누르면{' '}
        {isLast
          ? '섹션 끝에 새 마디를 붙여'
          : `${selection.barIndex + 2}마디에`}{' '}
        적용합니다.
      </Typography>
    </Stack>
  );
}

interface AssistPanelProps {
  song: Song;
  shapeKey: SongKey;
  selection: BarSelection | null;
  onApplyCapo: (tonic: string, capo: number) => void;
  onApplyNextChord: (selection: BarSelection, chord: SongChord) => void;
}

export default function AssistPanel({
  song,
  shapeKey,
  selection,
  onApplyCapo,
  onApplyNextChord,
}: AssistPanelProps) {
  return (
    <Stack spacing={3}>
      <NextChordSuggestions
        song={song}
        shapeKey={shapeKey}
        selection={selection}
        onApply={onApplyNextChord}
      />
      <KeyCapoCalculator song={song} onApply={onApplyCapo} />
    </Stack>
  );
}
