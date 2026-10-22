import type { Client } from "./types";
import { isManager, type PublicUser, type SessionUser } from "./staff";

export class AccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}

/** Admin has global scope; managers have themselves plus direct reports; agents have themselves only. */
export function scopeUserIds(actor: SessionUser, users: PublicUser[]): Set<string> {
  const ids = new Set<string>([actor.id]);
  if (actor.role === "admin") {
    for (const user of users) ids.add(user.id);
  } else if (isManager(actor.role)) {
    for (const user of users) {
      if (user.leaderId === actor.id) ids.add(user.id);
    }
  }
  return ids;
}

export function canAccessClient(actor: SessionUser, client: Client, users: PublicUser[]): boolean {
  if (actor.role === "admin") return true;
  if (!client.assignedToId) return false;
  return scopeUserIds(actor, users).has(client.assignedToId);
}

export function filterClientsForActor(actor: SessionUser, clients: Client[], users: PublicUser[]): Client[] {
  if (actor.role === "admin") return clients;
  const scope = scopeUserIds(actor, users);
  return clients.filter((client) => client.assignedToId !== null && scope.has(client.assignedToId));
}

export function assertClientAccess(actor: SessionUser, client: Client, users: PublicUser[]): void {
  if (!canAccessClient(actor, client, users)) {
    // Use 404 for out-of-scope records so their existence is not disclosed.
    throw new AccessError("Client not found.", 404);
  }
}

export function assertCanAssign(actor: SessionUser, assignee: PublicUser): void {
  if (!assignee.active) throw new AccessError("The selected user is inactive.", 400);
  if (actor.role === "admin") return;
  if (actor.role === "agent") {
    if (assignee.id !== actor.id) throw new AccessError("Agents can only assign records to themselves.");
    return;
  }
  if (assignee.id !== actor.id && assignee.leaderId !== actor.id) {
    throw new AccessError("You can only assign records within your own team.");
  }
}

export function assertCanManageUser(actor: SessionUser, target: PublicUser): void {
  if (actor.role === "admin") return;
  if (!isManager(actor.role)) throw new AccessError("You do not have user-management access.");
  if (target.id !== actor.id && target.leaderId !== actor.id) {
    throw new AccessError("You can only manage users within your own team.");
  }
}

export function assertRoleCreation(actor: SessionUser, requestedRole: PublicUser["role"]): void {
  if (actor.role === "admin") return;
  if (!isManager(actor.role)) throw new AccessError("You do not have user-management access.");
  if (requestedRole !== "agent") throw new AccessError("Only an Admin can create or change elevated roles.");
}
