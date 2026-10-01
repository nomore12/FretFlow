// 코드 선택 창의 키보드 조작. 숫자키 1–7은 다이어토닉 코드, 0은 N.C.,
// ←/→는 옆 마디로 이동한다.

export type ChordKeyAction =
  | { type: 'diatonic'; index: number } // 0~6
  | { type: 'noChord' }
  | { type: 'move'; delta: -1 | 1 };

export interface KeyInput {
  key: string;
  isComposing?: boolean; // 한글 조합 중
  targetTag?: string; // 이벤트가 난 요소 (INPUT 등)
  targetRole?: string | null; // MUI 선택 상자처럼 div로 된 입력 요소의 role
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const TYPING_ROLES = new Set(['combobox', 'listbox', 'option', 'textbox']);

/**
 * 키 입력을 코드 선택 동작으로 바꾼다. 글자를 입력하는 중(입력칸, 한글 조합)이나
 * 단축키 조합일 때는 아무 동작도 하지 않는다.
 */
export function chordKeyAction(input: KeyInput): ChordKeyAction | null {
  if (input.isComposing) return null;
  if (input.targetTag && TYPING_TAGS.has(input.targetTag.toUpperCase())) {
    return null;
  }
  if (input.targetRole && TYPING_ROLES.has(input.targetRole)) return null;
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (/^[1-7]$/.test(input.key)) {
    return { type: 'diatonic', index: Number(input.key) - 1 };
  }
  if (input.key === '0') return { type: 'noChord' };
  if (input.key === 'ArrowLeft') return { type: 'move', delta: -1 };
  if (input.key === 'ArrowRight') return { type: 'move', delta: 1 };
  return null;
}

/** 이동한 마디 번호. 섹션 처음·끝을 넘지 않는다. */
export function moveBarIndex(index: number, delta: number, count: number) {
  return Math.max(0, Math.min(count - 1, index + delta));
}
