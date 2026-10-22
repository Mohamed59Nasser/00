import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { transferClientForActor } from "@/lib/clients";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const { id } = await context.params;
    const body = await readJson(request);
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid request body." }, { status: 400 });
    const assignedToId = (body as Record<string, unknown>).assignedToId;
    const client = await transferClientForActor(actor, decodeURIComponent(id), assignedToId);
    return Response.json({ client });
  } catch (error) {
    return apiError(error, "Failed to transfer client.");
  }
}
