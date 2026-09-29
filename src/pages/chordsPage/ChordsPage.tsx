import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Tabs,
  Slider,
  Select,
  RadioGroup,
} from '@radix-ui/themes';
import Chords from '../../components/chords/Chords';
import useTonePlayer from '../../hooks/useTonePlayer';
import CustomChordDisplay from './CustomChordDisplay';
import {
  DifficultyLevel,
  DIFFICULTY_DESCRIPTIONS,
  generateProgressionChords,
  getRandomProgression,
  getAvailableRootKeys,
} from '../../utils/chordProgressionGenerator';
import chordProgressions from '../../data/chordProgressions.json';

interface ChordData {
  chord: string;
  fingers: [number, number][];
  mute: number[];
  flat: number;
}

interface ProgressionOption {
  id: string;
  name: string;
  description: string;
}

const ChordsPage = () => {
  // 상태 관리
  const [currentChord, setCurrentChord] = useState<ChordData | null>(null);
  const [nextChord, setNextChord] = useState<ChordData | null>(null);
  const [chordArr, setChordArr] = useState<ChordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);

  // 설정 상태
  const [rootKey, setRootKey] = useState<string>('C');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    DifficultyLevel.OPEN_POSITION,
  );
  const [chordLength, setChordLength] = useState<4 | 8 | 12>(4);
  const [selectedProgression, setSelectedProgression] = useState<string>('');

  // 재생 관련 상태
  const [bpm, setBpm] = useState<number>(60);
  const [volume, setVolume] = useState(10);
  const [beat, setBeat] = useState<'4' | '8' | '16'>('4');

  // 코드 진행 옵션 가져오기
  const progressionOptions: ProgressionOption[] = (
    chordProgressions.progressions[
      chordLength.toString() as keyof typeof chordProgressions.progressions
    ] || []
  ).filter((p: any) => p.difficulty <= difficulty);

  const { handlePlay, handleStop, isBusy, countdown, error } = useTonePlayer({
    bpm,
    volume,
    beat,
    callback: playCallback,
  });

  // 재생 콜백 함수
  function playCallback() {
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % chordArr.length;
      setCurrentChord(chordArr[newIndex]);
      return newIndex;
    });
    setNextIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % chordArr.length;
      setNextChord(chordArr[newIndex]);
      return newIndex;
    });
  }

  // 코드 진행 생성
  const generateChords = useCallback(() => {
    try {
      let progressionId = selectedProgression;

      // 랜덤 선택인 경우
      if (!progressionId || progressionId === 'random') {
        const randomProg = getRandomProgression(chordLength, difficulty);
        progressionId = randomProg.id;
      }

      const chords = generateProgressionChords(
        progressionId,
        rootKey,
        difficulty,
        chordLength,
      );

      setChordArr(chords);
      if (chords.length > 0) {
        setCurrentChord(chords[0]);
        setNextChord(chords[1] || chords[0]);
        setCurrentIndex(0);
        setNextIndex(1);
      }
    } catch (error) {
      console.error('코드 생성 오류:', error);
    }
  }, [selectedProgression, rootKey, difficulty, chordLength]);

  // 초기 코드 생성
  useEffect(() => {
    generateChords();
  }, [generateChords]);

  // 시작 버튼 핸들러 (카운트다운 포함)
  const handleStart = () => {
    void handlePlay(5);
  };

  // 정지 버튼 핸들러
  const handleStopAndReset = () => {
    handleStop();
    setCurrentIndex(0);
    setNextIndex(1);
    if (chordArr.length > 0) {
      setCurrentChord(chordArr[0]);
      setNextChord(chordArr[1] || chordArr[0]);
    }
  };

  // BPM 변경 핸들러
  const onChangeBpm = (value: number[]) => {
    if (value[0] < 40 || value[0] >= 300) {
      return;
    }
    setBpm(value[0]);
  };

  return (
    <Flex gap="5" direction="column" align="center">
      <Box py="6">
        <Text size="9">코드 연습</Text>
      </Box>

      {error && (
        <Text color="red" role="alert">
          {error}
        </Text>
      )}

      {/* 설정 영역 */}
      <Box style={{ width: '600px' }}>
        <Flex direction="column" gap="4">
          {/* 근음 선택 */}
          <Flex align="center" gap="3">
            <Text size="3" style={{ width: '100px' }}>
              근음:
            </Text>
            <Select.Root value={rootKey} onValueChange={setRootKey}>
              <Select.Trigger style={{ flex: 1 }} />
              <Select.Content>
                <Select.Item value="random">랜덤</Select.Item>
                {getAvailableRootKeys().map((key) => (
                  <Select.Item key={key} value={key}>
                    {key}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* 난이도 선택 */}
          <Flex align="center" gap="3">
            <Text size="3" style={{ width: '100px' }}>
              난이도:
            </Text>
            <Select.Root
              value={difficulty.toString()}
              onValueChange={(value) =>
                setDifficulty(parseInt(value) as DifficultyLevel)
              }
            >
              <Select.Trigger style={{ flex: 1 }} />
              <Select.Content>
                {Object.entries(DIFFICULTY_DESCRIPTIONS).map(
                  ([level, desc]) => (
                    <Select.Item key={level} value={level}>
                      {desc}
                    </Select.Item>
                  ),
                )}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* 코드 길이 선택 */}
          <Flex align="center" gap="3">
            <Text size="3" style={{ width: '100px' }}>
              코드 길이:
            </Text>
            <RadioGroup.Root
              value={chordLength.toString()}
              onValueChange={(value) =>
                setChordLength(parseInt(value) as 4 | 8 | 12)
              }
            >
              <Flex gap="3">
                <RadioGroup.Item value="4">4코드</RadioGroup.Item>
                <RadioGroup.Item value="8">8코드</RadioGroup.Item>
                <RadioGroup.Item value="12">12코드</RadioGroup.Item>
              </Flex>
            </RadioGroup.Root>
          </Flex>

          {/* 진행 패턴 선택 */}
          <Flex align="center" gap="3">
            <Text size="3" style={{ width: '100px' }}>
              진행 패턴:
            </Text>
            <Select.Root
              value={selectedProgression}
              onValueChange={setSelectedProgression}
            >
              <Select.Trigger style={{ flex: 1 }} />
              <Select.Content>
                <Select.Item value="random">랜덤</Select.Item>
                {progressionOptions.map((prog) => (
                  <Select.Item key={prog.id} value={prog.id}>
                    {prog.name} - {prog.description}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Box>

      {/* 코드 표시 영역 */}
      <Box>
        <Flex gap="5" justify="center">
          <Box>
            <Text align="center" mb="2">
              현재 코드
            </Text>
            {currentChord && <Chords chord={currentChord} />}
          </Box>
          <Box>
            <Text align="center" mb="2">
              다음 코드
            </Text>
            {nextChord && <Chords chord={nextChord} />}
          </Box>
        </Flex>
      </Box>

      {/* 카운트다운 표시 */}
      {countdown !== null && (
        <Box>
          <Text size="9" weight="bold">
            {countdown}
          </Text>
        </Box>
      )}

      {/* 컨트롤 버튼 */}
      <Box>
        <Flex gap="4">
          <Button size="4" onClick={handleStart} disabled={isBusy}>
            시작
          </Button>
          <Button size="4" onClick={handleStopAndReset} disabled={!isBusy}>
            정지
          </Button>
          <Button size="4" onClick={generateChords} disabled={isBusy}>
            새로고침
          </Button>
        </Flex>
      </Box>

      {/* 재생 설정 */}
      <Box width="400px">
        <Flex direction="column" gap="3">
          {/* BPM 설정 */}
          <Flex align="center" justify="between">
            <Text>BPM: {bpm}</Text>
            <Box style={{ width: '250px' }}>
              <Slider
                onValueChange={onChangeBpm}
                value={[bpm]}
                max={300}
                min={40}
              />
            </Box>
          </Flex>

          {/* 볼륨 설정 */}
          <Flex align="center" justify="between">
            <Text>볼륨: {volume}</Text>
            <Box style={{ width: '250px' }}>
              <Slider
                onValueChange={(value) => setVolume(value[0])}
                value={[volume]}
                max={30}
              />
            </Box>
          </Flex>

          {/* 비트 설정 */}
          <Flex align="center" justify="between">
            <Text>비트:</Text>
            <RadioGroup.Root
              value={beat === '4' ? '1' : beat === '8' ? '2' : '3'}
              onValueChange={(value) => {
                const selectedBeat =
                  value === '1' ? '4' : value === '2' ? '8' : '16';
                setBeat(selectedBeat);
              }}
            >
              <Flex gap="3">
                <RadioGroup.Item value="1">4 beat</RadioGroup.Item>
                <RadioGroup.Item value="2">8 beat</RadioGroup.Item>
                <RadioGroup.Item value="3">16 beat</RadioGroup.Item>
              </Flex>
            </RadioGroup.Root>
          </Flex>
        </Flex>
      </Box>

      {/* 커스텀 코드 탭 */}
      <Box width="692px">
        <Tabs.Root defaultValue="generated">
          <Tabs.List>
            <Tabs.Trigger value="generated">자동 생성</Tabs.Trigger>
            <Tabs.Trigger value="custom">직접 입력</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="generated">
            <Box py="4">
              <Text size="2" color="gray">
                위 설정에서 코드 진행을 선택하고 시작 버튼을 누르세요.
              </Text>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="custom">
            <CustomChordDisplay
              setCustomChords={(chords: any[]) => {
                // ChordProps를 ChordData로 변환
                const convertedChords: ChordData[] = chords.map((chord) => ({
                  chord: chord.chord,
                  fingers: chord.fingers as [number, number][],
                  mute: chord.mute,
                  flat: chord.flat,
                }));
                setChordArr(convertedChords);
              }}
            />
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Flex>
  );
};

export default ChordsPage;
