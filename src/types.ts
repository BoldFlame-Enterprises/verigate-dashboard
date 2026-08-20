export type UserRole = 'admin' | 'scanner' | 'user';
export type AccountStatus = 'active' | 'suspended' | 'deactivated';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  account_status?: AccountStatus;
  status_reason?: string | null;
  status_changed_at?: string;
  created_at: string;
  updated_at: string;
  is_event_admin?: boolean;
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
  role_in_event?: string;
  administration_scope?: 'global' | 'event' | 'none';
  capabilities?: EventCapability[];
}

export interface EventMembership {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
  role_in_event: string;
  is_active: boolean;
  joined_at: string;
}

export type EventCapability =
  | 'manage_event_devices'
  | 'manage_operational_cases';

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

export interface DeviceRegistration {
  id: number;
  event_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  app: 'pass' | 'scan';
  installation_id: string;
  platform: string | null;
  state: 'active' | 'deregistered' | 'blacklisted';
  session_generation: number;
  version: number;
  registered_at: string;
  last_seen_at: string | null;
  last_sync_at: string | null;
  last_scan_upload_at: string | null;
  local_db_version: number | null;
  app_version: string | null;
  state_changed_at: string;
  state_changed_by: number | null;
  state_reason: string | null;
  audit_upload_until: string | null;
  updated_at: string;
  sync_status: 'online' | 'stale' | 'offline' | 'unknown';
}

export interface DeviceRegistrationAction {
  id: number;
  registration_id: number;
  event_id: number;
  action: string;
  previous_state: DeviceRegistration['state'] | null;
  new_state: DeviceRegistration['state'];
  actor_user_id: number | null;
  actor_email: string | null;
  reason: string | null;
  session_generation: number;
  created_at: string;
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
  assigned_to: number | null;
  assigned_to_name: string | null;
  decision_by: number | null;
  decision_by_name: string | null;
  decision_note: string | null;
  version: number;
  created_at: string;
  updated_at: string;
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
  review_status: 'pending' | 'reviewing' | 'reviewed';
  review_outcome: 'justified' | 'rejected' | 'follow_up_required' | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  decision_note: string | null;
  legacy_outcome_unknown: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
}

export interface CasePage<T> {
  items: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export type CursorPage<T> = CasePage<T>;

export interface CaseAdministrator {
  id: number;
  name: string;
  email: string;
  administration_scope: 'global' | 'event';
}

export interface OperationalCaseActivity {
  id: number;
  action: string;
  previous_status: string | null;
  new_status: string;
  previous_outcome?: string | null;
  new_outcome?: string | null;
  previous_assigned_to: number | null;
  new_assigned_to: number | null;
  actor_user_id: number;
  actor_name: string | null;
  note: string | null;
  version: number;
  created_at: string;
}
