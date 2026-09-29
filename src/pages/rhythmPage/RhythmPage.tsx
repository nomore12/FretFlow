import CountdownOverlay from '../../components/practice/CountdownOverlay';
import React, { useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Container } from '@mui/material';
import RhythmStaff from './RhythmStaff';
import { Bar, StageId } from './types';
import ControlUi from './ControlUi';
import useRhythmPlayback from './useRhythmPlayback';
import { generateStagePreset } from './rhythmGenerator';

const RhythmPage: React.FC = () => {
  const [bpm, setBpm] = useState(90);
  const [restAccentEnabled, setRestAccentEnabled] = useState(true);
  const [stageId, setStageId] = useState<StageId>(1);
  const [seed, setSeed] = useState(Date.now());

  const width = 1200;
  const height = 480;

  const marginLeft = 80;
  const marginRight = 40;
  const marginTop = 50;

  const staffCount = 4; // 기본 4줄
  const staffSpacing = 120;

  const barsPerStaff = 4;

  const presetOptions = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: (i + 1) as StageId,
        name: `Stage ${i + 1}`,
      })),
    [],
  );

  const activeStage = useMemo(() => {
    return generateStagePreset(stageId, seed);
  }, [stageId, seed]);
  const stageBars = activeStage.bars;
  const beatsPerBar = stageBars[0]?.beatsPerBar ?? 4;

  const totalBars = staffCount * barsPerStaff;
  const bars: Bar[] = useMemo(
    () =>
      Array.from(
        { length: totalBars },
        (_, i) => stageBars[i % stageBars.length],
      ),
    [stageBars, totalBars],
  );

  const staffBarData: Bar[][] = useMemo(
    () =>
      Array.from({ length: staffCount }, (_, staffIndex) =>
        bars.slice(staffIndex * barsPerStaff, (staffIndex + 1) * barsPerStaff),
      ),
    [bars, barsPerStaff, staffCount],
  );

  const innerWidth = width - marginLeft - marginRight;
  const barWidth = innerWidth / barsPerStaff;

  const staffYPositions = Array.from(
    { length: staffCount },
    (_, i) => marginTop + i * staffSpacing,
  );

  const { isBusy, countdown, start, stop, activePosition, error } =
    useRhythmPlayback({
      bars,
      beatsPerBar,
      bpm,
      restAccentEnabled,
    });

  const handleStageChange = (nextStageId: StageId) => {
    if (nextStageId === stageId) return;
    stop();
    setStageId(nextStageId);
    setSeed(Date.now());
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <ControlUi
          bpm={bpm}
          onBpmChange={setBpm}
          isPlaying={isBusy}
          onTogglePlay={() => (isBusy ? stop() : void start(3))}
          restAccentEnabled={restAccentEnabled}
          onRestAccentToggle={setRestAccentEnabled}
          stageId={stageId}
          onStageChange={handleStageChange}
          stageOptions={presetOptions}
          onRegenerate={() => setSeed(Date.now())}
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Card
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 1200,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #dfdfdfff 0%, #e4e4e4ff 100%)',
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: 3, position: 'relative' }}>
            <CountdownOverlay countdown={countdown} />
            <svg
              viewBox={`0 0 ${width} ${height}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            >
              {/* 템포 표시 */}
              <text
                x={marginLeft}
                y={16}
                fontSize={16}
                fontWeight="bold"
                fill="black"
              >
                BPM: {bpm}
              </text>

              {/* 4/4 박자 표시 (첫 줄 왼쪽) */}
              <text
                x={marginLeft - 30}
                y={staffYPositions[0] + 18}
                fontSize={20}
                fontWeight="bold"
                fill="black"
              >
                {beatsPerBar}
              </text>
              <line
                x1={marginLeft - 30}
                y1={staffYPositions[0] + 20}
                x2={marginLeft - 16}
                y2={staffYPositions[0] + 20}
                stroke="black"
                strokeWidth={2}
              />
              <text
                x={marginLeft - 30}
                y={staffYPositions[0] + 38}
                fontSize={20}
                fontWeight="bold"
                fill="black"
              >
                4
              </text>

              {staffYPositions.map((y, staffIndex) => {
                const staffStartBarIndex = staffIndex * barsPerStaff;
                return (
                  <RhythmStaff
                    key={staffIndex}
                    y={y + 20}
                    staffIndex={staffIndex}
                    startX={marginLeft}
                    endX={width - marginRight}
                    barsPerStaff={barsPerStaff}
                    barWidth={barWidth}
                    bars={staffBarData[staffIndex]}
                    startBarIndex={staffStartBarIndex}
                    activePosition={activePosition}
                  />
                );
              })}
            </svg>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RhythmPage;
