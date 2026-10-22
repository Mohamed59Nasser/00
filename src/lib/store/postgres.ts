import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type ClientRow } from "@/db/schema";
import type { Client, ClientInput, ClientMutationMeta } from "../types";
import type { Store } from "./types";

export function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    age: row.age,
    maritalStatus: row.maritalStatus,
    childrenCount: row.childrenCount,
    childrenNote: row.childrenNote,
    areas: row.areas ?? [],
    sizeSqm: row.sizeSqm,
    price: row.price,
    propertyTypes: row.propertyTypes ?? [],
    role: row.role,
    paymentMethods: row.paymentMethods ?? [],
    notes: row.notes,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedToName,
    assignedById: row.assignedById,
    assignedByName: row.assignedByName,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    createdById: row.createdById,
    createdByName: row.createdByName,
    updatedById: row.updatedById,
    updatedByName: row.updatedByName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const postgresStore: Store = {
  kind: "postgres",

  async list() {
    const rows = await db.select().from(clients).orderBy(desc(clients.createdAt), desc(clients.id));
    return rows.map(rowToClient);
  },

  async create(input: ClientInput, meta: ClientMutationMeta) {
    const now = new Date();
    const assignedToId = meta.assignedToId ?? null;
    const [created] = await db
      .insert(clients)
      .values({
        ...input,
        assignedToId,
        assignedToName: assignedToId ? meta.assignedToName ?? null : null,
        assignedById: meta.actorId,
        assignedByName: meta.actorName,
        assignedAt: assignedToId ? now : null,
        createdById: meta.actorId,
        createdByName: meta.actorName,
        updatedById: meta.actorId,
        updatedByName: meta.actorName,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return rowToClient(created);
  },

  async update(id: string, input: ClientInput, meta: ClientMutationMeta) {
    const [existingRow] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (!existingRow) return null;
    const existing = rowToClient(existingRow);
    const assignedToId = meta.assignedToId === undefined ? existing.assignedToId : meta.assignedToId;
    const assignmentChanged = assignedToId !== existing.assignedToId;
    const now = new Date();
    const [updated] = await db
      .update(clients)
      .set({
        ...input,
        assignedToId,
        assignedToName: assignedToId
          ? assignmentChanged
            ? meta.assignedToName ?? null
            : existing.assignedToName
          : null,
        assignedById: assignmentChanged ? meta.actorId : existing.assignedById,
        assignedByName: assignmentChanged ? meta.actorName : existing.assignedByName,
        assignedAt: assignmentChanged ? now : existing.assignedAt ? new Date(existing.assignedAt) : null,
        createdById: existing.createdById ?? meta.actorId,
        createdByName: existing.createdByName ?? meta.actorName,
        updatedById: meta.actorId,
        updatedByName: meta.actorName,
        updatedAt: now,
      })
      .where(eq(clients.id, id))
      .returning();
    return updated ? rowToClient(updated) : null;
  },

  async remove(id: string) {
    const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
    return deleted.length > 0;
  },
};
