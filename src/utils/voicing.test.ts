import { describe, expect, it } from 'vitest';
import openChords from '../data/openChords.json';
import { DifficultyLevel, getChordData } from './chordProgressionGenerator';
import { parseNote } from './pitch';
import {
  ShapeLookup,
  fallbackVoicing,
  midiToNoteName,
  notesFromShape,
  voiceChord,
} from './voicing';

const names = (notes: number[]) => notes.map(midiToNoteName).join(' ');
const open = (name: keyof typeof openChords) => openChords[name];
const withShapes: ShapeLookup = (name) =>
  getChordData(name, DifficultyLevel.WITH_SPECIAL);
const noShapes: ShapeLookup = () => null;

describe('운지 데이터 → 실제 음', () => {
  it('표준 튜닝에 프렛을 더하고 뮤트 줄은 뺀다', () => {
    expect(names(notesFromShape(open('E')))).toBe('E2 B2 E3 G#3 B3 E4');
    expect(names(notesFromShape(open('A')))).toBe('A2 E3 A3 C#4 E4');
    // 1-3-5 순서인 오픈 코드도 운지를 그대로 따른다
    expect(names(notesFromShape(open('C')))).toBe('C3 E3 G3 C4 E4');
    expect(names(notesFromShape(open('G')))).toBe('G2 B2 D3 G3 B3 G4');
    expect(names(notesFromShape(open('D')))).toBe('D3 A3 D4 F#4');
  });

  it('바레 위 운지는 같은 줄의 높은 프렛이 소리 난다', () => {
    expect(
      names(
        notesFromShape({
          fingers: [
            [1, 1],
            [2, 1],
            [6, 1],
            [5, 3],
            [4, 3],
            [3, 1],
            [3, 2],
          ],
          mute: [],
        }),
      ),
    ).toBe('F2 C3 F3 A3 C4 F4');
  });

  const CHORD_TONES: Record<string, number[]> = {
    '': [0, 4, 7],
    m: [0, 3, 7],
    '7': [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    dim: [0, 3, 6],
    m7b5: [0, 3, 6, 10],
    dim7: [0, 3, 6, 9],
  };

  it.each(Object.keys(openChords).filter((name) => name !== 'X'))(
    '오픈 코드 %s의 음이 코드 이름과 맞는다',
    (name) => {
      const [, rootName, suffix] = /^([A-G][#b]?)(.*)$/.exec(name)!;
      const root = parseNote(rootName)!;
      const tones = CHORD_TONES[suffix].map((t) => (root + t) % 12);
      const pitchClasses = notesFromShape(
        open(name as keyof typeof openChords),
      ).map((note) => note % 12);
      expect(pitchClasses.every((pc) => tones.includes(pc))).toBe(true);
      expect(pitchClasses).toContain(tones[0]); // 근음
      expect(pitchClasses).toContain(tones[1]); // 3도
    },
  );
});

describe('운지 데이터가 없을 때 E형·A형', () => {
  it('F#m은 E형 2프렛', () => {
    expect(names(fallbackVoicing(parseNote('F#')!, 'minor'))).toBe(
      'F#2 C#3 F#3 A3 C#4 F#4',
    );
  });

  it('Bm7b5는 A형 2프렛', () => {
    expect(names(fallbackVoicing(parseNote('B')!, 'm7b5'))).toBe('B2 F3 A3 D4');
  });

  it('6번 줄 근음 프렛이 7을 넘으면 A형', () => {
    // C는 6번 줄 8프렛 → 5번 줄 3프렛
    expect(names(fallbackVoicing(parseNote('C')!, 'major'))).toBe(
      'C3 G3 C4 E4 G4',
    );
    // B는 6번 줄 7프렛 → E형 유지
    expect(names(fallbackVoicing(parseNote('B')!, 'major'))).toBe(
      'B2 F#3 B3 D#4 F#4 B4',
    );
  });

  it('퀄리티별 치환과 3도(또는 sus 대체음) 포함', () => {
    expect(names(fallbackVoicing(parseNote('G')!, '7'))).toBe(
      'G2 D3 F3 B3 D4 G4',
    );
    expect(names(fallbackVoicing(parseNote('A')!, 'maj7'))).toBe(
      'A2 E3 G#3 C#4 E4',
    );
    expect(names(fallbackVoicing(parseNote('A')!, 'm7'))).toBe(
      'A2 E3 G3 C4 E4 A4',
    );
    expect(names(fallbackVoicing(parseNote('A')!, 'sus4'))).toBe(
      'A2 E3 A3 D4 E4 A4',
    );
    expect(names(fallbackVoicing(parseNote('D')!, 'sus2'))).toBe(
      'D3 A3 D4 E4 A4',
    );
    expect(names(fallbackVoicing(parseNote('B')!, 'dim'))).toBe('B2 F3 B3 D4');
  });
});

describe('곡 코드 보이싱과 카포', () => {
  it('운지가 있으면 운지, 없으면 폴백', () => {
    const key = { tonic: 'D', mode: 'major' } as const;
    const fsm = { degree: 3, quality: 'minor' };
    expect(names(voiceChord(fsm, key, 0, noShapes))).toBe(
      'F#2 C#3 F#3 A3 C#4 F#4',
    );
    const d = { degree: 1, quality: 'major' };
    expect(names(voiceChord(d, key, 0, withShapes))).toBe('D3 A3 D4 F#4');
  });

  it('키 A, 카포 2에서 G 모양은 A 코드 음높이로 재생된다', () => {
    const one = { degree: 1, quality: 'major' };
    const played = voiceChord(
      one,
      { tonic: 'G', mode: 'major' },
      2,
      withShapes,
    );
    expect(names(played)).toBe('A2 C#3 E3 A3 C#4 A4');
    expect(new Set(played.map((n) => n % 12))).toEqual(new Set([9, 1, 4]));
  });
});
