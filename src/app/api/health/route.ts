import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    const debugToken = process.env.HEALTH_DEBUG_TOKEN;
    const providedToken = new URL(request.url).searchParams.get("debug");
    if (debugToken && providedToken === debugToken) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
    return Response.json({ ok: false }, { status: 500 });
  }
}
