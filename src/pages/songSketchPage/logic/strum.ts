import { Strum } from '../types';

export type StrokeDirection = 'down' | 'up';

// 한 마디 = 8분음표 8칸. null은 치지 않는 칸.
export const SLOTS_PER_BAR = 8;

export const STRUM_PATTERNS: Record<Strum, (StrokeDirection | null)[]> = {
  down8: Array(SLOTS_PER_BAR).fill('down'),
  // D, D U, U D U
  folk: ['down', null, 'down', 'up', null, 'up', 'down', 'up'],
  stop: ['down', null, null, null, null, null, null, null],
};

export const STRING_SPREAD_MS = 12; // 줄 사이 간격 (8~15ms)
export const DOWN_VELOCITY = 0.8;
export const UP_VELOCITY = 0.55; // 업은 다운보다 약하게

export interface StrumNote {
  slot: number; // 0~7
  direction: StrokeDirection;
  midi: number;
  delayMs: number; // 칸 시작에서 이 줄을 치기까지
  velocity: number;
  durationSlots: number; // 다음 스트로크(또는 마디 끝)까지 울림
}

/**
 * 스트로크 한 번에 치는 음과 순서. 다운은 낮은 줄 → 높은 줄 전부,
 * 업은 위쪽 3~4줄만 높은 줄 → 낮은 줄.
 */
export function strokeNotes(
  voicing: number[],
  direction: StrokeDirection,
): number[] {
  const low = [...voicing].sort((a, b) => a - b);
  if (direction === 'down') return low;
  const count = low.length >= 5 ? 4 : 3;
  return low.slice(-count).reverse();
}

/** 섹션 스트럼 패턴과 코드 음으로 한 마디의 연주 이벤트를 만든다. */
export function strumEvents(strum: Strum, voicing: number[]): StrumNote[] {
  if (voicing.length === 0) return [];
  const pattern = STRUM_PATTERNS[strum];
  const strokeSlots = pattern.flatMap((direction, slot) =>
    direction ? [slot] : [],
  );

  return strokeSlots.flatMap((slot, index) => {
    const direction = pattern[slot]!;
    const next = strokeSlots[index + 1] ?? SLOTS_PER_BAR;
    return strokeNotes(voicing, direction).map((midi, order) => ({
      slot,
      direction,
      midi,
      delayMs: order * STRING_SPREAD_MS,
      velocity: direction === 'down' ? DOWN_VELOCITY : UP_VELOCITY,
      durationSlots: next - slot,
    }));
  });
}
