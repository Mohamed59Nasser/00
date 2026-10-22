import "server-only";

import { sheetsFetch } from "./google";
import { listAllPublicUsers } from "./users";
import { roleToSheet } from "./staff";

export const USERS_TAB = "USERS";
export const USERS_HEADERS = [
  "User ID",
  "Username",
  "Display Name",
  "Email",
  "Phone",
  "Role",
  "Leader ID",
  "Leader Name",
  "Active",
  "Must Change Password",
  "Created At",
  "Created By",
  "Updated At",
  "Updated By",
] as const;

function sheetDate(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

async function ensureUsersTab(): Promise<void> {
  const meta = await sheetsFetch<{ sheets?: { properties: { title: string } }[] }>("?fields=sheets.properties.title");
  if ((meta.sheets ?? []).some((sheet) => sheet.properties.title === USERS_TAB)) return;
  await sheetsFetch(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: USERS_TAB, index: 2 } } }] }),
  });
}

/** Replaces only the non-sensitive USERS tab; client tabs are never touched. */
export async function syncUsersToSheet(): Promise<void> {
  await ensureUsersTab();
  const users = await listAllPublicUsers();
  if (users.length === 0) {
    // Never erase pre-existing Sheet staff metadata before the first DB bootstrap.
    const existing = await sheetsFetch<{ values?: unknown[][] }>(`/values/${encodeURIComponent(`${USERS_TAB}!A1:N`)}`);
    if ((existing.values ?? []).length > 1) return;
    await sheetsFetch(`/values/${encodeURIComponent(`${USERS_TAB}!A1:N1`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [[...USERS_HEADERS]] }),
    });
    return;
  }
  const names = new Map(users.map((user) => [user.id, user.displayName]));
  const rows = users.map((user) => [
    user.id,
    user.username,
    user.displayName,
    user.email,
    user.phone,
    roleToSheet(user.role),
    user.leaderId ?? "",
    user.leaderName ?? "",
    user.active,
    user.mustChangePassword,
    sheetDate(user.createdAt),
    user.createdById ? names.get(user.createdById) ?? "System" : "System",
    sheetDate(user.updatedAt),
    user.updatedById ? names.get(user.updatedById) ?? "" : "",
  ]);

  await sheetsFetch(`/values/${encodeURIComponent(`${USERS_TAB}!A2:N1000`)}:clear`, {
    method: "POST",
    body: "{}",
  });
  await sheetsFetch(`/values/${encodeURIComponent(`${USERS_TAB}!A1:N${rows.length + 1}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [[...USERS_HEADERS], ...rows] }),
  });
}
