import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  ContentCopy,
  Delete,
  DriveFileRenameOutline,
  FileUpload,
} from '@mui/icons-material';
import {
  PracticePage,
  PracticePanel,
} from '../../components/practice/PracticeLayout';
import useSongStore from '../../store/useSongStore';
import { keyLabel } from '../../utils/pitch';
import { parseSongJson } from './logic/songIO';
import { Song } from './types';

const formatDate = (time: number) =>
  new Date(time).toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

export default function SongListPage() {
  const navigate = useNavigate();
  const songs = useSongStore((state) => state.songs);
  const {
    createSong,
    importSong,
    renameSong,
    deleteSong,
    duplicateSong,
    seedIfEmpty,
  } = useSongStore.getState();
  const [title, setTitle] = useState('');
  const [renaming, setRenaming] = useState<Song | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleting, setDeleting] = useState<Song | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const list = Object.values(songs).sort((a, b) => b.updatedAt - a.updatedAt);

  const create = () => {
    const id = createSong(title.trim() || '새 곡');
    setTitle('');
    navigate(`/songs/${id}`);
  };

  const importFile = async (file: File) => {
    const result = parseSongJson(await file.text());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    navigate(`/songs/${importSong(result.data)}`);
  };

  return (
    <PracticePage title="송 스케치패드">
      <PracticePanel controls>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            size="small"
            label="새 곡 제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') create();
            }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Add />}
            onClick={create}
            sx={{ color: '#5b4a9e' }}
          >
            새 곡 만들기
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<FileUpload />}
            onClick={() => fileInput.current?.click()}
          >
            JSON 가져오기
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) importFile(file);
            }}
          />
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5 }}>
          내보내기·가져오기 파일에는 곡(코드·가사·설정)만 들어가며, 녹음
          테이크는 포함되지 않습니다.
        </Typography>
      </PracticePanel>

      {importError && (
        <Alert
          severity="error"
          onClose={() => setImportError(null)}
          sx={{ width: '100%' }}
        >
          가져오지 못했습니다: {importError}
        </Alert>
      )}

      <PracticePanel>
        <Box sx={{ textAlign: 'left' }}>
          {list.length === 0 ? (
            <Typography color="text.secondary">곡이 없습니다.</Typography>
          ) : (
            <List disablePadding>
              {list.map((song) => (
                <ListItem
                  key={song.id}
                  disablePadding
                  secondaryAction={
                    <Stack direction="row">
                      <Tooltip title="이름 변경">
                        <IconButton
                          aria-label={`${song.title} 이름 변경`}
                          onClick={() => {
                            setRenaming(song);
                            setRenameText(song.title);
                          }}
                        >
                          <DriveFileRenameOutline />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="복제">
                        <IconButton
                          aria-label={`${song.title} 복제`}
                          onClick={() => duplicateSong(song.id)}
                        >
                          <ContentCopy />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton
                          aria-label={`${song.title} 삭제`}
                          onClick={() => setDeleting(song)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                  sx={{
                    bgcolor: 'rgba(255,255,255,.7)',
                    borderRadius: 2,
                    mb: 1,
                    pr: 18,
                  }}
                >
                  <ListItemButton
                    component={Link}
                    to={`/songs/${song.id}`}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemText
                      primary={song.title}
                      secondary={`키 ${keyLabel(song.key)}${song.capo ? ` · 카포 ${song.capo}` : ''} · ${song.bpm} BPM · ${formatDate(song.updatedAt)}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </PracticePanel>

      <Dialog open={renaming !== null} onClose={() => setRenaming(null)}>
        <DialogTitle>곡 이름 변경</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            value={renameText}
            onChange={(event) => setRenameText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && renaming && renameText.trim()) {
                renameSong(renaming.id, renameText.trim());
                setRenaming(null);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(null)}>취소</Button>
          <Button
            disabled={!renameText.trim()}
            onClick={() => {
              if (renaming) renameSong(renaming.id, renameText.trim());
              setRenaming(null);
            }}
          >
            변경
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)}>
        <DialogTitle>곡 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &ldquo;{deleting?.title}&rdquo;을(를) 삭제할까요? 이 곡의 녹음
            테이크도 함께 삭제되며 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>취소</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleting) deleteSong(deleting.id);
              setDeleting(null);
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </PracticePage>
  );
}
