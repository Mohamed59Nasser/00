"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appPath } from "@/lib/paths";
import type { Client, ClientInput } from "@/lib/types";

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export function useClients(initialClients: Client[], initialError: string | null = null) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(appPath("/api/clients"), { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res, "Failed to load data."));
      const data = (await res.json()) as { clients: Client[] };
      if (mounted.current) setClients(data.clients);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: ClientInput, assignedToId?: string): Promise<Client> => {
    const res = await fetch(appPath("/api/clients"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, ...(assignedToId ? { assignedToId } : {}) }),
    });
    if (!res.ok) throw new Error(await readError(res, "Failed to save record."));
    const data = (await res.json()) as { client: Client };
    setError(null);
    setClients((prev) => [data.client, ...prev]);
    return data.client;
  }, []);

  const update = useCallback(async (id: string, input: ClientInput): Promise<Client> => {
    const res = await fetch(appPath(`/api/clients/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await readError(res, "Failed to update record."));
    const data = (await res.json()) as { client: Client };
    setClients((prev) => prev.map((c) => (c.id === id ? data.client : c)));
    return data.client;
  }, []);

  const transfer = useCallback(async (id: string, assignedToId: string): Promise<Client> => {
    const res = await fetch(appPath(`/api/clients/${encodeURIComponent(id)}/transfer`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (!res.ok) throw new Error(await readError(res, "Failed to transfer record."));
    const data = (await res.json()) as { client: Client };
    setClients((prev) => prev.map((c) => (c.id === id ? data.client : c)));
    return data.client;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(appPath(`/api/clients/${encodeURIComponent(id)}`), { method: "DELETE" });
    if (!res.ok) throw new Error(await readError(res, "Failed to delete record."));
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { clients, loading, error, refresh, create, update, transfer, remove };
}
