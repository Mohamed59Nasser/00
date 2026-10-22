import { AREAS } from "../areas";
import { GoogleSheetsError, sheetsFetch } from "../google";
import {
  MARITAL_STATUSES,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  MARITAL_LABELS,
  CLIENT_ROLE_LABELS,
  type Client,
  type ClientInput,
  type MaritalStatus,
  type PaymentMethod,
  type PropertyType,
} from "../types";
import type { Store } from "./types";

/* ------------------------------------------------------------------ */
/*  Layout of the ALL tab                                              */
/* ------------------------------------------------------------------ */

export const ALL_TAB = "ALL";
export const SEARCH_TAB = "SEARCH";

/** Column order of the ALL tab. The last two columns are managed by the app. */
export const SHEET_HEADERS = [
  "Name",
  "Phone",
  "Email",
  "Age",
  "Marital Status",
  "Children",
  "Children Note",
  "Areas",
  "Size (m²)",
  "Price (EGP)",
  "Type",
  "Role",
  "Payment",
  "Notes",
  "Added",
  "ID",
] as const;

export const LAST_COLUMN_LETTER = "P"; // 16 columns: A..P
const COL = { ADDED: 14, ID: 15 } as const;

/* ------------------------------------------------------------------ */
/*  Row <-> Client mapping                                             */
/* ------------------------------------------------------------------ */

const AREA_LOOKUP = new Map(AREAS.map((a) => [a.toLowerCase(), a]));

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function splitList(value: unknown): string[] {
  return str(value)
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toSheetDate(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

function fromSheetDate(value: string): string | null {
  if (!value) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}:00Z` : value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseMarital(value: unknown): MaritalStatus {
  const v = str(value).toLowerCase();
  return (MARITAL_STATUSES as readonly string[]).includes(v) ? (v as MaritalStatus) : "single";
}

function parseTypes(value: unknown): PropertyType[] {
  const v = str(value).toLowerCase();
  const found = PROPERTY_TYPES.filter((t) => v.includes(t.slice(0, 5)));
  return found.length ? found : ["residential"];
}

function parsePayments(value: unknown): PaymentMethod[] {
  const v = str(value).toLowerCase();
  return PAYMENT_METHODS.filter((p) => v.includes(p.slice(0, 5)));
}

function parseAreas(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of splitList(value)) {
    const canonical = AREA_LOOKUP.get(item.toLowerCase()) ?? item;
    if (seen.has(canonical.toLowerCase())) continue;
    seen.add(canonical.toLowerCase());
    out.push(canonical);
  }
  return out;
}

interface ParsedRow {
  rowNumber: number; // 1-based row number in the sheet
  client: Client;
  needsId: boolean;
  needsAdded: boolean;
}

function parseRow(row: unknown[], rowNumber: number): ParsedRow | null {
  const name = str(row[0]);
  const phone = str(row[1]);
  if (!name && !phone) return null; // blank row

  const id = str(row[COL.ID]);
  const addedIso = fromSheetDate(str(row[COL.ADDED]));
  const maritalStatus = parseMarital(row[4]);
  const children = numOrNull(row[5]);

  const client: Client = {
    id: id || crypto.randomUUID(),
    name: name || "(no name)",
    phone,
    email: str(row[2]) || null,
    age: numOrNull(row[3]),
    maritalStatus,
    childrenCount: maritalStatus === "single" ? 0 : Math.max(0, Math.round(children ?? 0)),
    childrenNote: str(row[6]) || null,
    areas: parseAreas(row[7]),
    sizeSqm: numOrNull(row[8]),
    price: numOrNull(row[9]),
    propertyTypes: parseTypes(row[10]),
    role: str(row[11]).toLowerCase().startsWith("sell") ? "seller" : "buyer",
    paymentMethods: parsePayments(row[12]),
    notes: str(row[13]) || null,
    createdAt: addedIso ?? new Date().toISOString(),
    updatedAt: addedIso ?? new Date().toISOString(),
  };

  return { rowNumber, client, needsId: !id, needsAdded: !addedIso };
}

function clientToRow(c: Client): (string | number)[] {
  return [
    c.name,
    c.phone,
    c.email ?? "",
    c.age ?? "",
    MARITAL_LABELS[c.maritalStatus],
    c.maritalStatus === "single" ? "" : c.childrenCount,
    c.maritalStatus === "single" ? "" : (c.childrenNote ?? ""),
    c.areas.join(", "),
    c.sizeSqm ?? "",
    c.price ?? "",
    c.propertyTypes.map((t) => PROPERTY_TYPE_LABELS[t]).join(", "),
    CLIENT_ROLE_LABELS[c.role],
    c.paymentMethods.map((p) => PAYMENT_LABELS[p]).join(", "),
    c.notes ?? "",
    toSheetDate(c.createdAt),
    c.id,
  ];
}

/* ------------------------------------------------------------------ */
/*  Sheets API helpers                                                 */
/* ------------------------------------------------------------------ */

interface SheetMeta {
  sheets?: { properties: { sheetId: number; title: string } }[];
}

const enc = encodeURIComponent;

async function getSheetId(title: string): Promise<number | null> {
  const meta = await sheetsFetch<SheetMeta>("?fields=sheets.properties(sheetId,title)");
  return meta.sheets?.find((s) => s.properties.title === title)?.properties.sheetId ?? null;
}

let readyPromise: Promise<void> | null = null;

/** Makes sure the ALL / SEARCH tabs exist (initialises the spreadsheet on first use). */
async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const allId = await getSheetId(ALL_TAB);
      if (allId === null) {
        const { initializeSheet } = await import("../sheetsSetup");
        await initializeSheet();
      }
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}

export function resetSheetsReadyCache() {
  readyPromise = null;
}

async function readRows(): Promise<ParsedRow[]> {
  await ensureReady();
  const data = await sheetsFetch<{ values?: unknown[][] }>(
    `/values/${enc(`${ALL_TAB}!A2:${LAST_COLUMN_LETTER}`)}?valueRenderOption=UNFORMATTED_VALUE`,
  );
  const rows = data.values ?? [];
  const parsed: ParsedRow[] = [];
  rows.forEach((row, index) => {
    const p = parseRow(row, index + 2);
    if (p) parsed.push(p);
  });

  // Rows typed directly in Google Sheets have no ID / Added value yet – fill them in.
  const fixes = parsed.filter((p) => p.needsId || p.needsAdded);
  if (fixes.length) {
    await sheetsFetch(`/values:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: fixes.map((p) => ({
          range: `${ALL_TAB}!O${p.rowNumber}:P${p.rowNumber}`,
          values: [[toSheetDate(p.client.createdAt), p.client.id]],
        })),
      }),
    });
  }
  return parsed;
}

