import type { PublicUser } from "./staff";
import type { Client, DuplicateInfo } from "./types";

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("20") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  return digits;
}

function maskPhone(value: string): string {
  const normalized = normalizePhone(value);
  return normalized ? `${"•".repeat(Math.max(4, normalized.length - 3))}${normalized.slice(-3)}` : "—";
}

function maskEmail(value: string | null): string | null {
  if (!value) return null;
  const [local = "", domain] = value.toLowerCase().split("@");
  return domain ? `${local.slice(0, 1) || "•"}•••@${domain}` : "•••";
}

/** Pure global matching used by both the API and unit tests. */
export function findDuplicateInData(
  clients: Client[],
  users: PublicUser[],
  phone: string,
  email: string | null,
  excludeId?: string,
): DuplicateInfo | null {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email?.trim().toLowerCase() || "";
  if (!normalizedPhone && !normalizedEmail) return null;

  const matched = clients.find((client) => {
    if (client.id === excludeId) return false;
    const phoneMatches = normalizedPhone.length > 0 && normalizePhone(client.phone) === normalizedPhone;
    const emailMatches = normalizedEmail.length > 0 && client.email?.toLowerCase() === normalizedEmail;
    return phoneMatches || emailMatches;
  });
  if (!matched) return null;

  const phoneMatches = normalizedPhone.length > 0 && normalizePhone(matched.phone) === normalizedPhone;
  const emailMatches = normalizedEmail.length > 0 && matched.email?.toLowerCase() === normalizedEmail;
  const owner = users.find((user) => user.id === matched.assignedToId);
  return {
    matchedOn: phoneMatches && emailMatches ? "both" : phoneMatches ? "phone" : "email",
    assignedToName: owner?.displayName ?? matched.assignedToName ?? "Unassigned (Admin only)",
    leaderName: owner?.leaderName ?? null,
    phone: maskPhone(matched.phone),
    email: maskEmail(matched.email),
  };
}
