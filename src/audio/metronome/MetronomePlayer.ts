import * as Tone from 'tone';
import {
  MetronomeOptions,
  MetronomePosition,
  MetronomeSnapshot,
} from './types';

export class MetronomePlayer {
  private options: MetronomeOptions;
  private clock: Tone.Clock | null = null;
  private output: Tone.Volume | null = null;
  private voices = new Map<string, Tone.MembraneSynth | Tone.NoiseSynth>();
  private notificationTimers = new Set<number>();
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private disposed = false;
  private listeners = new Set<() => void>();
  private snapshot: MetronomeSnapshot = {
    status: 'stopped',
    countdown: null,
    position: null,
    error: null,
  };

  constructor(options: MetronomeOptions) {
    this.options = options;
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish = (patch: Partial<MetronomeSnapshot>) => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  };

  private get bpm() {
    return Number.isFinite(this.options.bpm)
      ? Math.max(1, this.options.bpm)
      : 120;
  }

  configure = (options: MetronomeOptions) => {
    const previous = this.options;
    const restart =
      options.subdivisions !== this.options.subdivisions ||
      options.beatsPerMeasure !== this.options.beatsPerMeasure ||
      options.voices !== this.options.voices ||
      options.totalMeasures !== this.options.totalMeasures ||
      options.sequenceKey !== this.options.sequenceKey;
    this.options = options;

    if (restart && this.snapshot.status === 'playing') {
      this.releaseAudio();
      this.generation++;
      this.beginPlayback(this.generation);
      return;
    }

    // 템포·음량·콜백 변경은 재생 위치와 기존 오디오 객체를 유지한다.
    if (this.clock && options.bpm !== previous.bpm) {
      this.clock.frequency.value = (this.bpm * options.subdivisions) / 60;
    }
    if (this.output && options.volumeDb !== previous.volumeDb) {
      this.output.volume.value = options.volumeDb ?? 0;
    }
  };

  start = async (countdownSeconds = 0) => {
    if (this.disposed || this.snapshot.status !== 'stopped') return;
    const generation = ++this.generation;
    this.publish({ status: 'starting', error: null, position: null });

    try {
      // 사용자 클릭 시점에 오디오를 활성화하고, 완료 전에 취소됐는지 확인한다.
      await Tone.start();
      if (generation !== this.generation) return;
      const seconds = Number.isFinite(countdownSeconds)
        ? Math.max(0, Math.ceil(countdownSeconds))
        : 0;
      this.countDown(seconds, generation);
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    }
  };

  private countDown = (seconds: number, generation: number) => {
    if (generation !== this.generation) return;
    if (seconds === 0) {
      this.countdownTimer = null;
      this.beginPlayback(generation);
      return;
    }
    this.publish({ status: 'countdown', countdown: seconds });
    this.countdownTimer = setTimeout(
      () => this.countDown(seconds - 1, generation),
      1000,
    );
  };

  private beginPlayback = (generation: number) => {
    try {
      this.output = new Tone.Volume(this.options.volumeDb ?? 0).toDestination();
      for (const [name, definition] of Object.entries(this.options.voices)) {
        const voice =
          definition.kind === 'membrane'
            ? new Tone.MembraneSynth(definition.options)
            : new Tone.NoiseSynth(definition.options);
        this.voices.set(name, voice);
        voice.connect(this.output);
      }

      let tick = 0;
      // 전역 Transport를 건드리지 않아 화면별 재생 세션이 서로 간섭하지 않는다.
      this.clock = new Tone.Clock(
        (time) => {
          if (generation !== this.generation) return;
          try {
            this.scheduleTick(tick++, time, generation);
          } catch (error) {
            this.fail(error);
          }
        },
        (this.bpm * this.options.subdivisions) / 60,
      );
      this.publish({ status: 'playing', countdown: null, position: null });
      this.clock.start(Tone.now());
    } catch (error) {
      this.fail(error);
    }
  };

  private scheduleTick = (tick: number, time: number, generation: number) => {
    const { subdivisions, beatsPerMeasure, totalMeasures } = this.options;
    const stepsPerMeasure = subdivisions * beatsPerMeasure;
    const step = tick % stepsPerMeasure;
    const measure = Math.floor(tick / stepsPerMeasure);
    const position: MetronomePosition = {
      tick,
      measure,
      step,
      beat: Math.floor(step / subdivisions),
      subdivision: step % subdivisions,
    };
    const finished = totalMeasures !== undefined && measure >= totalMeasures;

    if (finished) {
      this.clock?.stop(time);
    } else {
      const note = this.options.getNote(position);
      if (note) {
        const voice = this.voices.get(note.voice);
        const duration = (60 / this.bpm) * note.durationBeats;
        if (voice instanceof Tone.MembraneSynth) {
          voice.triggerAttackRelease(
            note.pitch ?? 'C2',
            duration,
            time,
            note.velocity,
          );
        } else if (voice instanceof Tone.NoiseSynth) {
          voice.triggerAttackRelease(duration, time, note.velocity);
        }
      }
    }

    // 오디오 시계의 타이머를 사용해 비활성 탭에서도 진행 콜백을 버리지 않는다.
    const context = Tone.getContext();
    const timer = context.setTimeout(
      () => {
        this.notificationTimers.delete(timer);
        if (generation !== this.generation) return;
        try {
          if (tick > 0 && step === 0) this.options.onMeasureComplete?.(measure);
          if (generation !== this.generation) return;
          if (finished) {
            this.stop();
          } else {
            this.publish({ position });
            this.options.onTick?.(position);
          }
        } catch (error) {
          this.fail(error);
        }
      },
      Math.max(0, time - context.immediate()),
    );
    this.notificationTimers.add(timer);
  };

  private releaseAudio = () => {
    const context = Tone.getContext();
    this.notificationTimers.forEach((timer) => context.clearTimeout(timer));
    this.notificationTimers.clear();
    this.clock?.dispose();
    this.clock = null;
    this.voices.forEach((voice) => voice.dispose());
    this.voices.clear();
    this.output?.dispose();
    this.output = null;
  };

  stop = () => {
    // 이전 비동기 시작과 화면 갱신 콜백도 함께 무효화한다.
    this.generation++;
    if (this.countdownTimer !== null) clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
    this.releaseAudio();
    this.publish({ status: 'stopped', countdown: null, position: null });
  };

  activate = () => {
    this.disposed = false;
  };

  dispose = () => {
    this.disposed = true;
    this.stop();
  };

  private fail = (error: unknown) => {
    console.error('메트로놈 재생 오류:', error);
    this.stop();
    this.publish({
      error: '메트로놈을 재생하지 못했습니다. 다시 시도해 주세요.',
    });
  };
}
