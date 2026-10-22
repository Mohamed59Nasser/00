"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/useToast";
import { MARITAL_LABELS, MARITAL_STATUSES, type Client, type ClientRole, type MaritalStatus, type PropertyType } from "@/lib/types";
import { ClientsTable } from "./ClientsTable";
import { RecordDialogs } from "./RecordDialogs";
import { FilterIcon, HomeIcon, RefreshIcon, SearchIcon, TagIcon, TrendIcon, XIcon } from "./icons";
import { Toast } from "./ui";

interface Filters {
  q: string;
  area: string;
  sizeMin: string;
  sizeMax: string;
  priceMin: string;
  priceMax: string;
  marital: "any" | MaritalStatus;
  ageMin: string;
  ageMax: string;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  area: "",
  sizeMin: "",
  sizeMax: "",
  priceMin: "",
  priceMax: "",
  marital: "any",
  ageMin: "",
  ageMax: "",
};

function toNum(v: string): number | null {
  const t = v.trim().replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function inRange(value: number | null, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  if (value === null) return false;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function applyFilters(clients: Client[], f: Filters): Client[] {
  const q = f.q.trim().toLowerCase();
  const area = f.area.trim().toLowerCase();
  const sizeMin = toNum(f.sizeMin);
  const sizeMax = toNum(f.sizeMax);
  const priceMin = toNum(f.priceMin);
  const priceMax = toNum(f.priceMax);
  const ageMin = toNum(f.ageMin);
  const ageMax = toNum(f.ageMax);

  return clients.filter((c) => {
    if (q) {
      const hay = [c.name, c.phone, c.email, c.childrenNote, c.areas.join(" "), c.notes].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (area && !c.areas.some((a) => a.toLowerCase().includes(area))) return false;
    if (!inRange(c.sizeSqm, sizeMin, sizeMax)) return false;
    if (!inRange(c.price, priceMin, priceMax)) return false;
    if (!inRange(c.age, ageMin, ageMax)) return false;
    if (f.marital !== "any" && c.maritalStatus !== f.marital) return false;
    return true;
  });
}

/* ---------------- Section (Residential / Investment) ---------------- */

function Section({
  type,
  clients,
  onEdit,
  onDelete,
  filtered,
}: {
  type: PropertyType;
  clients: Client[];
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
  filtered: boolean;
}) {
  const residential = type === "residential";
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className={`flex items-center justify-between px-4 py-2 text-white ${residential ? "bg-emerald-600" : "bg-violet-600"}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]">
          {residential ? <HomeIcon size={16} /> : <TrendIcon size={16} />}
          {residential ? "Residential" : "Investment"}
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold tabular-nums">{clients.length}</span>
      </div>
      <ClientsTable
        clients={clients}
        variant="compact"
        onEdit={onEdit}
        onDelete={onDelete}
        maxHeightClass="max-h-[26rem]"
        emptyTitle={filtered ? "No matching records" : "No records in this section"}
        emptyHint={filtered ? "Adjust the filters above." : "Add records from the ALL DATA sheet."}
      />
    </div>
  );
}

/* ---------------- Half (BUYER / SELLER) ---------------- */

function Half({ role, total, shown, children }: { role: ClientRole; total: number; shown: number; children: ReactNode }) {
  const buyer = role === "buyer";
  return (
    <section className={`overflow-hidden rounded-xl border shadow-sm ${buyer ? "border-blue-200" : "border-amber-200"}`}>
      <div className={`flex items-center justify-between px-5 py-3.5 text-white ${buyer ? "bg-blue-700" : "bg-amber-600"}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
            <TagIcon size={18} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-[0.2em] leading-none">{buyer ? "Buyer" : "Seller"}</h2>
            <p className="mt-1 text-[11px] text-white/75">{buyer ? "Clients looking to buy" : "Clients looking to sell"}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black leading-none tabular-nums">{shown}</div>
          <div className="text-[11px] text-white/75">{shown === total ? "records" : `of ${total} records`}</div>
        </div>
      </div>
      <div className={`space-y-4 p-4 ${buyer ? "bg-blue-50/50" : "bg-amber-50/50"}`}>{children}</div>
    </section>
  );
}

/* ---------------- Main view ---------------- */

export function SearchView({ initialClients, initialError }: { initialClients: Client[]; initialError: string | null }) {
  const { clients, loading, error, refresh, update, remove } = useClients(initialClients, initialError);
  const { toast, show } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));

  const isFiltered = useMemo(
    () => (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).some((k) => filters[k] !== EMPTY_FILTERS[k]),
    [filters],
  );

  const visible = useMemo(() => applyFilters(clients, filters), [clients, filters]);

  const groups = useMemo(() => {
    // A client who wants both Residential and Investment shows up in both sections.
    const pick = (role: ClientRole, type: PropertyType) => visible.filter((c) => c.role === role && c.propertyTypes.includes(type));
    return {
      buyerRes: pick("buyer", "residential"),
      buyerInv: pick("buyer", "investment"),
      sellerRes: pick("seller", "residential"),
      sellerInv: pick("seller", "investment"),
    };
  }, [visible]);

  const totals = useMemo(
    () => ({
      buyers: clients.filter((c) => c.role === "buyer").length,
      sellers: clients.filter((c) => c.role === "seller").length,
    }),
    [clients],
  );

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-white">
              <FilterIcon size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Search &amp; Filter</h2>
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700 tabular-nums">{visible.length}</span> of{" "}
                <span className="font-semibold text-slate-700 tabular-nums">{clients.length}</span> records across the four sections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button type="button" className="btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                <XIcon size={14} /> Reset
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={refresh} disabled={loading} title="Reload from database">
              <RefreshIcon size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4 xl:grid-cols-12">
          <div className="col-span-2 md:col-span-2 xl:col-span-3">
            <label className="field-label" htmlFor="s-q">Search</label>
            <div className="relative">
              <SearchIcon size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="s-q" className="field-input pl-8" placeholder="Name, phone, email, notes…" value={filters.q} onChange={(e) => set("q", e.target.value)} />
            </div>
          </div>
          <div className="col-span-2 md:col-span-2 xl:col-span-2">
            <label className="field-label" htmlFor="s-area">Area</label>
            <input id="s-area" className="field-input" placeholder="e.g. New Cairo" value={filters.area} onChange={(e) => set("area", e.target.value)} />
          </div>
          <div className="col-span-1 md:col-span-1 xl:col-span-2">
            <label className="field-label">Size (m²)</label>
            <div className="flex items-center gap-1.5">
              <input className="field-input" placeholder="Min" inputMode="decimal" value={filters.sizeMin} onChange={(e) => set("sizeMin", e.target.value)} aria-label="Minimum size" />
              <span className="text-slate-400">–</span>
              <input className="field-input" placeholder="Max" inputMode="decimal" value={filters.sizeMax} onChange={(e) => set("sizeMax", e.target.value)} aria-label="Maximum size" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 xl:col-span-2">
            <label className="field-label">Price (EGP)</label>
            <div className="flex items-center gap-1.5">
              <input className="field-input" placeholder="Min" inputMode="decimal" value={filters.priceMin} onChange={(e) => set("priceMin", e.target.value)} aria-label="Minimum price" />
              <span className="text-slate-400">–</span>
              <input className="field-input" placeholder="Max" inputMode="decimal" value={filters.priceMax} onChange={(e) => set("priceMax", e.target.value)} aria-label="Maximum price" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 xl:col-span-2">
            <label className="field-label">Age</label>
            <div className="flex items-center gap-1.5">
              <input className="field-input" placeholder="Min" inputMode="numeric" value={filters.ageMin} onChange={(e) => set("ageMin", e.target.value)} aria-label="Minimum age" />
              <span className="text-slate-400">–</span>
              <input className="field-input" placeholder="Max" inputMode="numeric" value={filters.ageMax} onChange={(e) => set("ageMax", e.target.value)} aria-label="Maximum age" />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 xl:col-span-1">
            <label className="field-label" htmlFor="s-marital">Marital</label>
            <select id="s-marital" className="field-select" value={filters.marital} onChange={(e) => set("marital", e.target.value as Filters["marital"])}>
              <option value="any">Any</option>
              {MARITAL_STATUSES.map((m) => (
                <option key={m} value={m}>{MARITAL_LABELS[m]}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="border-t border-rose-200 bg-rose-50 px-5 py-2 text-sm font-medium text-rose-700">{error}</div>}
      </section>

      {/* BUYER | SELLER */}
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
        <Half role="buyer" total={totals.buyers} shown={groups.buyerRes.length + groups.buyerInv.length}>
          <Section type="residential" clients={groups.buyerRes} onEdit={setEditing} onDelete={setDeleting} filtered={isFiltered} />
          <Section type="investment" clients={groups.buyerInv} onEdit={setEditing} onDelete={setDeleting} filtered={isFiltered} />
        </Half>
        <Half role="seller" total={totals.sellers} shown={groups.sellerRes.length + groups.sellerInv.length}>
          <Section type="residential" clients={groups.sellerRes} onEdit={setEditing} onDelete={setDeleting} filtered={isFiltered} />
          <Section type="investment" clients={groups.sellerInv} onEdit={setEditing} onDelete={setDeleting} filtered={isFiltered} />
        </Half>
      </div>

      <RecordDialogs
        editing={editing}
        deleting={deleting}
        onCloseEdit={() => setEditing(null)}
        onCloseDelete={() => setDeleting(null)}
        onSave={async (id, input) => {
          await update(id, input);
          setEditing(null);
          show("success", "Record updated");
        }}
        onConfirmDelete={async (id) => {
          await remove(id);
          setDeleting(null);
          show("success", "Record deleted");
        }}
      />

      <Toast toast={toast} />
    </div>
  );
}
