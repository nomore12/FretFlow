import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LibraryMusic,
  MusicNote,
  Speed,
  Album,
  GridOn,
  GraphicEq,
  Lyrics,
} from '@mui/icons-material';

const features = [
  {
    title: '코드 라이브러리',
    description: '다양한 기타 코드의 운지법을 시각적으로 확인하고 익혀보세요.',
    icon: <LibraryMusic fontSize="large" />,
    link: '/chords',
    color: '#2196f3', // Blue
    disabled: true,
  },
  {
    title: '코드 트레이닝',
    description: '난이도별 랜덤 코드 연습으로 실력을 키워보세요.',
    icon: <MusicNote fontSize="large" />,
    link: '/exercise-chords',
    color: '#4caf50', // Green
  },
  {
    title: '리듬 트레이닝',
    description: '다양한 리듬 패턴을 만들고 연습하며 리듬감을 익히세요.',
    icon: <GraphicEq fontSize="large" />,
    link: '/rhythm',
    color: '#e91e63', // Pink
  },
  {
    title: '크로매틱 연습',
    description:
      '손가락의 민첩성과 속도를 기르는 크로매틱 연습을 시작해보세요.',
    icon: <Speed fontSize="large" />,
    link: '/chromatic',
    color: '#f44336', // Red
  },
  {
    title: '백킹 트랙',
    description: '여러 장르의 백킹 트랙에 맞춰 즉흥 연주를 즐겨보세요.',
    icon: <Album fontSize="large" />,
    link: '/backingTracks',
    color: '#9c27b0', // Purple
  },
  {
    title: '송 스케치패드',
    description: '진행을 고르고 가사를 마디에 맞춰 나만의 곡을 만들어 보세요.',
    icon: <Lyrics fontSize="large" />,
    link: '/songs',
    color: '#009688', // Teal
  },
  {
    title: '지판 탐색기',
    description: '기타 지판 위의 음계와 스케일을 한눈에 파악해보세요.',
    icon: <GridOn fontSize="large" />,
    link: '/fretboard',
    color: '#ff9800', // Orange
  },
];

const MainPage: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            fontWeight="bold"
            color="text.primary"
          >
            기타 연습 스튜디오
          </Typography>
          <Typography variant="h5" color="text.secondary">
            종합적인 연습 도구로 실력을 마스터하세요
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  ...(feature.disabled
                    ? {
                        opacity: 0.6,
                        bgcolor: '#f0f0f0',
                        pointerEvents: 'none',
                      }
                    : {
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[4],
                        },
                      }),
                }}
              >
                <CardActionArea
                  component={feature.disabled ? 'div' : Link}
                  to={feature.disabled ? undefined : feature.link}
                  disabled={feature.disabled}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: feature.disabled
                        ? 'action.disabledBackground'
                        : alpha(feature.color, 0.1),
                      color: feature.disabled
                        ? 'action.disabled'
                        : feature.color,
                      mb: 2,
                      display: 'inline-flex',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <CardContent sx={{ p: 0 }}>
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                      fontWeight="bold"
                      color={
                        feature.disabled ? 'text.disabled' : 'text.primary'
                      }
                    >
                      {feature.title} {feature.disabled && '(준비중)'}
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        feature.disabled ? 'text.disabled' : 'text.secondary'
                      }
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default MainPage;
