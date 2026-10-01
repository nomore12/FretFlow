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
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.75,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
        재생 순서
      </Typography>
      {song.order.length === 0 && (
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          비어 있습니다. 오른쪽에서 섹션을 추가하세요.
        </Typography>
      )}
      {song.order.map((sectionId, index) => (
        <Paper
          key={`${sectionId}-${index}`}
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            pl: 1,
            borderRadius: 5,
            color: 'text.primary',
            '& .MuiIconButton-root': { p: 0.25 },
          }}
        >
          <Typography variant="body2" sx={{ mr: 0.25 }}>
            {index + 1}. {song.sections[sectionId]?.name}
          </Typography>
          <IconButton
            size="small"
            aria-label="앞으로"
            disabled={index === 0}
            onClick={() => onUpdate((s) => moveInOrder(s, index, index - 1))}
          >
            <ArrowBack fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="뒤로"
            disabled={index === song.order.length - 1}
            onClick={() => onUpdate((s) => moveInOrder(s, index, index + 1))}
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
      {sections.length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <FormControl size="small" sx={{ width: 120 }}>
            <InputLabel id="order-add">섹션</InputLabel>
            <Select
              labelId="order-add"
              label="섹션"
              value={selected}
              onChange={(event) => setToAdd(event.target.value)}
              sx={{ '& .MuiSelect-select': { py: 0.5 } }}
            >
              {sections.map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            color="inherit"
            startIcon={<Add />}
            onClick={() => onUpdate((s) => appendToOrder(s, selected))}
          >
            추가
          </Button>
        </Stack>
      )}
    </Box>
  );
}
