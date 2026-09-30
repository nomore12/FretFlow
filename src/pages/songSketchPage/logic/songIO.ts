import { QUALITIES, parseNote } from '../../../utils/pitch';
import {
  BPM_MAX,
  BPM_MIN,
  Bar,
  CAPO_MAX,
  SCHEMA_VERSION,
  SECTION_KINDS,
  STRUMS,
  Section,
  Song,
  SongChord,
} from '../types';

/** 저장·내보내기에 쓰는 곡 본문. id와 시각은 가져올 때 새로 붙인다. */
export type SongData = Omit<Song, 'id' | 'createdAt' | 'updatedAt'>;

export type ParseResult =
  | { ok: true; data: SongData }
  | { ok: false; error: string };

class SongFormatError extends Error {}

const fail = (message: string): never => {
  throw new SongFormatError(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isIntIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

function readChord(value: unknown, where: string): SongChord | null {
  if (value === null) return null;
  if (!isRecord(value)) return fail(`${where}: 코드 형식이 잘못되었습니다.`);
  const { degree, quality, accidental } = value;
  if (!isIntIn(degree, 1, 7)) fail(`${where}: 도수는 1~7이어야 합니다.`);
  if (!QUALITIES.includes(quality as SongChord['quality'])) {
    fail(`${where}: 알 수 없는 코드 종류 ${String(quality)}`);
  }
  if (accidental !== undefined && accidental !== -1 && accidental !== 1) {
    fail(`${where}: 임시표는 -1 또는 1이어야 합니다.`);
  }
  const chord: SongChord = {
    degree: degree as number,
    quality: quality as SongChord['quality'],
  };
  if (accidental !== undefined) chord.accidental = accidental as -1 | 1;
  return chord;
}

function readBar(value: unknown, where: string): Bar {
  if (!isRecord(value)) return fail(`${where}: 마디 형식이 잘못되었습니다.`);
  const bar: Bar = { chord: readChord(value.chord ?? null, where) };
  if (value.lyric !== undefined) {
    if (typeof value.lyric !== 'string')
      fail(`${where}: 가사는 문자열이어야 합니다.`);
    if (value.lyric) bar.lyric = value.lyric as string;
  }
  if (value.spoken !== undefined) {
    if (typeof value.spoken !== 'boolean')
      fail(`${where}: spoken은 true/false여야 합니다.`);
    if (value.spoken) bar.spoken = true;
  }
  return bar;
}

function readSection(id: string, value: unknown): Section {
  const where = `섹션 ${id}`;
  if (!isRecord(value)) return fail(`${where}: 형식이 잘못되었습니다.`);
  if (value.id !== id) fail(`${where}: id가 일치하지 않습니다.`);
  if (!SECTION_KINDS.includes(value.kind as Section['kind'])) {
    fail(`${where}: 알 수 없는 종류 ${String(value.kind)}`);
  }
  if (!STRUMS.includes(value.strum as Section['strum'])) {
    fail(`${where}: 알 수 없는 스트럼 ${String(value.strum)}`);
  }
  if (typeof value.name !== 'string') fail(`${where}: 이름이 없습니다.`);
  if (!Array.isArray(value.bars)) fail(`${where}: 마디 목록이 없습니다.`);
  return {
    id,
    kind: value.kind as Section['kind'],
    name: value.name as string,
    strum: value.strum as Section['strum'],
    bars: (value.bars as unknown[]).map((bar, index) =>
      readBar(bar, `${where} ${index + 1}마디`),
    ),
  };
}

/** 가져온 JSON 값을 검증해 곡 본문으로 만든다. */
export function readSongData(value: unknown): ParseResult {
  try {
    if (!isRecord(value)) fail('곡 파일 형식이 아닙니다.');
    const song = value as Record<string, unknown>;
    if (song.schemaVersion !== SCHEMA_VERSION) {
      fail(
        `지원하지 않는 곡 파일 버전입니다 (파일: ${String(song.schemaVersion)}, 지원: ${SCHEMA_VERSION}).`,
      );
    }
    if (typeof song.title !== 'string') fail('제목이 없습니다.');

    const key = song.key;
    if (
      !isRecord(key) ||
      typeof key.tonic !== 'string' ||
      parseNote(key.tonic) === null ||
      (key.mode !== 'major' && key.mode !== 'minor')
    ) {
      fail('키 형식이 잘못되었습니다.');
    }
    if (!isIntIn(song.capo, 0, CAPO_MAX))
      fail(`카포는 0~${CAPO_MAX}이어야 합니다.`);
    if (!isIntIn(song.bpm, BPM_MIN, BPM_MAX)) {
      fail(`BPM은 ${BPM_MIN}~${BPM_MAX}이어야 합니다.`);
    }
    if (song.beatsPerBar !== 4) fail('4/4 박자만 지원합니다.');
    if (!isRecord(song.sections)) fail('섹션 목록이 없습니다.');

    const sections: Record<string, Section> = {};
    for (const [id, section] of Object.entries(
      song.sections as Record<string, unknown>,
    )) {
      sections[id] = readSection(id, section);
    }

    if (!Array.isArray(song.order)) fail('재생 순서(order)가 없습니다.');
    for (const id of song.order as unknown[]) {
      if (typeof id !== 'string' || !sections[id]) {
        fail(`재생 순서에 없는 섹션이 있습니다: ${String(id)}`);
      }
    }

    const { tonic, mode } = key as { tonic: string; mode: 'major' | 'minor' };
    return {
      ok: true,
      data: {
        schemaVersion: SCHEMA_VERSION,
        title: song.title as string,
        key: { tonic, mode },
        capo: song.capo as number,
        bpm: song.bpm as number,
        beatsPerBar: 4,
        sections,
        order: [...(song.order as string[])],
      },
    };
  } catch (error) {
    if (error instanceof SongFormatError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export function parseSongJson(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 파일을 읽을 수 없습니다.' };
  }
  return readSongData(value);
}

/** 내보내기용 JSON. id와 시각은 빼고, 테이크는 포함하지 않는다. */
export function serializeSong(song: Song): string {
  return JSON.stringify(toSongData(song), null, 2);
}

export function toSongData(song: Song): SongData {
  return {
    schemaVersion: song.schemaVersion,
    title: song.title,
    key: song.key,
    capo: song.capo,
    bpm: song.bpm,
    beatsPerBar: song.beatsPerBar,
    sections: song.sections,
    order: song.order,
  };
}
