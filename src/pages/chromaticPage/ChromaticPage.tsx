import React from 'react';
import ChromaticFlatboard from '../../components/fretboard/ChromaticFlatboard';
import useNoteStore from '../../store/useNoteStore';
import {
  Alert,
  Box,
  TextField,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  Button,
  Container,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { PlayArrow, Stop, Shuffle } from '@mui/icons-material';
import { useChromaticPractice } from './useChromaticPractice';
import {
  AVAILABLE_FINGER_NUMBERS,
  MIN_BPM,
  MAX_BPM,
  PracticeMode,
} from './chromaticLogic';
// ChromaticNote is global

const ChromaticPage: React.FC = () => {
  const {
    state,
    dispatch,
    handleBpmChange,
    handleBpmBlur,
    togglePractice,
    resetToInitialPracticeState,
    handleRandomFingerPattern,
    selectedFretSequence,
    error,
  } = useChromaticPractice();

  const { isPracticePlaying } = useNoteStore();

  const handleNodeClick = (node: ChromaticNote) => {
    console.log('Node clicked:', node);
  };

  const handleFingerPatternChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as number[];
    if (Array.isArray(value)) {
      dispatch({ type: 'SET_FINGER_PATTERN', payload: [...value] });
    }
  };

  const handleBeatTypeChange = (event: SelectChangeEvent<number>) => {
    dispatch({ type: 'SET_BEAT_TYPE', payload: event.target.value as number });
  };

  const handlePracticeModeChange = (event: SelectChangeEvent<PracticeMode>) => {
    resetToInitialPracticeState();
    dispatch({
      type: 'SET_PRACTICE_MODE',
      payload: event.target.value as PracticeMode,
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" sx={{ fontWeight: 600, textAlign: 'center' }}>
          🎸 크로매틱 속도 연습
        </Typography>

        {/* Control Panel */}
        <Card
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 1200,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ py: 3, px: 4 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems="center"
              justifyContent="center"
              flexWrap="wrap"
            >
              {/* BPM Input */}
              <TextField
                label="BPM"
                type="number"
                value={state.bpm}
                onChange={(e) => {
                  const val = e.target.value;
                  handleBpmChange(val === '' ? '' : Number(val));
                }}
                onBlur={handleBpmBlur}
                sx={{
                  width: 100,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'white',
                    },
                  },
                }}
                inputProps={{
                  min: MIN_BPM,
                  max: MAX_BPM,
                  step: 1,
                }}
              />

              {/* Beat Type Select */}
              <FormControl
                sx={{
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'white',
                    },
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <InputLabel id="beat-type-label">Beat Type</InputLabel>
                <Select<number>
                  labelId="beat-type-label"
                  value={state.beatType}
                  label="Beat Type"
                  onChange={handleBeatTypeChange}
                >
                  <MenuItem value={4}>4 Beats</MenuItem>
                </Select>
              </FormControl>

              {/* Practice Mode Select */}
              <FormControl
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'white',
                    },
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <InputLabel id="practice-mode-label">Practice Mode</InputLabel>
                <Select<PracticeMode>
                  labelId="practice-mode-label"
                  value={state.practiceMode}
                  label="Practice Mode"
                  onChange={handlePracticeModeChange}
                >
                  <MenuItem value="loop">1번 프랫 반복</MenuItem>
                  <MenuItem value="traverse_with_repeat">
                    1번 프랫 반복(정방향/역방향)
                  </MenuItem>
                  <MenuItem value="traverse_6th_start">
                    프랫 하행(6번줄 시작)
                  </MenuItem>
                  <MenuItem value="traverse_1st_start">
                    프랫 하행(1번줄 시작)
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Finger Pattern Select */}
              <FormControl
                sx={{
                  minWidth: 240,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'white',
                    },
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <InputLabel id="finger-pattern-label">
                  Finger Pattern
                </InputLabel>
                <Select<number[]>
                  labelId="finger-pattern-label"
                  multiple
                  value={state.selectedFingerPattern}
                  onChange={handleFingerPatternChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((val, index) => (
                        <Chip
                          key={`${val}-${index}`}
                          label={String(val)}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            color: 'white',
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  label="Finger Pattern"
                  MenuProps={{ PaperProps: { style: { maxHeight: 200 } } }}
                >
                  {AVAILABLE_FINGER_NUMBERS.map((fingerNum) => (
                    <MenuItem key={fingerNum} value={fingerNum}>
                      {`Finger ${fingerNum}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Random Button */}
              <Tooltip title="랜덤 패턴">
                <IconButton
                  onClick={handleRandomFingerPattern}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    color: 'white',
                  }}
                >
                  <Shuffle />
                </IconButton>
              </Tooltip>

              {/* Start/Stop Button */}
              <Button
                variant="contained"
                onClick={togglePractice}
                color={
                  isPracticePlaying || state.isPreparingToPlay
                    ? 'error'
                    : 'success'
                }
                startIcon={
                  isPracticePlaying || state.isPreparingToPlay ? (
                    <Stop />
                  ) : (
                    <PlayArrow />
                  )
                }
                sx={{
                  minWidth: 120,
                  height: 56,
                  fontWeight: 600,
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 5,
                  },
                }}
              >
                {isPracticePlaying || state.isPreparingToPlay
                  ? 'Stop'
                  : 'Start'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Fretboard Card */}
        <Card
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 1200,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #dfdfdfff 0%, #e4e4e4ff 100%)',
          }}
        >
          <CardContent sx={{ p: 3, position: 'relative' }}>
            {state.isPreparingToPlay && state.countdown !== null && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  zIndex: 10,
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="h1"
                  sx={{ color: 'white', fontWeight: 'bold', fontSize: '6rem' }}
                >
                  {state.countdown > 0 ? state.countdown : 'GO!'}
                </Typography>
              </Box>
            )}
            <ChromaticFlatboard
              handleNodeClick={handleNodeClick}
              handleReset={() => resetToInitialPracticeState()}
              selectedFingerPattern={state.selectedFingerPattern}
              shouldReversePattern={state.shouldReversePattern}
              practiceMode={state.practiceMode}
            />
          </CardContent>
        </Card>

        {/* Status Text */}
        <Typography
          sx={{
            textAlign: 'center',
            minHeight: '1.5em',
            maxWidth: 1200,
            px: 2,
          }}
        >
          {isPracticePlaying
            ? `Mode: ${state.practiceMode.replace(/_/g, ' ')} - String: ${state.currentLineNumber} (${state.practiceDirection === 'asc' ? 'Ascending' : 'Descending'}) - Pattern: ${state.selectedFingerPattern.join('-')} (Frets: ${selectedFretSequence.join('-')}) - Beat: ${state.beatType}/4`
            : `Stopped. Next start: Mode: ${state.practiceMode.replace(/_/g, ' ')} - String ${state.currentLineNumber} (Ascending) - Pattern: ${state.selectedFingerPattern.join('-')} (Frets: ${selectedFretSequence.join('-')}) - Beat: ${state.beatType}/4`}
        </Typography>
      </Stack>
    </Container>
  );
};

export default ChromaticPage;
