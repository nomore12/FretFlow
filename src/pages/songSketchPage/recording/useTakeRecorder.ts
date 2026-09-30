import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  RecordedTake,
  RecorderDeps,
  TakeRecorder,
  pickMimeType,
  trackInputLatencyMs,
} from './TakeRecorder';

const browserDeps: RecorderDeps = {
  isSupported: () =>
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia),
  getUserMedia: () => navigator.mediaDevices.getUserMedia({ audio: true }),
  createRecorder: (stream) => {
    const mimeType = pickMimeType((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    return new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  },
  now: () => performance.now(),
  // 출력 지연은 마디선 시각(heardAtMs)에 이미 들어 있다. 마이크 입력 지연은
  // 트랙 설정에 latency가 있을 때만 더한다.
  latencyMs: trackInputLatencyMs,
};

/** 녹음기 수명주기. 화면을 떠나면 마이크를 끈다. */
export default function useTakeRecorder(onTake: (take: RecordedTake) => void) {
  const onTakeRef = useRef(onTake);
  onTakeRef.current = onTake;
  const [recorder] = useState(
    () => new TakeRecorder(browserDeps, (take) => onTakeRef.current(take)),
  );
  const snapshot = useSyncExternalStore(
    recorder.subscribe,
    recorder.getSnapshot,
  );

  useEffect(() => () => recorder.dispose(), [recorder]);

  return {
    ...snapshot,
    supported: recorder.isSupported(),
    busy: snapshot.status !== 'idle',
    arm: recorder.arm,
    requestStop: recorder.requestStop,
    barStarted: recorder.barStarted,
    playbackStopped: recorder.playbackStopped,
    clearError: recorder.clearError,
  };
}
