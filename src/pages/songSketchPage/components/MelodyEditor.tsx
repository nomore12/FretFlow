import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { SongKey, keyLabel } from '../../../utils/pitch';
import { MelodyNote, Section, Song } from '../types';
import { chordLabel } from '../logic/chordSheet';
import {
  DEFAULT_NOTE_LENGTH,
  MELODY_STEPS_PER_BAR,
  alignSyllables,
  chordTonePitchClasses,
  melodyNoteName,
  melodyPitchMidi,
  melodyRows,
  midiToMelodyPitch,
  placeNote,
  removeNote,
  updateNote,
} from '../logic/melody';
import { setSectionMelody } from '../logic/songEdits';

const LABEL_WIDTH = 56;
const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 56;
const RESIZE_HANDLE = 6;
const WIDE_LAYOUT = 900; // 이보다 넓으면 한 번에 4마디, 좁으면 2마디

export interface Playhead {
  barIndex: number;
  step: number;
}

interface MelodyEditorProps {
  song: Song;
  section: Section;
  shapeKey: SongKey; // 코드 이름(손 모양)
  playhead: Playhead | null;
  backing: boolean;
  melodyOn: boolean;
  onSectionChange: (sectionId: string) => void;
  onBackingChange: (backing: boolean) => void;
  onMelodyOnChange: (on: boolean) => void;
  onUpdate: (update: (song: Song) => Song) => void;
  onPreview: (midi: number, lengthSteps: number) => void;
}

interface Selection {
  bar: number;
  step: number;
}

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

