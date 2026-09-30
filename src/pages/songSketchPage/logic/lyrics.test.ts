import { describe, expect, it } from 'vitest';
import {
  analyzeSectionLyrics,
  countSyllables,
  endsWithBatchim,
  hasBatchim,
} from './lyrics';

describe('countSyllables', () => {
  it('완성형 한글만 센다', () => {
    expect(countSyllables('새벽 두 시 반까지')).toBe(7);
    expect(countSyllables('"다음 화 결제하기"')).toBe(7);
    expect(countSyllables('김 대리, 어제 보고서?')).toBe(8);
    expect(countSyllables('Love you 사랑해 123')).toBe(3);
    expect(countSyllables('ㅋㅋ ㅏ')).toBe(0); // 자모만 있는 경우
    expect(countSyllables('')).toBe(0);
  });
});

describe('받침 판별', () => {
  it('(code - 0xAC00) % 28 !== 0', () => {
    expect(hasBatchim('가')).toBe(false);
    expect(hasBatchim('각')).toBe(true);
    expect(hasBatchim('힣')).toBe(true);
    expect(hasBatchim('a')).toBe(false);
  });

  it('줄 끝 문장부호는 건너뛰고 마지막 한글을 본다', () => {
    expect(endsWithBatchim('나는 화산의 검객')).toBe(true);
    expect(endsWithBatchim('손가락이 먼저 가네')).toBe(false);
    expect(endsWithBatchim('"다음 화 결제하기"')).toBe(false);
    expect(endsWithBatchim('결재 올렸어?!')).toBe(false);
    expect(endsWithBatchim('딱 그만큼은...')).toBe(true);
    expect(endsWithBatchim('')).toBe(false);
  });
});

describe('analyzeSectionLyrics', () => {
  it('평균에서 ±3 이상 벗어난 줄에 경고한다', () => {
    const result = analyzeSectionLyrics([
      { chord: null, lyric: '하나둘셋넷' }, // 5
      { chord: null, lyric: '하나둘셋넷' }, // 5
      { chord: null, lyric: '하나둘셋넷' }, // 5
      { chord: null, lyric: '하나둘셋넷여섯일곱여덟' }, // 11
    ]);
    expect(result.average).toBe(6.5);
    expect(result.bars.map((bar) => bar.deviates)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('평균과 차이가 정확히 3이면 경고한다', () => {
    const result = analyzeSectionLyrics([
      { chord: null, lyric: '가나' }, // 2
      { chord: null, lyric: '가나다라마바사아' }, // 8
    ]);
    expect(result.average).toBe(5);
    expect(result.bars.every((bar) => bar.deviates)).toBe(true);
  });

  it('spoken·빈 마디는 평균과 경고에서 제외한다', () => {
    const result = analyzeSectionLyrics([
      { chord: null, lyric: '이십사수 매화검법' }, // 8
      { chord: null, lyric: '매화심결 자하신공' }, // 8
      { chord: null },
      {
        chord: null,
        lyric: '이번 정거장은 을지로, 을지로입니다',
        spoken: true,
      },
    ]);
    expect(result.average).toBe(8);
    expect(result.bars[3]).toEqual({
      syllables: 15,
      hardToHold: false,
      deviates: false,
    });
  });

  it('줄 끝 받침은 hardToHold로 표시한다', () => {
    const result = analyzeSectionLyrics([
      { chord: null, lyric: '나는 화산의 검객' },
      { chord: null, lyric: '오늘도 입산하네' },
    ]);
    expect(result.bars.map((bar) => bar.hardToHold)).toEqual([true, false]);
  });

  it('노래하는 줄이 하나뿐이면 편차 경고를 하지 않는다', () => {
    const result = analyzeSectionLyrics([{ chord: null, lyric: '가' }]);
    expect(result.bars[0].deviates).toBe(false);
  });
});
