"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/paths";
import { SpinnerIcon } from "./icons";

export function ChangePasswordForm({ required }: { required: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmation) return setError("The new password confirmation does not match.");
    setBusy(true);
    try {
      const res = await fetch(appPath("/api/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not change password.");
      router.replace(appPath("/"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Change your password</h1>
          <p className="mt-1 text-sm text-slate-500">
            {required ? "You must replace your initial password before using the application." : "Choose a new password for your account."}
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="current-password">Current password</label>
          <input id="current-password" type="password" className="field-input" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
        </div>
        <div>
          <label className="field-label" htmlFor="new-password">New password</label>
          <input id="new-password" type="password" className="field-input" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} required />
          <p className="mt-1 text-xs text-slate-400">At least 10 characters, including a letter and a number.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" type="password" className="field-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={10} required />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <SpinnerIcon size={16} />} {busy ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
