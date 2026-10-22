"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, AlertIcon, RefreshIcon, SpinnerIcon, UsersIcon } from "./icons";
import { Toast } from "./ui";
import { useToast } from "@/hooks/useToast";
import { appPath } from "@/lib/paths";

interface StorageStatus {
  kind: "postgres" | "sheets";
  configured: boolean;
  connected: boolean;
  initialized: boolean;
  serviceAccountEmail: string | null;
  spreadsheetUrl: string | null;
  title?: string | null;
  tabs?: string[];
  localCount: number;
  error: string | null;
}

const ENV_ROWS = [
  { key: "GOOGLE_SHEET_ID", hint: "The long id in the sheet URL (or paste the full URL)." },
  { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", hint: "client_email from the downloaded JSON key." },
  { key: "GOOGLE_PRIVATE_KEY", hint: "private_key from the JSON key (keep the \\n characters)." },
];

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard not available – ignore
        }
      }}
      className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 hover:bg-slate-100"
      title="Click to copy"
    >
      <span className="truncate">{text}</span>
      <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-700">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{n}</span>
      <div className="min-w-0 text-sm text-slate-700">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="mt-1 space-y-1.5">{children}</div>
      </div>
    </li>
  );
}

export function GoogleSheetsPanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"init" | "migrate" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast, show } = useToast(4000);

  const load = useCallback(async () => {
    try {
      const res = await fetch(appPath("/api/storage"), { cache: "no-store" });
      if (!res.ok) throw new Error("Could not read the storage status.");
      setStatus((await res.json()) as StorageStatus);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not read the storage status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function run(action: "init" | "migrate") {
    setBusy(action);
    try {
      const res = await fetch(appPath("/api/storage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Operation failed.");
      show("success", data.message || "Done");
      await load();
    } catch (e) {
      show("error", e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(null);
    }
  }

  const live = status?.kind === "sheets" && status.connected;

  return (
    <div className="space-y-5">
      {/* Status */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M4 9h16M4 15h16M10 3v18" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheets Database</h2>
              <p className="text-xs text-slate-500">Every record you add, edit or delete is stored in your Google Sheet.</p>
            </div>
          </div>
          <button type="button" className="btn-secondary" onClick={() => { setLoading(true); setLoadError(null); void load(); }} disabled={loading}>
            <RefreshIcon size={15} className={loading ? "animate-spin" : ""} /> Check connection
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {loadError && <p className="text-sm font-medium text-rose-600">{loadError}</p>}

          {!status && loading && (
            <p className="inline-flex items-center gap-2 text-sm text-slate-500">
              <SpinnerIcon size={16} /> Checking connection…
            </p>
          )}

          {status && (
            <>
              <div
                className={`flex items-start gap-3 rounded-lg p-4 ring-1 ring-inset ${
                  live
                    ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                    : status.configured
                      ? "bg-rose-50 text-rose-900 ring-rose-200"
                      : "bg-amber-50 text-amber-900 ring-amber-200"
                }`}
              >
                <span className="mt-0.5">{live ? <CheckIcon size={20} /> : <AlertIcon size={20} />}</span>
                <div className="min-w-0 text-sm">
                  {live ? (
                    <>
                      <p className="font-bold">Connected — Google Sheets is your database.</p>
                      <p className="mt-0.5">
                        Spreadsheet: <span className="font-semibold">{status.title || "Untitled"}</span>
                        {status.tabs && <> · Tabs: {status.tabs.join(", ")}</>}
                      </p>
                      {status.spreadsheetUrl && (
                        <a href={status.spreadsheetUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold underline">
                          Open the Google Sheet ↗
                        </a>
                      )}
                    </>
                  ) : status.configured ? (
                    <>
                      <p className="font-bold">Connection settings found, but Google Sheets cannot be reached.</p>
                      <p className="mt-0.5 break-words">{status.error}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold">Not connected yet — using the local PostgreSQL database.</p>
                      <p className="mt-0.5">Follow the steps below. Nothing is lost: you can copy your existing records to the sheet afterwards.</p>
                    </>
                  )}
                </div>
              </div>

              {status.configured && status.connected && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-primary" onClick={() => run("init")} disabled={busy !== null}>
                    {busy === "init" ? <SpinnerIcon size={16} /> : <CheckIcon size={16} />}
                    {status.initialized ? "Re-apply sheet design" : "Set up ALL & SEARCH tabs"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => run("migrate")}
                    disabled={busy !== null || status.localCount === 0}
                    title="Copies the records stored in the local database into the Google Sheet"
                  >
                    {busy === "migrate" ? <SpinnerIcon size={16} /> : <UsersIcon size={16} />}
                    Copy {status.localCount} local record{status.localCount === 1 ? "" : "s"} to the sheet
                  </button>
                  {!status.initialized && (
                    <span className="text-xs text-slate-500">The tabs are also created automatically the first time you add a record.</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Setup guide */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-900">How to connect (one time, ~5 minutes)</h2>
        </div>
        <ol className="space-y-5 px-5 py-5">
          <Step n={1} title="Create a Google Cloud service account">
            <p>
              Open <span className="font-semibold">console.cloud.google.com</span> → create a project → <em>APIs &amp; Services → Library</em> → enable{" "}
              <span className="font-semibold">Google Sheets API</span>.
            </p>
            <p>
              Then <em>IAM &amp; Admin → Service Accounts → Create</em>, open it, go to <em>Keys → Add key → JSON</em>, and download the file.
            </p>
          </Step>
          <Step n={2} title="Create an empty Google Sheet and share it">
            <p>
              Create a new sheet at <span className="font-semibold">sheets.google.com</span>, press <em>Share</em>, and add the service account e-mail as an{" "}
              <span className="font-semibold">Editor</span>:
            </p>
            {status?.serviceAccountEmail ? (
              <CopyBox text={status.serviceAccountEmail} />
            ) : (
              <p className="text-slate-500">(the e-mail is the <code className="rounded bg-slate-100 px-1">client_email</code> value inside the JSON file)</p>
            )}
          </Step>
          <Step n={3} title="Add these settings to the project's environment variables">
            <ul className="space-y-1.5">
              {ENV_ROWS.map((row) => (
                <li key={row.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <code className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-emerald-300">{row.key}</code>
                  <span className="text-xs text-slate-500">{row.hint}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Alternative: set a single <code className="rounded bg-slate-100 px-1">GOOGLE_SERVICE_ACCOUNT_JSON</code> with the whole JSON file content, plus{" "}
              <code className="rounded bg-slate-100 px-1">GOOGLE_SHEET_ID</code>.
            </p>
          </Step>
          <Step n={4} title="Restart the app and press “Check connection”">
            <p>
              When it turns green, the app creates two tabs for you: <span className="font-semibold">ALL</span> (all data, with dropdowns) and{" "}
              <span className="font-semibold">SEARCH</span> (live BUYER | SELLER × Residential | Investment tables built with formulas).
            </p>
          </Step>
        </ol>
      </section>

      {/* Sheet layout */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-900">What the sheet looks like</h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
          <p>
            You can also type directly in the <span className="font-semibold">ALL</span> tab — rows added there appear in the app, and everything you add in the app appears in the sheet.
          </p>
          <div className="sheet-scroll overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="bg-slate-800 text-slate-100">
                  {["Name", "Phone", "Email", "Age", "Marital Status", "Children", "Children Note", "Areas", "Size (m²)", "Price (EGP)", "Type", "Role", "Payment", "Notes"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-600">
                  <td className="px-3 py-2">Ahmed Hassan</td>
                  <td className="px-3 py-2">01001234567</td>
                  <td className="px-3 py-2">ahmed@mail.com</td>
                  <td className="px-3 py-2">38</td>
                  <td className="px-3 py-2">Married</td>
                  <td className="px-3 py-2">2</td>
                  <td className="px-3 py-2">school age</td>
                  <td className="px-3 py-2">New Cairo, Sheikh Zayed</td>
                  <td className="px-3 py-2">180</td>
                  <td className="px-3 py-2">6,500,000</td>
                  <td className="px-3 py-2">Residential, Investment</td>
                  <td className="px-3 py-2">Buyer</td>
                  <td className="px-3 py-2">Cash, Installment</td>
                  <td className="px-3 py-2">Wants a garden</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Several areas / types / payment methods are stored in one cell separated by commas. Two hidden helper columns (Added, ID) at the end are managed by the app.
          </p>
        </div>
      </section>

      <Toast toast={toast} />
    </div>
  );
}
