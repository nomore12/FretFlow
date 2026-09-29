import CountdownOverlay from './CountdownOverlay';
import React, { ReactNode } from 'react';
import { Card, CardContent, Container, Stack, Typography } from '@mui/material';

export function PracticePage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack
        spacing={3}
        alignItems="center"
        sx={{ maxWidth: 1200, mx: 'auto', minWidth: 0 }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 600,
            textAlign: 'center',
            fontSize: { xs: '1.7rem', sm: '2.125rem' },
          }}
        >
          {title}
        </Typography>
        {children}
      </Stack>
    </Container>
  );
}

export function PracticePanel({
  controls = false,
  countdown = null,
  children,
}: {
  controls?: boolean;
  countdown?: number | null;
  children: ReactNode;
}) {
  return (
    <Card
      elevation={3}
      sx={{
        width: '100%',
        minWidth: 0,
        borderRadius: 3,
        background: controls
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #dfdfdf 0%, #e4e4e4 100%)',
        ...(controls && {
          color: 'white',
          '& .MuiSlider-root': { color: 'white' },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,.85)' },
          '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
          '& .MuiOutlinedInput-root': {
            color: 'white',
            bgcolor: 'rgba(255,255,255,.12)',
            '& fieldset': { borderColor: 'rgba(255,255,255,.4)' },
            '&:hover fieldset, &.Mui-focused fieldset': {
              borderColor: 'white',
            },
          },
          '& .MuiSelect-icon': { color: 'white' },
          '& .MuiCheckbox-root': {
            color: 'rgba(255,255,255,.7)',
            '&.Mui-checked': { color: 'white' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,.35)' },
          },
          '& .MuiFormControlLabel-label.Mui-disabled': {
            color: 'rgba(255,255,255,.5)',
          },
        }),
      }}
    >
      <CardContent
        sx={{
          position: 'relative',
          p: { xs: 2, sm: 3, md: 4 },
          '&:last-child': { pb: { xs: 2, sm: 3, md: 4 } },
        }}
      >
        <CountdownOverlay countdown={countdown} />
        {children}
      </CardContent>
    </Card>
  );
}
