export interface SyncGuard {
  isApplyingRemote: boolean;
  readOnly: boolean;
}

export function createSyncGuard(): SyncGuard {
  return {
    isApplyingRemote: false,
    readOnly: false,
  };
}