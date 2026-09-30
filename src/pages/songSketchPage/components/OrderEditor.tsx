import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Close } from '@mui/icons-material';
import { Song } from '../types';
import {
  appendToOrder,
  moveInOrder,
  removeFromOrder,
} from '../logic/songEdits';

interface OrderEditorProps {
  song: Song;
  onUpdate: (update: (song: Song) => Song) => void;
}

/** 재생 순서 편집. 같은 섹션을 여러 번 넣을 수 있다. */
export default function OrderEditor({ song, onUpdate }: OrderEditorProps) {
  const sections = Object.values(song.sections);
  const [toAdd, setToAdd] = useState('');
  const selected = song.sections[toAdd] ? toAdd : sections[0]?.id ?? '';

  return (
    <Stack spacing={2}>
      {song.order.length === 0 ? (
        <Typography color="text.secondary">
          재생 순서가 비어 있습니다. 아래에서 섹션을 추가하세요.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {song.order.map((sectionId, index) => (
            <Paper
              key={`${sectionId}-${index}`}
              variant="outlined"
              sx={{
                display: 'flex',
                alignItems: 'center',
                pl: 1.5,
                pr: 0.5,
                py: 0.5,
                borderRadius: 5,
                color: 'text.primary',
              }}
            >
              <Typography variant="body2" sx={{ mr: 0.5 }}>
                {index + 1}. {song.sections[sectionId]?.name}
              </Typography>
              <IconButton
                size="small"
                aria-label="앞으로"
                disabled={index === 0}
                onClick={() =>
                  onUpdate((s) => moveInOrder(s, index, index - 1))
                }
              >
                <ArrowBack fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="뒤로"
                disabled={index === song.order.length - 1}
                onClick={() =>
                  onUpdate((s) => moveInOrder(s, index, index + 1))
                }
              >
                <ArrowForward fontSize="inherit" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="순서에서 빼기"
                onClick={() => onUpdate((s) => removeFromOrder(s, index))}
              >
                <Close fontSize="inherit" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
      {sections.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="order-add">섹션</InputLabel>
            <Select
              labelId="order-add"
              label="섹션"
              value={selected}
              onChange={(event) => setToAdd(event.target.value)}
            >
              {sections.map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            startIcon={<Add />}
            onClick={() => onUpdate((s) => appendToOrder(s, selected))}
          >
            순서 끝에 추가
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
