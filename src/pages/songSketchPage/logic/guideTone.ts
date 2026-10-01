import { SongKey, degreeRootPitchClass } from '../../../utils/pitch';
import { SongChord } from '../types';

// 흥얼거릴 때 음을 잡는 기준으로 마디 첫 박에 울리는 코드 구성음 하나.
// 근음보다 코드의 성격(메이저/마이너)이 잘 드러나는 3음을 고른다.

// 코드 종류별 가이드 톤의 근음에서 반음 거리. sus는 3음 대신 4음·2음.
const GUIDE_INTERVAL: Record<SongChord['quality'], number> = {
  major: 4,
  '7': 4,
  maj7: 4,
  minor: 3,
  m7: 3,
  dim: 3,
  m7b5: 3,
  sus4: 5,
  sus2: 2,
};

// 대부분의 사람이 편하게 부르는 가운데 음역. A3(57)부터 한 옥타브.
export const GUIDE_RANGE_LOW = 57;
export const GUIDE_RANGE_HIGH = GUIDE_RANGE_LOW + 11;

/**
 * 코드의 가이드 톤(MIDI). 실제로 들리는 키 기준이라 카포와 상관없이
 * 반주와 같은 음이 난다.
 */
export function guideToneMidi(chord: SongChord, actualKey: SongKey): number {
  const pitchClass =
    (degreeRootPitchClass(chord, actualKey) + GUIDE_INTERVAL[chord.quality]) %
    12;
  // 가운데 음역 안에서 그 음이름을 찾는다.
  return GUIDE_RANGE_LOW + ((((pitchClass - GUIDE_RANGE_LOW) % 12) + 12) % 12);
}
