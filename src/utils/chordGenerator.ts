// 기타 코드 자동 생성 유틸리티

// 음계 정의
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

// 표준 기타 줄 튜닝 (E A D G B E)
const STANDARD_TUNING = [4, 9, 2, 7, 11, 4]; // 각 줄의 음 (0=C, 1=C#, 2=D, ...)

// 코드 구성음 인터벌 정의
const CHORD_INTERVALS = {
  // 메이저/마이너
  major: [0, 4, 7],
  minor: [0, 3, 7],

  // 7th 코드
  '7': [0, 4, 7, 10], // Dominant 7th
  maj7: [0, 4, 7, 11], // Major 7th
  m7: [0, 3, 7, 10], // Minor 7th
  m7b5: [0, 3, 6, 10], // Half diminished
  dim7: [0, 3, 6, 9], // Diminished 7th

  // 특수 코드
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  aug: [0, 4, 8],
  dim: [0, 3, 6],

  // 확장 코드
  '9': [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],

  // 6th 코드
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],

  // Add 코드
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
};

// 코드 타입 정의
type ChordType = keyof typeof CHORD_INTERVALS;

// 코드 포지션 인터페이스
interface ChordPosition {
  chord: string;
  fingers: [number, number][]; // [string, fret]
  mute: number[];
  flat: number; // 바레 코드의 경우 바레를 누르는 프렛
  quality?: string; // 코드 품질 (예: 전체 음이 포함되었는지)
}

// baseChordsForm.json 데이터 임포트
import baseChordsForm from '../data/baseChordsForm.json';

// 템플릿 기반 코드 생성을 위한 타입 정의
type BaseChordFormKey = keyof typeof baseChordsForm;
type ChordSuffix =
  | 'maj'
  | 'minor'
  | '7'
  | 'maj7'
  | 'minor7'
  | 'minmaj7'
  | 'm7b5'
  | 'dim'
  | 'dim7'
  | 'sus4'
  | '7sus4';

// 루트 노트를 기반으로 코드 구성음 계산
function getChordNotes(root: string, chordType: ChordType): number[] {
  const rootIndex =
    NOTES.indexOf(root) !== -1 ? NOTES.indexOf(root) : FLAT_NOTES.indexOf(root);
  const intervals = CHORD_INTERVALS[chordType];
  return intervals.map((interval) => rootIndex + interval);
}

// 코드 폼 생성 (바레 코드)
function generateBarreChord(
  root: string,
  chordType: ChordType,
  baseString: 5 | 6,
): ChordPosition {
  const rootIndex =
    NOTES.indexOf(root) !== -1 ? NOTES.indexOf(root) : FLAT_NOTES.indexOf(root);

  // 베이스 노트 위치 찾기
  let baseFret = 0;
  if (baseString === 6) {
    // 6번줄 기반 (E형)
    baseFret = (rootIndex - STANDARD_TUNING[5] + 12) % 12;
  } else {
    // 5번줄 기반 (A형)
    baseFret = (rootIndex - STANDARD_TUNING[4] + 12) % 12;
  }

  if (baseFret === 0) baseFret = 12; // 0프렛은 12프렛으로

  let fingers: [number, number][] = [];
  const mute: number[] = [];

  if (baseString === 6 && chordType === 'major') {
    // E형 메이저 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 1]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 6 && chordType === 'minor') {
    // E형 마이너 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 5 && chordType === 'major') {
    // A형 메이저 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret + 2]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 5 && chordType === 'minor') {
    // A형 마이너 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret + 1]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 6 && chordType === '7') {
    // E형 7th 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret]);
    fingers.push([3, baseFret + 1]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 5 && chordType === '7') {
    // A형 7th 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret + 2]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 6 && chordType === 'm7') {
    // E형 m7 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 5 && chordType === 'm7') {
    // A형 m7 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret + 1]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 6 && chordType === 'maj7') {
    // E형 maj7 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 1]);
    fingers.push([3, baseFret + 1]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 5 && chordType === 'maj7') {
    // A형 maj7 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 1]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret + 2]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 6 && chordType === 'sus4') {
    // E형 sus4 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 5 && chordType === 'sus4') {
    // A형 sus4 코드
    fingers.push([5, baseFret]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret + 3]);
    fingers.push([1, baseFret]);
    mute.push(6);
  } else if (baseString === 6 && chordType === 'sus2') {
    // E형 sus2 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret - 1]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 6 && chordType === 'dim') {
    // E형 dim 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 1]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret - 1]);
    mute.push(1);
  } else if (baseString === 6 && chordType === 'aug') {
    // E형 aug 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 2]);
    fingers.push([3, baseFret + 2]);
    fingers.push([2, baseFret + 1]);
    fingers.push([1, baseFret]);
  } else if (baseString === 6 && chordType === 'm7b5') {
    // E형 m7b5 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 2]);
    fingers.push([4, baseFret + 1]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret]);
    fingers.push([1, baseFret]);
  } else if (baseString === 6 && chordType === 'dim7') {
    // E형 dim7 코드
    fingers.push([6, baseFret]);
    fingers.push([5, baseFret + 1]);
    fingers.push([4, baseFret + 1]);
    fingers.push([3, baseFret]);
    fingers.push([2, baseFret - 1]);
    mute.push(1);
  }

  // 음수 프렛 처리 (0보다 작으면 조정)
  fingers = fingers.filter(([, fret]) => fret > 0);

  // 최소 프렛 찾기 (바레 위치)
  const minFret = Math.min(...fingers.map((f) => f[1]));
  return {
    chord:
      root +
      (chordType === 'major' ? '' : chordType === 'minor' ? 'm' : chordType),
    fingers,
    mute,
    flat: minFret,
  };
}

