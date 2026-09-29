import { useReducer, useEffect, useCallback, useMemo } from 'react';
import useNoteStore from '../../store/useNoteStore';
import useMetronome from '../../hooks/useMetronome';
import { CHROMATIC_VOICES } from '../../audio/metronome/voices';
import {
  PracticeMode,
  PracticeState,
  GUITAR_STRINGS,
  MIN_BPM,
  MAX_BPM,
  calculateNextLoopState,
  calculateNextTraverseState,
  generateChromaticNotesArray,
} from './chromaticLogic';

interface ChromaticPracticeState extends PracticeState {
  bpm: number | '';
  beatType: number;
  practiceMode: PracticeMode;
  selectedFingerPattern: number[];
}

const initialState: ChromaticPracticeState = {
  bpm: 100,
  beatType: 4,
  practiceMode: 'loop',
  selectedFingerPattern: [1, 2, 3, 4],
  currentLineNumber: GUITAR_STRINGS[0],
  practiceDirection: 'asc',
  currentFretOffset: 0,
  fretTraversalDirection: 'increasing',
  isRepeatPhase: false,
  shouldReversePattern: false,
};

type Action =
  | { type: 'SET_BPM'; payload: number | '' }
  | { type: 'SET_BEAT_TYPE'; payload: number }
  | { type: 'SET_PRACTICE_MODE'; payload: PracticeMode }
  | { type: 'SET_FINGER_PATTERN'; payload: number[] }
  | { type: 'RESET_STATE'; payload: PracticeMode }
  | { type: 'TICK_NEXT_STATE'; payload: PracticeState };

const reducer = (
  state: ChromaticPracticeState,
  action: Action,
): ChromaticPracticeState => {
  switch (action.type) {
    case 'SET_BPM':
      return { ...state, bpm: action.payload };
    case 'SET_BEAT_TYPE':
      return { ...state, beatType: action.payload };
    case 'SET_FINGER_PATTERN':
      return { ...state, selectedFingerPattern: action.payload };
    case 'SET_PRACTICE_MODE':
    case 'RESET_STATE':
      return {
        ...state,
        practiceMode: action.payload,
        currentLineNumber:
          action.payload === 'traverse_1st_start'
            ? GUITAR_STRINGS[GUITAR_STRINGS.length - 1]
            : GUITAR_STRINGS[0],
        practiceDirection:
          action.payload === 'traverse_1st_start' ? 'desc' : 'asc',
        currentFretOffset: 0,
        fretTraversalDirection: 'increasing',
        isRepeatPhase: false,
        shouldReversePattern: false,
      };
    case 'TICK_NEXT_STATE':
      return { ...state, ...action.payload };
  }
};

