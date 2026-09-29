import React, { useEffect } from 'react';

interface NoteMarkerProps {
  fret: number; // 프렛 번호 (1 ~ 12)
  lineNumber: number; // 줄 번호 (1 ~ 6, 1번줄이 하이 E)
  calculatedX: number; // Flatboard에서 계산된 정확한 x 좌표
  calculatedY: number; // Flatboard에서 계산된 정확한 y 좌표
  note: string; // 출력할 음계
  color?: string;
  handleNodeClick?: (node: ChromaticNote) => void;
}

const NoteMarker: React.FC<NoteMarkerProps> = ({
  fret,
  lineNumber,
  calculatedX,
  calculatedY,
  note,
  color,
  handleNodeClick,
}) => {
  // cx와 cy는 prop으로 받은 calculatedX와 calculatedY를 사용
  const cx = calculatedX;
  const cy = calculatedY;

  const onMarkerClick = () => {
    const nodeNote: ChromaticNote = {
      flatNumber: fret,
      lineNumber: lineNumber,
      chord: note,
      chromaticNumber: parseInt(note) || 0,
    };
    handleNodeClick?.(nodeNote);
  };

  return (
    <g onClick={onMarkerClick} style={{ cursor: 'pointer' }}>
      {/* 원형 */}
      <circle
        cx={cx}
        cy={cy}
        r="14"
        fill={color ? color : 'rgba(0,0,0,0.1)'}
        stroke="#555"
        strokeWidth="1"
      />
      {/* 텍스트 */}
      <text
        x={cx}
        y={cy}
        fontSize="14"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="black"
        style={{ userSelect: 'none' }}
        fontWeight="bold"
      >
        {note}
      </text>
    </g>
  );
};

export default NoteMarker;
