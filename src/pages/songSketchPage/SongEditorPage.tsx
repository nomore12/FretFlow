import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, Close, FileDownload } from '@mui/icons-material';
import { PracticePanel } from '../../components/practice/PracticeLayout';
import useSongStore from '../../store/useSongStore';
import { shapeKey } from '../../utils/pitch';
import { SECTION_KINDS, SECTION_KIND_LABELS, SectionKind, Song } from './types';
import { buildChordSheet } from './logic/chordSheet';
import { addSection, applyKeyAndCapo, newId } from './logic/songEdits';
import { serializeSong } from './logic/songIO';
import ChordSheetView, { SheetHighlight } from './components/ChordSheetView';
import PlaybackPanel, { RecordingControls } from './components/PlaybackPanel';
import TakesPanel from './components/TakesPanel';
import KeyCapoCalculator from './components/KeyCapoCalculator';
import MelodyEditor from './components/MelodyEditor';
import { Take } from './recording/takes';
import useTakePlayer from './recording/useTakePlayer';
import useTakeRecorder from './recording/useTakeRecorder';
import useTakes from './recording/useTakes';
import useSongPlayback, { PlaybackMode } from './useSongPlayback';
import OrderEditor from './components/OrderEditor';
import SectionEditor from './components/SectionEditor';
import SongSettings from './components/SongSettings';
import './songSheet.css';

