import { useCallback } from 'react';
import { qualifyVisitLocally, shouldPromptUser } from '../services/visit-qualifier';
import { useVisitStore } from '../stores/visits';
import type { QualificationState } from '@moviereview/shared';

export function useVisitQualification() {
  const { updateVisitPromptState } = useVisitStore();

  const qualify = useCallback(
    (params: {
      dwellMinutes: number;
      locationConfidence: number;
      recentVisitCountAtSameCinema: number;
    }): QualificationState => {
      return qualifyVisitLocally(params);
    },
    []
  );

  const shouldPrompt = useCallback(
    (qualificationState: QualificationState): boolean => {
      return shouldPromptUser(qualificationState);
    },
    []
  );

  return { qualify, shouldPrompt };
}
