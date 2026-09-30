import { Song } from '../types';

export interface Take {
  id: string;
  songId: string;
  sectionId: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
  durationMs: number; // 첫 마디선부터 끝까지
  offsetMs: number; // 파일 앞 프리롤. 재생은 여기서 시작한다
  bpm: number; // 녹음 당시 템포 (반주와 함께 들을 때 사용)
  starred: boolean;
  memo: string;
}

export type TakePatch = Partial<Pick<Take, 'starred' | 'memo'>>;

export interface TakeGroup {
  sectionId: string;
  name: string;
  deleted: boolean; // 섹션이 지워졌지만 테이크는 남아 있음
  takes: Take[];
}

/**
 * 섹션별로 묶는다. 곡의 재생 순서를 따르고, 지워진 섹션은 뒤에 둔다.
 * 섹션 안에서는 별표 먼저, 그다음 최신순.
 */
export function groupTakes(takes: Take[], song: Song): TakeGroup[] {
  const bySection = new Map<string, Take[]>();
  for (const take of takes) {
    bySection.set(take.sectionId, [
      ...(bySection.get(take.sectionId) ?? []),
      take,
    ]);
  }
  const ids = [
    ...new Set([...song.order, ...Object.keys(song.sections)]),
  ].filter((id) => bySection.has(id));
  const orphans = [...bySection.keys()].filter((id) => !song.sections[id]);

  return [...ids, ...orphans].map((sectionId) => ({
    sectionId,
    name: song.sections[sectionId]?.name ?? '지워진 섹션',
    deleted: !song.sections[sectionId],
    takes: [...bySection.get(sectionId)!].sort(
      (a, b) =>
        Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt,
    ),
  }));
}

/** 파일에서 실제로 들려줄 구간(초). 프리롤을 건너뛴다. */
export function takeWindow(take: Pick<Take, 'offsetMs' | 'durationMs'>) {
  const start = take.offsetMs / 1000;
  return { start, end: start + take.durationMs / 1000 };
}

export function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const QUOTA_MESSAGE =
  '저장 공간이 부족해 테이크를 저장하지 못했습니다. 필요 없는 테이크를 지운 뒤 다시 녹음해 주세요.';

export function describeStorageError(error: unknown): string {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError') return QUOTA_MESSAGE;
  if (name === 'InvalidStateError' || name === 'UnknownError') {
    return '브라우저 저장소를 열 수 없습니다. 시크릿 모드이거나 저장소가 차단되어 있는지 확인해 주세요.';
  }
  return '테이크 저장소 작업에 실패했습니다. 다시 시도해 주세요.';
}
