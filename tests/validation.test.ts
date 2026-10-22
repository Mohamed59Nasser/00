import { describe, expect, it } from "vitest";
import { validateClientInput } from "@/lib/validation";

const valid = {
  name: "Test Client",
  phone: "01156426501",
  email: "client@example.com",
  age: 35,
  maritalStatus: "married",
  childrenCount: 2,
  childrenNote: "",
  areas: ["New Cairo"],
  sizeSqm: 150,
  price: 2500000,
  propertyTypes: ["residential"],
  role: "buyer",
  paymentMethods: ["cash"],
  notes: "A note",
};

describe("client input validation", () => {
  it("accepts a valid client and strips server-controlled audit fields", () => {
    const result = validateClientInput({ ...valid, assignedToId: "another-user", createdById: "another-user", updatedByName: "forged" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe(valid.name);
      expect("assignedToId" in result.data).toBe(false);
      expect("createdById" in result.data).toBe(false);
      expect("updatedByName" in result.data).toBe(false);
    }
  });

  it("requires phone and a valid email when supplied", () => {
    expect(validateClientInput({ ...valid, phone: "" }).ok).toBe(false);
    expect(validateClientInput({ ...valid, email: "not-an-email" }).ok).toBe(false);
    expect(validateClientInput({ ...valid, email: "" }).ok).toBe(true);
  });

  it("locks children fields for single clients", () => {
    const result = validateClientInput({ ...valid, maritalStatus: "single", childrenCount: 4, childrenNote: "should be removed" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.childrenCount).toBe(0);
      expect(result.data.childrenNote).toBeNull();
    }
  });

  it("rejects invalid numbers and unknown enum values", () => {
    expect(validateClientInput({ ...valid, price: "not-a-number" }).ok).toBe(false);
    expect(validateClientInput({ ...valid, propertyTypes: ["unknown"] }).ok).toBe(false);
    expect(validateClientInput({ ...valid, role: "admin" }).ok).toBe(false);
  });
});
