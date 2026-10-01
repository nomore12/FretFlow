import { Degree, QUALITIES } from '../../../utils/pitch';
import {
  Bar,
  SCHEMA_VERSION,
  SECTION_KIND_LABELS,
  Section,
  SectionKind,
  Song,
  SongChord,
} from '../types';
import { SongData } from './songIO';

// 곡 편집용 순수 함수. 모두 새 객체를 돌려주고 updatedAt은 스토어가 갱신한다.

export const newId = (): string => crypto.randomUUID();

export const DEFAULT_BARS_PER_SECTION = 4;

const tonicBar = (): Bar => ({ chord: { degree: 1, quality: 'major' } });

export function createSongData(title: string, sectionId = newId()): SongData {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    key: { tonic: 'C', mode: 'major' },
    capo: 0,
    bpm: 90,
    beatsPerBar: 4,
    sections: {
      [sectionId]: {
        id: sectionId,
        kind: 'verse',
        name: SECTION_KIND_LABELS.verse,
        strum: 'folk',
        bars: Array.from({ length: DEFAULT_BARS_PER_SECTION }, tonicBar),
      },
    },
    order: [sectionId],
  };
}

export function materializeSong(data: SongData, id: string, now: number): Song {
  return { ...structuredClone(data), id, createdAt: now, updatedAt: now };
}

const withSection = (
  song: Song,
  sectionId: string,
  update: (section: Section) => Section,
): Song => {
  const section = song.sections[sectionId];
  if (!section) return song;
  return {
    ...song,
    sections: { ...song.sections, [sectionId]: update(section) },
  };
};

