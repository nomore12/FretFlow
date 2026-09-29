export const generateChromaticNotesArray = (
  line: number,
  sequence: number[],
  selectedFingerPattern: number[],
  practiceMode: PracticeMode,
  shouldReversePattern: boolean,
): ChromaticNote[] => {
  const notes = sequence.map((fretNumber, index) => {
    const fingerNumber = selectedFingerPattern[index] ?? index + 1;

    return {
      flatNumber: fretNumber,
      lineNumber: line,
      chromaticNumber: fingerNumber,
      chord: String(fingerNumber),
    };
  });

  // 프렛과 손가락의 연결을 유지하고 연주 순서만 반대로 바꾼다.
  return shouldReversePattern && practiceMode === 'traverse_with_repeat'
    ? notes.reverse()
    : notes;
};

export type PracticeMode =
  | 'loop'
  | 'traverse_6th_start'
  | 'traverse_1st_start'
  | 'traverse_with_repeat';

export type FretTraversalDirection = 'increasing' | 'decreasing' | 'done';
export type PracticeDirection = 'asc' | 'desc';

export const GUITAR_STRINGS = [6, 5, 4, 3, 2, 1];
export const MAX_FRET_OFFSET = 8;
export const DEFAULT_FRET_SEQUENCE_LENGTH = 4;
export const AVAILABLE_FINGER_NUMBERS = [1, 2, 3, 4];
export const MIN_BPM = 40;
export const MAX_BPM = 300;

export interface PracticeState {
  currentLineNumber: number;
  practiceDirection: PracticeDirection;
  currentFretOffset: number;
  fretTraversalDirection: FretTraversalDirection;
  isRepeatPhase: boolean;
  shouldReversePattern: boolean;
}

export interface NextStateResult {
  nextLineNumber: number;
  nextPracticeDirection: PracticeDirection;
  nextFretOffset: number;
  nextFretTraversalDirection: FretTraversalDirection;
  shouldStopPractice: boolean;
  nextShouldReversePattern: boolean;
  nextIsRepeatPhase: boolean;
}

export const calculateNextLoopState = (
  currentLine: number,
  currentDirection: PracticeDirection,
  currentState: PracticeState,
): NextStateResult => {
  let nextLine = currentLine;
  let nextDir = currentDirection;
  const currentLineIdx = GUITAR_STRINGS.indexOf(currentLine);
  const lastStringIdx = GUITAR_STRINGS.length - 1;
  const secondLastStringIdx = GUITAR_STRINGS.length - 2;
  const secondStringIdx = 1;
  const firstStringIdx = 0;

  if (currentDirection === 'asc') {
    if (currentLineIdx === secondLastStringIdx) {
      nextLine = GUITAR_STRINGS[currentLineIdx + 1];
      nextDir = 'desc';
    } else if (currentLineIdx < lastStringIdx) {
      nextLine = GUITAR_STRINGS[currentLineIdx + 1];
    } else {
      nextLine = currentLine;
      nextDir = 'desc';
    }
  } else {
    if (currentLineIdx === secondStringIdx) {
      nextLine = GUITAR_STRINGS[currentLineIdx - 1];
      nextDir = 'asc';
    } else if (currentLineIdx > firstStringIdx) {
      nextLine = GUITAR_STRINGS[currentLineIdx - 1];
    } else {
      nextLine = currentLine;
      nextDir = 'asc';
    }
  }

  return {
    nextLineNumber: nextLine,
    nextPracticeDirection: nextDir,
    nextFretOffset: currentState.currentFretOffset,
    nextFretTraversalDirection: currentState.fretTraversalDirection,
    shouldStopPractice: false,
    nextShouldReversePattern: currentState.shouldReversePattern,
    nextIsRepeatPhase: currentState.isRepeatPhase,
  };
};

