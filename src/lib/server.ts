import { errorMessage, getStore } from "./store";
import type { Client } from "./types";

/** Loads every client for server-rendered pages (newest first). Never throws. */
export async function loadClients(): Promise<{ clients: Client[]; error: string | null }> {
  try {
    return { clients: await getStore().list(), error: null };
  } catch (error) {
    console.error("Failed to load clients", error);
    return { clients: [], error: errorMessage(error, "Failed to load data.") };
  }
}
