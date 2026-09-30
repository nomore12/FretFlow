import { describe, expect, it } from 'vitest';
import {
  DOWN_VELOCITY,
  STRING_SPREAD_MS,
  UP_VELOCITY,
  strokeNotes,
  strumEvents,
} from './strum';

const E = [40, 47, 52, 56, 59, 64]; // E2 B2 E3 G#3 B3 E4
const D = [50, 57, 62, 66]; // D3 A3 D4 F#4

describe('스트로크', () => {
  it('다운은 낮은 줄부터 전부', () => {
    expect(strokeNotes(E, 'down')).toEqual(E);
  });

  it('업은 위쪽 줄만 높은 줄부터', () => {
    expect(strokeNotes(E, 'up')).toEqual([64, 59, 56, 52]);
    expect(strokeNotes(D, 'up')).toEqual([66, 62, 57]);
  });
});

describe('strum 패턴 → 이벤트', () => {
  it('down8은 8칸 모두 다운, 줄마다 간격을 둔다', () => {
    const events = strumEvents('down8', E);
    expect(events).toHaveLength(8 * 6);
    expect(new Set(events.map((e) => e.slot))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6, 7]),
    );
    const first = events.filter((e) => e.slot === 0);
    expect(first.map((e) => e.midi)).toEqual(E);
    expect(first.map((e) => e.delayMs)).toEqual(
      [0, 1, 2, 3, 4, 5].map((i) => i * STRING_SPREAD_MS),
    );
    expect(events.every((e) => e.durationSlots === 1)).toBe(true);
  });

  it('folk는 D, D U, U D U', () => {
    const events = strumEvents('folk', E);
    const strokes = [...new Map(events.map((e) => [e.slot, e.direction]))];
    expect(strokes).toEqual([
      [0, 'down'],
      [2, 'down'],
      [3, 'up'],
      [5, 'up'],
      [6, 'down'],
      [7, 'up'],
    ]);
    const up = events.filter((e) => e.slot === 3);
    expect(up.map((e) => e.midi)).toEqual([64, 59, 56, 52]);
    expect(up.every((e) => e.velocity === UP_VELOCITY)).toBe(true);
    expect(UP_VELOCITY).toBeLessThan(DOWN_VELOCITY);
    // 다음 스트로크까지 울린다
    expect(events.find((e) => e.slot === 0)!.durationSlots).toBe(2);
    expect(events.find((e) => e.slot === 5)!.durationSlots).toBe(1);
  });

  it('stop은 첫 박에 한 번, 마디 끝까지 울린다', () => {
    const events = strumEvents('stop', D);
    expect(events.map((e) => [e.slot, e.midi, e.durationSlots])).toEqual(
      D.map((midi) => [0, midi, 8]),
    );
  });

  it('음이 없으면 이벤트도 없다', () => {
    expect(strumEvents('down8', [])).toEqual([]);
  });
});
