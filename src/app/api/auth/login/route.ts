import { or, eq } from "drizzle-orm";
import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, createSession, verifyPassword } from "@/lib/auth";
import { normalizeEmail, normalizeUsername } from "@/lib/staff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid login details." }, { status: 400 });
    const data = body as Record<string, unknown>;
    const identifier = typeof data.identifier === "string" ? data.identifier.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (!identifier || !password || identifier.length > 254 || password.length > 128) {
      return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(staffUsers)
      .where(or(eq(staffUsers.usernameNormalized, normalizeUsername(identifier)), eq(staffUsers.emailNormalized, normalizeEmail(identifier))))
      .limit(1);
    const valid = user?.active ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid) {
      return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return Response.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return apiError(error, "Could not sign in.");
  }
}
