"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appPath } from "@/lib/paths";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch(appPath("/api/auth/logout"), { method: "POST" });
      router.replace(appPath("/login"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" className="btn-secondary border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}