// 다양한 포지션에서 코드 생성
function generateChordPositions(
  root: string,
  chordType: ChordType,
): ChordPosition[] {
  const positions: ChordPosition[] = [];

  // 6번줄 기반 바레 코드
  positions.push(generateBarreChord(root, chordType, 6));

  // 5번줄 기반 바레 코드
  positions.push(generateBarreChord(root, chordType, 5));

  // 추가 포지션들...

  return positions;
}

// 코드 검색 함수
export function findChord(chordName: string): ChordPosition[] {
  // 코드 이름 파싱
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return [];

  const [, root, suffix] = match;
  let chordType: ChordType = 'major';

  if (suffix === 'm') chordType = 'minor';
  else if (suffix === '7') chordType = '7';
  else if (suffix === 'maj7') chordType = 'maj7';
  else if (suffix === 'm7') chordType = 'm7';
  else if (suffix === 'm7b5') chordType = 'm7b5';
  else if (suffix === 'dim7') chordType = 'dim7';
  else if (suffix === 'sus2') chordType = 'sus2';
  else if (suffix === 'sus4') chordType = 'sus4';
  else if (suffix === 'aug') chordType = 'aug';
  else if (suffix === 'dim') chordType = 'dim';
  else if (suffix) return []; // 지원하지 않는 코드 타입

  // 모양이 정의되지 않은 줄 기준(예: 5번 줄 sus2)은 운지가 비어 개방현 6줄이
  // 되므로 후보에서 뺀다.
  return generateChordPositions(root, chordType).filter(
    (position) => position.fingers.length > 0,
  );
}

// 모든 코드 생성 (캐싱용)
export function generateAllChords(): Record<string, ChordPosition[]> {
  const allChords: Record<string, ChordPosition[]> = {};

  // 모든 루트 노트에 대해
  for (const root of NOTES) {
    // 모든 코드 타입에 대해
    for (const chordType of Object.keys(CHORD_INTERVALS) as ChordType[]) {
      const chordName =
        root +
        (chordType === 'major' ? '' : chordType === 'minor' ? 'm' : chordType);
      allChords[chordName] = generateChordPositions(root, chordType);
    }
  }

  return allChords;
}

// 코드 난이도 계산 (초보자 친화적인 코드 찾기)
export function calculateChordDifficulty(position: ChordPosition): number {
  let difficulty = 0;

  // 바레 코드는 난이도 증가
  if (position.flat > 0) difficulty += position.flat * 2;

  // 운지 간격이 넓을수록 난이도 증가
  const frets = position.fingers.map((f) => f[1]);
  const span = Math.max(...frets) - Math.min(...frets);
  difficulty += span;

  // 뮤트 줄이 많을수록 난이도 증가
  difficulty += position.mute.length * 0.5;

  // 많은 손가락을 사용할수록 난이도 증가
  difficulty += position.fingers.length * 0.3;

  return difficulty;
}

// 가장 쉬운 포지션 찾기
export function findEasiestPosition(chordName: string): ChordPosition | null {
  const positions = findChord(chordName);
  if (positions.length === 0) return null;

  return positions.reduce((easiest, current) =>
    calculateChordDifficulty(current) < calculateChordDifficulty(easiest)
      ? current
      : easiest,
  );
}

