import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, MoreHoriz } from '@mui/icons-material';
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
import { moveBarIndex } from '../logic/chordKeys';
import { analyzeSectionLyrics } from '../logic/lyrics';
import { suggestChordsForBar } from '../logic/nextChords';
import {
  addBar,
  applyProgression,
  distributeLyrics,
  duplicateBar,
  duplicateBars,
  insertBar,
  removeBar,
  removeSection,
  splitLyricLines,
  toSongChord,
  updateBar,
  updateSection,
} from '../logic/songEdits';
import BarCell, { BarMenuAction } from './BarCell';
import ChordPopover from './ChordPopover';
import { degreeLabel } from './ChordPicker';

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

interface SectionEditorProps {
  section: Section;
  shapeKey: SongKey;
  onUpdate: SongUpdate;
  currentBarIndex?: number | null; // 재생 중인 마디
}

interface ChordTarget {
  index: number;
  anchor: HTMLElement;
}

function SectionEditor({
  section,
  shapeKey,
  onUpdate,
  currentBarIndex = null,
}: SectionEditorProps) {
  const [presetId, setPresetId] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [chordTarget, setChordTarget] = useState<ChordTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const chordButtons = useRef<(HTMLElement | null)[]>([]);
  const lyricInputs = useRef<(HTMLInputElement | null)[]>([]);
  const barsRef = useRef(section.bars);
  barsRef.current = section.bars;

  const lyricInfo = useMemo(
    () => analyzeSectionLyrics(section.bars),
    [section.bars],
  );
  const preset = presetId ? findPreset(presetId) : undefined;
  const id = section.id;
  const barCount = section.bars.length;

  const registerChordButton = useCallback(
    (index: number, element: HTMLElement | null) => {
      chordButtons.current[index] = element;
    },
    [],
  );
  const registerLyricInput = useCallback(
    (index: number, element: HTMLInputElement | null) => {
      lyricInputs.current[index] = element;
    },
    [],
  );

  const onOpenChord = useCallback((index: number, anchor: HTMLElement) => {
    setChordTarget({ index, anchor });
  }, []);

  const moveChordTarget = (delta: -1 | 1) => {
    if (!chordTarget) return;
    const index = moveBarIndex(chordTarget.index, delta, barCount);
    const anchor = chordButtons.current[index];
    if (anchor) setChordTarget({ index, anchor });
  };

  const pickChord = (chord: SongChord | null, viaKey: boolean) => {
    if (!chordTarget) return;
    const { index } = chordTarget;
    onUpdate((song) => updateBar(song, id, index, { chord }));
    // 숫자키로 고르면 다음 마디로 넘어가 이어서 고른다. 마지막 마디거나
    // 마우스로 골랐으면 닫는다.
    if (viaKey && index < barCount - 1) {
      const anchor = chordButtons.current[index + 1];
      if (anchor) {
        setChordTarget({ index: index + 1, anchor });
        return;
      }
    }
    setChordTarget(null);
  };

  const onLyricChange = useCallback(
    (index: number, lyric: string) =>
      onUpdate((song) => updateBar(song, id, index, { lyric })),
    [id, onUpdate],
  );

  // Enter: 다음 마디 가사, Shift+Enter: 앞 마디 가사. 한글 조합 중에는 무시한다.
  const onLyricKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
      event.preventDefault();
      const next = index + (event.shiftKey ? -1 : 1);
      lyricInputs.current[next]?.focus();
    },
    [],
  );

  // 여러 줄을 붙여 넣으면 이 마디부터 한 줄씩 나눠 넣는다.
  const onLyricPaste = useCallback(
    (index: number, event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData('text');
      if (!/\r|\n/.test(text)) return;
      const lines = splitLyricLines(text);
      if (lines.length <= 1) return;
      event.preventDefault();
      onUpdate((song) => distributeLyrics(song, id, index, text).song);
      const added = Math.max(0, index + lines.length - barsRef.current.length);
      setMessage(
        `${lines.length}마디에 가사를 나눠 넣었습니다` +
          (added > 0 ? ` (마디 ${added}개 추가)` : ''),
      );
    },
    [id, onUpdate],
  );

  const onMenu = useCallback(
    (index: number, action: BarMenuAction) => {
      onUpdate((song) => {
        switch (action) {
          case 'insertBefore':
            return insertBar(song, id, index);
          case 'duplicate':
            return duplicateBar(song, id, index);
          case 'toggleSpoken':
            return updateBar(song, id, index, {
              spoken: !song.sections[id]?.bars[index]?.spoken,
            });
          case 'delete':
            return removeBar(song, id, index);
        }
      });
    },
    [id, onUpdate],
  );

  const target =
    chordTarget && section.bars[chordTarget.index] ? chordTarget : null;
  const targetSuggestions = useMemo(
    () =>
      target
        ? suggestChordsForBar(section.bars, target.index, shapeKey.mode)
        : null,
    [target, section.bars, shapeKey.mode],
  );

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
        <FormControl size="small" sx={{ width: 170 }}>
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
        <IconButton
          size="small"
          aria-label={`${section.name} 섹션 메뉴`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <MoreHoriz fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onUpdate((song) => duplicateBars(song, id));
            }}
          >
            <ListItemText>마디 전체 복제 (×2)</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onUpdate((song) => removeSection(song, id));
            }}
          >
            <ListItemText sx={{ color: 'error.main' }}>섹션 삭제</ListItemText>
          </MenuItem>
        </Menu>
      </Stack>
      {preset && (
        <Typography variant="caption" color="text.secondary">
          마디 수가 {preset.pattern.length}개로 바뀌고, 겹치는 마디의 가사는
          유지됩니다.
        </Typography>
      )}

      {/* 악보처럼 넓은 화면은 한 줄에 4마디, 휴대폰은 2마디 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1,
        }}
      >
        {section.bars.map((bar, index) => (
          <BarCell
            key={index}
            sectionId={id}
            index={index}
            bar={bar}
            chordName={chordLabel(bar.chord, shapeKey)}
            degree={bar.chord ? degreeLabel(bar.chord) : ''}
            info={lyricInfo.bars[index]}
            averageSyllables={lyricInfo.average}
            playing={index === currentBarIndex}
            selected={index === target?.index}
            canDelete={barCount > 1}
            onOpenChord={onOpenChord}
            onLyricChange={onLyricChange}
            onLyricKeyDown={onLyricKeyDown}
            onLyricPaste={onLyricPaste}
            onMenu={onMenu}
            registerChordButton={registerChordButton}
            registerLyricInput={registerLyricInput}
          />
        ))}
        <Button
          startIcon={<Add />}
          onClick={() => onUpdate((song) => addBar(song, id))}
          sx={{
            minHeight: 84,
            border: '2px dashed',
            borderColor: 'rgba(0,0,0,.2)',
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,.45)',
          }}
        >
          마디 추가
        </Button>
      </Box>

      {target && targetSuggestions && (
        <ChordPopover
          anchorEl={target.anchor}
          title={`${section.name} ${target.index + 1}마디 코드`}
          value={section.bars[target.index].chord}
          shapeKey={shapeKey}
          previousName={
            targetSuggestions.previous
              ? chordLabel(targetSuggestions.previous, shapeKey)
              : null
          }
          suggestions={targetSuggestions.suggestions}
          canPrev={target.index > 0}
          canNext={target.index < barCount - 1}
          onPick={pickChord}
          onMove={moveChordTarget}
          onClose={() => setChordTarget(null)}
        />
      )}

      <Snackbar
        open={message !== null}
        autoHideDuration={3000}
        onClose={() => setMessage(null)}
        message={message}
      />
    </Stack>
  );
}

// 재생 중 칸마다 페이지가 다시 그려지므로, 바뀐 섹션만 다시 그린다.
export default React.memo(SectionEditor);
