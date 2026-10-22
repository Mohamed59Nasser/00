import { AREAS } from "./areas";
import {
  CLIENT_ROLES,
  MARITAL_STATUSES,
  PAYMENT_METHODS,
  PROPERTY_TYPES,
  allowsChildren,
  type ClientInput,
} from "./types";

export type ValidationResult = { ok: true; data: ClientInput } | { ok: false; error: string };

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function cleanNumber(value: unknown): number | null | typeof NaN {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Keeps only allowed values from an array, de-duplicated, in a stable order. */
function pickAllowed<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const arr = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const lowered = arr.map((v) => String(v).trim().toLowerCase());
  return allowed.filter((a) => lowered.includes(a));
}

const AREA_LOOKUP = new Map(AREAS.map((a) => [a.toLowerCase(), a]));

export function cleanAreas(value: unknown): string[] {
  const arr = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of arr) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().replace(/\s*,\s*/g, " ");
    if (!trimmed) continue;
    const canonical = AREA_LOOKUP.get(trimmed.toLowerCase()) ?? trimmed;
    if (seen.has(canonical.toLowerCase())) continue;
    seen.add(canonical.toLowerCase());
    result.push(canonical);
  }
  return result;
}

/**
 * Validates and normalizes an incoming JSON body into a ClientInput.
 * Name and phone are required; everything else is optional.
 */
export function validateClientInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;

  const name = cleanString(b.name);
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 120) return { ok: false, error: "Name is too long." };

  const phone = cleanString(b.phone);
  if (!phone) return { ok: false, error: "Phone is required." };
  if (phone.length > 40) return { ok: false, error: "Phone is too long." };
  if (phone.replace(/\D/g, "").length < 5) return { ok: false, error: "Phone must contain at least 5 digits." };

  const email = cleanString(b.email);
  if (email && email.length > 254) return { ok: false, error: "Email is too long." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email format is not valid." };
  }

  const age = cleanNumber(b.age);
  if (Number.isNaN(age)) return { ok: false, error: "Age must be a number." };
  if (age !== null && (age < 0 || age > 120)) return { ok: false, error: "Age must be between 0 and 120." };

  const maritalRaw = typeof b.maritalStatus === "string" ? b.maritalStatus.toLowerCase() : "";
  if (!(MARITAL_STATUSES as readonly string[]).includes(maritalRaw)) {
    return { ok: false, error: "Marital status must be Single, Married, Divorced or Widowed." };
  }
  const maritalStatus = maritalRaw as ClientInput["maritalStatus"];

  // Single → children fields are locked.
  let childrenCount = 0;
  let childrenNote: string | null = null;
  if (allowsChildren(maritalStatus)) {
    const childrenRaw = cleanNumber(b.childrenCount);
    if (Number.isNaN(childrenRaw)) return { ok: false, error: "Children must be a number." };
    childrenCount = childrenRaw === null ? 0 : Math.max(0, Math.round(childrenRaw));
    childrenNote = cleanString(b.childrenNote);
  }

  const sizeSqm = cleanNumber(b.sizeSqm);
  if (Number.isNaN(sizeSqm)) return { ok: false, error: "Size must be a number." };
  if (sizeSqm !== null && sizeSqm < 0) return { ok: false, error: "Size cannot be negative." };

  const price = cleanNumber(b.price);
  if (Number.isNaN(price)) return { ok: false, error: "Price must be a number." };
  if (price !== null && price < 0) return { ok: false, error: "Price cannot be negative." };

  const propertyTypes = pickAllowed(b.propertyTypes, PROPERTY_TYPES);
  if (propertyTypes.length === 0) {
    return { ok: false, error: "Choose Residential, Investment, or both." };
  }

  const role = typeof b.role === "string" ? b.role.toLowerCase() : "";
  if (!(CLIENT_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Role must be Buyer or Seller." };
  }

  const notes = cleanString(b.notes);
  if (notes && notes.length > 4000) return { ok: false, error: "Notes are too long." };

  return {
    ok: true,
    data: {
      name,
      phone,
      email,
      age: age === null ? null : Math.round(age),
      maritalStatus,
      childrenCount,
      childrenNote,
      areas: cleanAreas(b.areas),
      sizeSqm,
      price,
      propertyTypes,
      role: role as ClientInput["role"],
      paymentMethods: pickAllowed(b.paymentMethods, PAYMENT_METHODS),
      notes,
    },
  };
}
