"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/paths";
import { BuildingIcon, SpinnerIcon } from "./icons";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(appPath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { error?: string; user?: { mustChangePassword: boolean } };
      if (!res.ok) throw new Error(data.error || "Could not sign in.");
      router.replace(appPath(data.user?.mustChangePassword ? "/change-password" : "/"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
        <div className="text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white"><BuildingIcon size={25} /></span>
          <h1 className="text-xl font-bold text-slate-900">Sign in to Broker Data Sheet</h1>
          <p className="mt-1 text-sm text-slate-500">Use your username or email and your password.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="identifier">Username or email</label>
          <input id="identifier" className="field-input" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoFocus required />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field-input" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <SpinnerIcon size={16} />} {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
