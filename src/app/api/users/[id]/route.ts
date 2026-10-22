import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { deleteStaffUser, updateStaffUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const result = await updateStaffUser(actor, decodeURIComponent(id), await readJson(request));
    return Response.json(result);
  } catch (error) {
    return apiError(error, "Failed to update user.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const result = await deleteStaffUser(actor, decodeURIComponent(id));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, "Failed to delete user.");
  }
}
