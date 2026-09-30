import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetronomePlayer } from './MetronomePlayer';
import { MetronomeOptions } from './types';

interface FakeClock {
  callback: (time: number) => void;
  frequency: { value: number };
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

interface FakeVoice {
  connect: ReturnType<typeof vi.fn>;
  triggerAttackRelease: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

const audio = vi.hoisted(() => ({
  start: vi.fn(),
  clocks: [] as FakeClock[],
  membranes: [] as FakeVoice[],
  noises: [] as FakeVoice[],
  polys: [] as (FakeVoice & { maxPolyphony: number })[],
  outputs: [] as {
    volume: { value: number };
    connect: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[],
  notifications: [] as { callback: () => void; time: number; id: number }[],
  nextTimerId: 0,
}));

vi.mock('tone', () => {
  class Clock implements FakeClock {
    frequency: { value: number };
    start = vi.fn();
    stop = vi.fn();
    dispose = vi.fn();
    constructor(
      public callback: (time: number) => void,
      frequency: number,
    ) {
      this.frequency = { value: frequency };
      audio.clocks.push(this);
    }
  }
  class MembraneSynth implements FakeVoice {
    connect = vi.fn();
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    constructor() {
      audio.membranes.push(this);
    }
  }
  class NoiseSynth implements FakeVoice {
    connect = vi.fn();
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    constructor() {
      audio.noises.push(this);
    }
  }
  class PolySynth implements FakeVoice {
    connect = vi.fn();
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    maxPolyphony = 32;
    constructor() {
      audio.polys.push(this);
    }
  }
  class Volume {
    volume: { value: number };
    connect = vi.fn();
    dispose = vi.fn();
    constructor(value: number) {
      this.volume = { value };
      audio.outputs.push(this);
    }
    toDestination() {
      return this;
    }
  }
  return {
    start: audio.start,
    now: () => 10,
    Clock,
    MembraneSynth,
    NoiseSynth,
    PolySynth,
    Synth: class {},
    Volume,
    getContext: () => ({
      immediate: () => 10,
      setTimeout: (callback: () => void, delay: number) => {
        const id = ++audio.nextTimerId;
        audio.notifications.push({ callback, time: 10 + delay, id });
        return id;
      },
      clearTimeout: (id: number) => {
        audio.notifications = audio.notifications.filter(
          (timer) => timer.id !== id,
        );
      },
    }),
  };
});

const options = (
  overrides: Partial<MetronomeOptions> = {},
): MetronomeOptions => ({
  bpm: 60,
  beatsPerMeasure: 4,
  subdivisions: 1,
  voices: { click: { kind: 'membrane' }, rest: { kind: 'noise' } },
  getNote: () => ({ voice: 'click', pitch: 'C2', durationBeats: 0.5 }),
  ...overrides,
});

const flushNotifications = () =>
  audio.notifications.splice(0).forEach(({ callback }) => callback());
const tick = (clock: FakeClock, time = 10) => {
  clock.callback(time);
  flushNotifications();
};

beforeEach(() => {
  vi.useFakeTimers();
  audio.start.mockReset().mockResolvedValue(undefined);
  audio.clocks.length = 0;
  audio.membranes.length = 0;
  audio.noises.length = 0;
  audio.polys.length = 0;
  audio.outputs.length = 0;
  audio.notifications.length = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('공통 메트로놈', () => {
  it('오디오는 예약 시간에 재생하고 화면 콜백은 해당 시간에 맞춰 전달한다', async () => {
    const onTick = vi.fn();
    const player = new MetronomePlayer(options({ onTick }));
    await player.start();
    audio.clocks[0].callback(10.5);
    expect(audio.membranes[0].triggerAttackRelease).toHaveBeenCalledWith(
      'C2',
      0.5,
      10.5,
      undefined,
    );
    expect(onTick).not.toHaveBeenCalled();
    expect(audio.notifications[0].time).toBe(10.5);
    flushNotifications();
    expect(onTick).toHaveBeenCalledWith(
      {
        tick: 0,
        measure: 0,
        step: 0,
        beat: 0,
        subdivision: 0,
      },
      10.5,
    );
    player.dispose();
  });

  it.each([1, 2, 4] as const)(
    '분할 수 %i에서도 한 마디는 정확히 4박이다',
    async (subdivisions) => {
      const onMeasureComplete = vi.fn();
      const player = new MetronomePlayer(
        options({ subdivisions, onMeasureComplete }),
      );
      await player.start();
      const clock = audio.clocks[0];
      expect(clock.frequency.value).toBe(subdivisions);
      for (let index = 0; index < 4 * subdivisions; index++)
        tick(clock, 10 + index / subdivisions);
      expect(onMeasureComplete).not.toHaveBeenCalled();
      tick(clock, 14);
      expect(onMeasureComplete).toHaveBeenCalledExactlyOnceWith(1);
      player.dispose();
    },
  );

  it('크로매틱의 강박 주기는 음표 분할 간격과 독립적이다', async () => {
    const onMeasureComplete = vi.fn();
    const player = new MetronomePlayer(
      options({ beatsPerMeasure: 8, onMeasureComplete }),
    );
    await player.start();
    expect(audio.clocks[0].frequency.value).toBe(1);
    for (let index = 0; index < 8; index++) tick(audio.clocks[0]);
    expect(onMeasureComplete).not.toHaveBeenCalled();
    tick(audio.clocks[0]);
    expect(onMeasureComplete).toHaveBeenCalledExactlyOnceWith(1);
    player.dispose();
  });

  it('BPM·음량·콜백 변경 시 현재 위치와 오디오 객체를 유지한다', async () => {
    const oldCallback = vi.fn();
    const newCallback = vi.fn();
    const initial = options({ onTick: oldCallback });
    const player = new MetronomePlayer(initial);
    await player.start();
    tick(audio.clocks[0]);
    player.configure({
      ...initial,
      bpm: 120,
      volumeDb: -6,
      onTick: newCallback,
    });
    expect(audio.clocks).toHaveLength(1);
    expect(audio.clocks[0].frequency.value).toBe(2);
    expect(audio.outputs[0].volume.value).toBe(-6);
    expect(audio.clocks[0].dispose).not.toHaveBeenCalled();
    tick(audio.clocks[0]);
    expect(oldCallback).toHaveBeenCalledTimes(1);
    expect(newCallback).toHaveBeenCalledWith(
      expect.objectContaining({ tick: 1 }),
      10,
    );
    expect(audio.membranes[0].triggerAttackRelease).toHaveBeenLastCalledWith(
      'C2',
      0.25,
      10,
      undefined,
    );
    player.dispose();
  });

  it('16마디 종료 후 다음 마디 소리를 내지 않고 모든 자원을 해제한다', async () => {
    const onMeasureComplete = vi.fn();
    const player = new MetronomePlayer(
      options({ totalMeasures: 16, onMeasureComplete }),
    );
    await player.start();
    for (let index = 0; index <= 64; index++) tick(audio.clocks[0], 10 + index);
    expect(audio.membranes[0].triggerAttackRelease).toHaveBeenCalledTimes(64);
    expect(onMeasureComplete.mock.calls.map(([measure]) => measure)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    expect(player.getSnapshot().status).toBe('stopped');
    expect(audio.clocks[0].stop).toHaveBeenCalledWith(74);
    expect(audio.clocks[0].dispose).toHaveBeenCalledOnce();
    expect(audio.membranes[0].dispose).toHaveBeenCalledOnce();
    expect(audio.noises[0].dispose).toHaveBeenCalledOnce();
    expect(audio.outputs[0].dispose).toHaveBeenCalledOnce();
  });

  it.each([3, 5])(
    '%i초 카운트다운을 취소하면 시간이 지나도 재생하지 않는다',
    async (seconds) => {
      const player = new MetronomePlayer(options());
      await player.start(seconds);
      expect(audio.start).toHaveBeenCalledOnce();
      expect(player.getSnapshot().countdown).toBe(seconds);
      await vi.advanceTimersByTimeAsync(1000);
      expect(player.getSnapshot().countdown).toBe(seconds - 1);
      player.stop();
      await vi.advanceTimersByTimeAsync(10000);
      expect(audio.clocks).toHaveLength(0);
      expect(player.getSnapshot().status).toBe('stopped');
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('카운트다운이 끝나면 한 번만 시작한다', async () => {
    const player = new MetronomePlayer(options());
    await player.start(3);
    await player.start(3);
    await vi.advanceTimersByTimeAsync(2999);
    expect(audio.clocks).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(audio.clocks).toHaveLength(1);
    expect(player.getSnapshot()).toMatchObject({
      status: 'playing',
      countdown: null,
    });
    player.dispose();
  });

  it('오디오 활성화를 기다리는 중 정지하면 늦게 도착한 시작 요청을 무시한다', async () => {
    let resolveStart: () => void = () => undefined;
    audio.start.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve;
        }),
    );
    const player = new MetronomePlayer(options());
    const pending = player.start();
    player.stop();
    await player.start();
    resolveStart();
    await pending;
    expect(audio.clocks).toHaveLength(1);
    expect(player.getSnapshot().status).toBe('playing');
    player.dispose();
  });

  it('화면 이탈 후 지연 콜백과 재생 요청이 오디오를 되살리지 않는다', async () => {
    const onTick = vi.fn();
    const player = new MetronomePlayer(options({ onTick }));
    await player.start();
    audio.clocks[0].callback(10);
    player.dispose();
    flushNotifications();
    await player.start();
    expect(onTick).not.toHaveBeenCalled();
    expect(audio.clocks).toHaveLength(1);
    expect(player.getSnapshot().status).toBe('stopped');
  });

  it('StrictMode 재설정 이후 새 세션만 동작한다', async () => {
    const onTick = vi.fn();
    const player = new MetronomePlayer(options({ onTick }));
    await player.start(3);
    player.dispose();
    player.activate();
    await player.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(audio.clocks).toHaveLength(1);
    tick(audio.clocks[0]);
    expect(onTick).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('한 세션의 정지가 다른 세션의 시계나 소리를 해제하지 않는다', async () => {
    const first = new MetronomePlayer(options());
    const second = new MetronomePlayer(options({ bpm: 120 }));
    await first.start();
    await second.start();
    first.stop();
    expect(audio.clocks[0].dispose).toHaveBeenCalledOnce();
    expect(audio.clocks[1].dispose).not.toHaveBeenCalled();
    tick(audio.clocks[1]);
    expect(second.getSnapshot().position?.tick).toBe(0);
    expect(audio.membranes[1].triggerAttackRelease).toHaveBeenCalledOnce();
    second.dispose();
  });

  it('새 악보를 적용하면 이전 예약을 무효화하고 첫 위치부터 재생한다', async () => {
    const onTick = vi.fn();
    const initial = options({ sequenceKey: 'first', onTick });
    const player = new MetronomePlayer(initial);
    await player.start();
    audio.clocks[0].callback(10);
    player.configure({ ...initial, sequenceKey: 'second' });
    flushNotifications();
    expect(onTick).not.toHaveBeenCalled();
    expect(audio.clocks[0].dispose).toHaveBeenCalledOnce();
    tick(audio.clocks[1]);
    expect(onTick).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ tick: 0 }),
      10,
    );
    player.dispose();
  });

  it('쉼표 강조를 끈 무음 슬롯에서도 위치가 진행한다', async () => {
    const initial = options({
      getNote: () => ({ voice: 'rest', durationBeats: 0.25, velocity: 0.5 }),
    });
    const player = new MetronomePlayer(initial);
    await player.start();
    tick(audio.clocks[0]);
    expect(audio.noises[0].triggerAttackRelease).toHaveBeenCalledWith(
      0.25,
      10,
      0.5,
    );
    player.configure({ ...initial, getNote: () => null });
    tick(audio.clocks[0]);
    expect(audio.noises[0].triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().position?.tick).toBe(1);
    player.dispose();
  });

  it('오디오 시작 실패를 표시하고 재시도할 수 있다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    audio.start.mockRejectedValueOnce(new Error('오디오 활성화 실패'));
    const player = new MetronomePlayer(options());
    await player.start();
    expect(player.getSnapshot().status).toBe('stopped');
    expect(player.getSnapshot().error).toBeTruthy();
    expect(audio.clocks).toHaveLength(0);
    await player.start();
    expect(player.getSnapshot()).toMatchObject({
      status: 'playing',
      error: null,
    });
    player.dispose();
  });

  it('재생 중 오류가 나도 생성한 오디오 자원을 해제한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const player = new MetronomePlayer(
      options({
        getNote: () => {
          throw new Error('패턴 오류');
        },
      }),
    );
    await player.start();
    tick(audio.clocks[0]);
    expect(player.getSnapshot().status).toBe('stopped');
    expect(player.getSnapshot().error).toBeTruthy();
    expect(audio.clocks[0].dispose).toHaveBeenCalledOnce();
    expect(audio.membranes[0].dispose).toHaveBeenCalledOnce();
    expect(audio.noises[0].dispose).toHaveBeenCalledOnce();
    expect(audio.outputs[0].dispose).toHaveBeenCalledOnce();
  });

  it('한 칸에 여러 음을 줄마다 늦춰 화음 음색으로 친다', async () => {
    const player = new MetronomePlayer(
      options({
        voices: { guitar: { kind: 'poly', maxPolyphony: 12 } },
        getNote: () => [
          { voice: 'guitar', pitch: 'E2', durationBeats: 0.5, velocity: 0.8 },
          {
            voice: 'guitar',
            pitch: 'B2',
            durationBeats: 0.5,
            velocity: 0.8,
            delaySeconds: 0.012,
          },
        ],
      }),
    );
    await player.start();
    tick(audio.clocks[0], 10);
    expect(audio.polys[0].maxPolyphony).toBe(12);
    expect(audio.polys[0].triggerAttackRelease.mock.calls).toEqual([
      ['E2', 0.5, 10, 0.8],
      ['B2', 0.5, 10.012, 0.8],
    ]);
    player.dispose();
    expect(audio.polys[0].dispose).toHaveBeenCalledOnce();
  });

  it('음색별 음량을 재생 중에 바꿔도 다시 시작하지 않는다', async () => {
    const initial = options({ voiceVolumesDb: { click: -6, rest: -12 } });
    const player = new MetronomePlayer(initial);
    await player.start();
    const [master, click, rest] = audio.outputs;
    expect(click.volume.value).toBe(-6);
    expect(rest.volume.value).toBe(-12);
    expect(click.connect).toHaveBeenCalledWith(master);
    expect(audio.membranes[0].connect).toHaveBeenCalledWith(click);
    player.configure({ ...initial, voiceVolumesDb: { click: -20, rest: 0 } });
    expect(click.volume.value).toBe(-20);
    expect(rest.volume.value).toBe(0);
    expect(audio.clocks).toHaveLength(1);
    player.dispose();
    audio.outputs.forEach((output) =>
      expect(output.dispose).toHaveBeenCalledOnce(),
    );
  });
});
