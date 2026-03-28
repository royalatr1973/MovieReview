export interface AuthRegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
}

export interface NotificationPreference {
  userId: string;
  reviewUpdateOptIn: boolean;
  digestMode: 'immediate' | 'daily';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  lastNotificationSentAt: string | null;
}