/** 같은 종류가 이미 있으면 "벌스 2"처럼 번호를 붙인다. */
function nextSectionName(song: Song, kind: SectionKind) {
  const base = SECTION_KIND_LABELS[kind];
  const names = new Set(Object.values(song.sections).map((s) => s.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function addSection(song: Song, kind: SectionKind, id = newId()): Song {
  const section: Section = {
    id,
    kind,
    name: nextSectionName(song, kind),
    strum: kind === 'chorus' || kind === 'intro' ? 'down8' : 'folk',
    bars: Array.from({ length: DEFAULT_BARS_PER_SECTION }, tonicBar),
  };
  return {
    ...song,
    sections: { ...song.sections, [id]: section },
    order: [...song.order, id],
  };
}

export function removeSection(song: Song, sectionId: string): Song {
  const sections = { ...song.sections };
  delete sections[sectionId];
  return {
    ...song,
    sections,
    order: song.order.filter((id) => id !== sectionId),
  };
}

export function updateSection(
  song: Song,
  sectionId: string,
  patch: Partial<Pick<Section, 'name' | 'kind' | 'strum'>>,
): Song {
  return withSection(song, sectionId, (section) => ({ ...section, ...patch }));
}

/** 빈 가사와 false인 spoken은 저장하지 않는다. */
function normalizeBar(bar: Bar): Bar {
  const result: Bar = { chord: bar.chord };
  if (bar.lyric) result.lyric = bar.lyric;
  if (bar.spoken) result.spoken = true;
  return result;
}

export function updateBar(
  song: Song,
  sectionId: string,
  barIndex: number,
  patch: Partial<Bar>,
): Song {
  return withSection(song, sectionId, (section) => ({
    ...section,
    bars: section.bars.map((bar, index) =>
      index === barIndex ? normalizeBar({ ...bar, ...patch }) : bar,
    ),
  }));
}

export function addBar(song: Song, sectionId: string): Song {
  return withSection(song, sectionId, (section) => {
    const last = section.bars[section.bars.length - 1];
    return {
      ...section,
      bars: [...section.bars, { chord: last ? last.chord : tonicBar().chord }],
    };
  });
}

export function removeBar(
  song: Song,
  sectionId: string,
  barIndex: number,
): Song {
  return withSection(song, sectionId, (section) => ({
    ...section,
    bars: section.bars.filter((_, index) => index !== barIndex),
  }));
}

/** 섹션 안 마디 전체를 한 번 더 이어 붙인다 (×2). */
export function duplicateBars(song: Song, sectionId: string): Song {
  return withSection(song, sectionId, (section) => ({
    ...section,
    bars: [...section.bars, ...structuredClone(section.bars)],
  }));
}

/** 진행 프리셋의 코드를 곡 모델 코드로 바꾼다. */
export function toSongChord(chord: Degree): SongChord {
  const quality = QUALITIES.includes(chord.quality as SongChord['quality'])
    ? (chord.quality as SongChord['quality'])
    : chord.quality.startsWith('m')
      ? 'minor'
      : 'major';
  const result: SongChord = { degree: chord.degree, quality };
  if (chord.accidental === -1 || chord.accidental === 1) {
    result.accidental = chord.accidental;
  }
  return result;
}

/**
 * 섹션에 진행을 적용한다. 마디 수는 진행 길이에 맞추고,
 * 겹치는 마디의 가사와 spoken은 유지한다.
 */
export function applyProgression(
  song: Song,
  sectionId: string,
  pattern: Degree[],
): Song {
  return withSection(song, sectionId, (section) => ({
    ...section,
    bars: pattern.map((chord, index) =>
      normalizeBar({ ...section.bars[index], chord: toSongChord(chord) }),
    ),
  }));
}

export function appendToOrder(song: Song, sectionId: string): Song {
  if (!song.sections[sectionId]) return song;
  return { ...song, order: [...song.order, sectionId] };
}

export function removeFromOrder(song: Song, orderIndex: number): Song {
  return {
    ...song,
    order: song.order.filter((_, index) => index !== orderIndex),
  };
}

export function moveInOrder(song: Song, from: number, to: number): Song {
  if (to < 0 || to >= song.order.length || from === to) return song;
  const order = [...song.order];
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return { ...song, order };
}

/**
 * 카포 추천 적용. 곡의 키를 실제로 부를 키로 두고 카포만 바꾼다.
 * 코드는 도수로 저장되므로 들리는 소리는 그 키 그대로다.
 */
export function applyKeyAndCapo(song: Song, tonic: string, capo: number): Song {
  return { ...song, key: { ...song.key, tonic }, capo };
}

/** index 앞에 마디를 끼운다. 코드는 그 자리 마디의 코드를 따르고 가사는 비운다. */
export function insertBar(song: Song, sectionId: string, index: number): Song {
  return withSection(song, sectionId, (section) => {
    const at = Math.max(0, Math.min(index, section.bars.length));
    const chord = (section.bars[at] ?? section.bars[at - 1])?.chord ?? null;
    const bars = [...section.bars];
    bars.splice(at, 0, { chord });
    return { ...section, bars };
  });
}

/** 마디 하나를 바로 뒤에 복제한다 (코드·가사·말로 모두). */
export function duplicateBar(
  song: Song,
  sectionId: string,
  index: number,
): Song {
  return withSection(song, sectionId, (section) => {
    if (!section.bars[index]) return section;
    const bars = [...section.bars];
    bars.splice(index + 1, 0, structuredClone(section.bars[index]));
    return { ...section, bars };
  });
}

/** 붙여 넣은 텍스트를 가사 줄로 나눈다. 앞뒤 빈 줄은 버린다. */
export function splitLyricLines(text: string): string[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

/**
 * 여러 줄 가사를 startIndex 마디부터 한 줄씩 나눠 넣는다. 줄이 마디보다 많으면
 * 마지막 마디의 코드로 마디를 덧붙인다. 앞뒤 빈 줄은 무시한다.
 */
export function distributeLyrics(
  song: Song,
  sectionId: string,
  startIndex: number,
  text: string,
): { song: Song; filled: number; added: number } {
  const lines = splitLyricLines(text);
  const section = song.sections[sectionId];
  if (!section || lines.length === 0) return { song, filled: 0, added: 0 };

  const bars = [...section.bars];
  let added = 0;
  lines.forEach((line, offset) => {
    const index = startIndex + offset;
    if (index >= bars.length) {
      bars.push({ chord: bars[bars.length - 1]?.chord ?? null });
      added++;
    }
    bars[index] = normalizeBar({ ...bars[index], lyric: line.trim() });
  });
  return {
    song: {
      ...song,
      sections: { ...song.sections, [sectionId]: { ...section, bars } },
    },
    filled: lines.length,
    added,
  };
}