export const calculateNextTraverseState = (
  currentLine: number,
  currentDirection: PracticeDirection,
  currentState: PracticeState,
  mode: PracticeMode,
): NextStateResult => {
  let nextLineNum = currentLine;
  let nextPracDir = currentDirection;
  let nextFretOff = currentState.currentFretOffset;
  let nextFretTravDir = currentState.fretTraversalDirection;
  let stopPractice = false;
  let nextShouldReverse = currentState.shouldReversePattern;
  let nextIsRepeatPhase = currentState.isRepeatPhase;

  const currentLineIdx = GUITAR_STRINGS.indexOf(currentLine);

  if (currentState.fretTraversalDirection === 'increasing') {
    if (currentDirection === 'asc') {
      // Ascending
      if (currentLineIdx < GUITAR_STRINGS.length - 1) {
        nextLineNum = GUITAR_STRINGS[currentLineIdx + 1];
        if (mode === 'traverse_with_repeat') {
          nextShouldReverse = currentState.shouldReversePattern;
        }
      } else {
        // Finished ascending 1st string
        if (mode === 'traverse_with_repeat' && !currentState.isRepeatPhase) {
          nextIsRepeatPhase = true;
          nextShouldReverse = true;
          nextLineNum = currentLine;
          nextPracDir = 'asc';
        } else if (
          mode === 'traverse_with_repeat' &&
          currentState.isRepeatPhase
        ) {
          nextIsRepeatPhase = false;
          nextLineNum = GUITAR_STRINGS[currentLineIdx - 1];
          nextPracDir = 'desc';
          nextShouldReverse = true;
        } else if (currentState.currentFretOffset < MAX_FRET_OFFSET) {
          nextFretOff = currentState.currentFretOffset + 1;
          nextLineNum = GUITAR_STRINGS[GUITAR_STRINGS.length - 1];
          nextPracDir = 'desc';
        } else {
          nextFretTravDir = 'decreasing';
          nextFretOff = currentState.currentFretOffset - 1;
          nextLineNum = GUITAR_STRINGS[GUITAR_STRINGS.length - 1];
          nextPracDir = 'desc';
        }
      }
    } else {
      // Descending
      if (currentLineIdx > 0) {
        nextLineNum = GUITAR_STRINGS[currentLineIdx - 1];
        if (mode === 'traverse_with_repeat') {
          nextShouldReverse = currentState.shouldReversePattern;
        }
      } else {
        // Finished descending 6th string
        if (mode === 'traverse_with_repeat' && !currentState.isRepeatPhase) {
          nextIsRepeatPhase = true;
          nextShouldReverse = false;
          nextLineNum = currentLine;
          nextPracDir = 'desc';
        } else if (
          mode === 'traverse_with_repeat' &&
          currentState.isRepeatPhase
        ) {
          nextIsRepeatPhase = false;
          nextLineNum = GUITAR_STRINGS[currentLineIdx + 1];
          nextPracDir = 'asc';
          nextShouldReverse = false;
        } else if (currentState.currentFretOffset < MAX_FRET_OFFSET) {
          nextFretOff = currentState.currentFretOffset + 1;
          nextLineNum = GUITAR_STRINGS[0];
          nextPracDir = 'asc';
        } else {
          if (mode === 'traverse_1st_start') {
            nextFretTravDir = 'decreasing';
            nextFretOff = currentState.currentFretOffset - 1;
            nextLineNum = GUITAR_STRINGS[0];
            nextPracDir = 'asc';
          } else {
            nextLineNum = GUITAR_STRINGS[0];
            nextPracDir = 'asc';
          }
        }
      }
    }
  } else if (currentState.fretTraversalDirection === 'decreasing') {
    if (currentDirection === 'desc') {
      if (currentLineIdx > 0) {
        nextLineNum = GUITAR_STRINGS[currentLineIdx - 1];
      } else {
        if (currentState.currentFretOffset > 0) {
          nextFretOff = currentState.currentFretOffset - 1;
          nextLineNum = GUITAR_STRINGS[0];
          nextPracDir = 'asc';
        } else {
          stopPractice = true;
          nextFretTravDir = 'done';
        }
      }
    } else {
      if (currentLineIdx < GUITAR_STRINGS.length - 1) {
        nextLineNum = GUITAR_STRINGS[currentLineIdx + 1];
      } else {
        if (currentState.currentFretOffset > 0) {
          nextFretOff = currentState.currentFretOffset - 1;
          nextLineNum = GUITAR_STRINGS[GUITAR_STRINGS.length - 1];
          nextPracDir = 'desc';
        } else {
          stopPractice = true;
          nextFretTravDir = 'done';
        }
      }
    }
  }

  return {
    nextLineNumber: nextLineNum,
    nextPracticeDirection: nextPracDir,
    nextFretOffset: nextFretOff,
    nextFretTraversalDirection: nextFretTravDir,
    shouldStopPractice: stopPractice,
    nextShouldReversePattern: nextShouldReverse,
    nextIsRepeatPhase: nextIsRepeatPhase,
  };
};
