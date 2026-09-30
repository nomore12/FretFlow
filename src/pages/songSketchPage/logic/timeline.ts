import { Bar, Song } from '../types';

export interface TimelineBar {
  index: number; // 재생 순서상 전체 마디 번호
  orderIndex: number; // song.order에서 몇 번째 등장인지 (같은 섹션 반복 구분)
  sectionId: string;
  barIndex: number; // 섹션 안 마디 번호
  bar: Bar;
}

/** order를 펼쳐 재생 순서대로 마디 목록을 만든다. 없는 섹션 id는 건너뛴다. */
export function buildTimeline(song: Song): TimelineBar[] {
  const result: TimelineBar[] = [];
  song.order.forEach((sectionId, orderIndex) => {
    const section = song.sections[sectionId];
    if (!section) return;
    section.bars.forEach((bar, barIndex) => {
      result.push({
        index: result.length,
        orderIndex,
        sectionId,
        barIndex,
        bar,
      });
    });
  });
  return result;
}

/** 한 섹션만 반복할 때의 마디 목록. orderIndex는 -1. */
export function buildSectionTimeline(
  song: Song,
  sectionId: string,
): TimelineBar[] {
  const section = song.sections[sectionId];
  if (!section) return [];
  return section.bars.map((bar, barIndex) => ({
    index: barIndex,
    orderIndex: -1,
    sectionId,
    barIndex,
    bar,
  }));
}
