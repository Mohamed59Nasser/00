import { describe, expect, it } from "vitest";
import {
  AccessError,
  assertCanAssign,
  assertCanManageUser,
  assertClientAccess,
  assertRoleCreation,
  filterClientsForActor,
  scopeUserIds,
} from "@/lib/access";
import type { PublicUser, SessionUser, StaffRole } from "@/lib/staff";
import type { Client } from "@/lib/types";

const now = new Date().toISOString();

function user(id: string, role: StaffRole, leaderId: string | null = null, active = true): PublicUser {
  return {
    id,
    username: id,
    displayName: id,
    email: `${id}@example.com`,
    phone: "01000000000",
    role,
    leaderId,
    leaderName: leaderId,
    active,
    mustChangePassword: false,
    createdAt: now,
    createdById: null,
    updatedAt: now,
    updatedById: null,
  };
}

function actor(id: string, role: StaffRole, leaderId: string | null = null): SessionUser {
  return { id, username: id, displayName: id, email: `${id}@example.com`, phone: "01000000000", role, leaderId, mustChangePassword: false };
}

function client(id: string, assignedToId: string | null): Client {
  return {
    id,
    name: id,
    phone: `010000000${id.length}`,
    email: null,
    age: null,
    maritalStatus: "single",
    childrenCount: 0,
    childrenNote: null,
    areas: [],
    sizeSqm: null,
    price: null,
    propertyTypes: ["residential"],
    role: "buyer",
    paymentMethods: [],
    notes: null,
    assignedToId,
    assignedToName: assignedToId,
    assignedById: null,
    assignedByName: null,
    assignedAt: null,
    createdById: null,
    createdByName: null,
    updatedById: null,
    updatedByName: null,
    createdAt: now,
    updatedAt: now,
  };
}

const users = [
  user("admin", "admin"),
  user("leader-a", "team_leader"),
  user("senior-b", "senior"),
  user("agent-a1", "agent", "leader-a"),
  user("agent-a2", "agent", "leader-a"),
  user("agent-b1", "agent", "senior-b"),
  user("unassigned", "agent"),
];
const records = [client("admin-record", "admin"), client("a1-record", "agent-a1"), client("a2-record", "agent-a2"), client("b1-record", "agent-b1"), client("legacy", null)];

describe("role and team scope", () => {
  it("gives Admin global scope", () => {
    expect(scopeUserIds(actor("admin", "admin"), users).size).toBe(users.length);
    expect(filterClientsForActor(actor("admin", "admin"), records, users)).toHaveLength(records.length);
  });

  it("limits managers to themselves and direct Agents", () => {
    const visible = filterClientsForActor(actor("leader-a", "team_leader"), records, users);
    expect(visible.map((record) => record.id)).toEqual(["a1-record", "a2-record"]);
    expect(() => assertClientAccess(actor("leader-a", "team_leader"), records[3], users)).toThrow(AccessError);
  });

  it("limits Agents to their own assigned records", () => {
    const visible = filterClientsForActor(actor("agent-a1", "agent", "leader-a"), records, users);
    expect(visible.map((record) => record.id)).toEqual(["a1-record"]);
    expect(() => assertClientAccess(actor("agent-a1", "agent", "leader-a"), records[1], users)).not.toThrow();
    expect(() => assertClientAccess(actor("agent-a1", "agent", "leader-a"), records[2], users)).toThrow(AccessError);
  });

  it("does not expose legacy unassigned records to non-admin users", () => {
    expect(filterClientsForActor(actor("leader-a", "team_leader"), records, users).some((record) => record.id === "legacy")).toBe(false);
  });
});

describe("assignment and staff hierarchy", () => {
  it("allows managers to assign only within their own team", () => {
    const leader = actor("leader-a", "team_leader");
    expect(() => assertCanAssign(leader, users.find((item) => item.id === "agent-a1")!)).not.toThrow();
    expect(() => assertCanAssign(leader, users.find((item) => item.id === "agent-b1")!)).toThrow(AccessError);
    expect(() => assertCanAssign(leader, users.find((item) => item.id === "unassigned")!)).toThrow(AccessError);
  });

  it("prevents Agents from assigning to anyone else or transferring through staff permissions", () => {
    const agent = actor("agent-a1", "agent", "leader-a");
    expect(() => assertCanAssign(agent, users.find((item) => item.id === "agent-a1")!)).not.toThrow();
    expect(() => assertCanAssign(agent, users.find((item) => item.id === "agent-a2")!)).toThrow(AccessError);
    expect(() => assertRoleCreation(agent, "agent")).toThrow(AccessError);
  });

  it("prevents managers from creating elevated roles or editing another team", () => {
    const leader = actor("leader-a", "team_leader");
    expect(() => assertRoleCreation(leader, "senior")).toThrow(AccessError);
    expect(() => assertRoleCreation(leader, "team_leader")).toThrow(AccessError);
    expect(() => assertRoleCreation(leader, "admin")).toThrow(AccessError);
    expect(() => assertCanManageUser(leader, users.find((item) => item.id === "agent-b1")!)).toThrow(AccessError);
  });

  it("rejects inactive assignees", () => {
    const inactive = user("inactive", "agent", "leader-a", false);
    expect(() => assertCanAssign(actor("leader-a", "team_leader"), inactive)).toThrow(AccessError);
  });
});
