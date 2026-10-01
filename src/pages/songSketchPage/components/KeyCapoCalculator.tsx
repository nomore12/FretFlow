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
import { Song } from '../types';
import { EASY_OPEN_CHORDS, capoOptions, playedChords } from '../logic/capo';

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** 부를 키에서 쉬운 오픈 코드가 가장 많은 카포 위치를 찾는 계산기. */
export default function KeyCapoCalculator({
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
