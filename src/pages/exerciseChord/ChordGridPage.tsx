import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  PracticePage,
  PracticePanel,
} from '../../components/practice/PracticeLayout';
import { Divider } from '@mui/material';
import { Shuffle } from '@mui/icons-material';
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
  const [countdown, setCountdown] = useState<number | null>(null);
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

  const categories: [keyof ChordCategories, string][] = [
    ['openPosition', '오픈포지션'],
    ['barreChords', '하이코드(5,6번줄)'],
    ['diminishedChords', 'Diminished'],
    ['minor7b5Chords', 'Minor7b5'],
    ['augmentedChords', 'Augmented'],
    ['sus4Chords', 'Sus4'],
    ['seventhChords', '7th 코드'],
  ];

  return (
    <PracticePage title="🎸 코드 트레이닝">
      <PracticePanel controls>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ md: 'end' }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography component="h2" fontWeight={600} mb={1.5}>
                난이도 설정
              </Typography>
              <ToggleButtonGroup
                value={selectedMode}
                exclusive
                onChange={handleModeChange}
                aria-label="난이도 설정"
                fullWidth
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: 'white',
                    borderColor: 'rgba(255,255,255,.35)',
                    py: 1,
                    '&.Mui-selected': {
                      color: 'white',
                      bgcolor: 'rgba(255,255,255,.25)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
                    },
                  },
                }}
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
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                startIcon={<Shuffle />}
                onClick={generateNewChords}
                disabled={isGenerating}
                sx={{
                  bgcolor: 'rgba(255,255,255,.2)',
                  minHeight: 42,
                  '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
                }}
              >
                {isGenerating ? '생성 중...' : '코드 생성'}
              </Button>
              <Button
                variant="outlined"
                onClick={toggleHideFingers}
                aria-pressed={hideFingers}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,.5)',
                  minHeight: 42,
                }}
              >
                {hideFingers ? '운지법 보이기' : '운지법 숨기기'}
              </Button>
            </Stack>
          </Stack>
          <Box>
            <Typography variant="body2" fontWeight={600} mb={1}>
              코드 카테고리
              {selectedMode !== 'custom' && ' · 커스텀 모드에서 선택'}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                columnGap: 2,
                rowGap: 0.5,
              }}
            >
              {categories.map(([key, label]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={selectedCategories[key]}
                      onChange={() => handleCategoryChange(key)}
                      size="small"
                      disabled={selectedMode !== 'custom'}
                    />
                  }
                  label={label}
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '.875rem' },
                  }}
                />
              ))}
            </Box>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,.2)' }} />
          <ChordPracticeMetronome
            onCountdownChange={setCountdown}
            onMeasureComplete={handleMeasureComplete}
            onPlayStateChange={handlePlayStateChange}
            currentMeasure={currentMeasure}
            totalMeasures={TOTAL_MEASURES}
          />
        </Stack>
      </PracticePanel>
      <PracticePanel countdown={countdown}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography component="h2" fontWeight={600}>
            코드 진행
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {TOTAL_MEASURES}마디
          </Typography>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {displayChords.map((chord, index) => (
            <Box
              key={index}
              role="button"
              tabIndex={0}
              aria-label={`${index + 1}마디 ${chord.chord}`}
              aria-pressed={focusedIndex === index}
              onClick={() => handleChordClick(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleChordClick(index);
                }
              }}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                '&:focus-visible': {
                  outline: '3px solid #667eea',
                  outlineOffset: 2,
                },
              }}
            >
              <ChordDisplay
                chord={chord}
                focused={focusedIndex === index}
                hide={hideFingers}
              />
            </Box>
          ))}
        </Box>
      </PracticePanel>
    </PracticePage>
  );
};

export default ChordGridPage;
