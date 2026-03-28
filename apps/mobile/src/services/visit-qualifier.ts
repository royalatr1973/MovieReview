import {
  qualifyVisit,
  type QualificationState,
  EMPLOYEE_DETECTION,
} from '@moviereview/shared';

export interface VisitQualificationParams {
  dwellMinutes: number;
  locationConfidence: number;
  recentVisitCountAtSameCinema: number;
}

export function qualifyVisitLocally(
  params: VisitQualificationParams
): QualificationState {
  return qualifyVisit({
    dwellMinutes: params.dwellMinutes,
    locationConfidence: params.locationConfidence,
    recentVisitCountAtSameCinema: params.recentVisitCountAtSameCinema,
  });
}

export function shouldPromptUser(
  qualificationState: QualificationState
): boolean {
  return (
    qualificationState === 'soft_confirm' ||
    qualificationState === 'full_review'
  );
}

export function getPromptType(
  qualificationState: QualificationState
): 'soft_confirm' | 'full_review' | null {
  if (qualificationState === 'soft_confirm') return 'soft_confirm';
  if (qualificationState === 'full_review') return 'full_review';
  return null;
}

export function isPotentialEmployee(
  recentVisitCount: number
): boolean {
  return recentVisitCount >= EMPLOYEE_DETECTION.VISIT_COUNT_THRESHOLD;
}
