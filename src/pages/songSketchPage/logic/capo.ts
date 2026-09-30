import {
  SongKey,
  degreeToChordName,
  keyLabel,
  transposeKey,
} from '../../../utils/pitch';
import { Song, SongChord } from '../types';
import { buildTimeline } from './timeline';

// 초보도 바로 잡을 수 있는 오픈 코드. 카포 추천은 이 목록의 비율로 고른다.
export const EASY_OPEN_CHORDS = new Set([
  'C',
  'D',
  'E',
  'G',
  'A',
  'Am',
  'Dm',
  'Em',
  'A7',
  'B7',
  'C7',
  'D7',
  'E7',
  'G7',
  'Am7',
  'Dm7',
  'Em7',
  'Cmaj7',
  'Fmaj7',
  'Dsus4',
  'Asus4',
  'Dsus2',
  'Asus2',
]);

export const MAX_RECOMMENDED_CAPO = 7;

export interface CapoOption {
  capo: number;
  shapeKey: SongKey; // 손으로 잡는 코드 모양의 키
  shapeLabel: string;
  easyRatio: number; // 0~1, 연주하는 마디 중 쉬운 오픈 코드 비율
  chordNames: string[]; // 모양 기준 코드 이름 (중복 제거, 등장 순서)
}

/**
 * 부르고 싶은 실제 키에서 카포 0~7마다 쉬운 오픈 코드 비율을 계산한다.
 * chords는 곡에서 실제로 치는 마디 순서대로 (N.C. 제외) 넘긴다.
 */
export function capoOptions(
  chords: SongChord[],
  actualKey: SongKey,
  maxCapo = MAX_RECOMMENDED_CAPO,
): CapoOption[] {
  return Array.from({ length: maxCapo + 1 }, (_, capo) => {
    const shapeKey = transposeKey(actualKey, -capo);
    const names = chords.map((chord) => degreeToChordName(chord, shapeKey));
    const easy = names.filter((name) => EASY_OPEN_CHORDS.has(name)).length;
    return {
      capo,
      shapeKey,
      shapeLabel: keyLabel(shapeKey),
      easyRatio: names.length > 0 ? easy / names.length : 0,
      chordNames: [...new Set(names)],
    };
  });
}

/** 비율이 가장 높은 조합. 같으면 카포가 낮은 쪽. */
export function recommendCapo(
  chords: SongChord[],
  actualKey: SongKey,
  maxCapo = MAX_RECOMMENDED_CAPO,
): CapoOption {
  return capoOptions(chords, actualKey, maxCapo).reduce((best, option) =>
    option.easyRatio > best.easyRatio ? option : best,
  );
}

/** 곡 전체(order)에서 실제로 치는 코드. 말로 하는 마디와 N.C.는 뺀다. */
export function playedChords(song: Song): SongChord[] {
  return buildTimeline(song).flatMap(({ bar }) =>
    bar.chord && !bar.spoken ? [bar.chord] : [],
  );
}
