import { JWT } from "google-auth-library";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetsConfig {
  spreadsheetId: string;
  email: string;
  privateKey: string;
}

export class GoogleSheetsError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "GoogleSheetsError";
    this.status = status;
  }
}

/** Accepts a bare spreadsheet id or a full Google Sheets URL. */
export function extractSpreadsheetId(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

function normalizeKey(key: string): string {
  return key.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

/**
 * Reads the Google Sheets connection settings from environment variables.
 *
 *   GOOGLE_SHEET_ID                – spreadsheet id (or the full URL)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   – service account e-mail
 *   GOOGLE_PRIVATE_KEY             – service account private key
 *   (or) GOOGLE_SERVICE_ACCOUNT_JSON – the whole downloaded JSON key file
 */
export function getSheetsConfig(): SheetsConfig | null {
  const rawId = process.env.GOOGLE_SHEET_ID;
  if (!rawId?.trim()) return null;

  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json && (!email || !privateKey)) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
      email = email || parsed.client_email;
      privateKey = privateKey || parsed.private_key;
    } catch {
      // Ignore – reported as "not configured" below.
    }
  }

  if (!email || !privateKey?.trim()) return null;

  return {
    spreadsheetId: extractSpreadsheetId(rawId),
    email,
    privateKey: normalizeKey(privateKey),
  };
}

export function isSheetsConfigured(): boolean {
  return getSheetsConfig() !== null;
}

let cachedAuth: { key: string; client: JWT } | null = null;

async function getAccessToken(config: SheetsConfig): Promise<string> {
  const cacheKey = `${config.email}:${config.privateKey.length}`;
  if (!cachedAuth || cachedAuth.key !== cacheKey) {
    cachedAuth = {
      key: cacheKey,
      client: new JWT({
        email: config.email,
        key: config.privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      }),
    };
  }
  try {
    const { token } = await cachedAuth.client.getAccessToken();
    if (!token) throw new Error("No access token returned.");
    return token;
  } catch (error) {
    cachedAuth = null;
    const message = error instanceof Error ? error.message : "Authentication failed.";
    throw new GoogleSheetsError(`Google authentication failed: ${message}`, 401);
  }
}

function friendlyMessage(status: number, apiMessage: string, config: SheetsConfig): string {
  if (status === 403) {
    return `Access denied. Share the Google Sheet with ${config.email} as an Editor. (${apiMessage})`;
  }
  if (status === 404) {
    return "Spreadsheet not found. Check that GOOGLE_SHEET_ID is correct.";
  }
  if (status === 429) {
    return "Google Sheets rate limit reached. Please wait a few seconds and try again.";
  }
  return apiMessage || `Google Sheets request failed (${status}).`;
}

/** Calls the Google Sheets REST API. `path` is appended to the spreadsheet URL. */
export async function sheetsFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getSheetsConfig();
  if (!config) throw new GoogleSheetsError("Google Sheets is not configured.", 400);

  const token = await getAccessToken(config);
  const res = await fetch(`${SHEETS_API}/${config.spreadsheetId}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let apiMessage = "";
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      apiMessage = data.error?.message ?? "";
    } catch {
      // ignore body parse errors
    }
    throw new GoogleSheetsError(friendlyMessage(res.status, apiMessage, config), res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function spreadsheetUrl(): string | null {
  const config = getSheetsConfig();
  return config ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit` : null;
}