/* ------------------------------------------------------------------ */
/*  Store implementation                                               */
/* ------------------------------------------------------------------ */

export const sheetsStore: Store = {
  kind: "sheets",

  async list() {
    const rows = await readRows();
    return rows
      .sort((a, b) => b.client.createdAt.localeCompare(a.client.createdAt) || b.rowNumber - a.rowNumber)
      .map((p) => p.client);
  },

  async create(input: ClientInput) {
    await ensureReady();
    const now = new Date().toISOString();
    const client: Client = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await sheetsFetch(
      `/values/${enc(`${ALL_TAB}!A:${LAST_COLUMN_LETTER}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [clientToRow(client)] }) },
    );
    return client;
  },

  async update(id: string, input: ClientInput) {
    const rows = await readRows();
    const existing = rows.find((p) => p.client.id === id);
    if (!existing) return null;
    const client: Client = {
      ...input,
      id,
      createdAt: existing.client.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await sheetsFetch(
      `/values/${enc(`${ALL_TAB}!A${existing.rowNumber}:${LAST_COLUMN_LETTER}${existing.rowNumber}`)}?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [clientToRow(client)] }) },
    );
    return client;
  },

  async remove(id: string) {
    const rows = await readRows();
    const existing = rows.find((p) => p.client.id === id);
    if (!existing) return false;
    const sheetId = await getSheetId(ALL_TAB);
    if (sheetId === null) throw new GoogleSheetsError("The ALL tab was not found in the spreadsheet.", 404);
    await sheetsFetch(`:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: existing.rowNumber - 1,
                endIndex: existing.rowNumber,
              },
            },
          },
        ],
      }),
    });
    return true;
  },
};

/** Appends many clients at once (used to copy local PostgreSQL data into the sheet). */
export async function appendClients(clients: Client[]): Promise<number> {
  if (clients.length === 0) return 0;
  await ensureReady();
  await sheetsFetch(
    `/values/${enc(`${ALL_TAB}!A:${LAST_COLUMN_LETTER}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: clients.map(clientToRow) }) },
  );
  return clients.length;
}
