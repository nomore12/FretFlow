import React, { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, FileDownload } from '@mui/icons-material';
import { PracticePanel } from '../../components/practice/PracticeLayout';
import useSongStore from '../../store/useSongStore';
import { shapeKey } from '../../utils/pitch';
import { SECTION_KINDS, SECTION_KIND_LABELS, SectionKind, Song } from './types';
import { buildChordSheet } from './logic/chordSheet';
import { addSection } from './logic/songEdits';
import { serializeSong } from './logic/songIO';
import ChordSheetView, { SheetHighlight } from './components/ChordSheetView';
import PlaybackPanel from './components/PlaybackPanel';
import useSongPlayback, { PlaybackMode } from './useSongPlayback';
import OrderEditor from './components/OrderEditor';
import SectionEditor from './components/SectionEditor';
import SongSettings from './components/SongSettings';
import './songSheet.css';

type View = 'edit' | 'sheet';

export function downloadSong(song: Song) {
  const blob = new Blob([serializeSong(song)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${song.title.replace(/[\\/:*?"<>|]/g, '_') || 'song'}.fretflow.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** order에 나오는 순서대로, 그 뒤에 순서에 없는 섹션. */
function sectionsInDisplayOrder(song: Song) {
  const ids = [...new Set([...song.order, ...Object.keys(song.sections)])];
  return ids.map((id) => song.sections[id]).filter(Boolean);
}

export default function SongEditorPage() {
  const { id = '' } = useParams();
  const song = useSongStore((state) => state.songs[id]);

  if (!song) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">곡을 찾을 수 없습니다.</Typography>
          <Button component={Link} to="/songs" startIcon={<ArrowBack />}>
            곡 목록으로
          </Button>
        </Stack>
      </Container>
    );
  }

  return <SongEditor song={song} />;
}

function SongEditor({ song }: { song: Song }) {
  const id = song.id;
  const updateSong = useSongStore((state) => state.updateSong);
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = searchParams.get('view') === 'sheet' ? 'sheet' : 'edit';
  const [newKind, setNewKind] = useState<SectionKind>('verse');
  const [mode, setMode] = useState<PlaybackMode>('section');
  const [loopSectionId, setLoopSectionId] = useState<string | null>(null);
  const [drumVolumeDb, setDrumVolumeDb] = useState(-12);
  const [chordVolumeDb, setChordVolumeDb] = useState(-6);

  const update = useCallback(
    (recipe: (song: Song) => Song) => updateSong(id, recipe),
    [id, updateSong],
  );
  const sheet = useMemo(() => buildChordSheet(song), [song]);
  const shape = useMemo(
    () => shapeKey(song.key, song.capo),
    [song.key, song.capo],
  );

  // 반복할 섹션이 지워졌으면 재생 순서의 첫 섹션으로 돌아간다.
  const sectionId =
    loopSectionId && song.sections[loopSectionId]
      ? loopSectionId
      : song.order[0] ?? Object.keys(song.sections)[0] ?? null;

  const playback = useSongPlayback({
    song,
    mode,
    sectionId,
    drumVolumeDb,
    chordVolumeDb,
  });
  const current = playback.isPlaying ? playback.current : null;
  const highlight = useMemo<SheetHighlight | null>(
    () =>
      current && {
        sectionId: current.sectionId,
        barIndex: current.barIndex,
        timelineIndex: mode === 'song' ? current.index : null,
      },
    [current, mode],
  );

  return (
    <Container
      maxWidth="xl"
      sx={{ py: 4, textAlign: 'left' }}
      className="song-print-root"
    >
      <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto', minWidth: 0 }}>
        <Stack
          className="no-print"
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button component={Link} to="/songs" startIcon={<ArrowBack />}>
            곡 목록
          </Button>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              flex: 1,
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '2rem' },
              minWidth: 0,
            }}
          >
            {song.title}
          </Typography>
          <Button
            startIcon={<FileDownload />}
            onClick={() => downloadSong(song)}
          >
            JSON 내보내기
          </Button>
        </Stack>

        <Box className="no-print">
          <PracticePanel controls countdown={playback.countdown}>
            <PlaybackPanel
              song={song}
              shapeKey={shape}
              mode={mode}
              sectionId={sectionId}
              drumVolumeDb={drumVolumeDb}
              chordVolumeDb={chordVolumeDb}
              isBusy={playback.isBusy}
              isPlaying={playback.isPlaying}
              error={playback.error}
              current={current}
              next={playback.next}
              onModeChange={setMode}
              onSectionChange={setLoopSectionId}
              onDrumVolumeChange={setDrumVolumeDb}
              onChordVolumeChange={setChordVolumeDb}
              onStart={playback.start}
              onStop={playback.stop}
            />
          </PracticePanel>
        </Box>

        <Tabs
          className="no-print"
          value={view}
          onChange={(_, value: View) =>
            setSearchParams(value === 'sheet' ? { view: 'sheet' } : {}, {
              replace: true,
            })
          }
        >
          <Tab value="edit" label="편집" />
          <Tab value="sheet" label="코드 악보" />
        </Tabs>

        {view === 'sheet' ? (
          <Paper
            elevation={3}
            sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, minWidth: 0 }}
          >
            <ChordSheetView sheet={sheet} current={highlight} />
          </Paper>
        ) : (
          <>
            <PracticePanel controls>
              <SongSettings
                song={song}
                onChange={(patch) => update((s) => ({ ...s, ...patch }))}
              />
            </PracticePanel>

            <PracticePanel>
              <Typography variant="h6" gutterBottom>
                재생 순서
              </Typography>
              <OrderEditor song={song} onUpdate={update} />
            </PracticePanel>

            {sectionsInDisplayOrder(song).map((section) => (
              <PracticePanel key={section.id}>
                <SectionEditor
                  section={section}
                  shapeKey={shape}
                  onUpdate={update}
                  currentBarIndex={
                    current?.sectionId === section.id ? current.barIndex : null
                  }
                />
                {!song.order.includes(section.id) && (
                  <Typography variant="caption" color="warning.main">
                    이 섹션은 재생 순서에 들어 있지 않습니다.
                  </Typography>
                )}
              </PracticePanel>
            ))}

            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="new-section-kind">새 섹션</InputLabel>
                <Select
                  labelId="new-section-kind"
                  label="새 섹션"
                  value={newKind}
                  onChange={(event) =>
                    setNewKind(event.target.value as SectionKind)
                  }
                >
                  {SECTION_KINDS.map((kind) => (
                    <MenuItem key={kind} value={kind}>
                      {SECTION_KIND_LABELS[kind]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => update((s) => addSection(s, newKind))}
              >
                섹션 추가
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
