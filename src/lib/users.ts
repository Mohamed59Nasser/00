import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, staffUsers, type StaffUserRow } from "@/db/schema";
import { hashPassword, validatePassword, AuthError } from "./auth";
import { AccessError, assertCanManageUser, assertRoleCreation } from "./access";
import { getStore } from "./store";
import { isSheetsConfigured } from "./google";
import {
  isManager,
  normalizeEmail,
  normalizeUsername,
  STAFF_ROLES,
  type PublicUser,
  type SessionUser,
  type StaffInput,
  type StaffRole,
} from "./staff";

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new AuthError(`${label} is required.`, 400);
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length > max) throw new AuthError(`${label} is too long.`, 400);
  return clean;
}

function validateStaffBody(body: unknown, partial = false): StaffInput {
  if (!body || typeof body !== "object") throw new AuthError("Invalid request body.", 400);
  const b = body as Record<string, unknown>;
  const username = requiredText(b.username, "Username", 80);
  const displayName = requiredText(b.displayName, "Display name", 120);
  const email = normalizeEmail(requiredText(b.email, "Email", 254));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("Email format is not valid.", 400);
  const phone = requiredText(b.phone, "Phone", 40);
  const role = String(b.role ?? "") as StaffRole;
  if (!(STAFF_ROLES as readonly string[]).includes(role)) throw new AuthError("Invalid staff role.", 400);
  if (typeof b.active !== "boolean") throw new AuthError("Active must be true or false.", 400);
  const leaderId = b.leaderId === null || b.leaderId === "" || b.leaderId === undefined ? null : String(b.leaderId);
  const password = b.password === undefined || b.password === "" ? undefined : validatePassword(b.password);
  if (partial && password === undefined && b.password !== undefined && b.password !== "") {
    throw new AuthError("Invalid password.", 400);
  }
  return { username, displayName, email, phone, role, leaderId, active: b.active, password };
}

function toPublicUsers(rows: StaffUserRow[]): PublicUser[] {
  const names = new Map(rows.map((row) => [row.id, row.displayName]));
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    leaderId: row.leaderId,
    leaderName: row.leaderId ? names.get(row.leaderId) ?? null : null,
    active: row.active,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
    updatedAt: row.updatedAt.toISOString(),
    updatedById: row.updatedById,
  }));
}

export async function listAllPublicUsers(): Promise<PublicUser[]> {
  const rows = await db.select().from(staffUsers).orderBy(asc(staffUsers.createdAt));
  return toPublicUsers(rows);
}

export async function listUsersForActor(actor: SessionUser): Promise<PublicUser[]> {
  const users = await listAllPublicUsers();
  if (actor.role === "admin") return users;
  if (isManager(actor.role)) return users.filter((user) => user.id === actor.id || user.leaderId === actor.id);
  return users.filter((user) => user.id === actor.id);
}

export async function getPublicUser(id: string): Promise<PublicUser> {
  const users = await listAllPublicUsers();
  const user = users.find((item) => item.id === id);
  if (!user) throw new AccessError("User not found.", 404);
  return user;
}

export async function getAssignableUsers(actor: SessionUser): Promise<PublicUser[]> {
  const users = await listUsersForActor(actor);
  return users.filter((user) => user.active && (actor.role === "admin" || user.id === actor.id || user.leaderId === actor.id));
}

async function syncUsersAfterChange(): Promise<string | null> {
  if (!isSheetsConfigured()) return null;
  try {
    const { syncUsersToSheet } = await import("./usersSheets");
    await syncUsersToSheet();
    return null;
  } catch (error) {
    console.error("USERS sheet synchronization failed", error instanceof Error ? error.message : "Unknown error");
    return "The user was saved, but the USERS sheet could not be synchronized. Please retry from Users.";
  }
}

