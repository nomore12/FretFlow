import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import sampleSongs from '../data/sampleSongs.json';
import { Song } from '../pages/songSketchPage/types';
import {
  createSongData,
  materializeSong,
  newId,
} from '../pages/songSketchPage/logic/songEdits';
import { SongData, readSongData } from '../pages/songSketchPage/logic/songIO';

interface SongStore {
  songs: Record<string, Song>;
  createSong: (title: string) => string;
  importSong: (data: SongData) => string;
  renameSong: (id: string, title: string) => void;
  deleteSong: (id: string) => void;
  duplicateSong: (id: string) => string | null;
  updateSong: (id: string, update: (song: Song) => Song) => void;
  seedIfEmpty: () => void;
}

const useSongStore = create<SongStore>()(
  devtools(
    persist(
      (set, get) => {
        const add = (data: SongData) => {
          const id = newId();
          const song = materializeSong(data, id, Date.now());
          set((state) => ({ songs: { ...state.songs, [id]: song } }));
          return id;
        };

        return {
          songs: {},

          createSong: (title) => add(createSongData(title)),

          importSong: (data) => add(data),

          renameSong: (id, title) =>
            get().updateSong(id, (song) => ({ ...song, title })),

          // 녹음 테이크 삭제는 3단계에서 IndexedDB 래퍼와 함께 연결한다.
          deleteSong: (id) =>
            set((state) => {
              const songs = { ...state.songs };
              delete songs[id];
              return { songs };
            }),

          duplicateSong: (id) => {
            const song = get().songs[id];
            if (!song) return null;
            return add({ ...song, title: `${song.title} (복사본)` });
          },

          updateSong: (id, update) =>
            set((state) => {
              const song = state.songs[id];
              if (!song) return {};
              const next = update(song);
              if (next === song) return {};
              return {
                songs: {
                  ...state.songs,
                  [id]: { ...next, id, updatedAt: Date.now() },
                },
              };
            }),

          // 곡이 하나도 없으면 샘플 곡을 넣는다.
          seedIfEmpty: () => {
            if (Object.keys(get().songs).length > 0) return;
            for (const sample of sampleSongs) {
              const result = readSongData(sample);
              if (result.ok) add(result.data);
              else console.error('샘플 곡 형식 오류:', result.error);
            }
          },
        };
      },
      {
        name: 'song-sketchpad-storage',
        version: 1,
        partialize: (state) => ({ songs: state.songs }),
      },
    ),
    { name: 'SongStore' },
  ),
);

export default useSongStore;
