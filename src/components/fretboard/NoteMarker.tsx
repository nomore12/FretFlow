import React, { useEffect } from 'react';

interface NoteMarkerProps {
  fret: number; // 프렛 번호 (1 ~ 12)
  string: number; // 줄 번호 (1 ~ 6, 1번줄이 하이 E)
  note: string; // 출력할 음계
  color?: string;
  handleNodeClick?: (node: Note) => void;
}

const NoteMarker: React.FC<NoteMarkerProps> = ({
  fret,
  string,
  note,
  color,
  handleNodeClick,
}) => {
  // 프렛보드 설정값
  const fretboardWidth = 960; // 프렛보드 너비
  const fretboardHeight = 200; // 프렛보드 높이
  const paddingLeft = 24; // 좌측 여백
  const extraPadding = 50; // 전체 패딩
  const frets = 12; // 총 프렛 수
  const strings = 6; // 총 줄 수

  // 계산값
  const fretWidth = (fretboardWidth - paddingLeft) / frets; // 프렛의 너비
  const stringSpacing = fretboardHeight / (strings + 1); // 줄 간격

  // 원형의 중심 위치 계산
  const cx = (fret - 0.5) * fretWidth + paddingLeft + extraPadding;
  const cy = stringSpacing * (string - 1) + stringSpacing + extraPadding;

  const onClick = () => {
    const nodeNote: Note = {
      flatNumber: fret,
      lineNumber: string,
      chord: note,
    };
    handleNodeClick?.(nodeNote);
  };

  return (
    <g
      onClick={() => {
        const nodeNote: Note = {
          flatNumber: fret,
          lineNumber: string,
          chord: note,
        };
        handleNodeClick?.(nodeNote);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* 원형 */}
      <circle
        cx={cx}
        cy={cy}
        r="12"
        fill={color ? color : '#ffd700'}
        stroke="black"
        strokeWidth="1"
      />
      {/* 텍스트 */}
      <text
        x={cx}
        y={cy + 4} // 텍스트가 원 중앙에 오도록 약간 아래로 조정
        fontSize="10"
        textAnchor="middle"
        fill="black"
        style={{ userSelect: 'none' }}
      >
        {note}
      </text>
    </g>
  );
};

export default NoteMarker;