async function resolveLeader(actor: SessionUser, requestedRole: StaffRole, requestedLeaderId: string | null): Promise<string | null> {
  if (actor.role !== "admin") return actor.id;
  if (requestedRole !== "agent") return null;
  if (!requestedLeaderId) throw new AccessError("Choose a Senior or Team Leader for this Agent.", 400);
  const leader = await getPublicUser(requestedLeaderId);
  if (!leader.active || !isManager(leader.role)) {
    throw new AccessError("An Agent's leader must be an active Senior or Team Leader.", 400);
  }
  return leader.id;
}

export async function createStaffUser(actor: SessionUser, body: unknown): Promise<{ user: PublicUser; warning: string | null }> {
  const input = validateStaffBody(body);
  if (!input.password) throw new AuthError("An initial password is required.", 400);
  assertRoleCreation(actor, input.role);
  const leaderId = await resolveLeader(actor, input.role, input.leaderId);
  const passwordHash = await hashPassword(input.password);

  try {
    const [row] = await db
      .insert(staffUsers)
      .values({
        username: input.username,
        usernameNormalized: normalizeUsername(input.username),
        displayName: input.displayName,
        email: input.email,
        emailNormalized: normalizeEmail(input.email),
        phone: input.phone,
        passwordHash,
        role: input.role,
        leaderId,
        active: input.active,
        mustChangePassword: true,
        createdById: actor.id,
        updatedById: actor.id,
      })
      .returning();
    const user = (await getPublicUser(row.id)) as PublicUser;
    return { user, warning: await syncUsersAfterChange() };
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
      throw new AccessError("Username or email is already in use.", 409);
    }
    throw error;
  }
}

export async function updateStaffUser(actor: SessionUser, id: string, body: unknown): Promise<{ user: PublicUser; warning: string | null }> {
  const input = validateStaffBody(body, true);
  const target = await getPublicUser(id);
  assertCanManageUser(actor, target);
  assertRoleCreation(actor, input.role);

  if (actor.role !== "admin") {
    if (target.id === actor.id || target.role !== "agent") throw new AccessError("You can only edit Agents in your own team.");
    if (input.role !== "agent" || (input.leaderId && input.leaderId !== actor.id)) {
      throw new AccessError("Only an Admin can change roles or leaders.");
    }
  }
  if (target.id === actor.id && (input.role !== target.role || !input.active)) {
    throw new AccessError("You cannot demote or deactivate your own account.", 400);
  }

  const leaderId = await resolveLeader(actor, input.role, input.leaderId);
  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  try {
    await db
      .update(staffUsers)
      .set({
        username: input.username,
        usernameNormalized: normalizeUsername(input.username),
        displayName: input.displayName,
        email: input.email,
        emailNormalized: normalizeEmail(input.email),
        phone: input.phone,
        role: input.role,
        leaderId,
        active: input.active,
        ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
        updatedAt: new Date(),
        updatedById: actor.id,
      })
      .where(eq(staffUsers.id, id));
    if (passwordHash || !input.active) await db.delete(authSessions).where(eq(authSessions.userId, id));
    return { user: await getPublicUser(id), warning: await syncUsersAfterChange() };
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
      throw new AccessError("Username or email is already in use.", 409);
    }
    throw error;
  }
}

export async function deleteStaffUser(actor: SessionUser, id: string): Promise<{ warning: string | null }> {
  if (actor.role !== "admin") throw new AccessError("Only an Admin can delete users.");
  if (actor.id === id) throw new AccessError("You cannot delete your own account.", 400);
  const target = await getPublicUser(id);
  const users = await listAllPublicUsers();
  if (users.some((user) => user.leaderId === id)) {
    throw new AccessError("Reassign this user's team before deleting the account.", 409);
  }
  const assigned = (await getStore().list()).some((client) => client.assignedToId === target.id);
  if (assigned) throw new AccessError("Transfer this user's clients before deleting the account.", 409);
  await db.delete(staffUsers).where(eq(staffUsers.id, id));
  return { warning: await syncUsersAfterChange() };
}
