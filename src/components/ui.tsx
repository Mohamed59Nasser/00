"use client";

import { useEffect, type ReactNode } from "react";
import type { ClientRole, MaritalStatus, PaymentMethod, PropertyType } from "@/lib/types";
import { CLIENT_ROLE_LABELS, MARITAL_LABELS, PAYMENT_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { AlertIcon, CheckIcon, XIcon } from "./icons";

/* ---------------- Badges ---------------- */

export function RoleBadge({ role }: { role: ClientRole }) {
  const cls =
    role === "buyer"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${cls}`}>
      {CLIENT_ROLE_LABELS[role]}
    </span>
  );
}

export function TypeBadge({ type }: { type: PropertyType }) {
  const cls =
    type === "residential"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-violet-50 text-violet-700 ring-violet-200";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${cls}`}>
      {PROPERTY_TYPE_LABELS[type]}
    </span>
  );
}

const MARITAL_STYLES: Record<MaritalStatus, string> = {
  single: "bg-slate-100 text-slate-700 ring-slate-200",
  married: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  divorced: "bg-orange-50 text-orange-700 ring-orange-200",
  widowed: "bg-zinc-100 text-zinc-700 ring-zinc-300",
};

export function MaritalBadge({ status }: { status: MaritalStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${MARITAL_STYLES[status]}`}>
      {MARITAL_LABELS[status]}
    </span>
  );
}

const PAYMENT_STYLES: Record<PaymentMethod, string> = {
  cash: "bg-green-50 text-green-700 ring-green-200",
  installment: "bg-sky-50 text-sky-700 ring-sky-200",
  financing: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
};

export function PaymentBadges({ methods }: { methods: PaymentMethod[] }) {
  if (methods.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {methods.map((m) => (
        <span key={m} className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${PAYMENT_STYLES[m]}`}>
          {PAYMENT_LABELS[m]}
        </span>
      ))}
    </span>
  );
}

export function TypeBadges({ types }: { types: PropertyType[] }) {
  return (
    <span className="inline-flex flex-wrap justify-center gap-1">
      {types.map((t) => (
        <TypeBadge key={t} type={t} />
      ))}
    </span>
  );
}

export function AreaChips({ areas, max = 2 }: { areas: string[]; max?: number }) {
  if (areas.length === 0) return <span className="text-slate-300">—</span>;
  const shown = areas.slice(0, max);
  const rest = areas.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={areas.join(", ")}>
      {shown.map((a) => (
        <span key={a} className="inline-block max-w-[170px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
          {a}
        </span>
      ))}
      {rest > 0 && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-white">+{rest}</span>}
    </span>
  );
}

/* ---------------- Stat card ---------------- */

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent: string; // tailwind classes for icon chip
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-bold leading-tight text-slate-900 tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "lg",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${size === "sm" ? "max-w-md" : "max-w-4xl"} overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost -mr-2" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Toast ---------------- */

export type ToastState = { kind: "success" | "error"; message: string } | null;

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const success = toast.kind === "success";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
          success ? "bg-emerald-600" : "bg-rose-600"
        }`}
      >
        {success ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
        {toast.message}
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M9 4v16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
