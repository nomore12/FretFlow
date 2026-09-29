import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import Chords from '../components/chords/Chords';
import chordsData from '../data/openChords.json';
import * as Tone from 'tone';
import { Text } from '@radix-ui/themes';

const ContainerStyle = styled.div`
  .title {
    font-family: 'Lobster', sans-serif;
  }

  .control-wrapper {
    padding: 24px;
  }

  .chord-wrapper {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 20px 0;
  }
`;

const allChords = [
  chordsData.A,
  chordsData.Am,
  chordsData.C,
  chordsData.D,
  chordsData.Dm,
  chordsData.E,
  chordsData.Em,
  chordsData.F,
  chordsData.G,
  chordsData.A7,
  chordsData.Am7,
  chordsData.Amaj7,
  chordsData.B7,
  chordsData.Bm,
  chordsData.C7,
  chordsData.Cmaj7,
  chordsData.D7,
  chordsData.Dm7,
  chordsData.Dmaj7,
  chordsData.E7,
  chordsData.Em7,
  chordsData.Fmaj7,
  chordsData.G7,
];

const dinatonicChords = [
  chordsData.C,
  chordsData.Dm,
  chordsData.Em,
  chordsData.F,
  chordsData.G,
  chordsData.Am,
  chordsData.Bdim,
];

function getRandomElement(arr: any[]) {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

const Main: React.FC = () => {
  const [currentChord, setCurrentChord] = useState<{
    chord: string;
    fingers: number[][];
    mute: number[];
    flat: number;
  }>(chordsData.X);
  const [nextChord, setNextChord] = useState<{
    chord: string;
    fingers: number[][];
    mute: number[];
    flat: number;
  }>(chordsData.X);
  const [player, setPlayer] = useState<Tone.Player | null>(null);
  const [beatLoop, setBeatLoop] = useState<Tone.Loop | null>(null);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);

  const [chordArr, setChordArr] = useState<
    {
      chord: string;
      fingers: number[][];
      mute: number[];
      flat: number;
    }[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);

  const beatCount = useRef(0);

  const handlePlay = async () => {
    const playerToUse = player as Tone.Player;

    if (playerToUse) {
      await Tone.start();
      beatCount.current = 0; // Reset beat count

      const transport = Tone.getTransport();
      transport.bpm.value = 60; // set BPM to 60
      transport.start(); // start Transport

      // const loop = new Tone.Loop((time) => {
      //   playerToUse.start(time);
      //   beatCount.current++;
      //   if ((beatCount.current - 1) % 4 === 0) {
      //     setCurrentIndex((prevIndex) => {
      //       const newIndex = (prevIndex + 1) % chordArr.length;
      //       setCurrentChord(chordArr[newIndex]);
      //       return newIndex;
      //     });
      //     setNextIndex((prevIndex) => {
      //       const newIndex = (prevIndex + 1) % chordArr.length;
      //       setNextChord(chordArr[newIndex]);
      //       return newIndex;
      //     });
      //   }
      // }, '4n').start(0);

      // setBeatLoop(loop);
    }
  };

  const handleStop = () => {
    // Stop the Loop
    if (beatLoop) {
      beatLoop.stop();
    }

    // Stop the Transport and the Player
    Tone.getTransport().stop();
    player?.stop();
  };

  useEffect(() => {
    const newChordArr = [];
    for (let i = 0; i < 8; i++) {
      newChordArr.push(getRandomElement(allChords));
    }
    setChordArr(newChordArr);

    const createPlayer = async () => {
      const url = '/sounds/Kick.wav';
      const newPlayer = new Tone.Player();

      try {
        await newPlayer.load(url);
        setIsSoundLoaded(true);
        newPlayer.toDestination();

        setPlayer(newPlayer);
      } catch (e) {
        console.error('Unable to load sound file:', e);
      }
    };

    createPlayer();
  }, []);

  return (
    <ContainerStyle>
      <Text className="title" size="9" weight="bold">
        Chord! Chord! Chord!
      </Text>
      <div className="chord-wrapper">
        <div>
          <h1>current</h1>
          <Chords chord={currentChord} />
        </div>
        <div>
          <h1>next</h1>
          <Chords chord={nextChord} />
        </div>
      </div>
      <div>
        <input
          type="number"
          placeholder="BPM을 입력하세요."
          defaultValue={80}
        />
      </div>
      {isSoundLoaded && (
        <div className="control-wrapper">
          <button onClick={handlePlay}>start</button>
          <button onClick={handleStop}>stop</button>
        </div>
      )}
    </ContainerStyle>
  );
};

export default Main;
