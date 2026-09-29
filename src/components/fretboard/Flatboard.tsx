import React, { useEffect, useState } from 'react';
import NoteMarker from './NoteMarker';
import useNoteStore from '../../store/PracticeStore';

interface PropsType {
  rootChord: string;
  selectedScale: 'major' | 'minor' | undefined;
  handleNodeClick: (node: Note) => void;
  practiceNodes: Note[];
  handleReset?: () => void;
}

const Flatboard: React.FC<PropsType> = ({
  rootChord,
  selectedScale,
  handleNodeClick,
  practiceNodes,
  handleReset,
}) => {
  const [displayScale, setDisplayScale] = useState<
    {
      flatNumber: number;
      lineNumber: number;
      chord: string;
      codeTone?: boolean | number;
    }[]
  >([]);

  const strings = 6; // Number of guitar strings
  const frets = 12; // Number of frets to render
  const fretboardWidth = 960; // Width of the fretboard
  const fretboardHeight = 200; // Height of the fretboard
  const paddingLeft = 24; // Space before the 1st fret
  const extraPadding = 50; // Extra padding around the SVG
  const totalWidth = fretboardWidth + extraPadding * 2; // Total SVG width
  const totalHeight = fretboardHeight + extraPadding * 2; // Total SVG height
  const fretWidth = (fretboardWidth - paddingLeft) / frets; // Dynamically calculate fret width
  const stringSpacing = fretboardHeight / (strings + 1); // Dynamically calculate string spacing

  const {
    notes,
    currentIndex,
    incrementIndex,
    clearNotes,
    isPracticePlaying,
    setPracticeNotes,
  } = useNoteStore();

  const generateScale = (
    root: string,
    scaleType:
      | 'major'
      | 'minor'
      | 'ionian'
      | 'dorian'
      | 'phrygian'
      | 'lydian'
      | 'mixolydian'
      | 'aeolian'
      | 'locrian'
      | 'pentatonicMajor'
      | 'pentatonicMinor'
      | 'melodicMinor'
      | 'harmonicMinor'
      | 'minorBlues'
      | 'majorBlues'
      | 'custom',
    scaleIntervals?: number[],
  ) => {
    const tuning = ['E', 'A', 'D', 'G', 'B', 'E']; // 표준 조율 (6번줄부터 1번줄)
    const notes = [
      'A',
      'A#',
      'B',
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
    ]; // 12음계

    // 스케일 및 모드의 기본 정의
    const predefinedScales: Record<string, number[]> = {
      major: [0, 2, 4, 5, 7, 9, 11], // Ionian (메이저 스케일과 동일)
      minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian (자연적 마이너 스케일과 동일)
      ionian: [0, 2, 4, 5, 7, 9, 11], // Ionian
      dorian: [0, 2, 3, 5, 7, 9, 10], // Dorian
      phrygian: [0, 1, 3, 5, 7, 8, 10], // Phrygian
      lydian: [0, 2, 4, 6, 7, 9, 11], // Lydian
      mixolydian: [0, 2, 4, 5, 7, 9, 10], // Mixolydian
      aeolian: [0, 2, 3, 5, 7, 8, 10], // Aeolian
      locrian: [0, 1, 3, 5, 6, 8, 10], // Locrian
      pentatonicMajor: [0, 2, 4, 7, 9], // Major Pentatonic
      pentatonicMinor: [0, 3, 5, 7, 10], // Minor Pentatonic
      melodicMinor: [0, 2, 3, 5, 7, 9, 11], // Melodic Minor
      harmonicMinor: [0, 2, 3, 5, 7, 8, 11], // Harmonic Minor
      minorBlues: [0, 3, 5, 6, 7, 10], // Minor Blues
      majorBlues: [0, 2, 3, 4, 7, 9], // Major Blues
    };

    // 선택된 스케일 또는 모드 인터벌 계산
    const intervals =
      scaleType === 'custom'
        ? scaleIntervals || []
        : predefinedScales[scaleType] || [];

    if (intervals.length === 0) {
      throw new Error('Invalid scale type or custom intervals are missing.');
    }

    // 루트 음계부터 스케일 음계 생성
    const rootIndex = notes.indexOf(root);
    const scaleNotes = intervals.map(
      (interval) => notes[(rootIndex + interval) % notes.length],
    );

    // 코드 구성음 자동 계산 (루트, 3도, 5도)
    const isMajor =
      scaleType === 'major' ||
      scaleType === 'ionian' ||
      scaleType === 'pentatonicMajor' ||
      scaleType === 'majorBlues';
    const chordIntervals = isMajor ? [0, 4, 7] : [0, 3, 7]; // Major: Root, 3rd, 5th; Minor: Root, b3rd, 5th
    const chordNotes = chordIntervals.map(
      (interval) => notes[(rootIndex + interval) % notes.length],
    );

    const frets = 12; // 프렛 수
    const strings = 6; // 줄 수
    const scale = [];

    // 특정 음의 다음 음계를 계산
    const getNextNote = (currentNote: string, step: number) => {
      const currentIndex = notes.indexOf(currentNote);
      const nextIndex = (currentIndex + step) % notes.length;
      return notes[nextIndex];
    };

    // 줄 번호와 프렛 번호에 따라 스케일 음계와 코드톤 여부 추가
    for (let lineNumber = 1; lineNumber <= strings; lineNumber++) {
      const openNote = tuning[strings - lineNumber]; // 해당 줄의 개방현 음계
      for (let flatNumber = 0; flatNumber <= frets; flatNumber++) {
        const chord = getNextNote(openNote, flatNumber);

        // 스케일 음계와 일치하는 경우만 추가
        if (scaleNotes.includes(chord)) {
          scale.push({
            lineNumber,
            flatNumber,
            chord,
            codeTone: chordNotes.includes(chord), // 코드 구성음 여부
          });
        }
      }
    }

    return scale;
  };

  useEffect(() => {
    const scale = generateScale(rootChord, selectedScale || 'major');
    setDisplayScale(scale);
  }, [rootChord, selectedScale]);

  useEffect(() => {
    const playingNotes = practiceNodes.map((note, index) => {
      if (index === currentIndex - 1) {
        note.codeTone = 1;
        console.log(note);
      } else if (index === currentIndex) {
        note.codeTone = 2;
      } else if (index === currentIndex + 1) {
        note.codeTone = 3;
      } else {
        note.codeTone = 0;
      }
      return note;
    });
    setPracticeNotes(playingNotes);
    console.log(currentIndex, isPracticePlaying);
  }, [currentIndex, isPracticePlaying]);

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      {/* Open chord */}
      {['E', 'A', 'G', 'D', 'B', 'E'].map((chord, index) => (
        <text
          key={`open-chord-${index}`}
          x={extraPadding - 10}
          y={extraPadding + stringSpacing + stringSpacing * index + 5}
          fontSize={16}
          textAnchor="middle"
        >
          {chord}
        </text>
      ))}

      {/* Strings */}
      {[...Array(strings)].map((_, stringIndex) => (
        <line
          key={`string-${stringIndex}`}
          x1={paddingLeft + extraPadding}
          y1={extraPadding + stringIndex * stringSpacing + stringSpacing}
          x2={fretboardWidth + extraPadding}
          y2={extraPadding + stringIndex * stringSpacing + stringSpacing}
          stroke="black"
          strokeWidth={1.5}
        />
      ))}

      {/* Frets */}
      {[...Array(frets + 1)].map((_, fretIndex) => (
        <line
          key={`fret-${fretIndex}`}
          x1={fretIndex * fretWidth + paddingLeft + extraPadding}
          y1={extraPadding + stringSpacing}
          x2={fretIndex * fretWidth + paddingLeft + extraPadding}
          y2={totalHeight - extraPadding - stringSpacing}
          stroke="black"
          strokeWidth={fretIndex === 0 ? 6 : 2} // Thicker line for the nut (0th fret)
        />
      ))}

      {/* Fret Numbers */}
      {[...Array(frets)].map((_, fretIndex) => (
        <text
          key={`fret-number-${fretIndex}`}
          x={fretIndex * fretWidth + fretWidth / 2 + paddingLeft + extraPadding}
          y={extraPadding - 5}
          fontSize="12"
          textAnchor="middle"
        >
          {fretIndex + 1}
        </text>
      ))}

      {/* Fret Markers */}
      {[3, 5, 7, 9].map((fret) => (
        <circle
          key={`marker-${fret}`}
          cx={(fret - 0.5) * fretWidth + paddingLeft + extraPadding}
          cy={fretboardHeight / 2 + extraPadding}
          r="6"
          fill="#c0c0c0"
        />
      ))}
      {/* Double Dot on 12th Fret */}
      <circle
        cx={(12 - 0.5) * fretWidth + paddingLeft + extraPadding}
        cy={stringSpacing * 2 + extraPadding + stringSpacing / 2} // 두 번째 칸의 중앙
        r="6"
        fill="#c0c0c0"
      />
      <circle
        cx={(12 - 0.5) * fretWidth + paddingLeft + extraPadding}
        cy={stringSpacing * 4 + extraPadding + stringSpacing / 2} // 네 번째 칸의 중앙
        r="6"
        fill="#c0c0c0"
      />

      {/* 디스플레이: Root, Code Tone, Scale Tone */}
      {selectedScale && (
        <g
          transform={`translate(${totalWidth / 2 - 150}, ${totalHeight - 30})`}
        >
          {/* Root */}
          <g transform="translate(0, 0)">
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#ec5555"
              stroke="black"
              strokeWidth="1"
            />
            <text x="20" y="4" fontSize="12" textAnchor="start" fill="black">
              : Root
            </text>
          </g>
          {/* Code Tone */}
          <g transform="translate(100, 0)">
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#7ba871"
              stroke="black"
              strokeWidth="1"
            />
            <text x="20" y="4" fontSize="12" textAnchor="start" fill="black">
              : Chord Tone
            </text>
          </g>
          {/* Nothing */}
          <g transform="translate(220, 0)">
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#ffd700"
              stroke="black"
              strokeWidth="1"
            />
            <text x="20" y="4" fontSize="12" textAnchor="start" fill="black">
              : Scale Tone
            </text>
          </g>
        </g>
      )}

      {/*<NoteMarker fret={1} string={6} note="F" color="red" />*/}
      {!selectedScale
        ? practiceNodes &&
          practiceNodes
            // .filter(
            //   (node, index, self) =>
            //     index ===
            //     self.findIndex(
            //       (n) =>
            //         n.flatNumber === node.flatNumber &&
            //         n.lineNumber === node.lineNumber,
            //     ),
            // )
            .map((node, index) => (
              <NoteMarker
                key={`practice-${index}`}
                fret={node.flatNumber}
                string={node.lineNumber}
                note={String(index + 1)}
                color={
                  node.codeTone === 1
                    ? '#ec5555'
                    : node.codeTone === 2
                      ? '#7ba871'
                      : node.codeTone === 3
                        ? '#ffd700'
                        : 'rgba(0,0,0,0)'
                }
                handleNodeClick={handleNodeClick}
              />
            ))
        : displayScale &&
          displayScale.map((chord, index) => (
            <NoteMarker
              key={`chord-${index}`}
              fret={chord.flatNumber}
              string={chord.lineNumber}
              note={chord.chord}
              color={
                chord.chord === rootChord
                  ? '#ec5555'
                  : chord.codeTone
                    ? '#7ba871'
                    : ''
              }
              handleNodeClick={handleNodeClick}
            />
          ))}
      {!selectedScale && (
        <foreignObject x="900" y={totalHeight - 50} width="100" height="40">
          <div>
            <button
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'lightblue',
                border: '1px solid black',
                borderRadius: '5px',
              }}
              onClick={() => clearNotes()}
            >
              Reset
            </button>
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

export default Flatboard;
