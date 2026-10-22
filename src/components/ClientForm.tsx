"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MARITAL_LABELS,
  MARITAL_STATUSES,
  allowsChildren,
  type Client,
  type ClientInput,
  type DuplicateInfo,
  type ClientRole,
  type MaritalStatus,
  type PaymentMethod,
  type PropertyType,
} from "@/lib/types";
import { appPath } from "@/lib/paths";
import { AreaPicker } from "./AreaPicker";
import { AlertIcon, PlusIcon, SpinnerIcon } from "./icons";
import { ToggleGroup, type ToggleOption } from "./ToggleGroup";

interface FormValues {
  name: string;
  phone: string;
  email: string;
  age: string;
  maritalStatus: MaritalStatus;
  childrenCount: string;
  childrenNote: string;
  areas: string[];
  sizeSqm: string;
  price: string;
  propertyTypes: PropertyType[];
  role: ClientRole;
  paymentMethods: PaymentMethod[];
  notes: string;
}

const EMPTY: FormValues = {
  name: "",
  phone: "",
  email: "",
  age: "",
  maritalStatus: "single",
  childrenCount: "0",
  childrenNote: "",
  areas: [],
  sizeSqm: "",
  price: "",
  propertyTypes: ["residential"],
  role: "buyer",
  paymentMethods: [],
  notes: "",
};

const TYPE_OPTIONS: ToggleOption<PropertyType>[] = [
  { value: "residential", label: "Residential", activeClass: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  { value: "investment", label: "Investment", activeClass: "border-violet-400 bg-violet-50 text-violet-700" },
];

const PAYMENT_OPTIONS: ToggleOption<PaymentMethod>[] = [
  { value: "cash", label: "Cash", activeClass: "border-green-400 bg-green-50 text-green-700" },
  { value: "installment", label: "Installment", activeClass: "border-sky-400 bg-sky-50 text-sky-700" },
  { value: "financing", label: "Financing", activeClass: "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700" },
];

function fromClient(c: Client): FormValues {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    age: c.age === null ? "" : String(c.age),
    maritalStatus: c.maritalStatus,
    childrenCount: String(c.childrenCount ?? 0),
    childrenNote: c.childrenNote ?? "",
    areas: c.areas,
    sizeSqm: c.sizeSqm === null ? "" : String(c.sizeSqm),
    price: c.price === null ? "" : String(c.price),
    propertyTypes: c.propertyTypes,
    role: c.role,
    paymentMethods: c.paymentMethods,
    notes: c.notes ?? "",
  };
}

