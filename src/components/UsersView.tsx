"use client";

import { useMemo, useState, type FormEvent } from "react";
import { appPath } from "@/lib/paths";
import {
  STAFF_ROLE_LABELS,
  STAFF_ROLES,
  isManager,
  type PublicUser,
  type SessionUser,
  type StaffRole,
} from "@/lib/staff";
import { PencilIcon, PlusIcon, RefreshIcon, SpinnerIcon, TrashIcon, UsersIcon } from "./icons";
import { Modal, Toast } from "./ui";
import { useToast } from "@/hooks/useToast";

interface FormState {
  id: string | null;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  role: StaffRole;
  leaderId: string;
  active: boolean;
  password: string;
}

function emptyForm(actor: SessionUser): FormState {
  return {
    id: null,
    username: "",
    displayName: "",
    email: "",
    phone: "",
    role: "agent",
    leaderId: actor.role === "admin" ? "" : actor.id,
    active: true,
    password: "",
  };
}

function formFromUser(user: PublicUser): FormState {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    leaderId: user.leaderId ?? "",
    active: user.active,
    password: "",
  };
}

function payload(form: FormState) {
  return {
    username: form.username,
    displayName: form.displayName,
    email: form.email,
    phone: form.phone,
    role: form.role,
    leaderId: form.role === "agent" ? form.leaderId || null : null,
    active: form.active,
    ...(form.password ? { password: form.password } : {}),
  };
}

async function responseError(res: Response, fallback: string) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}

export function UsersView({ initialUsers, currentUser }: { initialUsers: PublicUser[]; currentUser: SessionUser }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, show } = useToast();
  const isAdmin = currentUser.role === "admin";

  const leaders = useMemo(
    () => users.filter((user) => user.active && isManager(user.role) && user.id !== form?.id),
    [users, form?.id],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => previous ? { ...previous, [key]: value } : previous);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(appPath(form.id ? `/api/users/${encodeURIComponent(form.id)}` : "/api/users"), {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(form)),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not save user."));
      const data = (await res.json()) as { user: PublicUser; warning: string | null };
      setUsers((previous) => form.id ? previous.map((user) => user.id === data.user.id ? data.user : user) : [...previous, data.user]);
      setForm(null);
      show(data.warning ? "error" : "success", data.warning ?? `${data.user.displayName} saved`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: PublicUser) {
    setBusy(true);
    try {
      const res = await fetch(appPath(`/api/users/${encodeURIComponent(user.id)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload({ ...formFromUser(user), active: !user.active })),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not update user."));
      const data = (await res.json()) as { user: PublicUser; warning: string | null };
      setUsers((previous) => previous.map((item) => item.id === data.user.id ? data.user : item));
      show(data.warning ? "error" : "success", data.warning ?? `${data.user.displayName} updated`);
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Could not update user.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(user: PublicUser) {
    if (!window.confirm(`Delete ${user.displayName}? This is only allowed when they have no team or assigned clients.`)) return;
    setBusy(true);
    try {
      const res = await fetch(appPath(`/api/users/${encodeURIComponent(user.id)}`), { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Could not delete user."));
      setUsers((previous) => previous.filter((item) => item.id !== user.id));
      show("success", `${user.displayName} deleted`);
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Could not delete user.");
    } finally {
      setBusy(false);
    }
  }

  async function synchronize() {
    setSyncBusy(true);
    try {
      const res = await fetch(appPath("/api/users/sync"), { method: "POST" });
      if (!res.ok) throw new Error(await responseError(res, "Could not synchronize users."));
      show("success", "USERS sheet synchronized without passwords");
    } catch (err) {
      show("error", err instanceof Error ? err.message : "Could not synchronize users.");
    } finally {
      setSyncBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white"><UsersIcon size={22} /></span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Staff &amp; permissions</h1>
            <p className="text-sm text-slate-500">Add staff, assign leaders and control access. Passwords never go to Google Sheets.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && <button type="button" className="btn-secondary" onClick={synchronize} disabled={syncBusy}>{syncBusy ? <SpinnerIcon size={15} /> : <RefreshIcon size={15} />} Sync USERS</button>}
          <button type="button" className="btn-primary" onClick={() => { setError(null); setForm(emptyForm(currentUser)); }}><PlusIcon size={16} /> Add staff</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sheet-scroll overflow-x-auto">
          <table className="sheet-table min-w-[1100px]">
            <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Leader</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td><span className="font-semibold text-slate-900">{user.displayName}</span>{user.mustChangePassword && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">INITIAL PASSWORD</span>}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{STAFF_ROLE_LABELS[user.role]}</span></td>
                  <td>{user.leaderName ?? "—"}</td>
                  <td><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost" title="Edit user" onClick={() => { setError(null); setForm(formFromUser(user)); }}><PencilIcon size={15} /></button>
                      {user.id !== currentUser.id && <button type="button" className="btn-ghost" disabled={busy} onClick={() => toggleActive(user)}>{user.active ? "Deactivate" : "Activate"}</button>}
                      {isAdmin && user.id !== currentUser.id && <button type="button" className="btn-ghost text-rose-600" disabled={busy} onClick={() => remove(user)}><TrashIcon size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={Boolean(form)} title={form?.id ? "Edit staff member" : "Add staff member"} description="Role and team changes are enforced again on the server." onClose={() => { if (!busy) setForm(null); }}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label">Username</label><input className="field-input" value={form.username} onChange={(e) => set("username", e.target.value)} required /></div>
              <div><label className="field-label">Display name</label><input className="field-input" value={form.displayName} onChange={(e) => set("displayName", e.target.value)} required /></div>
              <div><label className="field-label">Email</label><input type="email" className="field-input" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
              <div><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></div>
              <div>
                <label className="field-label">Role</label>
                <select className="field-select" value={form.role} disabled={!isAdmin} onChange={(e) => { const role = e.target.value as StaffRole; setForm((previous) => previous ? { ...previous, role, leaderId: role === "agent" ? previous.leaderId : "" } : previous); }}>
                  {(isAdmin ? STAFF_ROLES : (["agent"] as const)).map((role) => <option key={role} value={role}>{STAFF_ROLE_LABELS[role]}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Leader {form.role === "agent" && <span className="text-rose-500">*</span>}</label>
                <select className="field-select" value={form.leaderId} disabled={!isAdmin || form.role !== "agent"} required={form.role === "agent"} onChange={(e) => set("leaderId", e.target.value)}>
                  <option value="">Choose a leader</option>
                  {(isAdmin ? leaders : users.filter((user) => user.id === currentUser.id)).map((user) => <option key={user.id} value={user.id}>{user.displayName} · {STAFF_ROLE_LABELS[user.role]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">{form.id ? "Reset password (optional)" : "Initial password"}</label>
                <input type="password" className="field-input" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" minLength={10} required={!form.id} placeholder={form.id ? "Leave blank to keep the current password" : "At least 10 characters with a letter and a number"} />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active account</label>
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={busy}>{busy && <SpinnerIcon size={15} />} {form.id ? "Save changes" : "Create user"}</button>
            </div>
          </form>
        )}
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
