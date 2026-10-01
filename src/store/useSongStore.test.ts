import { describe, expect, it } from 'vitest';
import { migrateSongState } from './useSongStore';

describe('저장된 곡 상태 변환', () => {
  it('버전 1 곡은 멜로디 없이 버전 2가 된다', () => {
    const migrated = migrateSongState(
      {
        songs: { a: { id: 'a', schemaVersion: 1, title: '곡', sections: {} } },
      },
      1,
    );
    expect(migrated.songs.a).toMatchObject({ schemaVersion: 2, title: '곡' });
  });

  it('이미 버전 2면 그대로', () => {
    const state = { songs: { a: { id: 'a', schemaVersion: 2 } } };
    expect(migrateSongState(state, 2)).toBe(state);
  });
});
