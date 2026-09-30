import { useCallback, useEffect, useState } from 'react';
import { Take, TakePatch, describeStorageError } from './takes';
import {
  deleteTake,
  listTakes,
  saveTake,
  storageEstimate,
  updateTake,
} from './takesDb';

/** 곡 하나의 테이크 목록. 모든 변경은 IndexedDB에 쓴 뒤 다시 읽는다. */
export default function useTakes(songId: string) {
  const [takes, setTakes] = useState<Take[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(
    null,
  );

  const reload = useCallback(async () => {
    try {
      setTakes(await listTakes(songId));
      setUsage(await storageEstimate().catch(() => null));
    } catch (error) {
      setError(describeStorageError(error));
    }
  }, [songId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const mutate = useCallback(
    async (work: () => Promise<void>) => {
      try {
        await work();
        setError(null);
      } catch (error) {
        console.error('테이크 저장소 오류:', error);
        setError(describeStorageError(error));
      }
      await reload();
    },
    [reload],
  );

  return {
    takes,
    error,
    usage,
    clearError: () => setError(null),
    add: (take: Take) => mutate(() => saveTake(take)),
    update: (id: string, patch: TakePatch) =>
      mutate(() => updateTake(id, patch)),
    remove: (id: string) => mutate(() => deleteTake(id)),
  };
}
