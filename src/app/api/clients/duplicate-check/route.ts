import { apiError, readJson } from "@/lib/api";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { findDuplicate, getVisibleClient } from "@/lib/clients";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireApiUser();
    assertSameOrigin(request);
    const body = await readJson(request);
    if (!body || typeof body !== "object") return Response.json({ error: "Invalid request body." }, { status: 400 });
    const data = body as Record<string, unknown>;
    const phone = typeof data.phone === "string" ? data.phone : "";
    const email = typeof data.email === "string" && data.email.trim() ? data.email : null;
    const excludeId = typeof data.excludeId === "string" ? data.excludeId : undefined;
    if (excludeId) await getVisibleClient(actor, excludeId);
    return Response.json({ duplicate: await findDuplicate(phone, email, excludeId) });
  } catch (error) {
    return apiError(error, "Could not check for duplicates.");
  }
}
