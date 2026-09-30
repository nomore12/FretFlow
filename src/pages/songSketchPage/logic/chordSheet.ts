import {
  SongKey,
  degreeToChordName,
  keyLabel,
  shapeKey,
} from '../../../utils/pitch';
import { Section, Song, SongChord } from '../types';
import { buildTimeline } from './timeline';

export const NO_CHORD = 'N.C.';
export const SPOKEN_MARK = '(말로)';
export const BARS_PER_LINE = 4;

export function chordLabel(chord: SongChord | null, key: SongKey): string {
  return chord ? degreeToChordName(chord, key) : NO_CHORD;
}

export interface SheetBar {
  timelineIndex: number;
  barIndex: number;
  chordName: string; // 코드 모양(key − capo) 기준
  lyric: string;
  spoken: boolean;
}

export interface SheetBlock {
  orderIndex: number;
  section: Section;
  bars: SheetBar[];
}

export interface ChordSheet {
  title: string;
  capo: number;
  actualKey: string;
  shapeKey: string;
  blocks: SheetBlock[];
}

/** order 순서대로 섹션 블록을 만든다. 코드 이름은 카포를 뺀 모양 키로 쓴다. */
export function buildChordSheet(song: Song): ChordSheet {
  const shape = shapeKey(song.key, song.capo);
  const blocks: SheetBlock[] = [];
  for (const item of buildTimeline(song)) {
    let block = blocks[blocks.length - 1];
    if (!block || block.orderIndex !== item.orderIndex) {
      block = {
        orderIndex: item.orderIndex,
        section: song.sections[item.sectionId],
        bars: [],
      };
      blocks.push(block);
    }
    block.bars.push({
      timelineIndex: item.index,
      barIndex: item.barIndex,
      chordName: chordLabel(item.bar.chord, shape),
      lyric: item.bar.lyric ?? '',
      spoken: Boolean(item.bar.spoken),
    });
  }
  return {
    title: song.title,
    capo: song.capo,
    actualKey: keyLabel(song.key),
    shapeKey: keyLabel(shape),
    blocks,
  };
}

export function capoCaption(sheet: ChordSheet): string {
  return `카포 ${sheet.capo}, 실제 키 ${sheet.actualKey}`;
}

// 고정폭 글꼴에서 한글·전각 문자는 두 칸을 차지한다.
function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xff60);
    width += wide ? 2 : 1;
  }
  return width;
}

const padEnd = (text: string, width: number) =>
  text + ' '.repeat(Math.max(0, width - displayWidth(text)));

export function sheetLyric(bar: SheetBar): string {
  return bar.spoken ? `${SPOKEN_MARK} ${bar.lyric}`.trim() : bar.lyric;
}

/** 코드 줄 / 가사 줄 형식의 텍스트 악보. */
export function chordSheetToText(
  sheet: ChordSheet,
  barsPerLine = BARS_PER_LINE,
): string {
  const lines = [sheet.title, capoCaption(sheet)];
  for (const block of sheet.blocks) {
    lines.push('', `[${block.section.name}]`);
    for (let start = 0; start < block.bars.length; start += barsPerLine) {
      const row = block.bars.slice(start, start + barsPerLine);
      const lyrics = row.map(sheetLyric);
      const widths = row.map(
        (bar, index) =>
          Math.max(displayWidth(bar.chordName), displayWidth(lyrics[index])) +
          2,
      );
      lines.push(
        row
          .map((bar, index) => padEnd(bar.chordName, widths[index]))
          .join('')
          .trimEnd(),
      );
      if (lyrics.some(Boolean)) {
        lines.push(
          lyrics
            .map((lyric, index) => padEnd(lyric, widths[index]))
            .join('')
            .trimEnd(),
        );
      }
    }
  }
  return lines.join('\n') + '\n';
}
