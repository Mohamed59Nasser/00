import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type ClientRow } from "@/db/schema";
import type { Client, ClientInput } from "../types";
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

  async create(input: ClientInput) {
    const [created] = await db.insert(clients).values(input).returning();
    return rowToClient(created);
  },

  async update(id: string, input: ClientInput) {
    const [updated] = await db
      .update(clients)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated ? rowToClient(updated) : null;
  },

  async remove(id: string) {
    const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
    return deleted.length > 0;
  },
};
