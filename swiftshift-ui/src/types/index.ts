export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  positions: number[];
  locations: number[];
  avatar_url?: string;
}

export interface Position {
  id: number;
  name: string;
  color: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
}

export interface Shift {
  id: number;
  user_id: number;
  location_id: number;
  position_id: number;
  start_time: string;
  end_time: string;
  notes?: string;
  published: boolean;
}

export type TimeOffType = 'unpaid' | 'paid' | 'sick' | 'holiday';

export interface TimeOffRequest {
  id: number;
  user_id: number;
  type: TimeOffType;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  start_time?: string;
  end_time?: string;
  status: 'pending' | 'approved' | 'denied';
  notes?: string;
}

export type AvailabilityPreference = 'available' | 'unavailable';

export interface AvailabilityEvent {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  preference: AvailabilityPreference;
  notes?: string;
}

export type UserRole = 'admin' | 'tutor';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}