//   1. parseChordName(): 코드 이름을 루트음과 서픽스로 분리
//   2. suffixToTemplateKey(): 코드 서픽스를 템플릿 키로 변환
//   3. generateChordFromTemplate(): baseChordsForm.json을 활용한 코드 생성
//   4. findChordEnhanced(): 템플릿 기반과 기존 로직을 모두 지원하는 통합 함수

// 코드 이름에서 루트음과 서픽스 파싱
function parseChordName(
  chordName: string,
): { root: string; suffix: string } | null {
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;

  const [, root, suffix] = match;
  return { root, suffix };
}

// 서픽스를 템플릿 키로 변환
function suffixToTemplateKey(suffix: string): ChordSuffix | null {
  const suffixMap: Record<string, ChordSuffix> = {
    '': 'maj',
    m: 'minor',
    '7': '7',
    maj7: 'maj7',
    M7: 'maj7',
    m7: 'minor7',
    min7: 'minor7',
    mM7: 'minmaj7',
    'm(maj7)': 'minmaj7',
    m7b5: 'm7b5',
    ø7: 'm7b5',
    dim: 'dim',
    '°': 'dim',
    dim7: 'dim7',
    '°7': 'dim7',
    sus4: 'sus4',
    sus: 'sus4',
    '7sus4': '7sus4',
    '7sus': '7sus4',
  };

  return suffixMap[suffix] || null;
}

// 템플릿 기반 코드 생성 (baseChordsForm.json 활용)
export function generateChordFromTemplate(
  chordName: string,
  baseString?: 5 | 6,
): ChordPosition[] {
  const parsed = parseChordName(chordName);
  if (!parsed) return [];

  const { root, suffix } = parsed;
  const templateSuffix = suffixToTemplateKey(suffix);
  if (!templateSuffix) return [];

  const rootIndex =
    NOTES.indexOf(root) !== -1 ? NOTES.indexOf(root) : FLAT_NOTES.indexOf(root);
  if (rootIndex === -1) return [];

  const results: ChordPosition[] = [];

  // baseString이 지정되면 해당하는 것만, 아니면 5번줄과 6번줄 모두 생성
  const baseStrings = baseString ? [baseString] : ([6, 5] as const);

  for (const base of baseStrings) {
    const templateKey = `${base}_${templateSuffix}` as BaseChordFormKey;
    const template = baseChordsForm[templateKey];

    if (!template) continue;

    // 근음 위치 계산
    let baseFret: number;
    if (base === 6) {
      // 6번줄 기반 (E 줄)
      baseFret = rootIndex - STANDARD_TUNING[5];
      if (baseFret < 0) baseFret += 12;
    } else {
      // 5번줄 기반 (A 줄)
      baseFret = rootIndex - STANDARD_TUNING[1]; // 인덱스 4 → 1로 수정
      if (baseFret < 0) baseFret += 12;
    }

    // 디버깅 로그
    console.log(
      `[generateChordFromTemplate] ${chordName} on ${base}th string:`,
    );
    console.log(`  rootIndex: ${rootIndex}, baseFret: ${baseFret}`);
    console.log(`  template.flat: ${template.flat}`);

    // 템플릿의 프렛을 실제 위치로 변환
    const transposedFingers: [number, number][] = template.fingers.map(
      ([string, fret]) => [string, fret - template.flat + baseFret],
    );

    // 근음이 개방현 근처라 음수 프렛이 필요하면 이 줄 기준으로는 잡을 수 없다.
    // 0프렛으로 바꾸면 다른 음이 나므로 후보에서 뺀다.
    if (transposedFingers.some(([, fret]) => fret < 0)) continue;

    // 0 또는 음수 프렛 처리
    const validFingers = transposedFingers.filter(([, fret]) => fret >= 0);

    // 실제 최소 프렛 계산 (디스플레이용)
    const actualMinFret =
      validFingers.length > 0 ? Math.min(...validFingers.map((f) => f[1])) : 1;

    // 0프렛이 포함된 경우 flat을 1로 설정
    const displayFlat = actualMinFret < 1 ? 1 : actualMinFret;
    console.log(base, ', actual fret: ', actualMinFret);

    results.push({
      chord: chordName,
      fingers: validFingers,
      mute: [...template.mute],
      flat: displayFlat,
    });
  }

  return results;
}

// 두 가지 방식을 모두 지원하는 통합 함수
export function findChordEnhanced(
  chordName: string,
  useTemplate: boolean = true,
): ChordPosition[] {
  if (useTemplate) {
    const templateResults = generateChordFromTemplate(chordName);
    if (templateResults.length > 0) return templateResults;
  }

  // 템플릿에서 찾지 못하면 기존 로직 사용
  return findChord(chordName);
}
