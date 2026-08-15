export interface SyncGuard {
  isApplyingRemote: boolean;
}

export function createSyncGuard(): SyncGuard {
  return { isApplyingRemote: false };
}