import { desc } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { apiError, readJson } from "@/lib/api";
import { AccessError } from "@/lib/access";
import { assertSameOrigin, requireApiUser } from "@/lib/auth";
import { getSheetsConfig, sheetsFetch } from "@/lib/google";
import { findDuplicateInData } from "@/lib/duplicates";
import { initializeSheet } from "@/lib/sheetsSetup";
import { errorMessage, getStorageSummary } from "@/lib/store";
import { postgresStore, rowToClient } from "@/lib/store/postgres";
import { ALL_TAB, SEARCH_TAB, appendClients, resetSheetsReadyCache, sheetsStore } from "@/lib/store/sheets";
import { syncUsersToSheet } from "@/lib/usersSheets";
import { listAllPublicUsers } from "@/lib/users";
import type { SessionUser } from "@/lib/staff";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<SessionUser> {
  const actor = await requireApiUser();
  if (actor.role !== "admin") throw new AccessError("Only an Admin can manage storage.");
  return actor;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    return apiError(error, "Could not verify access.");
  }

  const summary = getStorageSummary();
  if (!summary.configured) {
    const localRows = await postgresStore.list().catch(() => []);
    return Response.json({ ...summary, connected: false, initialized: false, localCount: localRows.length, error: null });
  }

  try {
    const meta = await sheetsFetch<{ properties?: { title?: string }; sheets?: { properties: { title: string } }[] }>(
      "?fields=properties.title,sheets.properties.title",
    );
    const tabs = (meta.sheets ?? []).map((s) => s.properties.title);
    const localCount = (await db.select({ id: clients.id }).from(clients).orderBy(desc(clients.createdAt))).length;
    return Response.json({
      ...summary,
      connected: true,
      title: meta.properties?.title ?? null,
      tabs,
      initialized: tabs.includes(ALL_TAB) && tabs.includes(SEARCH_TAB),
      localCount,
      error: null,
    });
  } catch (error) {
    return Response.json({
      ...summary,
      connected: false,
      initialized: false,
      localCount: 0,
      error: errorMessage(error, "Could not reach Google Sheets."),
    });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);
    if (!getSheetsConfig()) return Response.json({ error: "Google Sheets is not configured yet." }, { status: 400 });
    const body = (await readJson(request)) as { action?: string };

    if (body.action === "init") {
      await initializeSheet();
      resetSheetsReadyCache();
      await syncUsersToSheet();
      return Response.json({ ok: true, message: "ALL, SEARCH and USERS tabs are ready." });
    }

    if (body.action === "migrate") {
      const rows = await db.select().from(clients).orderBy(clients.createdAt);
      if (rows.length === 0) return Response.json({ ok: true, message: "No local records to copy.", copied: 0, skipped: 0 });
      const existingClients = await sheetsStore.list();
      const existingIds = new Set(existingClients.map((c) => c.id));
      const users = await listAllPublicUsers();
      const toCopy: Client[] = [];
      let skipped = 0;
      for (const client of rows.map(rowToClient)) {
        if (existingIds.has(client.id) || findDuplicateInData([...existingClients, ...toCopy], users, client.phone, client.email)) {
          skipped += 1;
          continue;
        }
        toCopy.push(client);
      }
      const copied = await appendClients(toCopy);
      return Response.json({ ok: true, copied, skipped, message: `${copied} record(s) copied; ${skipped} skipped as existing or duplicate contact.` });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return apiError(error, "Storage operation failed.");
  }
}
