import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  useTheme,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ChordDisplay from './ChordDisplay';
import { chordData } from './chordData';
import {
  generateRandomChordsWithCategories,
  generateRandomChords,
} from './randomChordGenerator';
import type { ChordCategories } from './randomChordGenerator';
import { ChordGenerationMode } from './chordCategories';
import ChordPracticeMetronome from '../../components/metronome/ChordPracticeMetronome';
import { TOTAL_MEASURES } from './constants';

const ChordGridPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [hideFingers, setHideFingers] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [displayChords, setDisplayChords] = useState(chordData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ChordCategories>(
    {
      openPosition: true,
      barreChords: true,
      diminishedChords: false,
      minor7b5Chords: false,
      augmentedChords: false,
      sus4Chords: false,
      sixthChords: false,
      seventhChords: false,
    },
  );
  const [selectedMode, setSelectedMode] = useState<
    ChordGenerationMode | 'custom'
  >('custom');

  // 메트로놈 상태
  const [currentMeasure, setCurrentMeasure] = useState<number>(0);

  // 컴포넌트 마운트 시 랜덤하게 하나의 코드에 포커스
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * TOTAL_MEASURES);
    setFocusedIndex(randomIndex);
  }, []);

  // 코드 클릭 시 포커스 변경
  const handleChordClick = (index: number) => {
    setFocusedIndex(index);
  };

  const toggleHideFingers = () => {
    setHideFingers(!hideFingers);
  };

  // 메트로놈 콜백 - 마디가 끝날 때마다 호출되어 코드 포커스 변경
  const handleMeasureComplete = (completedMeasures: number) => {
    const nextMeasure =
      completedMeasures >= TOTAL_MEASURES ? 0 : completedMeasures;
    setCurrentMeasure(nextMeasure);
    setFocusedIndex(nextMeasure);
  };

  // 메트로놈 플레이 상태 변경 핸들러
  const handlePlayStateChange = (playing: boolean) => {
    if (playing) {
      // 메트로놈 시작 시 첫 번째 코드로 포커스 설정
      setCurrentMeasure(0);
      setFocusedIndex(0);
    } else {
      // 메트로놈 정지 시 마디 초기화
      setCurrentMeasure(0);
    }
  };

  // 체크박스 변경 핸들러
  const handleCategoryChange = (category: keyof ChordCategories) => {
    // 현재 선택된 카테고리 개수 확인
    const currentSelectedCount =
      Object.values(selectedCategories).filter(Boolean).length;

    // 마지막 하나를 비활성화하려고 하는 경우 방지
    if (currentSelectedCount === 1 && selectedCategories[category]) {
      alert('최소 1개 이상의 코드 카테고리를 선택해야 합니다.');
      return;
    }

    setSelectedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 모드 변경 핸들러
  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: ChordGenerationMode | 'custom' | null,
  ) => {
    if (newMode !== null) {
      setSelectedMode(newMode);
    }
  };

  // 랜덤 코드 생성
  const generateNewChords = async () => {
    setIsGenerating(true);

    try {
      // 로딩 시뮬레이션 제거
      // await new Promise((resolve) => setTimeout(resolve, 500));

      let newChords;
      if (selectedMode === 'custom') {
        newChords = generateRandomChordsWithCategories(selectedCategories);
      } else {
        newChords = generateRandomChords(selectedMode);
      }

      setDisplayChords(newChords);

      // 새로운 랜덤 포커스 설정
      const randomIndex = Math.floor(Math.random() * TOTAL_MEASURES);
      setFocusedIndex(randomIndex);
    } catch (error) {
      console.error('코드 생성 실패:', error);
      // 실패 시 기본 코드로 복원
      setDisplayChords(chordData);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        {/* <Typography
          variant="h4"
          component="h1"
          fontWeight="bold"
          mb={2}
          textAlign="center"
        >
          기타 코드 연습
        </Typography> */}

        {/* 컨트롤 영역 - 가로 레이아웃 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* 통합 컨트롤 영역 */}
          <Box
            sx={{
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              bgcolor: '#fafafa',
              maxWidth: 400,
              flex: '1 1 400px',
            }}
          >
            <Typography variant="body2" fontWeight="bold" mb={1.5}>
              난이도 설정
            </Typography>

            <ToggleButtonGroup
              value={selectedMode}
              exclusive
              onChange={handleModeChange}
              aria-label="difficulty mode"
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value={ChordGenerationMode.BEGINNER}>
                초급
              </ToggleButton>
              <ToggleButton value={ChordGenerationMode.INTERMEDIATE}>
                중급
              </ToggleButton>
              <ToggleButton value={ChordGenerationMode.ADVANCED}>
                고급
              </ToggleButton>
              <ToggleButton value="custom">커스텀</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="body2" fontWeight="bold" mb={1.5}>
              코드 카테고리{' '}
              {selectedMode !== 'custom' && '(커스텀 모드에서만 선택 가능)'}
            </Typography>
            <Grid
              container
              spacing={0.5}
              sx={{
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.openPosition}
                      onChange={() => handleCategoryChange('openPosition')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="오픈포지션"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.barreChords}
                      onChange={() => handleCategoryChange('barreChords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="하이코드(5,6번줄)"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.diminishedChords}
                      onChange={() => handleCategoryChange('diminishedChords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="Diminished"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.minor7b5Chords}
                      onChange={() => handleCategoryChange('minor7b5Chords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="Minor7b5"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.augmentedChords}
                      onChange={() => handleCategoryChange('augmentedChords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="Augmented"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.sus4Chords}
                      onChange={() => handleCategoryChange('sus4Chords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="Sus4"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedCategories.seventhChords}
                      onChange={() => handleCategoryChange('seventhChords')}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label="7th 코드"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.75rem' },
                    '& .MuiCheckbox-root': { py: 0.5 },
                  }}
                />
              </Grid>
            </Grid>

            {/* 버튼 영역 */}
            <Stack direction="row" spacing={1} width="100%">
              <Button
                variant="contained"
                color="success"
                onClick={generateNewChords}
                disabled={isGenerating}
                sx={{ fontSize: '0.9rem' }}
                fullWidth
              >
                {isGenerating ? '생성 중...' : '코드 생성'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={toggleHideFingers}
                sx={{ fontSize: '0.9rem' }}
                fullWidth
              >
                {hideFingers ? '운지법 보이기' : '운지법 숨기기'}
              </Button>
            </Stack>
          </Box>

          {/* 메트로놈 */}
          <ChordPracticeMetronome
            onMeasureComplete={handleMeasureComplete}
            onPlayStateChange={handlePlayStateChange}
            currentMeasure={currentMeasure}
            totalMeasures={TOTAL_MEASURES}
          />
        </Box>
      </Box>

      <Grid container spacing={2} justifyContent="center">
        {displayChords.map((chord, index) => (
          <Grid item xs={6} sm={6} md={3} lg={3} key={index}>
            <Box
              onClick={() => handleChordClick(index)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleChordClick(index);
                }
              }}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                '&:focus': {
                  outline: '2px solid #1976d2',
                  borderRadius: 1,
                },
              }}
            >
              <ChordDisplay
                chord={chord}
                focused={focusedIndex === index}
                hide={hideFingers}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default ChordGridPage;
