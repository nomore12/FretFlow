// 반주에 맞춘 흥얼거림 녹음. MediaRecorder는 녹음 버튼을 누르자마자 켜 두고,
// 다음 마디선을 테이크의 시작으로 삼는다. 그 앞부분(프리롤)은 offsetMs로 건너뛴다.

export type RecorderStatus =
  | 'idle'
  | 'requesting' // 마이크 권한·장치 확인 중
  | 'armed' // 녹음기는 켜졌고 다음 마디선을 기다림
  | 'recording'
  | 'finishing' // 정지를 눌러 이번 마디 끝을 기다림
  | 'saving';

export interface RecorderSnapshot {
  status: RecorderStatus;
  startMeasure: number | null; // 테이크가 시작된 재생 마디
  error: string | null;
}

export interface RecordedTake {
  blob: Blob;
  mimeType: string;
  offsetMs: number; // 파일 앞에서 건너뛸 길이 (첫 마디선 위치)
  durationMs: number; // 마디선부터 끝까지
}

interface RecorderLike {
  mimeType: string;
  state: string;
  start: () => void;
  stop: () => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

export interface RecorderDeps {
  isSupported: () => boolean;
  getUserMedia: () => Promise<MediaStream>;
  createRecorder: (stream: MediaStream) => RecorderLike;
  now: () => number; // barStarted의 시각과 같은 기준 (performance.now)
  // 마이크 입력 지연. 들리는 박자에 맞춰 부른 소리가 파일에는 이만큼 늦게 담긴다.
  latencyMs: () => number;
}

// 녹음을 지원하지 않는 브라우저면 여기서 걸러 안내한다.
export const UNSUPPORTED_MESSAGE =
  '이 브라우저는 녹음을 지원하지 않습니다. 최신 Chrome·Edge·Firefox·Safari에서 HTTPS 또는 localhost로 접속해 주세요.';

export function describeRecordingError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return '마이크 권한이 거부되었습니다. 주소창 왼쪽의 사이트 설정에서 마이크를 허용한 뒤 다시 시도해 주세요.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return '사용할 수 있는 마이크를 찾지 못했습니다. 마이크 연결을 확인해 주세요.';
    case 'NotReadableError':
    case 'AbortError':
      return '마이크를 열 수 없습니다. 다른 프로그램이 마이크를 쓰고 있는지 확인해 주세요.';
    default:
      return '녹음을 시작하지 못했습니다. 다시 시도해 주세요.';
  }
}

// 브라우저마다 지원하는 형식이 달라 앞에서부터 고른다.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export function pickMimeType(isTypeSupported: (type: string) => boolean) {
  return MIME_CANDIDATES.find((type) => isTypeSupported(type)) ?? '';
}

export class TakeRecorder {
  private listeners = new Set<() => void>();
  private snapshot: RecorderSnapshot = {
    status: 'idle',
    startMeasure: null,
    error: null,
  };
  private session = 0;
  private stream: MediaStream | null = null;
  private recorder: RecorderLike | null = null;
  private chunks: Blob[] = [];
  private recorderStartAt = 0;
  private barStartAt = 0;
  private offsetMs = 0;
  private durationMs = 0;
  private discard = false;

  constructor(
    private deps: RecorderDeps,
    private onTake: (take: RecordedTake) => void,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish = (patch: Partial<RecorderSnapshot>) => {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  };

  isSupported = () => this.deps.isSupported();

  /** 녹음 버튼. 마이크를 켜고 다음 마디선을 기다린다. */
  arm = async () => {
    if (this.snapshot.status !== 'idle') return;
    if (!this.deps.isSupported()) {
      this.publish({ error: UNSUPPORTED_MESSAGE });
      return;
    }
    const session = ++this.session;
    this.publish({ status: 'requesting', error: null, startMeasure: null });
    try {
      const stream = await this.deps.getUserMedia();
      if (session !== this.session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      this.chunks = [];
      this.discard = false;
      const recorder = this.deps.createRecorder(stream);
      this.recorder = recorder;
      recorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      });
      recorder.addEventListener('stop', () => this.finish(session));
      recorder.addEventListener('error', () => {
        this.cleanup();
        this.publish({
          status: 'idle',
          error: '녹음 중 오류가 났습니다. 다시 시도해 주세요.',
        });
      });
      recorder.start();
      this.recorderStartAt = this.deps.now();
      this.publish({ status: 'armed' });
    } catch (error) {
      if (session !== this.session) return;
      this.cleanup();
      this.publish({ status: 'idle', error: describeRecordingError(error) });
    }
  };

  /** 재생 중 마디가 시작될 때마다, 그 마디선이 들리는 시각과 함께 호출한다. */
  barStarted = (measure: number, atMs: number) => {
    const { status } = this.snapshot;
    if (status === 'armed') {
      this.barStartAt = atMs;
      this.offsetMs = Math.max(
        0,
        atMs - this.recorderStartAt + this.deps.latencyMs(),
      );
      this.publish({ status: 'recording', startMeasure: measure });
    } else if (status === 'finishing') {
      this.end(atMs);
    }
  };

  /** 녹음 정지 버튼. 녹음 중이면 이번 마디 끝에서 끝낸다. */
  requestStop = () => {
    const { status } = this.snapshot;
    if (status === 'recording') this.publish({ status: 'finishing' });
    else if (status === 'armed' || status === 'requesting') this.cancel();
  };

  /** 반주가 멈추면 녹음도 바로 끝낸다. 마디선 전이었다면 버린다. */
  playbackStopped = () => {
    const { status } = this.snapshot;
    if (status === 'recording' || status === 'finishing') {
      this.end(this.deps.now());
    } else if (status === 'armed' || status === 'requesting') {
      this.cancel();
    }
  };

  private end = (atMs: number) => {
    this.durationMs = Math.max(0, atMs - this.barStartAt);
    this.publish({ status: 'saving' });
    this.stopRecorder();
  };

  private cancel = () => {
    this.discard = true;
    this.session++;
    this.stopRecorder();
    this.cleanup();
    this.publish({ status: 'idle', startMeasure: null });
  };

  private stopRecorder = () => {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
  };

  private finish = (session: number) => {
    if (session !== this.session || this.discard) return;
    const mimeType = this.recorder?.mimeType || this.chunks[0]?.type || '';
    const blob = new Blob(this.chunks, { type: mimeType });
    const take = {
      blob,
      mimeType,
      offsetMs: this.offsetMs,
      durationMs: this.durationMs,
    };
    this.cleanup();
    this.publish({ status: 'idle', startMeasure: null });
    if (take.durationMs > 0 && blob.size > 0) this.onTake(take);
  };

  private cleanup = () => {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  };

  clearError = () => this.publish({ error: null });

  /** 화면을 떠날 때. 진행 중인 녹음은 저장하지 않고 마이크를 끈다. */
  dispose = () => {
    if (this.snapshot.status !== 'idle') this.cancel();
  };
}
