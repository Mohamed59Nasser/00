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
      const messages: string[] = [];
      let current: unknown = error;
      for (let depth = 0; depth < 5 && current; depth += 1) {
        messages.push(current instanceof Error ? `${current.name}: ${current.message}` : String(current));
        current = typeof current === "object" && current !== null && "cause" in current
          ? (current as { cause?: unknown }).cause
          : undefined;
      }
      return Response.json({ ok: false, error: messages.join(" | ") }, { status: 500 });
    }
    return Response.json({ ok: false }, { status: 500 });
  }
}
