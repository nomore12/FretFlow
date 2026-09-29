import React, { useMemo } from 'react';
import styled from 'styled-components';
import CompactFingerMark from './CompactFingerMark';
import CompactMuteMark from './CompactMuteMark';
import CompactOpenMark from './CompactOpenMark';
import CompactFlatChord from './CompactFlatChord';

interface ChordDisplayProps {
  chord: {
    chord: string;
    fingers: number[][];
    mute: number[] | [];
    flat: number;
  };
  focused?: boolean;
  hide?: boolean;
}

interface StyledWrapperProps {
  $focused?: boolean;
}

const StyledWrapper = styled.div<StyledWrapperProps>`
  width: 100%;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  background: ${(props) => (props.$focused ? '#f0edff' : '#ffffff')};
  border: 2px solid ${(props) => (props.$focused ? '#7664bb' : 'transparent')};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 4px;
  &:hover {
    border-color: #9d8fd0;
  }
`;

const ChordNameWrapper = styled.div`
  width: 100%;
  h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0 0 6px;
    text-align: center;
    color: #413767;
  }
`;

const ChordGridWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const HiddenFingerWrapper = styled.div`
  svg {
    circle {
      display: none;
    }
  }
`;

const ChordDisplay: React.FC<ChordDisplayProps> = ({
  chord,
  focused = false,
  hide = false,
}) => {
  // 텍스트 길이에 따른 데이터 속성 계산
  const getTextLengthClass = (text: string) => {
    if (text.length >= 8) return 'extra-long';
    if (text.length >= 6) return 'very-long';
    if (text.length >= 5) return 'long';
    return 'normal';
  };

  const textLengthClass = getTextLengthClass(chord.chord);
  const rowCount = 4;
  const columnCount = 5;
  const cellSize = 14; // 20 -> 14로 축소
  const cellSizeY = 20; // 30 -> 20으로 축소

  // 실제 운지된 프렛의 최소값과 최대값 찾기
  const fingerFrets = chord.fingers.map((f) => f[1]);
  const minFret =
    fingerFrets.length > 0 ? Math.min(...fingerFrets) : chord.flat;

  // 오픈포지션은 무조건 1fret부터 표시
  const isOpenPosition = chord.flat === 1 && minFret <= 3;
  const displayMinFret = isOpenPosition ? 1 : minFret;

  const lines = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let i = 0; i <= rowCount; i++) {
      result.push(
        <line
          key={`h${i}`}
          x1={cellSize + 10}
          y1={(i + 1) * cellSizeY}
          x2={cellSize * (columnCount + 1) + 10}
          y2={(i + 1) * cellSizeY}
          strokeWidth={i === 0 ? 3 : 1}
          stroke="black"
        />,
      );
    }

    for (let i = 0; i <= columnCount; i++) {
      result.push(
        <line
          key={`v${i}`}
          x1={(i + 1) * cellSize + 10}
          y1={cellSizeY}
          x2={(i + 1) * cellSize + 10}
          y2={cellSizeY * (rowCount + 1)}
          stroke="black"
        />,
      );
    }
    return result;
  }, [rowCount, columnCount, cellSize, cellSizeY]);

  const openFingers = useMemo(() => {
    const fingerLines = chord.fingers.map((item) => item[0]);
    const resultLines = chord.mute
      ? fingerLines.concat(chord.mute)
      : fingerLines;
    const removeSet = new Set(resultLines);
    return [1, 2, 3, 4, 5, 6].filter((item) => !removeSet.has(item));
  }, [chord.fingers, chord.mute]);

  const chordGrid = (
    <svg
      width={cellSize * columnCount + cellSize * 2 + 10}
      height={cellSizeY * rowCount + cellSizeY * 2}
    >
      {/* 프렛 번호 표시 */}
      <CompactFlatChord flat={displayMinFret} position={1} />
      <CompactFlatChord flat={displayMinFret + 1} position={2} />
      <CompactFlatChord flat={displayMinFret + 2} position={3} />
      <CompactFlatChord flat={displayMinFret + 3} position={4} />
      {lines}

      {!hide &&
        chord.mute &&
        chord.mute.map((item, index) => {
          return <CompactMuteMark key={`mute-${index}`} line={item} />;
        })}
      {!hide &&
        openFingers &&
        openFingers.map((item, index) => {
          return <CompactOpenMark key={`open-${index}`} line={item} />;
        })}
      {!hide &&
        chord.fingers &&
        chord.fingers.map((item, index) => {
          // 실제 프렛 위치를 디스플레이 위치로 변환
          const displayFret = isOpenPosition
            ? item[1]
            : item[1] - displayMinFret + 1;
          return (
            displayFret !== 0 &&
            displayFret <= 4 && (
              <CompactFingerMark
                key={index}
                line={item[0]}
                flat={displayFret}
              />
            )
          );
        })}
    </svg>
  );

  return (
    <StyledWrapper $focused={focused}>
      <ChordNameWrapper>
        <h2
          data-long={textLengthClass === 'long' ? 'true' : 'false'}
          data-very-long={textLengthClass === 'very-long' ? 'true' : 'false'}
          data-extra-long={textLengthClass === 'extra-long' ? 'true' : 'false'}
        >
          {chord.chord}
        </h2>
      </ChordNameWrapper>
      <ChordGridWrapper>
        {hide ? (
          <HiddenFingerWrapper>{chordGrid}</HiddenFingerWrapper>
        ) : (
          chordGrid
        )}
      </ChordGridWrapper>
    </StyledWrapper>
  );
};

export default ChordDisplay;
