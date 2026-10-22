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
  type ClientMutationMeta,
  type MaritalStatus,
  type PaymentMethod,
  type PropertyType,
} from "../types";
import type { Store } from "./types";

export const ALL_TAB = "ALL";
export const SEARCH_TAB = "SEARCH";

/** A:Z — original client fields followed by ownership and audit metadata. */
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
  "Assigned To ID",
  "Assigned To Name",
  "Assigned By ID",
  "Assigned By Name",
  "Assigned At",
  "Created By ID",
  "Created By Name",
  "Updated By ID",
  "Updated By Name",
  "Updated At",
] as const;

export const LAST_COLUMN_LETTER = "Z";
const COL = {
  ADDED: 14,
  ID: 15,
  ASSIGNED_TO_ID: 16,
  ASSIGNED_TO_NAME: 17,
  ASSIGNED_BY_ID: 18,
  ASSIGNED_BY_NAME: 19,
  ASSIGNED_AT: 20,
  CREATED_BY_ID: 21,
  CREATED_BY_NAME: 22,
  UPDATED_BY_ID: 23,
  UPDATED_BY_NAME: 24,
  UPDATED_AT: 25,
} as const;

const AREA_LOOKUP = new Map(AREAS.map((a) => [a.toLowerCase(), a]));

function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function nullable(value: unknown): string | null {
  return str(value) || null;
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

function fromSheetDate(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw) ? `${raw.replace(" ", "T")}:00Z` : raw);
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
  rowNumber: number;
  client: Client;
  needsId: boolean;
  needsAdded: boolean;
}

function parseRow(row: unknown[], rowNumber: number): ParsedRow | null {
  const name = str(row[0]);
  const phone = str(row[1]);
  if (!name && !phone) return null;

  const id = str(row[COL.ID]);
  const addedIso = fromSheetDate(row[COL.ADDED]);
  const createdAt = addedIso ?? new Date().toISOString();
  const maritalStatus = parseMarital(row[4]);
  const children = numOrNull(row[5]);

  const client: Client = {
    id: id || crypto.randomUUID(),
    name: name || "(no name)",
    phone,
    email: nullable(row[2]),
    age: numOrNull(row[3]),
    maritalStatus,
    childrenCount: maritalStatus === "single" ? 0 : Math.max(0, Math.round(children ?? 0)),
    childrenNote: nullable(row[6]),
    areas: parseAreas(row[7]),
    sizeSqm: numOrNull(row[8]),
    price: numOrNull(row[9]),
    propertyTypes: parseTypes(row[10]),
    role: str(row[11]).toLowerCase().startsWith("sell") ? "seller" : "buyer",
    paymentMethods: parsePayments(row[12]),
    notes: nullable(row[13]),
    assignedToId: nullable(row[COL.ASSIGNED_TO_ID]),
    assignedToName: nullable(row[COL.ASSIGNED_TO_NAME]),
    assignedById: nullable(row[COL.ASSIGNED_BY_ID]),
    assignedByName: nullable(row[COL.ASSIGNED_BY_NAME]),
    assignedAt: fromSheetDate(row[COL.ASSIGNED_AT]),
    createdById: nullable(row[COL.CREATED_BY_ID]),
    createdByName: nullable(row[COL.CREATED_BY_NAME]),
    updatedById: nullable(row[COL.UPDATED_BY_ID]),
    updatedByName: nullable(row[COL.UPDATED_BY_NAME]),
    createdAt,
    updatedAt: fromSheetDate(row[COL.UPDATED_AT]) ?? createdAt,
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
    c.assignedToId ?? "",
    c.assignedToName ?? "",
    c.assignedById ?? "",
    c.assignedByName ?? "",
    c.assignedAt ? toSheetDate(c.assignedAt) : "",
    c.createdById ?? "",
    c.createdByName ?? "",
    c.updatedById ?? "",
    c.updatedByName ?? "",
    toSheetDate(c.updatedAt),
  ];
}

interface SheetMeta {
  sheets?: { properties: { sheetId: number; title: string } }[];
}

const enc = encodeURIComponent;

async function getSheetId(title: string): Promise<number | null> {
  const meta = await sheetsFetch<SheetMeta>("?fields=sheets.properties(sheetId,title)");
  return meta.sheets?.find((s) => s.properties.title === title)?.properties.sheetId ?? null;
}

let readyPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const allId = await getSheetId(ALL_TAB);
      const searchId = await getSheetId(SEARCH_TAB);
      let needsSetup = allId === null || searchId === null;
      if (allId !== null && !needsSetup) {
        const header = await sheetsFetch<{ values?: string[][] }>(`/values/${enc(`${ALL_TAB}!A1:Z1`)}`);
        needsSetup = !header.values?.[0] || SHEET_HEADERS.some((value, index) => header.values?.[0]?.[index] !== value);
      }
      if (needsSetup) {
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

export function resetSheetsReadyCache(): void {
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

function createAudit(meta: ClientMutationMeta, now: string) {
  const assignedToId = meta.assignedToId ?? null;
  return {
    assignedToId,
    assignedToName: assignedToId ? meta.assignedToName ?? null : null,
    assignedById: meta.actorId,
    assignedByName: meta.actorName,
    assignedAt: assignedToId ? now : null,
    createdById: meta.actorId,
    createdByName: meta.actorName,
    updatedById: meta.actorId,
    updatedByName: meta.actorName,
  };
}

export const sheetsStore: Store = {
  kind: "sheets",

  async list() {
    const rows = await readRows();
    return rows
      .sort((a, b) => b.client.createdAt.localeCompare(a.client.createdAt) || b.rowNumber - a.rowNumber)
      .map((p) => p.client);
  },

  async create(input: ClientInput, meta: ClientMutationMeta) {
    await ensureReady();
    const now = new Date().toISOString();
    const client: Client = { ...input, ...createAudit(meta, now), id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await sheetsFetch(
      `/values/${enc(`${ALL_TAB}!A:${LAST_COLUMN_LETTER}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [clientToRow(client)] }) },
    );
    return client;
  },

  async update(id: string, input: ClientInput, meta: ClientMutationMeta) {
    const rows = await readRows();
    const existing = rows.find((p) => p.client.id === id);
    if (!existing) return null;
    const previous = existing.client;
    const assignedToId = meta.assignedToId === undefined ? previous.assignedToId : meta.assignedToId;
    const assignmentChanged = assignedToId !== previous.assignedToId;
    const now = new Date().toISOString();
    const client: Client = {
      ...input,
      id,
      assignedToId,
      assignedToName: assignedToId
        ? assignmentChanged
          ? meta.assignedToName ?? null
          : previous.assignedToName
        : null,
      assignedById: assignmentChanged ? meta.actorId : previous.assignedById,
      assignedByName: assignmentChanged ? meta.actorName : previous.assignedByName,
      assignedAt: assignmentChanged ? now : previous.assignedAt,
      createdById: previous.createdById ?? meta.actorId,
      createdByName: previous.createdByName ?? meta.actorName,
      updatedById: meta.actorId,
      updatedByName: meta.actorName,
      createdAt: previous.createdAt,
      updatedAt: now,
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

export async function appendClients(clients: Client[]): Promise<number> {
  if (clients.length === 0) return 0;
  await ensureReady();
  await sheetsFetch(
    `/values/${enc(`${ALL_TAB}!A:${LAST_COLUMN_LETTER}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: clients.map(clientToRow) }) },
  );
  return clients.length;
}
