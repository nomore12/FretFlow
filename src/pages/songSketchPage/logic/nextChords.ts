import transitions from '../../../data/chordTransitions.json';
import { Mode, QUALITIES } from '../../../utils/pitch';
import { SongChord } from '../types';
import { toSongChord } from './songEdits';

export type FeelTag = 'stable' | 'tension' | 'wistful' | 'open';

interface TransitionEntry {
  degree: number;
  quality: string;
  accidental?: number;
  weight: number;
  tag: string;
}

export interface TransitionTable {
  tags: Record<string, string>;
  major: Record<string, TransitionEntry[]>;
  minor: Record<string, TransitionEntry[]>;
}

export interface ChordSuggestion {
  chord: SongChord;
  tag: FeelTag;
  tagLabel: string;
  share: number; // 보여주는 후보 안에서의 비율 (0~1)
}

export const DEFAULT_TRANSITIONS = transitions as TransitionTable;
export const SUGGESTION_LIMIT = 4;

/** 전이 테이블 키. N.C.·첫 마디는 'start', 임시표는 'b7'처럼 붙인다. */
export function transitionKey(chord: SongChord | null): string {
  if (!chord) return 'start';
  const accidental =
    chord.accidental === -1 ? 'b' : chord.accidental === 1 ? '#' : '';
  return `${accidental}${chord.degree}`;
}

const sameChord = (a: SongChord, b: SongChord) =>
  a.degree === b.degree &&
  a.quality === b.quality &&
  (a.accidental ?? 0) === (b.accidental ?? 0);

/**
 * 현재 코드 다음에 자주 오는 코드. 같은 코드는 빼고 빈도순으로 돌려준다.
 * 테이블에 없는 코드(빌려 온 코드 등) 다음에는 으뜸화음 쪽 후보를 보여준다.
 */
export function suggestNextChords(
  current: SongChord | null,
  mode: Mode,
  table: TransitionTable = DEFAULT_TRANSITIONS,
  limit = SUGGESTION_LIMIT,
): ChordSuggestion[] {
  const byMode = table[mode];
  const entries = byMode[transitionKey(current)] ?? byMode.start;
  const candidates = entries
    .map((entry) => ({ entry, chord: toSongChord(entry) }))
    .filter(({ chord }) => !current || !sameChord(chord, current))
    .sort((a, b) => b.entry.weight - a.entry.weight)
    .slice(0, limit);
  const total = candidates.reduce((sum, { entry }) => sum + entry.weight, 0);
  return candidates.map(({ entry, chord }) => ({
    chord,
    tag: entry.tag as FeelTag,
    tagLabel: table.tags[entry.tag] ?? entry.tag,
    share: total > 0 ? entry.weight / total : 0,
  }));
}

/** 테이블 형식 검사 (테스트와 개발 중 확인용). 문제 목록을 돌려준다. */
export function validateTransitions(table: TransitionTable): string[] {
  const problems: string[] = [];
  for (const mode of ['major', 'minor'] as const) {
    for (const key of ['start', '1', '2', '3', '4', '5', '6', '7']) {
      if (!table[mode][key]?.length) problems.push(`${mode}.${key} 없음`);
    }
    for (const [key, entries] of Object.entries(table[mode])) {
      for (const entry of entries) {
        const where = `${mode}.${key} → ${entry.degree}${entry.quality}`;
        if (
          !Number.isInteger(entry.degree) ||
          entry.degree < 1 ||
          entry.degree > 7
        )
          problems.push(`${where}: 도수 범위`);
        if (!QUALITIES.includes(entry.quality as SongChord['quality']))
          problems.push(`${where}: 코드 종류`);
        if (!(entry.weight > 0)) problems.push(`${where}: weight`);
        if (!table.tags[entry.tag])
          problems.push(`${where}: 태그 ${entry.tag}`);
      }
    }
  }
  return problems;
}

/**
 * 섹션의 barIndex 마디에 어울리는 코드: 바로 앞 마디 코드 다음에 자주 오는 코드.
 * 섹션 첫 마디이거나 앞 마디가 N.C.·말로면 곡 시작 후보를 쓴다.
 */
export function suggestChordsForBar(
  bars: { chord: SongChord | null; spoken?: boolean }[],
  barIndex: number,
  mode: Mode,
  table: TransitionTable = DEFAULT_TRANSITIONS,
): { previous: SongChord | null; suggestions: ChordSuggestion[] } {
  const previousBar = bars[barIndex - 1];
  const previous =
    previousBar && !previousBar.spoken ? previousBar.chord : null;
  return { previous, suggestions: suggestNextChords(previous, mode, table) };
}