type View = 'edit' | 'melody' | 'sheet' | 'takes';
const VIEWS: View[] = ['edit', 'melody', 'sheet', 'takes'];

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
  const requestedView = searchParams.get('view') as View | null;
  const view: View =
    requestedView && VIEWS.includes(requestedView) ? requestedView : 'edit';
  const [newKind, setNewKind] = useState<SectionKind>('verse');
  const [mode, setMode] = useState<PlaybackMode>('section');
  const [loopSectionId, setLoopSectionId] = useState<string | null>(null);
  const [drumVolumeDb, setDrumVolumeDb] = useState(-12);
  const [chordVolumeDb, setChordVolumeDb] = useState(-6);
  const [guideTone, setGuideTone] = useState(false);
  const [guideVolumeDb, setGuideVolumeDb] = useState(0);
  const [melodyOn, setMelodyOn] = useState(true);
  // 드럼·기타 반주를 켤지 (멜로디 탭의 "멜로디만"으로 끈다)
  const [backingOn, setBackingOn] = useState(true);
  const [melodyVolumeDb, setMelodyVolumeDb] = useState(0);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const transportRef = useRef<HTMLDivElement>(null);
  const [transportHeight, setTransportHeight] = useState(0);
  useLayoutEffect(() => {
    const element = transportRef.current;
    if (!element) return;
    const measure = () => setTransportHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  const takes = useTakes(id);
  // 테이크를 반주와 함께 들을 때는 그 테이크의 섹션·템포로 반복한다.
  const [backing, setBacking] = useState<{
    take: Take;
    started: boolean;
  } | null>(null);
  const playMode: PlaybackMode = backing ? 'section' : mode;
  const playSectionId = backing ? backing.take.sectionId : sectionId;
  const bpm = backing ? backing.take.bpm : song.bpm;

  // 녹음 버튼을 누를 때의 섹션·템포를 테이크에 기록한다.
  const recordingFor = useRef<{ sectionId: string; bpm: number } | null>(null);
  // 다른 탭에서 녹음한 새 테이크 수. 테이크 탭을 열면 0이 된다.
  const [unseenTakes, setUnseenTakes] = useState(0);
  const recorder = useTakeRecorder((recorded) => {
    const target = recordingFor.current;
    if (!target) return;
    setUnseenTakes((count) => count + 1);
    takes.add({
      ...recorded,
      id: newId(),
      songId: id,
      sectionId: target.sectionId,
      bpm: target.bpm,
      createdAt: Date.now(),
      syncOffsetMs: 0,
      starred: false,
      memo: '',
    });
  });
  useEffect(() => {
    if (view === 'takes') setUnseenTakes(0);
  }, [view, unseenTakes]);
  const takePlayer = useTakePlayer((endedMode) => {
    if (endedMode === 'backing') {
      playback.stop();
      setBacking(null);
    }
  });

  const playback = useSongPlayback({
    song,
    mode: playMode,
    sectionId: playSectionId,
    bpm,
    drumVolumeDb,
    chordVolumeDb,
    guideTone,
    guideVolumeDb,
    melody: melodyOn,
    // 테이크를 반주와 함께 들을 때는 항상 반주를 낸다
    backing: backingOn || backing !== null,
    melodyVolumeDb,
    onBarStart: (measure, atMs) => {
      recorder.barStarted(measure, atMs);
      takePlayer.barStarted(measure, atMs);
    },
  });

  // 반주와 함께 듣기: 테이크 섹션으로 설정이 바뀐 뒤 카운트다운 없이 시작한다.
  useEffect(() => {
    if (backing && !backing.started && !playback.isBusy) {
      setBacking({ ...backing, started: true });
      playback.start(0);
    }
  }, [backing, playback]);

  // 반주가 멈추면 녹음을 마무리하고 함께 듣던 테이크도 멈춘다.
  const wasBusy = useRef(false);
  const backingRef = useRef(backing);
  backingRef.current = backing;
  useEffect(() => {
    if (wasBusy.current && !playback.isBusy) {
      recorder.playbackStopped();
      if (backingRef.current?.started) {
        takePlayer.stop();
        setBacking(null);
      }
    }
    wasBusy.current = playback.isBusy;
  }, [playback.isBusy, recorder, takePlayer]);

  const playTake = (take: Take, takeMode: 'solo' | 'backing') => {
    if (takeMode === 'solo') {
      if (backing) {
        playback.stop();
        setBacking(null);
      }
      takePlayer.playSolo(take);
      return;
    }
    if (playback.isBusy) playback.stop();
    takePlayer.prepareWithBacking(take);
    setBacking({ take, started: false });
  };

  const stopTake = () => {
    takePlayer.stop();
    if (backing) {
      playback.stop();
      setBacking(null);
    }
  };

  const recording: RecordingControls = {
    status: recorder.status,
    supported: recorder.supported,
    error: recorder.error,
    blockedReason: backing
      ? '테이크를 반주와 함께 듣는 중에는 녹음할 수 없습니다.'
      : playMode !== 'section'
        ? '섹션 반복 모드에서 녹음할 수 있습니다.'
        : !playback.isPlaying
          ? '섹션 반복을 재생한 뒤 녹음 버튼을 누르세요.'
          : null,
    onRecord: () => {
      if (!playSectionId) return;
      recordingFor.current = { sectionId: playSectionId, bpm };
      recorder.arm();
    },
    onStopRecord: recorder.requestStop,
    onClearError: recorder.clearError,
  };
  const current = playback.isPlaying ? playback.current : null;
  const highlight = useMemo<SheetHighlight | null>(
    () =>
      current && {
        sectionId: current.sectionId,
        barIndex: current.barIndex,
        timelineIndex: playMode === 'song' ? current.index : null,
      },
    [current, playMode],
  );

  // 재생 중인 마디가 화면 밖으로 나가면 따라간다. 가사를 입력하는 중에는 움직이지 않는다.
  useEffect(() => {
    if (!current || view !== 'edit') return;
    const active = document.activeElement;
    if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
    const element = document.querySelector(
      `[data-bar-key="${current.sectionId}:${current.barIndex}"]`,
    );
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const visibleTop = transportHeight + 16;
    if (rect.top < visibleTop || rect.bottom > window.innerHeight) {
      window.scrollTo({
        top: window.scrollY + rect.top - visibleTop - 24,
        behavior: 'smooth',
      });
    }
  }, [current, view, transportHeight]);

  return (
    <Container
      maxWidth="xl"
      sx={{ py: 2, textAlign: 'left' }}
      className="song-print-root"
    >
      <Stack spacing={2} sx={{ maxWidth: 1200, mx: 'auto', minWidth: 0 }}>
        <Stack
          className="no-print"
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            size="small"
            component={Link}
            to="/songs"
            startIcon={<ArrowBack />}
          >
            곡 목록
          </Button>
          <Typography
            variant="h5"
            component="h1"
            noWrap
            sx={{
              flex: 1,
              fontWeight: 700,
              fontSize: { xs: '1.15rem', sm: '1.5rem' },
              minWidth: 0,
            }}
          >
            {song.title}
          </Typography>
          <Button
            size="small"
            startIcon={<FileDownload />}
            onClick={() => downloadSong(song)}
          >
            JSON 내보내기
          </Button>
        </Stack>

        {/* 재생 바는 스크롤해도 위에 붙어 있어 편집하면서 바로 재생·녹음할 수 있다. */}
        <Box
          ref={transportRef}
          className="no-print"
          sx={{ position: 'sticky', top: 8, zIndex: 10 }}
        >
          <PracticePanel controls dense countdown={playback.countdown}>
            <PlaybackPanel
              song={song}
              shapeKey={shape}
              mode={playMode}
              sectionId={playSectionId}
              bpm={bpm}
              locked={recorder.busy || backing !== null}
              recording={recording}
              drumVolumeDb={drumVolumeDb}
              chordVolumeDb={chordVolumeDb}
              guideTone={guideTone}
              guideVolumeDb={guideVolumeDb}
              isBusy={playback.isBusy}
              isPlaying={playback.isPlaying}
              error={playback.error}
              current={current}
              next={playback.next}
              onModeChange={setMode}
              onSectionChange={setLoopSectionId}
              onDrumVolumeChange={setDrumVolumeDb}
              onChordVolumeChange={setChordVolumeDb}
              onGuideToneChange={setGuideTone}
              onGuideVolumeChange={setGuideVolumeDb}
              melodyVolumeDb={melodyVolumeDb}
              onMelodyVolumeChange={setMelodyVolumeDb}
              onStart={() => playback.start()}
              onStop={playback.stop}
            />
          </PracticePanel>
        </Box>

        <Tabs
          className="no-print"
          value={view}
          onChange={(_, value: View) =>
            setSearchParams(value === 'edit' ? {} : { view: value }, {
              replace: true,
            })
          }
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 1 } }}
        >
          <Tab value="edit" label="편집" />
          <Tab value="melody" label="멜로디" />
          <Tab value="sheet" label="코드 악보" />
          <Tab
            value="takes"
            label={
              unseenTakes > 0
                ? `테이크 ${takes.takes.length} · 새 ${unseenTakes}`
                : `테이크 ${takes.takes.length}`
            }
          />
        </Tabs>

        {view === 'melody' && playSectionId && song.sections[playSectionId] ? (
          <Box className="no-print">
            <PracticePanel dense>
              <MelodyEditor
                song={song}
                section={song.sections[playSectionId]}
                shapeKey={shape}
                playhead={
                  current &&
                  current.sectionId === playSectionId &&
                  playback.position
                    ? {
                        barIndex: current.barIndex,
                        step: playback.position.step,
                      }
                    : null
                }
                backing={backingOn}
                melodyOn={melodyOn}
                onSectionChange={setLoopSectionId}
                onBackingChange={setBackingOn}
                onMelodyOnChange={setMelodyOn}
                onUpdate={update}
                onPreview={playback.previewMelodyNote}
              />
            </PracticePanel>
          </Box>
        ) : view === 'takes' ? (
          <Box className="no-print">
            <PracticePanel dense>
              <TakesPanel
                song={song}
                takes={takes.takes}
                error={takes.error}
                usage={takes.usage}
                playingId={takePlayer.playingId}
                playingMode={takePlayer.playingMode}
                onPlay={playTake}
                onStop={stopTake}
                onUpdate={takes.update}
                onDelete={takes.remove}
                onClearError={takes.clearError}
              />
            </PracticePanel>
          </Box>
        ) : view === 'sheet' ? (
          <Paper
            elevation={3}
            sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, minWidth: 0 }}
          >
            <ChordSheetView sheet={sheet} current={highlight} />
          </Paper>
        ) : (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            {/* 곡 설정과 재생 순서를 한 패널에 모은다. */}
            <PracticePanel controls dense>
              <Stack spacing={1.5}>
                <SongSettings
                  song={song}
                  onChange={(patch) => update((s) => ({ ...s, ...patch }))}
                  onOpenCalculator={() => setCalculatorOpen(true)}
                />
                <OrderEditor song={song} onUpdate={update} />
              </Stack>
            </PracticePanel>

            {sectionsInDisplayOrder(song).map((section) => (
              <PracticePanel key={section.id} dense>
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
          </Stack>
        )}
      </Stack>

      <Dialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          키·카포 계산기
          <IconButton
            aria-label="닫기"
            onClick={() => setCalculatorOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <KeyCapoCalculator
            song={song}
            onApply={(tonic, capo) =>
              update((s) => applyKeyAndCapo(s, tonic, capo))
            }
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}
