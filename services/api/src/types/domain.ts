export const Roles = {
  STUDENT: 'STUDENT',
  ORGANIZER: 'ORGANIZER',
  CHECKIN_STAFF: 'CHECKIN_STAFF'
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const roleValues = Object.values(Roles);

export type CheckinSource = 'ONLINE' | 'OFFLINE_SYNC';
