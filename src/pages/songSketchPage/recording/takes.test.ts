import { describe, expect, it } from 'vitest';
import sampleSongs from '../../../data/sampleSongs.json';
import { materializeSong } from '../logic/songEdits';
import { readSongData } from '../logic/songIO';
import {
  QUOTA_MESSAGE,
  Take,
  backingStartDelayMs,
  clampSyncOffset,
  normalizeTake,
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
  syncOffsetMs: 0,
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
      leadMs: 0,
    });
  });

  it('싱크 보정: 양수면 목소리를 늦게, 음수면 앞당긴다', () => {
    // +100ms: 파일을 100ms 앞에서 시작 → 목소리가 늦게 들린다
    expect(
      takeWindow({ offsetMs: 340, durationMs: 4000, syncOffsetMs: 100 }),
    ).toEqual({ start: 0.24, end: 4.24, leadMs: 0 });
    // -100ms: 파일을 100ms 뒤에서 시작 → 목소리가 앞당겨진다
    expect(
      takeWindow({ offsetMs: 340, durationMs: 4000, syncOffsetMs: -100 }),
    ).toEqual({ start: 0.44, end: 4.44, leadMs: 0 });
  });

  it('보정이 프리롤보다 크면 파일 처음부터 틀고 재생 시작을 늦춘다', () => {
    expect(
      takeWindow({ offsetMs: 74, durationMs: 3000, syncOffsetMs: 200 }),
    ).toEqual({ start: 0, end: 3, leadMs: 126 });
  });

  it('보정값은 ±200ms, 10ms 단위', () => {
    expect(clampSyncOffset(34)).toBe(30);
    expect(clampSyncOffset(-35)).toBe(-30);
    expect(clampSyncOffset(500)).toBe(200);
    expect(clampSyncOffset(-500)).toBe(-200);
    expect(clampSyncOffset(undefined)).toBe(0);
    expect(clampSyncOffset(Number.NaN)).toBe(0);
  });

  it('syncOffsetMs가 없던 이전 테이크는 0으로 읽는다', () => {
    const legacy: Partial<Take> = take({});
    delete legacy.syncOffsetMs;
    expect(normalizeTake(legacy as Take).syncOffsetMs).toBe(0);
    expect(
      normalizeTake({ ...(legacy as Take), syncOffsetMs: 60 }).syncOffsetMs,
    ).toBe(60);
  });

  it('반주와 함께: 첫 마디선이 들리는 시각까지 기다린다', () => {
    expect(backingStartDelayMs(1250, 1000)).toBe(250);
    // 이미 지났으면 바로 (0), 싱크 보정 리드는 더한다
    expect(backingStartDelayMs(900, 1000)).toBe(0);
    expect(backingStartDelayMs(1250, 1000, 126)).toBe(376);
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
