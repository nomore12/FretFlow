import { describe, expect, it, vi } from 'vitest';
import {
  RecordedTake,
  RecorderDeps,
  TakeRecorder,
  UNSUPPORTED_MESSAGE,
  describeRecordingError,
  pickMimeType,
  trackInputLatencyMs,
} from './TakeRecorder';

class FakeRecorder {
  mimeType = 'audio/webm';
  state = 'inactive';
  // 실제 녹음기처럼 start()와 'start' 이벤트 사이에 지연이 있다.
  // startEventAt이 null이면 테스트가 직접 emitStart()를 부른다.
  constructor(private startEventAt: number | null) {}
  private listeners: Record<string, ((event: any) => void)[]> = {};
  addEventListener(type: string, listener: (event: any) => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  emit(type: string, event: unknown = {}) {
    this.listeners[type]?.forEach((listener) => listener(event));
  }
  start = vi.fn(() => {
    this.state = 'recording';
    if (this.startEventAt !== null) this.emitStart(this.startEventAt);
  });
  emitStart(timeStamp: number) {
    this.emit('start', { timeStamp });
  }
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.emit('dataavailable', {
      data: new Blob(['audio'], { type: this.mimeType }),
    });
    this.emit('stop');
  });
}

const setup = (
  overrides: Partial<RecorderDeps> = {},
  startEventAt: number | null = 1000,
) => {
  let clock = 1000;
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const recorders: FakeRecorder[] = [];
  const takes: RecordedTake[] = [];
  const recorder = new TakeRecorder(
    {
      isSupported: () => true,
      getUserMedia: async () => stream,
      createRecorder: () => {
        const fake = new FakeRecorder(startEventAt);
        recorders.push(fake);
        return fake;
      },
      now: () => clock,
      latencyMs: () => 40,
      ...overrides,
    },
    (take) => takes.push(take),
  );
  return {
    recorder,
    recorders,
    takes,
    track,
    setClock: (ms: number) => {
      clock = ms;
    },
  };
};

describe('TakeRecorder', () => {
  it('다음 마디선부터 시작해 정지를 누른 마디 끝에서 끝낸다', async () => {
    const { recorder, recorders, takes, track, setClock } = setup();
    await recorder.arm();
    expect(recorder.getSnapshot().status).toBe('armed');
    expect(recorders[0].start).toHaveBeenCalledOnce();

    // 버튼을 누르고 300ms 뒤 다음 마디선
    recorder.barStarted(5, 1300);
    expect(recorder.getSnapshot()).toMatchObject({
      status: 'recording',
      startMeasure: 5,
    });

    recorder.barStarted(6, 3300);
    setClock(4000);
    recorder.requestStop();
    expect(recorder.getSnapshot().status).toBe('finishing');
    expect(recorders[0].stop).not.toHaveBeenCalled();

    // 이번 마디(6) 끝 = 7마디 시작
    recorder.barStarted(7, 5300);
    expect(recorders[0].stop).toHaveBeenCalledOnce();
    expect(takes).toHaveLength(1);
    expect(takes[0]).toMatchObject({
      mimeType: 'audio/webm',
      offsetMs: 300 + 40, // 프리롤 + 출력·입력 지연
      durationMs: 4000, // 두 마디
    });
    expect(track.stop).toHaveBeenCalled();
    expect(recorder.getSnapshot().status).toBe('idle');
  });

  it('반주가 멈추면 그 시점까지 저장한다', async () => {
    const { recorder, takes, setClock } = setup();
    await recorder.arm();
    recorder.barStarted(0, 1100);
    setClock(2600);
    recorder.playbackStopped();
    expect(takes[0].durationMs).toBe(1500);
  });

  it('마디선 전에 멈추거나 취소하면 버리고 마이크를 끈다', async () => {
    const { recorder, takes, track } = setup();
    await recorder.arm();
    recorder.requestStop();
    expect(recorder.getSnapshot().status).toBe('idle');
    expect(track.stop).toHaveBeenCalled();

    await recorder.arm();
    recorder.playbackStopped();
    expect(takes).toHaveLength(0);
  });

  it('화면을 떠나면 녹음 중이던 테이크는 저장하지 않는다', async () => {
    const { recorder, takes, track } = setup();
    await recorder.arm();
    recorder.barStarted(0, 1100);
    recorder.dispose();
    expect(takes).toHaveLength(0);
    expect(track.stop).toHaveBeenCalled();
    expect(recorder.getSnapshot().status).toBe('idle');
  });

  it('프리롤은 start() 호출이 아니라 녹음기 start 이벤트 시각 기준', async () => {
    // start()는 1000ms에 불렀지만 녹음은 1060ms에 실제로 시작됐다
    const { recorder, recorders, takes } = setup({}, null);
    await recorder.arm();
    expect(recorder.getSnapshot().status).toBe('requesting');
    // start 이벤트 전에 온 마디선은 쓰지 않는다
    recorder.barStarted(0, 1030);
    expect(recorder.getSnapshot().status).toBe('requesting');
    recorders[0].emitStart(1060);
    expect(recorder.getSnapshot().status).toBe('armed');
    recorder.barStarted(1, 1300);
    recorder.requestStop();
    recorder.barStarted(2, 3300);
    expect(takes[0]).toMatchObject({
      offsetMs: 1300 - 1060 + 40,
      durationMs: 2000,
    });
  });

  it('권한을 기다리는 중 취소하면 늦게 받은 마이크를 바로 끈다', async () => {
    let grant: (stream: MediaStream) => void = () => undefined;
    const track = { stop: vi.fn() };
    const { recorder, recorders } = setup({
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    });
    const pending = recorder.arm();
    expect(recorder.getSnapshot().status).toBe('requesting');
    recorder.requestStop();
    grant({ getTracks: () => [track] } as unknown as MediaStream);
    await pending;
    expect(track.stop).toHaveBeenCalled();
    expect(recorders).toHaveLength(0);
    expect(recorder.getSnapshot().status).toBe('idle');
  });

  it('권한 거부와 미지원 브라우저를 안내한다', async () => {
    const denied = setup({
      getUserMedia: () =>
        Promise.reject(new DOMException('denied', 'NotAllowedError')),
    });
    await denied.recorder.arm();
    expect(denied.recorder.getSnapshot()).toMatchObject({
      status: 'idle',
      error: expect.stringContaining('마이크 권한이 거부'),
    });

    const unsupported = setup({ isSupported: () => false });
    await unsupported.recorder.arm();
    expect(unsupported.recorder.getSnapshot().error).toBe(UNSUPPORTED_MESSAGE);
  });
});

describe('도우미', () => {
  it('오류 종류별 안내', () => {
    expect(
      describeRecordingError(new DOMException('', 'NotFoundError')),
    ).toContain('마이크를 찾지 못했습니다');
    expect(describeRecordingError(new Error('x'))).toContain('다시 시도');
  });

  it('입력 지연은 트랙 설정의 latency(초)를 쓰고 없으면 0', () => {
    const stream = (settings: object) =>
      ({
        getAudioTracks: () => [{ getSettings: () => settings }],
      }) as unknown as MediaStream;
    expect(trackInputLatencyMs(stream({ latency: 0.025 }))).toBe(25);
    expect(trackInputLatencyMs(stream({}))).toBe(0);
    expect(trackInputLatencyMs(stream({ latency: -1 }))).toBe(0);
    expect(
      trackInputLatencyMs({
        getAudioTracks: () => [],
      } as unknown as MediaStream),
    ).toBe(0);
  });

  it('지원하는 첫 형식을 고른다', () => {
    expect(pickMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBe('');
  });
});
