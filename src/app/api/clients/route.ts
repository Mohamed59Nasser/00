import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { createClientForActor, listVisibleClients } from "@/lib/clients";
import { validateClientInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireApiUser();
    return Response.json({ clients: await listVisibleClients(actor) });
  } catch (error) {
    return apiError(error, "Failed to load clients.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const body = await readJson(request);
    const result = validateClientInput(body);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    const assignedToId = body && typeof body === "object" ? (body as Record<string, unknown>).assignedToId : undefined;
    const client = await createClientForActor(actor, result.data, assignedToId);
    return Response.json({ client }, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to save client.");
  }
}