function num(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function toInput(v: FormValues): ClientInput {
  const kids = allowsChildren(v.maritalStatus);
  return {
    name: v.name.trim(),
    phone: v.phone.trim(),
    email: v.email.trim() || null,
    age: num(v.age),
    maritalStatus: v.maritalStatus,
    childrenCount: kids ? (num(v.childrenCount) ?? 0) : 0,
    childrenNote: kids ? v.childrenNote.trim() || null : null,
    areas: v.areas,
    sizeSqm: num(v.sizeSqm),
    price: num(v.price),
    propertyTypes: v.propertyTypes,
    role: v.role,
    paymentMethods: v.paymentMethods,
    notes: v.notes.trim() || null,
  };
}

interface ClientFormProps {
  initial?: Client | null;
  onSubmit: (input: ClientInput) => Promise<void>;
  submitLabel?: string;
  onCancel?: () => void;
  /** Clears the form after a successful submit (used by the quick-add panel). */
  resetAfterSubmit?: boolean;
  enableDuplicateCheck?: boolean;
}

export function ClientForm({ initial, onSubmit, submitLabel = "Add to Sheet", onCancel, resetAfterSubmit, enableDuplicateCheck = false }: ClientFormProps) {
  const [values, setValues] = useState<FormValues>(initial ? fromClient(initial) : EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!enableDuplicateCheck) return;
    const phone = values.phone.trim();
    const email = values.email.trim();
    if (phone.replace(/\D/g, "").length < 5 && !email) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const res = await fetch(appPath("/api/clients/duplicate-check"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, email, excludeId: initial?.id }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { duplicate: DuplicateInfo | null };
        setDuplicate(data.duplicate);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setCheckingDuplicate(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enableDuplicateCheck, values.phone, values.email, initial?.id]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    if (key === "phone" || key === "email") {
      setDuplicate(null);
      setCheckingDuplicate(false);
    }
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const kidsEnabled = allowsChildren(values.maritalStatus);

  function changeMarital(status: MaritalStatus) {
    setValues((prev) =>
      allowsChildren(status)
        ? { ...prev, maritalStatus: status }
        : { ...prev, maritalStatus: status, childrenCount: "0", childrenNote: "" },
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) return setError("Name is required.");
    if (!values.phone.trim()) return setError("Phone is required.");
    if (values.phone.replace(/\D/g, "").length < 5) return setError("Phone must contain at least 5 digits.");
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return setError("Email format is not valid.");
    }
    for (const [label, raw] of [
      ["Age", values.age],
      ["Children", kidsEnabled ? values.childrenCount : ""],
      ["Size", values.sizeSqm],
      ["Price", values.price],
    ] as const) {
      if (raw.trim() && num(raw) === null) return setError(`${label} must be a number.`);
    }
    if (values.propertyTypes.length === 0) return setError("Choose Residential, Investment, or both.");
    if (duplicate) return setError("This client already exists. Ask the responsible user or leader to review the existing record.");

    setSubmitting(true);
    try {
      await onSubmit(toInput(values));
      if (resetAfterSubmit) {
        setValues((prev) => ({ ...EMPTY, role: prev.role, propertyTypes: prev.propertyTypes }));
        setDuplicate(null);
        nameRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6 xl:grid-cols-12">
        {/* Row 1 */}
        <div className="col-span-2 md:col-span-3 xl:col-span-3">
          <label className="field-label" htmlFor="f-name">Name <span className="text-rose-500">*</span></label>
          <input id="f-name" ref={nameRef} className="field-input" placeholder="Client full name" value={values.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
        </div>
        <div className="col-span-1 md:col-span-3 xl:col-span-2">
          <label className="field-label" htmlFor="f-phone">Phone <span className="text-rose-500">*</span></label>
          <input id="f-phone" className="field-input font-mono" placeholder="01xxxxxxxxx" inputMode="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />
        </div>
        <div className="col-span-1 md:col-span-2 xl:col-span-3">
          <label className="field-label" htmlFor="f-email">Email</label>
          <input id="f-email" className="field-input" placeholder="name@example.com" inputMode="email" value={values.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
        </div>
        <div className="col-span-1 md:col-span-1 xl:col-span-1">
          <label className="field-label" htmlFor="f-age">Age</label>
          <input id="f-age" className="field-input" placeholder="35" inputMode="numeric" value={values.age} onChange={(e) => set("age", e.target.value)} />
        </div>
        <div className="col-span-1 md:col-span-3 xl:col-span-3">
          <label className="field-label" htmlFor="f-marital">Marital Status</label>
          <select id="f-marital" className="field-select" value={values.maritalStatus} onChange={(e) => changeMarital(e.target.value as MaritalStatus)}>
            {MARITAL_STATUSES.map((s) => (
              <option key={s} value={s}>{MARITAL_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Row 2 */}
        <div className="col-span-1 md:col-span-1 xl:col-span-2">
          <label className="field-label" htmlFor="f-children">Children</label>
          <input
            id="f-children"
            className="field-input"
            inputMode="numeric"
            value={kidsEnabled ? values.childrenCount : ""}
            placeholder={kidsEnabled ? "0" : "—"}
            onChange={(e) => set("childrenCount", e.target.value)}
            disabled={!kidsEnabled}
            title={kidsEnabled ? undefined : "Locked because the client is single"}
          />
        </div>
        <div className="col-span-1 md:col-span-3 xl:col-span-4">
          <label className="field-label" htmlFor="f-children-note">Children Note</label>
          <input
            id="f-children-note"
            className="field-input"
            placeholder={kidsEnabled ? "e.g. ages 5 & 9 · university · toddlers" : "Locked (single)"}
            value={kidsEnabled ? values.childrenNote : ""}
            onChange={(e) => set("childrenNote", e.target.value)}
            disabled={!kidsEnabled}
            autoComplete="off"
          />
        </div>
        <div className="col-span-1 md:col-span-1 xl:col-span-2">
          <label className="field-label" htmlFor="f-size">Size (m²)</label>
          <input id="f-size" className="field-input" placeholder="150" inputMode="decimal" value={values.sizeSqm} onChange={(e) => set("sizeSqm", e.target.value)} />
        </div>
        <div className="col-span-1 md:col-span-1 xl:col-span-4">
          <label className="field-label" htmlFor="f-price">Price / Budget (EGP)</label>
          <input id="f-price" className="field-input" placeholder="3,500,000" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} />
        </div>

        {/* Row 3 */}
        <div className="col-span-2 md:col-span-6 xl:col-span-6">
          <label className="field-label" htmlFor="f-areas">Areas <span className="font-normal normal-case text-slate-400">(type, pick one or more)</span></label>
          <AreaPicker id="f-areas" value={values.areas} onChange={(a) => set("areas", a)} />
        </div>
        <div className="col-span-2 md:col-span-2 xl:col-span-2">
          <label className="field-label" htmlFor="f-role">Buyer / Seller</label>
          <select id="f-role" className={`field-select font-semibold ${values.role === "buyer" ? "text-blue-700" : "text-amber-700"}`} value={values.role} onChange={(e) => set("role", e.target.value as ClientRole)}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        </div>
        <div className="col-span-2 md:col-span-4 xl:col-span-4">
          <span className="field-label">Residential / Investment <span className="font-normal normal-case text-slate-400">(both allowed)</span></span>
          <ToggleGroup ariaLabel="Property type" options={TYPE_OPTIONS} value={values.propertyTypes} onChange={(v) => set("propertyTypes", v)} />
        </div>

        {/* Row 4 */}
        <div className="col-span-2 md:col-span-6 xl:col-span-5">
          <span className="field-label">Payment <span className="font-normal normal-case text-slate-400">(cash · installment · financing)</span></span>
          <ToggleGroup ariaLabel="Payment method" options={PAYMENT_OPTIONS} value={values.paymentMethods} onChange={(v) => set("paymentMethods", v)} />
        </div>
        <div className="col-span-2 md:col-span-6 xl:col-span-7">
          <label className="field-label" htmlFor="f-notes">Notes</label>
          <textarea id="f-notes" rows={2} className="field-input resize-y" placeholder="Anything else worth remembering about this client…" value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      {enableDuplicateCheck && (checkingDuplicate || duplicate) && (
        <div className={`rounded-lg px-3 py-2 text-sm ${duplicate ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200" : "bg-slate-50 text-slate-500"}`}>
          {checkingDuplicate && !duplicate ? "Checking for an existing client…" : duplicate ? (
            <>
              <span className="font-semibold">Possible duplicate ({duplicate.matchedOn}).</span> Assigned to {duplicate.assignedToName}
              {duplicate.leaderName ? ` · Leader: ${duplicate.leaderName}` : ""} · {duplicate.phone}{duplicate.email ? ` · ${duplicate.email}` : ""}
            </>
          ) : null}
        </div>
      )}

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-h-[1.25rem] text-sm">
          {error ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
              <AlertIcon size={16} /> {error}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              <span className="text-rose-500">*</span> Required · Role and Type decide where the record appears in the SEARCH sheet.
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {onCancel ? (
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setValues(EMPTY);
                setError(null);
                nameRef.current?.focus();
              }}
              disabled={submitting}
            >
              Clear
            </button>
          )}
          <button type="submit" className="btn-primary min-w-[9rem]" disabled={submitting}>
            {submitting ? <SpinnerIcon size={16} /> : <PlusIcon size={16} />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