export const useChromaticPractice = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    isPracticePlaying,
    setIsPracticePlaying,
    setPracticeNotes,
    setOnMeasureEndCallback,
    setCurrentNoteIndex,
    incrementCurrentNoteIndex,
  } = useNoteStore();

  const { start, stop, isPlaying, isBusy, countdown, error } = useMetronome({
    bpm:
      state.bpm === ''
        ? MIN_BPM
        : Math.max(MIN_BPM, Math.min(MAX_BPM, state.bpm)),
    beatsPerMeasure: state.beatType,
    subdivisions: 1,
    voices: CHROMATIC_VOICES,
    getNote: ({ step }) =>
      step === 0
        ? { voice: 'strong', pitch: 'C2', durationBeats: 0.25 }
        : { voice: 'weak', durationBeats: 0.125 },
    onTick: ({ tick }) => {
      // 첫 음은 이미 선택되어 있으므로 두 번째 박부터 운지를 이동한다.
      if (tick > 0) incrementCurrentNoteIndex();
    },
  });

  useEffect(() => {
    setIsPracticePlaying(isPlaying);
  }, [isPlaying, setIsPracticePlaying]);

  useEffect(() => () => setIsPracticePlaying(false), [setIsPracticePlaying]);

  const selectedFretSequence = useMemo(() => {
    return state.practiceMode === 'loop'
      ? [...state.selectedFingerPattern]
      : state.selectedFingerPattern.map(
          (finger) => finger + state.currentFretOffset,
        );
  }, [
    state.selectedFingerPattern,
    state.practiceMode,
    state.currentFretOffset,
  ]);

  useEffect(() => {
    const notes = generateChromaticNotesArray(
      state.currentLineNumber,
      selectedFretSequence,
      state.selectedFingerPattern,
      state.practiceMode,
      state.shouldReversePattern,
    );
    setPracticeNotes(notes);
    if (notes.length === 0) stop();
  }, [
    state.currentLineNumber,
    selectedFretSequence,
    state.selectedFingerPattern,
    state.practiceMode,
    state.shouldReversePattern,
    setPracticeNotes,
    stop,
  ]);

  const handleMeasureEnd = useCallback(() => {
    if (!isPracticePlaying) return;
    const currentState: PracticeState = {
      currentLineNumber: state.currentLineNumber,
      practiceDirection: state.practiceDirection,
      currentFretOffset: state.currentFretOffset,
      fretTraversalDirection: state.fretTraversalDirection,
      isRepeatPhase: state.isRepeatPhase,
      shouldReversePattern: state.shouldReversePattern,
    };
    const result =
      state.practiceMode === 'loop'
        ? calculateNextLoopState(
            state.currentLineNumber,
            state.practiceDirection,
            currentState,
          )
        : calculateNextTraverseState(
            state.currentLineNumber,
            state.practiceDirection,
            currentState,
            state.practiceMode,
          );

    if (result.shouldStopPractice) {
      stop();
      setIsPracticePlaying(false);
      if (
        state.practiceMode.startsWith('traverse') &&
        result.nextFretTraversalDirection === 'done'
      ) {
        dispatch({ type: 'RESET_STATE', payload: state.practiceMode });
      }
    } else {
      dispatch({
        type: 'TICK_NEXT_STATE',
        payload: {
          currentLineNumber: result.nextLineNumber,
          practiceDirection: result.nextPracticeDirection,
          currentFretOffset: result.nextFretOffset,
          fretTraversalDirection: result.nextFretTraversalDirection,
          isRepeatPhase: result.nextIsRepeatPhase,
          shouldReversePattern: result.nextShouldReversePattern,
        },
      });
    }
  }, [isPracticePlaying, state, setIsPracticePlaying, stop]);

  useEffect(() => {
    setOnMeasureEndCallback(handleMeasureEnd);
    return () => setOnMeasureEndCallback(null);
  }, [setOnMeasureEndCallback, handleMeasureEnd]);

  const handleBpmChange = (value: number | '') => {
    if (value === '') {
      dispatch({ type: 'SET_BPM', payload: '' });
    } else if (Number.isFinite(value)) {
      dispatch({
        type: 'SET_BPM',
        payload: Math.min(MAX_BPM, Math.max(0, value)),
      });
    }
  };

  const handleBpmBlur = () => {
    dispatch({
      type: 'SET_BPM',
      payload:
        state.bpm === '' || !Number.isFinite(state.bpm)
          ? MIN_BPM
          : Math.max(MIN_BPM, Math.min(MAX_BPM, state.bpm)),
    });
  };

  const resetToInitialPracticeState = useCallback(() => {
    stop();
    setIsPracticePlaying(false);
    setCurrentNoteIndex(0);
    dispatch({ type: 'RESET_STATE', payload: state.practiceMode });
  }, [state.practiceMode, setIsPracticePlaying, setCurrentNoteIndex, stop]);

  const togglePractice = () => {
    if (isBusy) {
      resetToInitialPracticeState();
    } else if (state.selectedFingerPattern.length > 0) {
      setCurrentNoteIndex(0);
      void start(3);
    }
  };

  const handleRandomFingerPattern = () => {
    const numbers = [1, 2, 3, 4];
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    dispatch({ type: 'SET_FINGER_PATTERN', payload: numbers });
  };

  return {
    state: { ...state, isPreparingToPlay: isBusy && !isPlaying, countdown },
    dispatch,
    handleBpmChange,
    handleBpmBlur,
    togglePractice,
    resetToInitialPracticeState,
    handleRandomFingerPattern,
    selectedFretSequence,
    error,
  };
};
