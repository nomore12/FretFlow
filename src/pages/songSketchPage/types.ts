import { Quality, SongKey } from '../../utils/pitch';

// 2: 섹션에 멜로디(melody)가 생겼다. 1로 저장된 곡은 멜로디 없이 읽는다.
export const SCHEMA_VERSION = 2;
export const SUPPORTED_SCHEMA_VERSIONS = [1, 2];

export type SectionKind =
  | 'intro'
  | 'verse'
  | 'pre'
  | 'chorus'
  | 'bridge'
  | 'outro';

export const SECTION_KINDS: SectionKind[] = [
  'intro',
  'verse',
  'pre',
  'chorus',
  'bridge',
  'outro',
];

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  intro: '인트로',
  verse: '벌스',
  pre: '프리코러스',
  chorus: '후렴',
  bridge: '브릿지',
  outro: '아웃트로',
};

// down8: 8분 다운 8번 / folk: D, D U, U D U / stop: 첫 박에 한 번
export type Strum = 'down8' | 'folk' | 'stop';

export const STRUMS: Strum[] = ['down8', 'folk', 'stop'];

export const STRUM_LABELS: Record<Strum, string> = {
  down8: '8분 다운',
  folk: '포크 (D DU UDU)',
  stop: '첫 박만',
};

export interface SongChord {
  degree: number; // 1~7
  quality: Quality;
  accidental?: -1 | 1; // 반음 단위
}

export interface Bar {
  chord: SongChord | null; // null = N.C.
  lyric?: string;
  spoken?: boolean; // 반주·드럼을 멈추고 말로 처리
}

// 멜로디 음표. 음높이는 코드처럼 도수로 저장해 키를 바꾸면 같이 옮겨진다.
export interface MelodyNote {
  bar: number; // 섹션 안 마디 번호
  step: number; // 마디 안 16분음표 칸 (0~15)
  length: number; // 칸 수 (마디 끝을 넘지 않는다)
  degree: number; // 1~7
  accidental?: -1 | 1; // 반음 단위
  octave: number; // 기준 옥타브(으뜸음이 F#3~F4에 오는 옥타브)에서 몇 옥타브 위아래
}

export interface Section {
  id: string;
  kind: SectionKind;
  name: string;
  strum: Strum;
  bars: Bar[];
  melody?: MelodyNote[]; // 한 번에 한 음만 (겹치지 않음)
}

export interface Song {
  id: string;
  schemaVersion: typeof SCHEMA_VERSION;
  title: string;
  key: SongKey; // 실제로 들리는 키
  capo: number; // 코드 모양은 key − capo 기준
  bpm: number;
  beatsPerBar: 4;
  sections: Record<string, Section>;
  order: string[]; // 섹션 id, 같은 id 반복 가능
  createdAt: number;
  updatedAt: number;
}

export const CAPO_MAX = 9;
export const BPM_MIN = 40;
export const BPM_MAX = 240;
