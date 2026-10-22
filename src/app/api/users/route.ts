import { apiError, readJson } from "@/lib/api";
import { AccessError } from "@/lib/access";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/staff";
import { createStaffUser, listUsersForActor } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireApiUser();
    if (!canManageUsers(actor.role)) throw new AccessError("You do not have user-management access.");
    return Response.json({ users: await listUsersForActor(actor) });
  } catch (error) {
    return apiError(error, "Failed to load users.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    if (!canManageUsers(actor.role)) throw new AccessError("You do not have user-management access.");
    assertSameOrigin(request);
    const result = await createStaffUser(actor, await readJson(request));
    return Response.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create user.");
  }
}
