export type UserRole = 'admin' | 'scanner' | 'user';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessLevel {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
}

export interface Area {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  requires_scan: boolean;
  is_active: boolean;
}

export interface AccessAssignment {
  id: number;
  event_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  access_level_id: number;
  access_level_name: string;
  area_id: number;
  area_name: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export interface DashboardData {
  event_id: number;
  members: number;
  areas: number;
  access_levels: number;
  scans: {
    total: number;
    granted: number;
    denied: number;
    grant_rate: number;
    last_24h: number;
  };
  scans_by_area: { area_id: number; area_name: string; granted: number; denied: number }[];
  assignments_by_access_level: { access_level_id: number; access_level_name: string; count: number }[];
  recent_scans: {
    id: number;
    user_id: number;
    user_name: string | null;
    area_id: number;
    area_name: string | null;
    access_granted: boolean;
    failure_reason: string | null;
    scanned_at: string;
    scanner_user_id: number | null;
    scanner_name: string | null;
  }[];
  device_activity: { scanner_user_id: number; scanner_name: string | null; last_scan_at: string; scan_count: number }[];
}

export interface DeviceSyncStatus {
  device_id: string;
  app: 'pass' | 'scan';
  platform: string | null;
  last_sync_at: string | null;
  last_scan_upload_at: string | null;
  local_db_version: number | null;
  user_name: string | null;
  status: 'online' | 'stale' | 'offline' | 'unknown';
  seconds_since_sync: number | null;
}

export interface Incident {
  id: number;
  event_id: number;
  reporter_user_id: number | null;
  reporter_name: string | null;
  area_id: number | null;
  area_name: string | null;
  category: string;
  description: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
}

export interface EmergencyOverride {
  id: number;
  event_id: number;
  user_id: number | null;
  user_name: string | null;
  area_id: number;
  area_name: string;
  scanner_user_id: number | null;
  scanner_name: string | null;
  access_granted: boolean;
  reason: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
}
