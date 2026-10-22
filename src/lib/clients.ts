import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { AccessError, assertCanAssign, assertClientAccess, filterClientsForActor } from "./access";
import { getStore } from "./store";
import { getPublicUser, listAllPublicUsers } from "./users";
import type { Client, ClientInput, DuplicateInfo } from "./types";
import type { SessionUser } from "./staff";
import { findDuplicateInData } from "./duplicates";

export { normalizePhone } from "./duplicates";

/** Serializes contact mutations across serverless instances sharing PostgreSQL. */
async function withClientWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(918273645)`);
    return operation();
  });
}

export function clientInputFromClient(client: Client): ClientInput {
  return {
    name: client.name,
    phone: client.phone,
    email: client.email,
    age: client.age,
    maritalStatus: client.maritalStatus,
    childrenCount: client.childrenCount,
    childrenNote: client.childrenNote,
    areas: client.areas,
    sizeSqm: client.sizeSqm,
    price: client.price,
    propertyTypes: client.propertyTypes,
    role: client.role,
    paymentMethods: client.paymentMethods,
    notes: client.notes,
  };
}

export class DuplicateClientError extends Error {
  info: DuplicateInfo;
  status = 409;

  constructor(info: DuplicateInfo) {
    super(`This client is already assigned to ${info.assignedToName}${info.leaderName ? ` (Leader: ${info.leaderName})` : ""}.`);
    this.name = "DuplicateClientError";
    this.info = info;
  }
}

export async function findDuplicate(phone: string, email: string | null, excludeId?: string): Promise<DuplicateInfo | null> {
  const [clients, users] = await Promise.all([getStore().list(), listAllPublicUsers()]);
  return findDuplicateInData(clients, users, phone, email, excludeId);
}

export async function assertNoDuplicate(phone: string, email: string | null, excludeId?: string): Promise<void> {
  const duplicate = await findDuplicate(phone, email, excludeId);
  if (duplicate) throw new DuplicateClientError(duplicate);
}

export async function listVisibleClients(actor: SessionUser): Promise<Client[]> {
  const [clients, users] = await Promise.all([getStore().list(), listAllPublicUsers()]);
  return filterClientsForActor(actor, clients, users);
}

export async function getVisibleClient(actor: SessionUser, id: string): Promise<Client> {
  const [clients, users] = await Promise.all([getStore().list(), listAllPublicUsers()]);
  const client = clients.find((item) => item.id === id);
  if (!client) throw new AccessError("Client not found.", 404);
  assertClientAccess(actor, client, users);
  return client;
}

async function resolveAssignee(actor: SessionUser, assignedToId: unknown): Promise<{ id: string; name: string }> {
  const id = assignedToId === undefined || assignedToId === null || assignedToId === "" ? actor.id : String(assignedToId);
  const assignee = await getPublicUser(id);
  assertCanAssign(actor, assignee);
  return { id: assignee.id, name: assignee.displayName };
}

export async function createClientForActor(actor: SessionUser, input: ClientInput, assignedToId?: unknown): Promise<Client> {
  return withClientWriteLock(async () => {
    await assertNoDuplicate(input.phone, input.email);
    const assignee = await resolveAssignee(actor, assignedToId);
    return getStore().create(input, {
      actorId: actor.id,
      actorName: actor.displayName,
      assignedToId: assignee.id,
      assignedToName: assignee.name,
    });
  });
}

export async function updateClientForActor(
  actor: SessionUser,
  id: string,
  input: ClientInput,
  assignedToId?: unknown,
): Promise<Client> {
  return withClientWriteLock(async () => {
    await getVisibleClient(actor, id);
    await assertNoDuplicate(input.phone, input.email, id);
    const assignment = assignedToId === undefined ? null : await resolveAssignee(actor, assignedToId);
    const updated = await getStore().update(id, input, {
      actorId: actor.id,
      actorName: actor.displayName,
      ...(assignment ? { assignedToId: assignment.id, assignedToName: assignment.name } : {}),
    });
    if (!updated) throw new AccessError("Client not found.", 404);
    return updated;
  });
}

export async function transferClientForActor(actor: SessionUser, id: string, assignedToId: unknown): Promise<Client> {
  if (actor.role === "agent") throw new AccessError("Agents cannot transfer clients.");
  return withClientWriteLock(async () => {
    const existing = await getVisibleClient(actor, id);
    const assignee = await resolveAssignee(actor, assignedToId);
    const updated = await getStore().update(id, clientInputFromClient(existing), {
      actorId: actor.id,
      actorName: actor.displayName,
      assignedToId: assignee.id,
      assignedToName: assignee.name,
    });
    if (!updated) throw new AccessError("Client not found.", 404);
    return updated;
  });
}

export async function deleteClientForActor(actor: SessionUser, id: string): Promise<boolean> {
  if (actor.role !== "admin") throw new AccessError("Only an Admin can delete clients.");
  return withClientWriteLock(() => getStore().remove(id));
}
