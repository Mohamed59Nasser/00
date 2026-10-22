import { getSheetsConfig, isSheetsConfigured, spreadsheetUrl } from "../google";
import { postgresStore } from "./postgres";
import { sheetsStore } from "./sheets";
import type { Store, StoreKind } from "./types";

export type { Store, StoreKind } from "./types";

/** Google Sheets is the database as soon as it is configured; otherwise local PostgreSQL. */
export function getStore(): Store {
  return isSheetsConfigured() ? sheetsStore : postgresStore;
}

export function getStorageKind(): StoreKind {
  return isSheetsConfigured() ? "sheets" : "postgres";
}

export function getStorageSummary() {
  const config = getSheetsConfig();
  return {
    kind: getStorageKind(),
    configured: Boolean(config),
    serviceAccountEmail: config?.email ?? null,
    spreadsheetUrl: spreadsheetUrl(),
  };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
