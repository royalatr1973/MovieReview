import type { QualificationState } from '../types/visit';

export const DWELL_THRESHOLDS = {
  MIN_DISCARD: 15,
  MIN_SOFT_CONFIRM: 15,
  MAX_SOFT_CONFIRM: 45,
  MIN_FULL_REVIEW: 45,
  MAX_FULL_REVIEW: 240,
  MIN_EMPLOYEE_CHECK: 240,
  MULTI_MOVIE_THRESHOLD: 180,
} as const;

export const CONFIDENCE_THRESHOLD = 0.7;

export const EMPLOYEE_DETECTION = {
  VISIT_COUNT_THRESHOLD: 5,
  WINDOW_DAYS: 14,
} as const;

export const PROMPT_SUPPRESSION = {
  MAX_IGNORED_PROMPTS: 3,
  COOLDOWN_HOURS: 24,
} as const;

export interface QualificationInput {
  dwellMinutes: number;
  locationConfidence: number;
  recentVisitCountAtSameCinema?: number;
}

export function qualifyVisit(input: QualificationInput): QualificationState {
  const { dwellMinutes, locationConfidence, recentVisitCountAtSameCinema = 0 } = input;

  if (dwellMinutes < DWELL_THRESHOLDS.MIN_DISCARD) {
    return 'discarded';
  }

  if (dwellMinutes > DWELL_THRESHOLDS.MIN_EMPLOYEE_CHECK) {
    return 'employee_check';
  }

  if (recentVisitCountAtSameCinema >= EMPLOYEE_DETECTION.VISIT_COUNT_THRESHOLD) {
    return 'employee_check';
  }

  const isHighConfidence = locationConfidence >= CONFIDENCE_THRESHOLD;

  if (dwellMinutes >= DWELL_THRESHOLDS.MIN_FULL_REVIEW && isHighConfidence) {
    return 'full_review';
  }

  if (dwellMinutes >= DWELL_THRESHOLDS.MIN_SOFT_CONFIRM) {
    return 'soft_confirm';
  }

  return 'discarded';
}
