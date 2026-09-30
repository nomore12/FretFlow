import React, { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { ContentCopy, Print } from '@mui/icons-material';
import {
  ChordSheet,
  SPOKEN_MARK,
  capoCaption,
  chordSheetToText,
} from '../logic/chordSheet';
import '../songSheet.css';

interface ChordSheetViewProps {
  sheet: ChordSheet;
  currentIndex?: number | null; // 재생 중인 타임라인 마디 (2단계)
}

export default function ChordSheetView({
  sheet,
  currentIndex = null,
}: ChordSheetViewProps) {
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>(
    'idle',
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(chordSheetToText(sheet));
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <Stack spacing={2} className="song-sheet">
      <Stack
        direction="row"
        spacing={1}
        className="no-print"
        flexWrap="wrap"
        useFlexGap
      >
        <Button variant="outlined" startIcon={<ContentCopy />} onClick={copy}>
          텍스트로 복사
        </Button>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => window.print()}
        >
          인쇄
        </Button>
      </Stack>
      {copyState !== 'idle' && (
        <Alert
          className="no-print"
          severity={copyState === 'done' ? 'success' : 'error'}
          onClose={() => setCopyState('idle')}
        >
          {copyState === 'done'
            ? '코드 악보를 클립보드에 복사했습니다.'
            : '클립보드에 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.'}
        </Alert>
      )}

      <div>
        <Typography variant="h5" component="h2" fontWeight={700}>
          {sheet.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {capoCaption(sheet)}
          {sheet.capo > 0 && ` · 코드 모양 ${sheet.shapeKey}`}
        </Typography>
      </div>

      {sheet.blocks.length === 0 && (
        <Typography color="text.secondary">
          재생 순서에 섹션이 없습니다.
        </Typography>
      )}
      {sheet.blocks.map((block) => (
        <section key={block.orderIndex} className="song-sheet__block">
          <h3 className="song-sheet__section">{block.section.name}</h3>
          <div className="song-sheet__bars">
            {block.bars.map((bar) => (
              <div
                key={bar.timelineIndex}
                className={[
                  'song-sheet__bar',
                  bar.spoken && 'song-sheet__bar--spoken',
                  bar.timelineIndex === currentIndex &&
                    'song-sheet__bar--current',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="song-sheet__chord">{bar.chordName}</div>
                <div className="song-sheet__lyric">
                  {bar.spoken && (
                    <span className="song-sheet__spoken-mark">
                      {SPOKEN_MARK}
                    </span>
                  )}
                  {bar.lyric || ' '}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </Stack>
  );
}
