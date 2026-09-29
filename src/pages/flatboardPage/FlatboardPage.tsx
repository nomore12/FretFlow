import React, { useState } from 'react';
import Flatboard from '../../components/fretboard/Flatboard';
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import Metronome from '../../components/metronome/Metronome2';
import {
  PracticePage,
  PracticePanel,
} from '../../components/practice/PracticeLayout';
import useNoteStore from '../../store/PracticeStore';

const FlatboardPage: React.FC = () => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rootChord, setRootChord] = useState('A');
  const [selectedScale, setSelectedScale] = useState('major');
  const addNote = useNoteStore((state) => state.addNote);

  return (
    <PracticePage title="🎸 지판 탐색기">
      <PracticePanel controls>
        <Stack spacing={3}>
          <Typography component="h2" fontWeight={600}>
            스케일 설정
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel id="fretboard-root-label">루트 음</InputLabel>
              <Select
                labelId="fretboard-root-label"
                label="루트 음"
                value={rootChord}
                onChange={(event) => setRootChord(event.target.value)}
              >
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((note) => (
                  <MenuItem key={note} value={note}>
                    {note}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel id="fretboard-scale-label">스케일</InputLabel>
              <Select
                labelId="fretboard-scale-label"
                label="스케일"
                value={selectedScale}
                onChange={(event) => setSelectedScale(event.target.value)}
              >
                <MenuItem value="major">Major</MenuItem>
                <MenuItem value="minor">Minor</MenuItem>
                <MenuItem value="pentatonicMajor">Pentatonic Major</MenuItem>
                <MenuItem value="pentatonicMinor">Pentatonic Minor</MenuItem>
                <MenuItem value="ionian">Ionian</MenuItem>
                <MenuItem value="dorian">Dorian</MenuItem>
                <MenuItem value="phrygian">Phrygian</MenuItem>
                <MenuItem value="lydian">Lydian</MenuItem>
                <MenuItem value="mixolydian">Mixolydian</MenuItem>
                <MenuItem value="aeolian">Aeolian</MenuItem>
                <MenuItem value="locrian">Locrian</MenuItem>
                <MenuItem value="melodicMinor">Melodic Minor</MenuItem>
                <MenuItem value="harmonicMinor">Harmonic Minor</MenuItem>
                <MenuItem value="minorBlues">Minor Blues</MenuItem>
                <MenuItem value="majorBlues">Major Blues</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(255,255,255,.2)' }} />
          <Metronome onCountdownChange={setCountdown} />
        </Stack>
      </PracticePanel>
      <PracticePanel countdown={countdown}>
        <Typography component="h2" fontWeight={600} mb={1}>
          스케일 지판 · {rootChord}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          mb={2}
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          좌우로 스크롤하여 전체 지판을 확인하세요.
        </Typography>
        <Box
          role="region"
          aria-label="스케일 지판"
          tabIndex={0}
          sx={{
            overflowX: 'auto',
            borderRadius: 2,
            '&:focus-visible': { outline: '2px solid #667eea' },
          }}
        >
          <Box sx={{ minWidth: 760 }}>
            <Flatboard
              rootChord={rootChord}
              selectedScale={selectedScale as 'major' | 'minor'}
              handleNodeClick={addNote}
              practiceNodes={[]}
            />
          </Box>
        </Box>
      </PracticePanel>
    </PracticePage>
  );
};

export default FlatboardPage;
