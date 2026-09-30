import { Bar } from '../types';

// 섹션 안 줄들의 음절 수가 평균에서 이만큼 이상 벗어나면 경고한다.
export const SYLLABLE_DEVIATION_THRESHOLD = 3;

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

const isHangulSyllable = (code: number) =>
  code >= HANGUL_START && code <= HANGUL_END;

/** 완성형 한글 음절만 센다. 공백·문장부호·영문·숫자는 제외. */
export function countSyllables(text: string): number {
  let count = 0;
  for (const char of text) {
    if (isHangulSyllable(char.codePointAt(0)!)) count++;
  }
  return count;
}

/** 한글 음절 한 글자에 받침이 있는지. 한글이 아니면 false. */
export function hasBatchim(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined || !isHangulSyllable(code)) return false;
  return (code - HANGUL_START) % 28 !== 0;
}

/** 줄의 마지막 한글 음절. 뒤따르는 문장부호는 건너뛴다. */
export function lastSyllable(text: string): string | null {
  const chars = [...text];
  for (let i = chars.length - 1; i >= 0; i--) {
    if (isHangulSyllable(chars[i].codePointAt(0)!)) return chars[i];
  }
  return null;
}

/** 줄 끝 글자에 받침이 있어 길게 끌기 어려운지. */
export function endsWithBatchim(text: string): boolean {
  const last = lastSyllable(text);
  return last !== null && hasBatchim(last);
}

export interface BarLyricInfo {
  syllables: number;
  hardToHold: boolean; // 줄 끝 받침
  deviates: boolean; // 섹션 평균에서 크게 벗어남
}

/**
 * 섹션의 마디별 가사 분석. 가사가 없거나 spoken인 마디는
 * 평균 계산과 편차 경고에서 제외한다.
 */
export function analyzeSectionLyrics(
  bars: Bar[],
  threshold = SYLLABLE_DEVIATION_THRESHOLD,
): { bars: BarLyricInfo[]; average: number | null } {
  const counts = bars.map((bar) => countSyllables(bar.lyric ?? ''));
  const sung = bars
    .map((bar, index) => ({ bar, count: counts[index] }))
    .filter(({ bar, count }) => !bar.spoken && count > 0);
  const average =
    sung.length > 0
      ? sung.reduce((sum, { count }) => sum + count, 0) / sung.length
      : null;

  return {
    average,
    bars: bars.map((bar, index) => {
      const syllables = counts[index];
      const sungLine = !bar.spoken && syllables > 0;
      return {
        syllables,
        hardToHold: sungLine && endsWithBatchim(bar.lyric ?? ''),
        deviates:
          sungLine &&
          average !== null &&
          sung.length > 1 &&
          Math.abs(syllables - average) >= threshold,
      };
    }),
  };
}
