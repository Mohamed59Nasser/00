import "server-only";

import { errorMessage } from "./store";
import { listVisibleClients } from "./clients";
import type { Client } from "./types";
import type { SessionUser } from "./staff";

/** Loads only records visible to the authenticated user's role and team. */
export async function loadClients(actor: SessionUser): Promise<{ clients: Client[]; error: string | null }> {
  try {
    return { clients: await listVisibleClients(actor), error: null };
  } catch (error) {
    console.error("Failed to load data", error instanceof Error ? error.message : "Unknown error");
    return { clients: [], error: errorMessage(error, "Failed to load data.") };
  }
}
