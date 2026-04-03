export type QualificationState =
  | 'pending'
  | 'discarded'
  | 'soft_confirm'
  | 'full_review'
  | 'employee_check';

export type PromptState =
  | 'pending'
  | 'shown'
  | 'dismissed'
  | 'completed'
  | 'reviewed';

export interface VisitCandidate {
  visitId: string;
  userId: string;
  cinemaId: string;
  entryTime: string;
  exitTime: string | null;
  dwellMinutes: number | null;
  locationConfidence: number;
  qualificationState: QualificationState;
  promptState: PromptState;
  clientEventId: string;
  createdAt: string;
}

export interface Cinema {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  address: string | null;
  chain?: string | null;
  city?: string;
  active?: boolean;
}
