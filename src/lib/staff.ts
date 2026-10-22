export const STAFF_ROLES = ["agent", "senior", "team_leader", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  agent: "Agent",
  senior: "Senior",
  team_leader: "Team Leader",
  admin: "Admin",
};

export function roleToSheet(role: StaffRole): string {
  return STAFF_ROLE_LABELS[role];
}

export function roleFromSheet(value: unknown): StaffRole {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "team_leader") return "team_leader";
  if (normalized === "senior") return "senior";
  if (normalized === "admin") return "admin";
  return "agent";
}

/** Safe user shape shared with browser components. Never includes a password hash. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  leaderId: string | null;
  leaderName: string | null;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  createdById: string | null;
  updatedAt: string;
  updatedById: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  leaderId: string | null;
  mustChangePassword: boolean;
}

export interface StaffInput {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  leaderId: string | null;
  active: boolean;
  password?: string;
}

export function isManager(role: StaffRole): boolean {
  return role === "senior" || role === "team_leader";
}

export function canManageUsers(role: StaffRole): boolean {
  return role === "admin" || isManager(role);
}

export function canDeleteClients(role: StaffRole): boolean {
  return role === "admin";
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
