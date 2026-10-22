import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { apiError, readJson } from "@/lib/api";
import {
  assertSameOrigin,
  AuthError,
  hashPassword,
  requireApiUser,
  revokeOtherSessions,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser(true);
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid request body." }, { status: 400 });
    const data = body as Record<string, unknown>;
    const currentPassword = typeof data.currentPassword === "string" ? data.currentPassword : "";
    const newPassword = validatePassword(data.newPassword);
    if (currentPassword === newPassword) throw new AuthError("Choose a different new password.", 400);

    const [row] = await db.select().from(staffUsers).where(eq(staffUsers.id, actor.id)).limit(1);
    if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
      throw new AuthError("Your current password is incorrect.", 400);
    }
    await db
      .update(staffUsers)
      .set({
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        updatedAt: new Date(),
        updatedById: actor.id,
      })
      .where(eq(staffUsers.id, actor.id));
    await revokeOtherSessions(actor.id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not change password.");
  }
}
