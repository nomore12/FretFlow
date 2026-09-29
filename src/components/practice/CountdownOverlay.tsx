import React from 'react';
import { Box, Typography } from '@mui/material';

export default function CountdownOverlay({
  countdown,
}: {
  countdown: number | null;
}) {
  if (countdown === null) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label={`${countdown}초 후 시작`}
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h1"
        component="span"
        sx={{ color: 'white', fontWeight: 'bold', fontSize: '6rem' }}
      >
        {countdown > 0 ? countdown : 'GO!'}
      </Typography>
    </Box>
  );
}
