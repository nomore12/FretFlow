import chordProgressions from '../data/chordProgressions.json';
import openChords from '../data/openChords.json';
import { findChordEnhanced } from './chordGenerator';
import { Mode, degreeRootName } from './pitch';

// 타입 정의
type ChordProgressions = typeof chordProgressions;
type KeySignatures = ChordProgressions['keySignatures'];
type Progressions = ChordProgressions['progressions'];

// 코드 데이터 타입 정의
interface ChordData {
  chord: string;
  fingers: [number, number][];
  mute: number[];
  flat: number;
}

// 진행 패턴의 코드 타입 정의
interface ChordInProgression {
  degree: number;
  quality: string;
  accidental?: number;
}

// 진행 패턴 타입 정의
interface ProgressionPattern {
  id: string;
  name: string;
  pattern: ChordInProgression[];
  description: string;
  genre: string;
  difficulty: number;
}

// 난이도 레벨 정의
export enum DifficultyLevel {
  OPEN_POSITION = 1, // 오픈 포지션만
  WITH_BARRE = 2, // 오픈 포지션 + 바레
  WITH_SEVENTH = 3, // + 7th 코드
  WITH_SPECIAL = 4, // + m7b5, dim7, sus4 등
}

// 코드 타입 분류
const CHORD_TYPES = {
  OPEN: ['', 'm'], // 기본 메이저/마이너
  SEVENTH: ['7', 'maj7', 'm7'], // 7th 코드
  SPECIAL: ['m7b5', 'dim7', 'sus4', '7sus4', 'sus2', 'dim'], // 특수 코드
};

// 오픈 코드 목록 (바레 코드가 아닌 것들)
const OPEN_CHORD_NAMES = Object.keys(openChords);

/**
 * 코드가 오픈 포지션인지 확인
 */
function isOpenChord(chordName: string): boolean {
  return OPEN_CHORD_NAMES.includes(chordName);
}

/**
 * 코드 타입 추출 (예: "Cmaj7" -> "maj7")
 */
