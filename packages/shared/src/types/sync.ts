export type SyncStatus = 'pending' | 'synced' | 'failed';
export type SyncEntityType = 'visit' | 'review';

export interface SyncMetadata {
  clientEventId: string;
  syncStatus: SyncStatus;
  retryCount: number;
  lastAttemptAt: string | null;
  serverReceivedAt: string | null;
}

export interface SyncBatchItem {
  clientEventId: string;
  entityType: SyncEntityType;
  payload: Record<string, unknown>;
}

export interface SyncBatchResult {
  clientEventId: string;
  status: 'created' | 'duplicate' | 'error';
  serverId?: string;
  error?: string;
}
