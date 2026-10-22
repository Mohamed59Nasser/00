import "server-only";

import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { authSessions, staffUsers, type StaffUserRow } from "@/db/schema";
import type { SessionUser } from "./staff";
import { appPath } from "./paths";

export const SESSION_COOKIE = "broker_session";
const SESSION_DAYS = 7;
const BCRYPT_ROUNDS = 12;

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toSessionUser(row: StaffUserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    leaderId: row.leaderId,
    mustChangePassword: row.mustChangePassword,
  };
}

export function validatePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 10 || value.length > 128) {
    throw new AuthError("Password must be between 10 and 128 characters.", 400);
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw new AuthError("Password must contain at least one letter and one number.", 400);
  }
  return value;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 256) return null;

  const [row] = await db
    .select({ user: staffUsers })
    .from(authSessions)
    .innerJoin(staffUsers, eq(authSessions.userId, staffUsers.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  if (!row?.user.active) return null;
  return toSessionUser(row.user);
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
  await db.insert(authSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  }
  jar.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
}

export async function requireApiUser(allowPasswordChange = false): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in to continue.", 401);
  if (user.mustChangePassword && !allowPasswordChange) {
    throw new AuthError("Change your initial password before continuing.", 403);
  }
  return user;
}

export async function requirePageUser(allowPasswordChange = false): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(appPath("/login"));
  if (user.mustChangePassword && !allowPasswordChange) redirect(appPath("/change-password"));
  return user;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    if (new URL(origin).host !== request.headers.get("host")) {
      throw new AuthError("Cross-site requests are not allowed.", 403);
    }
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid request origin.", 403);
  }
}

export async function revokeOtherSessions(userId: string): Promise<void> {
  const jar = await cookies();
  const current = jar.get(SESSION_COOKIE)?.value;
  if (!current) {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
    return;
  }
  await db
    .delete(authSessions)
    .where(and(eq(authSessions.userId, userId), ne(authSessions.tokenHash, hashToken(current))));
}
