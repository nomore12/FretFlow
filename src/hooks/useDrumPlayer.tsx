import React, { useEffect } from 'react';
import * as Tone from 'tone';

interface DrumPlayerProps {
  bpm: number;
  volume: number;
  beat: '4' | '8' | '16'; // 비트 선택을 위한 props
  callback: () => void;
}

const useDrumPlayer = ({ bpm, volume, beat, callback }: DrumPlayerProps) => {
  useEffect(() => {
    // 드럼 소리 파일 로드
    const kick = new Tone.Player('/sounds/Kick.wav').toDestination();
    const snare = new Tone.Player('/sounds/snare.wav').toDestination();
    const hihat = new Tone.Player('/sounds/hithat.wav').toDestination();
    const tom = new Tone.Player('/sounds/tom.wav').toDestination();

    // 볼륨 설정
    kick.volume.value = volume;
    snare.volume.value = volume;
    hihat.volume.value = volume;
    tom.volume.value = volume;

    // BPM 설정
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    // 비트 패턴 설정
    const schedule4Beat = () => {
      transport.schedule((time) => {
        kick.start(time);
      }, '0:0:0'); // 첫 번째 박자에 재생

      transport.schedule((time) => {
        snare.start(time);
      }, '0:1:0'); // 두 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:2:0'); // 세 번째 박자에 재생

      transport.schedule((time) => {
        tom.start(time);
        callback();
      }, '0:3:0'); // 네 번째 박자에 재생
    };

    const schedule8Beat = () => {
      transport.schedule((time) => {
        kick.start(time);
      }, '0:0:0'); // 첫 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:0:2'); // 두 번째 8비트 박자에 재생

      transport.schedule((time) => {
        snare.start(time);
      }, '0:1:0'); // 두 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:1:2'); // 네 번째 8비트 박자에 재생

      transport.schedule((time) => {
        kick.start(time);
      }, '0:2:0'); // 세 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:2:2'); // 여섯 번째 8비트 박자에 재생

      transport.schedule((time) => {
        snare.start(time);
      }, '0:3:0'); // 네 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
        callback();
      }, '0:3:2'); // 여덟 번째 8비트 박자에 재생
    };

    const schedule16Beat = () => {
      transport.schedule((time) => {
        kick.start(time);
      }, '0:0:0'); // 첫 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:0:1'); // 두 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:0:2'); // 세 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:0:3'); // 네 번째 16비트 박자에 재생

      transport.schedule((time) => {
        snare.start(time);
      }, '0:1:0'); // 두 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:1:1'); // 여섯 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:1:2'); // 일곱 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:1:3'); // 여덟 번째 16비트 박자에 재생

      transport.schedule((time) => {
        kick.start(time);
      }, '0:2:0'); // 세 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:2:1'); // 열 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:2:2'); // 열한 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:2:3'); // 열두 번째 16비트 박자에 재생

      transport.schedule((time) => {
        snare.start(time);
      }, '0:3:0'); // 네 번째 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:3:1'); // 열네 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
      }, '0:3:2'); // 열다섯 번째 16비트 박자에 재생

      transport.schedule((time) => {
        hihat.start(time);
        callback();
      }, '0:3:3'); // 열여섯 번째 16비트 박자에 재생
    };

    // 비트 패턴 스케줄링
    if (beat === '4') {
      schedule4Beat();
    } else if (beat === '8') {
      schedule8Beat();
    } else if (beat === '16') {
      schedule16Beat();
    }

    return () => {
      transport.cancel();
    };
  }, [bpm, volume, beat]);

  const handlePlay = () => {
    Tone.start().then(() => {
      Tone.getTransport().start();
    });
  };

  const handleStop = () => {
    Tone.getTransport().stop();
  };

  return { handlePlay, handleStop };
};

export default useDrumPlayer;
