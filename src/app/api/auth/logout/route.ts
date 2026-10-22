import { apiError } from "@/lib/api";
import { assertSameOrigin, destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not sign out.");
  }
}
