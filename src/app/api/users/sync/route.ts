import { apiError } from "@/lib/api";
import { AccessError } from "@/lib/access";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { syncUsersToSheet } from "@/lib/usersSheets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    if (actor.role !== "admin") throw new AccessError("Only an Admin can synchronize all users.");
    assertSameOrigin(request);
    await syncUsersToSheet();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not synchronize the USERS sheet.");
  }
}
