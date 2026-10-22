"use client";

import { useMemo, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/useToast";
import type { Client, ClientRole, PropertyType } from "@/lib/types";
import type { PublicUser, SessionUser } from "@/lib/staff";
import { appPath } from "@/lib/paths";
import { ClientForm } from "./ClientForm";
import { ClientsTable } from "./ClientsTable";
import { RecordDialogs } from "./RecordDialogs";
import { DownloadIcon, HomeIcon, PlusIcon, RefreshIcon, SearchIcon, TagIcon, TrendIcon, UsersIcon, XIcon } from "./icons";
import { StatCard, Toast } from "./ui";

export function AllDataView({
  initialClients,
  initialError,
  currentUser,
  assignableUsers,
}: {
  initialClients: Client[];
  initialError: string | null;
  currentUser: SessionUser;
  assignableUsers: PublicUser[];
}) {
  const { clients, loading, error, refresh, create, update, transfer, remove } = useClients(initialClients, initialError);
  const { toast, show } = useToast();
  const canDelete = currentUser.role === "admin";
  const canTransfer = currentUser.role !== "agent";
  const [assignedToId, setAssignedToId] = useState(currentUser.id);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ClientRole>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PropertyType>("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const stats = useMemo(
    () => ({
      total: clients.length,
      buyers: clients.filter((c) => c.role === "buyer").length,
      sellers: clients.filter((c) => c.role === "seller").length,
      residential: clients.filter((c) => c.propertyTypes.includes("residential")).length,
      investment: clients.filter((c) => c.propertyTypes.includes("investment")).length,
    }),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (roleFilter !== "all" && c.role !== roleFilter) return false;
      if (typeFilter !== "all" && !c.propertyTypes.includes(typeFilter)) return false;
      if (!q) return true;
      const haystack = [c.name, c.phone, c.email, c.areas.join(" "), c.childrenNote, c.notes].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query, roleFilter, typeFilter]);

  const hasFilters = query.trim() !== "" || roleFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-5">
      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Records" value={stats.total} icon={<UsersIcon size={20} className="text-slate-700" />} accent="bg-slate-100" />
        <StatCard label="Buyers" value={stats.buyers} icon={<TagIcon size={20} className="text-blue-700" />} accent="bg-blue-50" />
        <StatCard label="Sellers" value={stats.sellers} icon={<TagIcon size={20} className="text-amber-700" />} accent="bg-amber-50" />
        <StatCard label="Residential" value={stats.residential} icon={<HomeIcon size={20} className="text-emerald-700" />} accent="bg-emerald-50" />
        <StatCard label="Investment" value={stats.investment} icon={<TrendIcon size={20} className="text-violet-700" />} accent="bg-violet-50" />
      </section>

      {/* Quick add */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <PlusIcon size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add New Record</h2>
              <p className="text-xs text-slate-500">Fill the row and press “Add to Sheet” — it is saved instantly to ALL DATA.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-5 py-4">
          {canTransfer ? (
            <div className="max-w-md">
              <label className="field-label" htmlFor="quick-assign">Assign new record to</label>
              <select id="quick-assign" className="field-select" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
                {assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName} · {user.role.replace("_", " ")}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-xs font-medium text-slate-500">New records are assigned to you automatically. Duplicate ownership is checked before saving.</p>
          )}
          <ClientForm
            resetAfterSubmit
            enableDuplicateCheck
            submitLabel="Add to Sheet"
            onSubmit={async (input) => {
              await create(input, canTransfer ? assignedToId : undefined);
              show("success", `${input.name} added to the sheet`);
            }}
          />
        </div>
      </section>

      {/* Sheet */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">All Data</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
              {hasFilters ? `${filtered.length} of ${clients.length}` : clients.length} records
            </span>
            {loading && <span className="text-xs text-slate-400">Refreshing…</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <SearchIcon size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="field-input w-64 pl-8"
                placeholder="Search name, phone, area, notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select className="field-select w-36" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | ClientRole)} aria-label="Filter by role">
              <option value="all">All roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
            <select className="field-select w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | PropertyType)} aria-label="Filter by type">
              <option value="all">All types</option>
              <option value="residential">Residential</option>
              <option value="investment">Investment</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQuery("");
                  setRoleFilter("all");
                  setTypeFilter("all");
                }}
              >
                <XIcon size={14} /> Clear
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={refresh} disabled={loading} title="Reload from database">
              <RefreshIcon size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <a href={appPath("/api/export")} className="btn-primary" title="Download Excel workbook">
              <DownloadIcon size={15} /> Export Excel
            </a>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{error}</div>
        )}

        <ClientsTable
          clients={filtered}
          variant="full"
          onEdit={setEditing}
          onDelete={setDeleting}
          canDelete={canDelete}
          canTransfer={canTransfer}
          assignableUsers={assignableUsers}
          onTransfer={async (id, userId) => {
            await transfer(id, userId);
            show("success", "Client transferred and audit fields updated");
          }}
          emptyTitle={hasFilters ? "No records match your filters" : "No records yet"}
          emptyHint={hasFilters ? "Try a different search or clear the filters." : "Add your first client using the form above."}
        />
      </section>

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
