import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { materializeSong } from '../logic/songEdits';
import { readSongData } from '../logic/songIO';
import {
  QUOTA_MESSAGE,
  Take,
  describeStorageError,
  formatDuration,
  groupTakes,
  takeWindow,
} from './takes';

const song = (() => {
  const result = readSongData(sampleSongs[0]);
  if (!result.ok) throw new Error(result.error);
  return materializeSong(result.data, 'song', 0);
})();

const take = (overrides: Partial<Take>): Take => ({
  id: 't',
  songId: 'song',
  sectionId: 'verse',
  blob: new Blob(),
  mimeType: 'audio/webm',
  createdAt: 0,
  durationMs: 8000,
  offsetMs: 300,
  bpm: 110,
  starred: false,
  memo: '',
  ...overrides,
});

describe('groupTakes', () => {
  it('재생 순서대로 섹션별로 묶고, 별표 먼저 최신순', () => {
    const groups = groupTakes(
      [
        take({ id: 'c1', sectionId: 'chorus', createdAt: 1 }),
        take({ id: 'v1', sectionId: 'verse', createdAt: 1 }),
        take({ id: 'v2', sectionId: 'verse', createdAt: 2 }),
        take({ id: 'v0', sectionId: 'verse', createdAt: 0, starred: true }),
      ],
      song,
    );
    expect(groups.map((g) => g.name)).toEqual(['벌스', '후렴']);
    expect(groups[0].takes.map((t) => t.id)).toEqual(['v0', 'v2', 'v1']);
  });

  it('지워진 섹션의 테이크는 맨 뒤에 따로 보여준다', () => {
    const groups = groupTakes(
      [
        take({ id: 'x', sectionId: 'gone' }),
        take({ id: 'i', sectionId: 'intro' }),
      ],
      song,
    );
    expect(groups.map((g) => [g.name, g.deleted])).toEqual([
      ['인트로', false],
      ['지워진 섹션', true],
    ]);
  });
});

describe('도우미', () => {
  it('재생 구간은 프리롤을 건너뛴다', () => {
    expect(takeWindow({ offsetMs: 340, durationMs: 4000 })).toEqual({
      start: 0.34,
      end: 4.34,
    });
  });

  it('길이 표시', () => {
    expect(formatDuration(8700)).toBe('0:09');
    expect(formatDuration(65000)).toBe('1:05');
  });

  it('저장 공간 부족을 알려준다', () => {
    expect(
      describeStorageError(new DOMException('full', 'QuotaExceededError')),
    ).toBe(QUOTA_MESSAGE);
    expect(describeStorageError(new Error('x'))).toContain('다시 시도');
  });
});
