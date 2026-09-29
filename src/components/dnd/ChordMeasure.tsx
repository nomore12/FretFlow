import { Box, DropdownMenu, Select } from '@radix-ui/themes';
import React from 'react';

const openPositionChordKeys: string[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'Am',
  'Bm',
  'Dm',
  'Em',
  'Gm',
  'C#m',
  'F#m',
  'Ab',
  'Bb',
  'Db',
  'Eb',
  'Gb',
  'A7',
  'B7',
  'C7',
  'D7',
  'E7',
  'F7',
  'G7',
  'Am7',
  'Dm7',
  'Em7',
];

const ChordMeasure: React.FC = () => {
  return (
    <Box
      style={{
        width: '400px',
        height: '100px',
        border: '1px solid black',
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <Box>
        <Box style={{ display: 'flex', gap: 10 }}>
          <DropdownMenu.Label>Chord</DropdownMenu.Label>
          <Select.Root>
            <Select.Trigger placeholder="Select a chord">
              {/* <Select.Value placeholder="Select a chord" /> */}
            </Select.Trigger>
            <Select.Content>
              {openPositionChordKeys.map((chord) => (
                <Select.Item key={chord} value={chord}>
                  {chord}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>
      </Box>
    </Box>
  );
};

export default ChordMeasure;
