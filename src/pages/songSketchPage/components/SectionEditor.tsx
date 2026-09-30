import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, ContentCopy, Delete } from '@mui/icons-material';
import chordProgressions from '../../../data/chordProgressions.json';
import { Degree, Mode, SongKey } from '../../../utils/pitch';
import {
  SECTION_KINDS,
  SECTION_KIND_LABELS,
  STRUMS,
  STRUM_LABELS,
  Section,
  SectionKind,
  Song,
  SongChord,
  Strum,
} from '../types';
import { chordLabel } from '../logic/chordSheet';
import {
  SYLLABLE_DEVIATION_THRESHOLD,
  analyzeSectionLyrics,
} from '../logic/lyrics';
import {
  addBar,
  applyProgression,
  duplicateBars,
  removeBar,
  removeSection,
  toSongChord,
  updateBar,
  updateSection,
} from '../logic/songEdits';
import ChordPicker, { degreeLabel } from './ChordPicker';

type SongUpdate = (update: (song: Song) => Song) => void;

interface Preset {
  id: string;
  name: string;
  pattern: Degree[];
}

const PRESET_GROUPS = Object.entries(chordProgressions.progressions).map(
  ([length, presets]) => ({
    length,
    presets: presets as Preset[],
  }),
);

// 1도가 마이너인 진행은 마이너 키용, 나머지는 메이저 키용으로 보여준다.
const presetMode = (preset: Preset): Mode =>
  preset.pattern[0].degree === 1 &&
  ['minor', 'm7'].includes(preset.pattern[0].quality)
    ? 'minor'
    : 'major';

const findPreset = (id: string) =>
  PRESET_GROUPS.flatMap((group) => group.presets).find((p) => p.id === id);

interface SectionEditorProps {
  section: Section;
  shapeKey: SongKey;
  onUpdate: SongUpdate;
  currentBarIndex?: number | null; // 재생 중인 마디
}

