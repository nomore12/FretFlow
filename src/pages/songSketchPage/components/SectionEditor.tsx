import React, { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
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

// 입력칸 높이를 줄여 한 화면에 마디가 더 많이 보이게 한다.
const DENSE_INPUTS = {
  '& .MuiInputBase-input, & .MuiSelect-select': { py: 0.75 },
};
const TINY_CHIP = { height: 20, fontSize: '0.7rem' };

interface SectionEditorProps {
  section: Section;
  shapeKey: SongKey;
  onUpdate: SongUpdate;
  currentBarIndex?: number | null; // 재생 중인 마디
  selectedBarIndex?: number | null; // 다음 코드 추천 기준 마디
  onSelectBar?: (sectionId: string, barIndex: number) => void;
}

function SectionEditor({
  section,
  shapeKey,
  onUpdate,
  currentBarIndex = null,
  selectedBarIndex = null,
  onSelectBar,
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
    <Stack spacing={1}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={DENSE_INPUTS}
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
          sx={{ width: 130 }}
        />
        <FormControl size="small" sx={{ width: 110 }}>
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
        <FormControl size="small" sx={{ width: 160 }}>
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
        <FormControl size="small" sx={{ flex: '1 1 180px', minWidth: 0 }}>
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
          size="small"
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
        <Tooltip title="섹션 삭제">
          <IconButton
            size="small"
            color="error"
            aria-label="섹션 삭제"
            onClick={() => onUpdate((song) => removeSection(song, id))}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {preset && (
        <Typography variant="caption" color="text.secondary">
          마디 수가 {preset.pattern.length}개로 바뀌고, 겹치는 마디의 가사는
          유지됩니다.
        </Typography>
      )}

      <Stack spacing={0.5}>
        {section.bars.map((bar, barIndex) => {
          const info = lyricInfo.bars[barIndex];
          return (
            <Stack
              key={barIndex}
              onFocusCapture={() => onSelectBar?.(id, barIndex)}
              onClickCapture={() => onSelectBar?.(id, barIndex)}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor:
                  barIndex === currentBarIndex
                    ? '#f0edff'
                    : 'rgba(255,255,255,.7)',
                outline:
                  barIndex === currentBarIndex
                    ? '2px solid #7664bb'
                    : barIndex === selectedBarIndex
                      ? '2px dashed #9d8fd0'
                      : 'none',
                transition: 'background-color .15s',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ width: 18, textAlign: 'right', flexShrink: 0 }}
              >
                {barIndex + 1}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setPickingBar(barIndex)}
                sx={{
                  minWidth: 84,
                  height: 34,
                  textTransform: 'none',
                  gap: 0.75,
                  flexShrink: 0,
                }}
              >
                <Typography fontWeight={700} fontSize="0.95rem">
                  {chordLabel(bar.chord, shapeKey)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {bar.chord ? degreeLabel(bar.chord) : ''}
                </Typography>
              </Button>
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
                  // 휴대폰에서는 코드 버튼과 같은 줄에, 넓은 화면에서는 남는 폭을 쓴다.
                  flex: { xs: '1 1 0', sm: '1 1 200px' },
                  minWidth: { xs: 120, sm: 0 },
                  '& .MuiInputBase-input': {
                    py: 0.75,
                    fontStyle: bar.spoken ? 'italic' : 'normal',
                  },
                }}
              />
              {/* 경고가 생겨도 가사 칸 폭이 바뀌지 않도록 자리를 고정한다. */}
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ width: 128, flexShrink: 0 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 36 }}
                >
                  {info.syllables}음절
                </Typography>
                {info.hardToHold && (
                  <Tooltip title="줄 끝 글자에 받침이 있어 길게 끌기 어렵습니다.">
                    <Chip
                      size="small"
                      color="info"
                      label="받침"
                      sx={TINY_CHIP}
                    />
                  </Tooltip>
                )}
                {info.deviates && (
                  <Tooltip
                    title={`섹션 평균(${lyricInfo.average?.toFixed(1)}음절)에서 ${SYLLABLE_DEVIATION_THRESHOLD}음절 이상 벗어납니다.`}
                  >
                    <Chip
                      size="small"
                      color="warning"
                      label="편차"
                      sx={TINY_CHIP}
                    />
                  </Tooltip>
                )}
              </Stack>
              <Tooltip title="반주를 멈추고 말로 하는 마디">
                <ToggleButton
                  size="small"
                  value="spoken"
                  selected={Boolean(bar.spoken)}
                  onChange={() =>
                    onUpdate((song) =>
                      updateBar(song, id, barIndex, { spoken: !bar.spoken }),
                    )
                  }
                  sx={{ py: 0.25, px: 1, flexShrink: 0 }}
                >
                  말로
                </ToggleButton>
              </Tooltip>
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
          );
        })}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          startIcon={<Add />}
          onClick={() => onUpdate((song) => addBar(song, id))}
        >
          마디 추가
        </Button>
        <Button
          size="small"
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
