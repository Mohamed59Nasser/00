import { errorMessage, getStore } from "@/lib/store";
import { validateClientInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): string | null {
  const id = decodeURIComponent(raw).trim();
  return id && id.length <= 100 ? id : null;
}

export async function PUT(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateClientInput(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  try {
    const client = await getStore().update(id, result.data);
    if (!client) return Response.json({ error: "Client not found." }, { status: 404 });
    return Response.json({ client });
  } catch (error) {
    console.error(`PUT /api/clients/${id} failed`, error);
    return Response.json({ error: errorMessage(error, "Failed to update client.") }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ error: "Invalid id." }, { status: 400 });

  try {
    const deleted = await getStore().remove(id);
    if (!deleted) return Response.json({ error: "Client not found." }, { status: 404 });
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error(`DELETE /api/clients/${id} failed`, error);
    return Response.json({ error: errorMessage(error, "Failed to delete client.") }, { status: 500 });
  }
}