function SectionEditor({
  section,
  shapeKey,
  onUpdate,
  currentBarIndex = null,
}: SectionEditorProps) {
  const [presetId, setPresetId] = useState('');
  const [pickingBar, setPickingBar] = useState<number | null>(null);
  const lyricInfo = useMemo(
    () => analyzeSectionLyrics(section.bars),
    [section.bars],
  );
  const preset = presetId ? findPreset(presetId) : undefined;
  const id = section.id;

  const setBarChord = (barIndex: number, chord: SongChord | null) =>
    onUpdate((song) => updateBar(song, id, barIndex, { chord }));

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <TextField
          size="small"
          label="섹션 이름"
          value={section.name}
          onChange={(event) =>
            onUpdate((song) =>
              updateSection(song, id, { name: event.target.value }),
            )
          }
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id={`${id}-kind`}>종류</InputLabel>
          <Select
            labelId={`${id}-kind`}
            label="종류"
            value={section.kind}
            onChange={(event) =>
              onUpdate((song) =>
                updateSection(song, id, {
                  kind: event.target.value as SectionKind,
                }),
              )
            }
          >
            {SECTION_KINDS.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {SECTION_KIND_LABELS[kind]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id={`${id}-strum`}>스트럼</InputLabel>
          <Select
            labelId={`${id}-strum`}
            label="스트럼"
            value={section.strum}
            onChange={(event) =>
              onUpdate((song) =>
                updateSection(song, id, {
                  strum: event.target.value as Strum,
                }),
              )
            }
          >
            {STRUMS.map((strum) => (
              <MenuItem key={strum} value={strum}>
                {STRUM_LABELS[strum]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button
          color="error"
          startIcon={<Delete />}
          onClick={() => onUpdate((song) => removeSection(song, id))}
        >
          섹션 삭제
        </Button>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id={`${id}-preset`}>진행 프리셋</InputLabel>
          <Select
            labelId={`${id}-preset`}
            label="진행 프리셋"
            value={presetId}
            onChange={(event) => setPresetId(event.target.value)}
          >
            {PRESET_GROUPS.flatMap((group) => [
              <ListSubheader key={`h${group.length}`}>
                {group.length}마디
              </ListSubheader>,
              ...group.presets
                .filter((p) => presetMode(p) === shapeKey.mode)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} ·{' '}
                    {p.pattern
                      .map((chord) => chordLabel(toSongChord(chord), shapeKey))
                      .join(' ')}
                  </MenuItem>
                )),
            ])}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          disabled={!preset}
          onClick={() => {
            if (!preset) return;
            onUpdate((song) => applyProgression(song, id, preset.pattern));
            setPresetId('');
          }}
        >
          적용
        </Button>
        {preset && (
          <Typography variant="caption" color="text.secondary">
            마디 수가 {preset.pattern.length}개로 바뀌고, 겹치는 마디의 가사는
            유지됩니다.
          </Typography>
        )}
      </Stack>

      <Stack spacing={1}>
        {section.bars.map((bar, barIndex) => {
          const info = lyricInfo.bars[barIndex];
          return (
            <Stack
              key={barIndex}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor:
                  barIndex === currentBarIndex
                    ? '#f0edff'
                    : 'rgba(255,255,255,.7)',
                outline:
                  barIndex === currentBarIndex ? '2px solid #7664bb' : 'none',
                transition: 'background-color .15s',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 28, textAlign: 'right' }}
                >
                  {barIndex + 1}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setPickingBar(barIndex)}
                  sx={{ minWidth: 96, textTransform: 'none' }}
                >
                  <Stack alignItems="center" sx={{ lineHeight: 1.1 }}>
                    <Typography fontWeight={700}>
                      {chordLabel(bar.chord, shapeKey)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bar.chord ? degreeLabel(bar.chord) : '코드 없음'}
                    </Typography>
                  </Stack>
                </Button>
              </Stack>
              <TextField
                size="small"
                placeholder="가사"
                value={bar.lyric ?? ''}
                onChange={(event) =>
                  onUpdate((song) =>
                    updateBar(song, id, barIndex, {
                      lyric: event.target.value,
                    }),
                  )
                }
                sx={{
                  flex: 1,
                  '& input': { fontStyle: bar.spoken ? 'italic' : 'normal' },
                }}
              />
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 40 }}
                >
                  {info.syllables}음절
                </Typography>
                {info.hardToHold && (
                  <Tooltip title="줄 끝 글자에 받침이 있어 길게 끌기 어렵습니다.">
                    <Chip size="small" color="info" label="길게 끌기 어려움" />
                  </Tooltip>
                )}
                {info.deviates && (
                  <Tooltip
                    title={`섹션 평균(${lyricInfo.average?.toFixed(1)}음절)에서 ${SYLLABLE_DEVIATION_THRESHOLD}음절 이상 벗어납니다.`}
                  >
                    <Chip size="small" color="warning" label="음절 수 편차" />
                  </Tooltip>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={Boolean(bar.spoken)}
                      onChange={(event) =>
                        onUpdate((song) =>
                          updateBar(song, id, barIndex, {
                            spoken: event.target.checked,
                          }),
                        )
                      }
                    />
                  }
                  label="말로"
                />
                <IconButton
                  size="small"
                  aria-label={`${barIndex + 1}마디 삭제`}
                  disabled={section.bars.length <= 1}
                  onClick={() =>
                    onUpdate((song) => removeBar(song, id, barIndex))
                  }
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          startIcon={<Add />}
          onClick={() => onUpdate((song) => addBar(song, id))}
        >
          마디 추가
        </Button>
        <Button
          startIcon={<ContentCopy />}
          onClick={() => onUpdate((song) => duplicateBars(song, id))}
        >
          마디 전체 복제 (×2)
        </Button>
      </Stack>

      {pickingBar !== null && section.bars[pickingBar] && (
        <ChordPicker
          open
          title={`${section.name} ${pickingBar + 1}마디 코드`}
          value={section.bars[pickingBar].chord}
          shapeKey={shapeKey}
          onSelect={(chord) => setBarChord(pickingBar, chord)}
          onClose={() => setPickingBar(null)}
        />
      )}
    </Stack>
  );
}

// 재생 중 칸마다 페이지가 다시 그려지므로, 바뀐 섹션만 다시 그린다.
export default React.memo(SectionEditor);
