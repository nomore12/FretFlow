import React, { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Mode,
  keyLabel,
  parseNote,
  shapeKey,
  tonicOptions,
} from '../../../utils/pitch';
import { BPM_MAX, BPM_MIN, CAPO_MAX, Song } from '../types';

interface SongSettingsProps {
  song: Song;
  onChange: (patch: Partial<Pick<Song, 'key' | 'capo' | 'bpm'>>) => void;
}

const clampBpm = (value: number) =>
  Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)));

export default function SongSettings({ song, onChange }: SongSettingsProps) {
  const [bpmText, setBpmText] = useState(String(song.bpm));
  useEffect(() => setBpmText(String(song.bpm)), [song.bpm]);

  const commitBpm = () => {
    const value = Number(bpmText);
    if (bpmText.trim() === '' || !Number.isFinite(value)) {
      setBpmText(String(song.bpm));
      return;
    }
    const bpm = clampBpm(value);
    setBpmText(String(bpm));
    if (bpm !== song.bpm) onChange({ bpm });
  };

  // 모드를 바꿀 때 같은 으뜸음을 그 모드의 표기로 맞춘다 (예: Db 메이저 → C# 마이너).
  const changeMode = (mode: Mode) => {
    const pitch = parseNote(song.key.tonic) ?? 0;
    onChange({ key: { tonic: tonicOptions(mode)[pitch], mode } });
  };

  const shape = shapeKey(song.key, song.capo);
  // 가져온 곡의 이명동음 표기(Gb 등)도 목록 값으로 맞춰 보여준다.
  const tonicValue = tonicOptions(song.key.mode)[
    parseNote(song.key.tonic) ?? 0
  ];

  return (
    <Stack
      spacing={1}
      sx={{ '& .MuiInputBase-input, & .MuiSelect-select': { py: 0.75 } }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        useFlexGap
      >
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="song-tonic">키</InputLabel>
          <Select
            labelId="song-tonic"
            label="키"
            value={tonicValue}
            onChange={(event) =>
              onChange({ key: { ...song.key, tonic: event.target.value } })
            }
          >
            {tonicOptions(song.key.mode).map((tonic) => (
              <MenuItem key={tonic} value={tonic}>
                {tonic}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="song-mode">모드</InputLabel>
          <Select
            labelId="song-mode"
            label="모드"
            value={song.key.mode}
            onChange={(event) => changeMode(event.target.value as Mode)}
          >
            <MenuItem value="major">메이저</MenuItem>
            <MenuItem value="minor">마이너</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="song-capo">카포</InputLabel>
          <Select
            labelId="song-capo"
            label="카포"
            value={song.capo}
            onChange={(event) => onChange({ capo: Number(event.target.value) })}
          >
            {Array.from({ length: CAPO_MAX + 1 }, (_, capo) => (
              <MenuItem key={capo} value={capo}>
                {capo === 0 ? '없음' : `${capo}프렛`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="BPM"
          type="number"
          value={bpmText}
          onChange={(event) => setBpmText(event.target.value)}
          onBlur={commitBpm}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitBpm();
          }}
          inputProps={{ min: BPM_MIN, max: BPM_MAX, step: 1 }}
          sx={{ width: 110 }}
        />
      </Stack>
      <Typography variant="body2">
        실제 키 <strong>{keyLabel(song.key)}</strong>
        {song.capo > 0 && (
          <>
            {' '}
            · 카포 {song.capo}에서 <strong>{keyLabel(shape)}</strong> 모양으로
            연주합니다. 코드 이름은 모두 손 모양 기준입니다.
          </>
        )}
      </Typography>
    </Stack>
  );
}