/** 멜로디 피아노 롤. 가로 = 16분음표 칸, 세로 = 음높이(실제로 들리는 키). */
export default function MelodyEditor({
  song,
  section,
  shapeKey,
  playhead,
  backing,
  melodyOn,
  onSectionChange,
  onBackingChange,
  onMelodyOnChange,
  onUpdate,
  onPreview,
}: MelodyEditorProps) {
  const key = song.key; // 멜로디는 실제로 들리는 키 기준
  const notes = section.melody ?? [];
  const barCount = section.bars.length;
  const [scaleOnly, setScaleOnly] = useState(true);
  const [pageStart, setPageStart] = useState(0);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [resize, setResize] = useState<{
    note: MelodyNote;
    length: number;
  } | null>(null);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const barsPerPage = width >= WIDE_LAYOUT ? 4 : 2;
  const gridWidth = Math.max(0, width - LABEL_WIDTH);
  const cellWidth = gridWidth / (barsPerPage * MELODY_STEPS_PER_BAR);
  const barWidth = cellWidth * MELODY_STEPS_PER_BAR;
  const rows = useMemo(() => melodyRows(key, scaleOnly), [key, scaleOnly]);
  const page = Math.min(pageStart, Math.max(0, barCount - 1));
  const visibleBars = Array.from(
    { length: Math.min(barsPerPage, barCount - page) },
    (_, offset) => page + offset,
  );

  // 섹션이 바뀌면 처음 마디로, 선택은 해제
  useEffect(() => {
    setPageStart(0);
    setSelected(null);
  }, [section.id]);

  // 재생 위치가 보이는 마디 밖으로 나가면 따라간다
  useEffect(() => {
    if (!playhead) return;
    if (playhead.barIndex < page || playhead.barIndex >= page + barsPerPage) {
      setPageStart(Math.floor(playhead.barIndex / barsPerPage) * barsPerPage);
    }
  }, [playhead, page, barsPerPage]);

  const commit = (next: MelodyNote[]) =>
    onUpdate((current) => setSectionMelody(current, section.id, next));

  const rowOf = (midi: number) => {
    const exact = rows.indexOf(midi);
    if (exact >= 0) return exact;
    // 음계만 보기에서 음계 밖 음표: 가장 가까운 줄 위치에 그린다
    return rows.findIndex((row) => row <= midi);
  };

  const noteAt = (bar: number, step: number) =>
    notes.find(
      (note) =>
        note.bar === bar && step >= note.step && step < note.step + note.length,
    );

  const onRollClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (resize || !rollRef.current || cellWidth <= 0) return;
    const rect = rollRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const bar = page + Math.floor(x / barWidth);
    const step = Math.floor((x - (bar - page) * barWidth) / cellWidth);
    const row = Math.floor(y / ROW_HEIGHT);
    if (bar >= barCount || row < 0 || row >= rows.length) return;
    rollRef.current.focus();

    const existing = noteAt(bar, step);
    if (existing) {
      // 선택된 음표를 다시 누르면 지운다
      if (
        selected &&
        selected.bar === existing.bar &&
        selected.step === existing.step
      ) {
        commit(removeNote(notes, existing.bar, existing.step));
        setSelected(null);
      } else {
        setSelected({ bar: existing.bar, step: existing.step });
        onPreview(melodyPitchMidi(existing, key), existing.length);
      }
      return;
    }
    const midi = rows[row];
    commit(
      placeNote(notes, {
        bar,
        step,
        length: DEFAULT_NOTE_LENGTH,
        ...midiToMelodyPitch(midi, key),
      }),
    );
    setSelected({ bar, step });
    onPreview(midi, DEFAULT_NOTE_LENGTH);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!selected) return;
    const note = notes.find(
      (n) => n.bar === selected.bar && n.step === selected.step,
    );
    if (!note) return;
    const midi = melodyPitchMidi(note, key);
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      commit(removeNote(notes, note.bar, note.step));
      setSelected(null);
    } else if (event.key === 'Escape') {
      setSelected(null);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      // 보이는 줄 기준으로 한 칸 위아래 (음계만 보기면 음계 안에서)
      const index = rowOf(midi) + (event.key === 'ArrowUp' ? -1 : 1);
      const target = rows[index];
      if (target === undefined) return;
      commit(
        updateNote(notes, note.bar, note.step, midiToMelodyPitch(target, key)),
      );
      onPreview(target, note.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const step = note.step + (event.key === 'ArrowLeft' ? -1 : 1);
      if (step < 0 || step + note.length > MELODY_STEPS_PER_BAR) return;
      commit(updateNote(notes, note.bar, note.step, { step }));
      setSelected({ bar: note.bar, step });
    }
  };

  // 오른쪽 끝을 끌어 길이를 바꾼다
  const startResize = (event: React.PointerEvent, note: MelodyNote) => {
    event.stopPropagation();
    event.preventDefault();
    const startX = event.clientX;
    let length = note.length;
    setResize({ note, length });
    setSelected({ bar: note.bar, step: note.step });
    const onMove = (move: PointerEvent) => {
      const delta = Math.round((move.clientX - startX) / cellWidth);
      length = Math.max(
        1,
        Math.min(MELODY_STEPS_PER_BAR - note.step, note.length + delta),
      );
      setResize({ note, length });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (length !== note.length) {
        commit(updateNote(notes, note.bar, note.step, { length }));
      }
      // 클릭 처리와 겹치지 않게 다음 틱에 해제
      setTimeout(() => setResize(null), 0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const barInfo = visibleBars.map((barIndex) => {
    const bar = section.bars[barIndex];
    const barNotes = notes.filter((note) => note.bar === barIndex);
    const alignment = alignSyllables(
      bar.spoken ? '' : bar.lyric ?? '',
      barNotes,
    );
    const tones = chordTonePitchClasses(bar.spoken ? null : bar.chord, key);
    return { barIndex, bar, barNotes, alignment, tones };
  });

  const playheadLeft =
    playhead &&
    playhead.barIndex >= page &&
    playhead.barIndex < page + barsPerPage
      ? (playhead.barIndex - page) * barWidth + playhead.step * cellWidth
      : null;

  const rollHeight = rows.length * ROW_HEIGHT;
  const tonicPitchClass = pitchClass(
    melodyPitchMidi({ degree: 1, octave: 0 }, key),
  );
  const actualChordName = (barIndex: number) => {
    const chord = section.bars[barIndex].chord;
    return chord ? chordLabel(chord, key) : 'N.C.';
  };

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ '& .MuiSelect-select': { py: 0.75 } }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="melody-section">섹션</InputLabel>
          <Select
            labelId="melody-section"
            label="섹션"
            value={section.id}
            onChange={(event) => onSectionChange(event.target.value)}
          >
            {Object.values(song.sections).map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={backing ? 'with' : 'only'}
          onChange={(_, value: 'with' | 'only' | null) => {
            if (value) onBackingChange(value === 'with');
          }}
        >
          <ToggleButton value="with" sx={{ py: 0.4 }}>
            반주와 함께
          </ToggleButton>
          <ToggleButton value="only" sx={{ py: 0.4 }}>
            멜로디만
          </ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={melodyOn}
              onChange={(event) => onMelodyOnChange(event.target.checked)}
            />
          }
          label="멜로디 재생"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={scaleOnly}
              onChange={(event) => setScaleOnly(event.target.checked)}
            />
          }
          label={`키에 맞는 음만 (${keyLabel(key)}${key.mode === 'major' ? ' 메이저' : ''})`}
        />
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="outlined"
          disabled={page === 0}
          onClick={() => setPageStart(Math.max(0, page - barsPerPage))}
        >
          ‹ 이전
        </Button>
        <Typography variant="body2" fontWeight={700}>
          {page + 1}–{Math.min(barCount, page + barsPerPage)}마디 / {barCount}
          마디
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={page + barsPerPage >= barCount}
          onClick={() => setPageStart(page + barsPerPage)}
        >
          다음 ›
        </Button>
      </Stack>

      <Box ref={containerRef} sx={{ display: 'flex', minWidth: 0 }}>
        {width > 0 && (
          <>
            <Box sx={{ width: LABEL_WIDTH, flexShrink: 0 }}>
              <Box sx={{ height: HEADER_HEIGHT }} />
              {rows.map((midi) => (
                <Box
                  key={midi}
                  sx={{
                    height: ROW_HEIGHT,
                    boxSizing: 'border-box',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 1,
                    borderBottom: '1px solid #ddd',
                    // 으뜸음 줄은 눈에 띄게
                    bgcolor:
                      pitchClass(midi) === tonicPitchClass
                        ? '#efeaff'
                        : '#fafafa',
                    fontWeight:
                      pitchClass(midi) === tonicPitchClass ? 800 : 400,
                    color:
                      pitchClass(midi) === tonicPitchClass ? '#5b4a9e' : '#555',
                  }}
                >
                  {melodyNoteName(midi, key)}
                </Box>
              ))}
            </Box>

            <Box sx={{ width: gridWidth, flexShrink: 0 }}>
              <Box sx={{ height: HEADER_HEIGHT, display: 'flex' }}>
                {barInfo.map(({ barIndex, bar, alignment }) => (
                  <Box
                    key={barIndex}
                    sx={{
                      width: barWidth,
                      boxSizing: 'border-box',
                      px: 1,
                      py: 0.5,
                      borderLeft: '2px solid #bdbdbd',
                      bgcolor: 'white',
                      minWidth: 0,
                    }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="baseline">
                      <Typography variant="caption" color="text.secondary">
                        {barIndex + 1}
                      </Typography>
                      <Typography fontWeight={800} color="primary.main">
                        {chordLabel(bar.chord, shapeKey)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        실제 {actualChordName(barIndex)}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ minWidth: 0 }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontStyle: bar.spoken ? 'italic' : 'normal',
                        }}
                      >
                        {bar.spoken
                          ? `(말로) ${bar.lyric ?? ''}`
                          : bar.lyric || ' '}
                      </Typography>
                      {!bar.spoken && alignment.syllableCount > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            flexShrink: 0,
                            px: 0.75,
                            borderRadius: 5,
                            fontWeight: 700,
                            // 아직 찍지 않은 마디는 회색, 맞으면 초록, 모자라면 빨강
                            ...(alignment.noteCount === 0
                              ? { color: '#666', bgcolor: '#eee' }
                              : alignment.leftover.length === 0
                                ? { color: '#2e7d32', bgcolor: '#e8f5e9' }
                                : { color: 'white', bgcolor: '#c62828' }),
                          }}
                        >
                          음표 {alignment.noteCount} · 음절{' '}
                          {alignment.syllableCount}
                          {alignment.leftover.length === 0 &&
                          alignment.noteCount >= alignment.syllableCount
                            ? ' ✓'
                            : ''}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Box>

              <Box
                ref={rollRef}
                role="grid"
                aria-label="멜로디 피아노 롤"
                tabIndex={0}
                onClick={onRollClick}
                onKeyDown={onKeyDown}
                sx={{
                  position: 'relative',
                  height: rollHeight,
                  cursor: 'crosshair',
                  outline: 'none',
                  bgcolor: 'white',
                  backgroundImage: [
                    'linear-gradient(to right, #b8b8b8 2px, transparent 2px)',
                    'linear-gradient(to right, #d6d6d6 1px, transparent 1px)',
                    'linear-gradient(to right, #f0f0f0 1px, transparent 1px)',
                    'linear-gradient(to bottom, #ececec 1px, transparent 1px)',
                  ].join(', '),
                  backgroundSize: `${barWidth}px 100%, ${cellWidth * 4}px 100%, ${cellWidth}px 100%, 100% ${ROW_HEIGHT}px`,
                  '&:focus-visible': { boxShadow: 'inset 0 0 0 2px #7664bb' },
                }}
              >
                {/* 이 마디 코드의 구성음 줄 */}
                {barInfo.flatMap(({ barIndex, tones }) =>
                  rows.map((midi, rowIndex) =>
                    tones.includes(pitchClass(midi)) ? (
                      <Box
                        key={`${barIndex}-${midi}`}
                        sx={{
                          position: 'absolute',
                          left: (barIndex - page) * barWidth,
                          width: barWidth,
                          top: rowIndex * ROW_HEIGHT,
                          height: ROW_HEIGHT,
                          bgcolor: 'rgba(118,100,187,.12)',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null,
                  ),
                )}

                {barInfo.flatMap(({ barIndex, barNotes, alignment }) =>
                  barNotes.map((note, index) => {
                    const midi = melodyPitchMidi(note, key);
                    const length =
                      resize &&
                      resize.note.bar === note.bar &&
                      resize.note.step === note.step
                        ? resize.length
                        : note.length;
                    const isSelected =
                      selected?.bar === note.bar && selected.step === note.step;
                    const isPlaying =
                      playhead?.barIndex === note.bar &&
                      playhead.step >= note.step &&
                      playhead.step < note.step + note.length;
                    return (
                      <Box
                        key={`${note.bar}-${note.step}`}
                        title={melodyNoteName(midi, key)}
                        sx={{
                          position: 'absolute',
                          left:
                            (barIndex - page) * barWidth +
                            note.step * cellWidth +
                            1,
                          top: rowOf(midi) * ROW_HEIGHT + 2,
                          width: Math.max(4, length * cellWidth - 2),
                          height: ROW_HEIGHT - 4,
                          borderRadius: 1,
                          bgcolor: isSelected
                            ? '#f9a825'
                            : isPlaying
                              ? '#3a2d7a'
                              : '#5b4a9e',
                          boxShadow: isPlaying
                            ? '0 0 0 3px rgba(198,40,40,.45)'
                            : 'none',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          pl: 0.5,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                        }}
                      >
                        {alignment.labels[index]}
                        <Box
                          onPointerDown={(event) => startResize(event, note)}
                          onClick={(event) => event.stopPropagation()}
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: RESIZE_HANDLE,
                            cursor: 'ew-resize',
                            bgcolor: isSelected
                              ? '#e65100'
                              : 'rgba(255,255,255,.25)',
                          }}
                        />
                      </Box>
                    );
                  }),
                )}

                {playheadLeft !== null && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: playheadLeft,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      bgcolor: '#c62828',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', minHeight: 24 }}>
                {barInfo.map(({ barIndex, alignment }) => (
                  <Box
                    key={barIndex}
                    sx={{
                      width: barWidth,
                      boxSizing: 'border-box',
                      px: 1,
                      py: 0.5,
                      borderLeft: '2px solid #bdbdbd',
                      fontSize: '0.72rem',
                      color: '#c62828',
                    }}
                  >
                    {alignment.noteCount > 0 &&
                      alignment.leftover.length > 0 &&
                      `"${alignment.leftover.join('')}" 음절이 남았어요`}
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary">
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: 14,
            height: 10,
            bgcolor: 'rgba(118,100,187,.16)',
            border: '1px solid rgba(118,100,187,.35)',
            mr: 0.5,
          }}
        />
        이 마디 코드의 구성음 · 빈 칸 클릭: 찍기 · 음표 클릭: 선택, 한 번 더:
        지우기 · 오른쪽 끝을 끌어 길이 · ↑/↓ 음 · ←/→ 위치 · Delete 지우기
      </Typography>
    </Stack>
  );
}
