// Types
export type {
  QualificationState,
  PromptState,
  VisitCandidate,
  Cinema,
} from './types/visit';

export type {
  SelectionSource,
  Movie,
  MovieSelection,
} from './types/movie';

export type {
  Review,
  CreateReviewInput,
  UpdateReviewInput,
} from './types/review';

export type {
  SyncStatus,
  SyncEntityType,
  SyncMetadata,
  SyncBatchItem,
  SyncBatchResult,
} from './types/sync';

export type {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthResponse,
  PaginatedRequest,
  PaginatedResponse,
  ApiError,
  NotificationPreference,
} from './types/api';

// Constants
export {
  DWELL_THRESHOLDS,
  CONFIDENCE_THRESHOLD,
  EMPLOYEE_DETECTION,
  PROMPT_SUPPRESSION,
  qualifyVisit,
} from './constants/dwell-time';
export type { QualificationInput } from './constants/dwell-time';

export {
  QUALIFICATION_LABELS,
  PROMPT_LABELS,
  RATING_MIN,
  RATING_MAX,
  REVIEW_EDIT_WINDOW_HOURS,
  SYNC_RETRY_INTERVALS_MS,
  SYNC_MAX_RETRIES,
  GEOFENCE_RADIUS_DEFAULT_METERS,
  GEOFENCE_MAX_REGIONS,
} from './constants/qualification';
