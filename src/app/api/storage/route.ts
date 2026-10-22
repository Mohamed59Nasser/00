import { desc } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getSheetsConfig } from "@/lib/google";
import { initializeSheet } from "@/lib/sheetsSetup";
import { errorMessage, getStorageSummary } from "@/lib/store";
import { postgresStore, rowToClient } from "@/lib/store/postgres";
import { ALL_TAB, SEARCH_TAB, appendClients, resetSheetsReadyCache, sheetsStore } from "@/lib/store/sheets";
import { sheetsFetch } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Connection status – also verifies that the Google Sheet can really be reached. */
export async function GET() {
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

/** Actions: "init" (create / restyle the tabs) and "migrate" (copy local data into the sheet). */
export async function POST(request: Request) {
  if (!getSheetsConfig()) {
    return Response.json({ error: "Google Sheets is not configured yet." }, { status: 400 });
  }

  let action = "";
  try {
    const body = (await request.json()) as { action?: string };
    action = body.action ?? "";
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    if (action === "init") {
      await initializeSheet();
      resetSheetsReadyCache();
      return Response.json({ ok: true, message: "Sheet initialized: ALL and SEARCH tabs are ready." });
    }

    if (action === "migrate") {
      const rows = await db.select().from(clients).orderBy(clients.createdAt);
      if (rows.length === 0) return Response.json({ ok: true, message: "No local records to copy.", copied: 0 });

      // Avoid duplicates: skip anything whose id already exists in the sheet.
      const existing = new Set((await sheetsStore.list()).map((c) => c.id));
      const toCopy = rows.map(rowToClient).filter((c) => !existing.has(c.id));
      const copied = await appendClients(toCopy);
      return Response.json({ ok: true, copied, message: `${copied} record(s) copied to Google Sheets.` });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/storage failed", error);
    return Response.json({ error: errorMessage(error, "Operation failed.") }, { status: 500 });
  }
}