function getChordType(chordName: string): string {
  const match = chordName.match(/^[A-G][#b]?(.*)$/);
  return match ? match[1] : '';
}

/**
 * 난이도에 따른 코드 필터링
 */
export function filterChordByDifficulty(
  chordName: string,
  difficulty: DifficultyLevel,
): boolean {
  const chordType = getChordType(chordName);

  switch (difficulty) {
    case DifficultyLevel.OPEN_POSITION:
      // 1단계: 오픈 포지션 메이저/마이너만
      return isOpenChord(chordName) && CHORD_TYPES.OPEN.includes(chordType);

    case DifficultyLevel.WITH_BARRE:
      // 2단계: 오픈 포지션 + 바레 코드 (메이저/마이너)
      return CHORD_TYPES.OPEN.includes(chordType);

    case DifficultyLevel.WITH_SEVENTH:
      // 3단계: + 7th 코드
      return (
        CHORD_TYPES.OPEN.includes(chordType) ||
        CHORD_TYPES.SEVENTH.includes(chordType)
      );

    case DifficultyLevel.WITH_SPECIAL:
      // 4단계: 모든 코드
      return true;

    default:
      return true;
  }
}

/**
 * 도수를 실제 코드로 변환
 */
export function degreeToChord(
  chordInProgression: ChordInProgression,
  rootKey: string,
  difficulty: DifficultyLevel,
): string {
  const keyInfo = (chordProgressions.keySignatures as KeySignatures)[
    rootKey as keyof KeySignatures
  ];
  if (!keyInfo) {
    throw new Error(`Unknown key: ${rootKey}`);
  }

  // 임시표는 음계 칸이 아니라 반음 단위로 적용한다 (C 키 b7 = Bb).
  const noteName = degreeRootName(chordInProgression, {
    tonic: rootKey.replace(/m$/, ''),
    mode: keyInfo.type as Mode,
  });

  // 코드 퀄리티에 따른 서픽스 결정
  let suffix = '';
  switch (chordInProgression.quality) {
    case 'minor':
      suffix = 'm';
      break;
    case 'major':
      suffix = '';
      break;
    case 'maj7':
    case 'major7':
      suffix = 'maj7';
      break;
    case '7':
      suffix = '7';
      break;
    case 'm7':
      suffix = 'm7';
      break;
    case 'm7b5':
      suffix = 'm7b5';
      break;
    case 'dim7':
      suffix = 'dim7';
      break;
    case 'dim':
    case 'diminished':
      suffix = 'dim';
      break;
  }

  const chordName = noteName + suffix;

  // 난이도에 따른 코드 단순화
  if (!filterChordByDifficulty(chordName, difficulty)) {
    // 난이도에 맞지 않으면 단순화
    if (suffix.includes('7') || suffix === 'dim' || suffix.includes('b5')) {
      // 7th나 특수 코드를 기본 코드로 변환
      if (chordInProgression.quality.includes('m')) {
        return noteName + 'm';
      } else {
        return noteName;
      }
    }
  }

  return chordName;
}

/**
 * 코드 데이터 가져오기 (난이도 고려)
 */
export function getChordData(
  chordName: string,
  difficulty: DifficultyLevel,
): ChordData | null {
  // 1. 먼저 오픈 코드에서 찾기
  if (isOpenChord(chordName)) {
    const chord = (openChords as any)[chordName];
    if (chord) {
      return {
        chord: chord.chord,
        fingers: chord.fingers as [number, number][],
        mute: chord.mute,
        flat: chord.flat,
      };
    }
  }

  // 2. 난이도가 1이면 오픈 코드만 허용
  if (difficulty === DifficultyLevel.OPEN_POSITION) {
    return null;
  }

  // 3. 바레 코드나 특수 코드 생성
  try {
    const positions = findChordEnhanced(chordName, true);
    if (positions.length > 0) {
      // 난이도에 따라 적절한 포지션 선택
      for (const position of positions) {
        if (difficulty === DifficultyLevel.WITH_BARRE) {
          // 2단계에서는 바레 코드만 허용 (특수 코드 제외)
          const chordType = getChordType(chordName);
          if (CHORD_TYPES.OPEN.includes(chordType)) {
            return position as ChordData;
          }
        } else {
          // 3단계 이상에서는 모든 코드 허용
          return position as ChordData;
        }
      }
    }
  } catch (error) {
    console.error(`Error generating chord ${chordName}:`, error);
  }

  return null;
}

/**
 * 진행 패턴에서 코드 생성
 */
export function generateProgressionChords(
  progressionId: string,
  rootKey: string,
  difficulty: DifficultyLevel,
  length: 4 | 8 | 12,
): ChordData[] {
  // 진행 패턴 찾기
  const progressions = (chordProgressions.progressions as Progressions)[
    length.toString() as keyof Progressions
  ];
  const progression = progressions.find(
    (p: ProgressionPattern) => p.id === progressionId,
  );

  if (!progression) {
    throw new Error(`Progression not found: ${progressionId}`);
  }

  // 도수를 실제 코드로 변환
  const chordNames = progression.pattern.map(
    (chordInProg: ChordInProgression) =>
      degreeToChord(chordInProg, rootKey, difficulty),
  );

  // 코드 데이터 가져오기
  const chords: ChordData[] = [];
  for (const chordName of chordNames) {
    const chordData = getChordData(chordName, difficulty);
    if (chordData) {
      chords.push(chordData);
    } else {
      // 코드를 찾지 못한 경우 기본 코드로 대체
      console.warn(`Chord not found: ${chordName}, using root chord`);
      const fallbackChord = getChordData(rootKey, difficulty);
      if (fallbackChord) {
        chords.push(fallbackChord);
      }
    }
  }

  return chords;
}

/**
 * 랜덤 진행 패턴 선택
 */
export function getRandomProgression(
  length: 4 | 8 | 12,
  difficulty: DifficultyLevel,
): ProgressionPattern {
  const progressions = (chordProgressions.progressions as Progressions)[
    length.toString() as keyof Progressions
  ];

  // 난이도에 맞는 진행만 필터링
  const filteredProgressions = progressions.filter(
    (p: ProgressionPattern) => p.difficulty <= difficulty,
  );

  if (filteredProgressions.length === 0) {
    // 난이도에 맞는 진행이 없으면 가장 쉬운 것 선택
    return (
      progressions.find((p: ProgressionPattern) => p.difficulty === 1) ||
      progressions[0]
    );
  }

  const randomIndex = Math.floor(Math.random() * filteredProgressions.length);
  return filteredProgressions[randomIndex];
}

/**
 * 사용 가능한 루트 키 목록
 */
export function getAvailableRootKeys(): string[] {
  return Object.keys(chordProgressions.keySignatures).filter(
    (key) =>
      (chordProgressions.keySignatures as KeySignatures)[
        key as keyof KeySignatures
      ].type === 'major',
  );
}

/**
 * 난이도별 설명
 */
export const DIFFICULTY_DESCRIPTIONS = {
  [DifficultyLevel.OPEN_POSITION]: '오픈 포지션만',
  [DifficultyLevel.WITH_BARRE]: '오픈 포지션 + 바레',
  [DifficultyLevel.WITH_SEVENTH]: '+ 7th 코드',
  [DifficultyLevel.WITH_SPECIAL]: '+ m7b5, dim7, sus4',
};
