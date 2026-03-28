export const QUALIFICATION_LABELS: Record<string, string> = {
  pending: 'Pending',
  discarded: 'Not Eligible',
  soft_confirm: 'Needs Confirmation',
  full_review: 'Ready for Review',
  employee_check: 'Frequent Visitor',
};

export const PROMPT_LABELS: Record<string, string> = {
  pending: 'Waiting',
  shown: 'Prompted',
  dismissed: 'Dismissed',
  completed: 'Completed',
};

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const REVIEW_EDIT_WINDOW_HOURS = 24;

export const SYNC_RETRY_INTERVALS_MS = [
  60_000,
  300_000,
  900_000,
  3_600_000,
  3_600_000,
] as const;

export const SYNC_MAX_RETRIES = 20;

export const GEOFENCE_RADIUS_DEFAULT_METERS = 100;
export const GEOFENCE_MAX_REGIONS = 20;
