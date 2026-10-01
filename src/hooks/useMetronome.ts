import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { MetronomePlayer } from '../audio/metronome/MetronomePlayer';
import { MetronomeOptions } from '../audio/metronome/types';

const useMetronome = (options: MetronomeOptions) => {
  const [player] = useState(() => new MetronomePlayer(options));
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot);

  useLayoutEffect(() => {
    player.configure(options);
  });

  useEffect(() => {
    player.activate();
    return () => player.dispose();
  }, [player]);

  return {
    ...snapshot,
    isPlaying: snapshot.status === 'playing',
    isBusy: snapshot.status !== 'stopped',
    start: player.start,
    stop: player.stop,
    preview: player.preview,
  };
};

export default useMetronome;
