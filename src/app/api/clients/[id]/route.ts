import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { deleteClientForActor, updateClientForActor } from "@/lib/clients";
import { validateClientInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): string {
  const id = decodeURIComponent(raw).trim();
  if (!id || id.length > 100) throw new Error("Invalid client id.");
  return id;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    const body = await readJson(request);
    const result = validateClientInput(body);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    const assignedToId = body && typeof body === "object" ? (body as Record<string, unknown>).assignedToId : undefined;
    const client = await updateClientForActor(actor, id, result.data, assignedToId);
    return Response.json({ client });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id.") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Failed to update client.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const { id: rawId } = await context.params;
    const id = parseId(rawId);
    const deleted = await deleteClientForActor(actor, id);
    if (!deleted) return Response.json({ error: "Client not found." }, { status: 404 });
    return Response.json({ ok: true, id });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid client id.") {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Failed to delete client.");
  }
}
