import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import sampleSongs from '../data/sampleSongs.json';
import { SCHEMA_VERSION, Song } from '../pages/songSketchPage/types';
import {
  createSongData,
  materializeSong,
  newId,
} from '../pages/songSketchPage/logic/songEdits';
import { SongData, readSongData } from '../pages/songSketchPage/logic/songIO';
import { deleteTakesForSong } from '../pages/songSketchPage/recording/takesDb';

/**
 * 저장된 곡 상태를 현재 형식으로 올린다.
 * 1 → 2: 섹션에 멜로디가 생겼다. 기존 곡은 멜로디 없이 그대로 쓰고 버전만 올린다.
 */
export function migrateSongState(persisted: unknown, version: number) {
  const state = (persisted ?? {}) as { songs?: Record<string, Song> };
  if (version < 2 && state.songs) {
    state.songs = Object.fromEntries(
      Object.entries(state.songs).map(([id, song]) => [
        id,
        { ...song, schemaVersion: SCHEMA_VERSION },
      ]),
    );
  }
  return state as { songs: Record<string, Song> };
}

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

          // 곡을 지우면 IndexedDB의 녹음 테이크도 함께 지운다.
          deleteSong: (id) => {
            deleteTakesForSong(id).catch((error) =>
              console.error('테이크 삭제 오류:', error),
            );
            set((state) => {
              const songs = { ...state.songs };
              delete songs[id];
              return { songs };
            });
          },

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
        version: 2,
        partialize: (state) => ({ songs: state.songs }),
        migrate: (persisted, version) => migrateSongState(persisted, version),
      },
    ),
    { name: 'SongStore' },
  ),
);

export default useSongStore;
