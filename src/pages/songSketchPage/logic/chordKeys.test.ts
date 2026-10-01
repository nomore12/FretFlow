import { describe, expect, it } from 'vitest';
import { chordKeyAction, moveBarIndex } from './chordKeys';

describe('코드 선택 창 키보드', () => {
  it('1–7은 다이어토닉, 0은 N.C., ←/→는 이동', () => {
    expect(chordKeyAction({ key: '1' })).toEqual({
      type: 'diatonic',
      index: 0,
    });
    expect(chordKeyAction({ key: '7' })).toEqual({
      type: 'diatonic',
      index: 6,
    });
    expect(chordKeyAction({ key: '0' })).toEqual({ type: 'noChord' });
    expect(chordKeyAction({ key: 'ArrowLeft' })).toEqual({
      type: 'move',
      delta: -1,
    });
    expect(chordKeyAction({ key: 'ArrowRight' })).toEqual({
      type: 'move',
      delta: 1,
    });
    expect(chordKeyAction({ key: '8' })).toBeNull();
    expect(chordKeyAction({ key: 'a' })).toBeNull();
  });

  it('한글 조합 중이나 입력칸에서는 동작하지 않는다', () => {
    expect(chordKeyAction({ key: '1', isComposing: true })).toBeNull();
    expect(chordKeyAction({ key: '1', targetTag: 'INPUT' })).toBeNull();
    expect(chordKeyAction({ key: '1', targetTag: 'textarea' })).toBeNull();
    expect(chordKeyAction({ key: 'ArrowLeft', targetTag: 'INPUT' })).toBeNull();
    // MUI 선택 상자(div role=combobox)도 입력 요소로 본다
    expect(
      chordKeyAction({ key: '3', targetTag: 'DIV', targetRole: 'combobox' }),
    ).toBeNull();
    expect(chordKeyAction({ key: '1', targetTag: 'BUTTON' })).toEqual({
      type: 'diatonic',
      index: 0,
    });
  });

  it('단축키 조합은 무시한다', () => {
    expect(chordKeyAction({ key: '1', ctrlKey: true })).toBeNull();
    expect(chordKeyAction({ key: '1', metaKey: true })).toBeNull();
    expect(chordKeyAction({ key: '1', altKey: true })).toBeNull();
  });

  it('이동은 섹션 처음·끝을 넘지 않는다', () => {
    expect(moveBarIndex(0, -1, 8)).toBe(0);
    expect(moveBarIndex(3, 1, 8)).toBe(4);
    expect(moveBarIndex(7, 1, 8)).toBe(7);
  });
});
