import { describe, expect, it } from "vitest";
import { findDuplicateInData, normalizePhone } from "@/lib/duplicates";
import type { PublicUser } from "@/lib/staff";
import type { Client } from "@/lib/types";

const users = [
  { id: "agent-1", displayName: "Agent One", leaderName: "Leader One" } as PublicUser,
  { id: "agent-2", displayName: "Agent Two", leaderName: "Leader Two" } as PublicUser,
];
const clients = [
  { id: "client-1", phone: "01156426501", email: "first@example.com", assignedToId: "agent-1", assignedToName: "Agent One" } as Client,
  { id: "client-2", phone: "01000000000", email: "second@example.com", assignedToId: "agent-2", assignedToName: "Agent Two" } as Client,
];

describe("global duplicate detection", () => {
  it("normalizes Egyptian phone formats", () => {
    expect(normalizePhone("+20 115 642 6501")).toBe("01156426501");
    expect(normalizePhone("0020 115 642 6501")).toBe("01156426501");
    expect(normalizePhone("01156426501")).toBe("01156426501");
  });

  it("matches a phone globally even when another team owns the record", () => {
    const result = findDuplicateInData(clients, users, "+20 115 642 6501", null);
    expect(result?.matchedOn).toBe("phone");
    expect(result?.assignedToName).toBe("Agent One");
    expect(result?.leaderName).toBe("Leader One");
    expect(result?.phone).not.toContain("01156426501");
    expect(result?.phone).toContain("501");
    expect(result).not.toHaveProperty("clientId");
  });

  it("matches email even when the phone is different", () => {
    const result = findDuplicateInData(clients, users, "09999999999", "SECOND@example.com");
    expect(result?.matchedOn).toBe("email");
    expect(result?.assignedToName).toBe("Agent Two");
    expect(result?.email).toBe("s•••@example.com");
  });

  it("reports both matches and supports excluding the record being edited", () => {
    expect(findDuplicateInData(clients, users, "01156426501", "first@example.com")?.matchedOn).toBe("both");
    expect(findDuplicateInData(clients, users, "01156426501", "first@example.com", "client-1")).toBeNull();
  });

  it("does not return contact details when no duplicate exists", () => {
    expect(findDuplicateInData(clients, users, "01222222222", "new@example.com")).toBeNull();
  });
});
