"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Client } from "@/lib/types";
import type { PublicUser } from "@/lib/staff";
import { formatDate, formatPrice, formatSize } from "@/lib/types";
import { PencilIcon, SortIcon, TrashIcon } from "./icons";
import { AreaChips, EmptyState, MaritalBadge, PaymentBadges, RoleBadge, TypeBadges } from "./ui";

type SortValue = string | number | null;

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortValue?: (c: Client) => SortValue;
  render: (c: Client) => ReactNode;
  headerClassName?: string;
}

function compare(a: SortValue, b: SortValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

const lower = (s: string | null) => (s ? s.toLowerCase() : null);

function PhoneCell({ phone }: { phone: string }) {
  return (
    <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-mono text-[13px] font-medium text-slate-800 hover:text-emerald-700 hover:underline">
      {phone}
    </a>
  );
}

function EmailCell({ email, className = "" }: { email: string | null; className?: string }) {
  if (!email) return <span className="text-slate-300">—</span>;
  return (
    <a href={`mailto:${email}`} className={`text-slate-600 hover:text-emerald-700 hover:underline ${className}`} title={email}>
      {email}
    </a>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-slate-300">{children}</span>;
}

const MARITAL_ORDER = { single: 0, married: 1, divorced: 2, widowed: 3 } as const;

function NotesCell({ notes }: { notes: string | null }) {
  if (!notes) return <Muted>—</Muted>;
  return (
    <span className="inline-block max-w-[260px] truncate align-middle text-slate-600" title={notes}>
      {notes}
    </span>
  );
}

function ChildrenCell({ c }: { c: Client }) {
  if (c.maritalStatus === "single") return <Muted>—</Muted>;
  return <span className="tabular-nums">{c.childrenCount}</span>;
}

function buildColumns(variant: "full" | "compact"): Column[] {
  const marital: Column = {
    key: "marital",
    label: "Marital Status",
    align: "center",
    sortValue: (c) => MARITAL_ORDER[c.maritalStatus],
    render: (c) => <MaritalBadge status={c.maritalStatus} />,
  };
  const areas: Column = {
    key: "areas",
    label: "Areas",
    sortValue: (c) => lower(c.areas.join(", ") || null),
    render: (c) => <AreaChips areas={c.areas} max={variant === "full" ? 2 : 1} />,
  };
  const size: Column = { key: "size", label: "Size (m²)", align: "right", sortValue: (c) => c.sizeSqm, render: (c) => <span className="tabular-nums">{formatSize(c.sizeSqm)}</span> };
  const price: Column = { key: "price", label: "Price (EGP)", align: "right", sortValue: (c) => c.price, render: (c) => <span className="font-semibold tabular-nums text-slate-900">{formatPrice(c.price)}</span> };
  const payment: Column = { key: "payment", label: "Payment", sortValue: (c) => c.paymentMethods.join(","), render: (c) => <PaymentBadges methods={c.paymentMethods} /> };
  const notes: Column = { key: "notes", label: "Notes", sortValue: (c) => lower(c.notes), render: (c) => <NotesCell notes={c.notes} /> };

  if (variant === "full") {
    return [
      { key: "name", label: "Name", sortValue: (c) => lower(c.name), render: (c) => <span className="font-semibold text-slate-900">{c.name}</span> },
      { key: "phone", label: "Phone", sortValue: (c) => c.phone, render: (c) => <PhoneCell phone={c.phone} /> },
      { key: "email", label: "Email", sortValue: (c) => lower(c.email), render: (c) => <EmailCell email={c.email} className="inline-block max-w-[220px] truncate align-middle" /> },
      { key: "age", label: "Age", align: "center", sortValue: (c) => c.age, render: (c) => (c.age ?? <Muted>—</Muted>) },
      marital,
      { key: "children", label: "Children", align: "center", sortValue: (c) => c.childrenCount, render: (c) => <ChildrenCell c={c} /> },
      { key: "childrenNote", label: "Children Note", sortValue: (c) => lower(c.childrenNote), render: (c) => c.childrenNote ? <span className="inline-block max-w-[220px] truncate align-middle text-slate-600" title={c.childrenNote}>{c.childrenNote}</span> : <Muted>—</Muted> },
      areas,
      size,
      price,
      { key: "type", label: "Type", align: "center", sortValue: (c) => c.propertyTypes.join(","), render: (c) => <TypeBadges types={c.propertyTypes} /> },
      { key: "role", label: "Role", align: "center", sortValue: (c) => c.role, render: (c) => <RoleBadge role={c.role} /> },
      payment,
      notes,
      { key: "added", label: "Added", align: "center", sortValue: (c) => c.createdAt, render: (c) => <span className="text-xs text-slate-500">{formatDate(c.createdAt)}</span> },
    ];
  }
  return [
    {
      key: "name",
      label: "Name",
      sortValue: (c) => lower(c.name),
      render: (c) => (
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">{c.name}</div>
          {c.email && <EmailCell email={c.email} className="block max-w-[200px] truncate text-[11px]" />}
        </div>
      ),
    },
    { key: "phone", label: "Phone", sortValue: (c) => c.phone, render: (c) => <PhoneCell phone={c.phone} /> },
    { key: "age", label: "Age", align: "center", sortValue: (c) => c.age, render: (c) => (c.age ?? <Muted>—</Muted>) },
    marital,
    {
      key: "children",
      label: "Children",
      sortValue: (c) => c.childrenCount,
      render: (c) => (
        <div className="leading-tight">
          <ChildrenCell c={c} />
          {c.childrenNote && <div className="max-w-[180px] truncate text-[11px] text-slate-500" title={c.childrenNote}>{c.childrenNote}</div>}
        </div>
      ),
    },
    areas,
    size,
    price,
    payment,
    notes,
  ];
}

interface ClientsTableProps {
  clients: Client[];
  variant?: "full" | "compact";
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canDelete?: boolean;
  canTransfer?: boolean;
  assignableUsers?: PublicUser[];
  onTransfer?: (id: string, assignedToId: string) => Promise<void>;
  emptyTitle?: string;
  emptyHint?: string;
  maxHeightClass?: string;
}

export function ClientsTable({
  clients,
  variant = "full",
  onEdit,
  onDelete,
  canDelete = false,
  canTransfer = false,
  assignableUsers = [],
  onTransfer,
  emptyTitle = "No records yet",
  emptyHint,
  maxHeightClass = "max-h-[70vh]",
}: ClientsTableProps) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [transferBusy, setTransferBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns = useMemo(() => {
    const base = buildColumns(variant);
    const owner: Column = {
      key: "assignedTo",
      label: "Assigned To",
      sortValue: (client) => lower(client.assignedToName),
      render: (client) => {
        if (!canTransfer || !onTransfer) return <span className="text-xs font-medium text-slate-600">{client.assignedToName ?? "Unassigned"}</span>;
        const hasCurrent = assignableUsers.some((user) => user.id === client.assignedToId);
        return (
          <select
            className="field-select min-w-36 py-1 text-xs"
            value={client.assignedToId ?? ""}
            disabled={transferBusy === client.id}
            aria-label={`Transfer ${client.name}`}
            onChange={async (event) => {
              const assignedToId = event.target.value;
              if (!assignedToId || assignedToId === client.assignedToId) return;
              setTransferBusy(client.id);
              setActionError(null);
              try {
                await onTransfer(client.id, assignedToId);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Failed to transfer client.");
              } finally {
                setTransferBusy(null);
              }
            }}
          >
            {!client.assignedToId && <option value="" disabled>Unassigned</option>}
            {!hasCurrent && client.assignedToId && <option value={client.assignedToId} disabled>{client.assignedToName ?? "Current user"}</option>}
            {assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
          </select>
        );
      },
    };
    return [base[0], owner, ...base.slice(1)];
  }, [variant, canTransfer, onTransfer, assignableUsers, transferBusy]);

  const sorted = useMemo(() => {
    if (!sort) return clients;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return clients;
    const getter = col.sortValue;
    const copy = [...clients];
    copy.sort((a, b) => {
      const result = compare(getter(a), getter(b));
      return sort.dir === "asc" ? result : -result;
    });
    return copy;
  }, [clients, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  if (clients.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  const alignClass = (a?: Column["align"]) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  return (
    <div>
      {actionError && <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{actionError}</div>}
      <div className={`sheet-scroll overflow-auto ${maxHeightClass}`}>
        <table className="sheet-table">
        <thead>
          <tr>
            <th className="w-12">#</th>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th key={col.key} className={alignClass(col.align)}>
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 uppercase hover:text-white ${active ? "text-emerald-300" : ""}`}
                      title={`Sort by ${col.label}`}
                    >
                      {col.label}
                      <SortIcon dir={active ? sort!.dir : null} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
            <th className="w-24 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((client, index) => (
            <tr key={client.id}>
              <td>{index + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className={alignClass(col.align)}>
                  {col.render(client)}
                </td>
              ))}
              <td className="text-center">
                <div className="inline-flex items-center gap-1">
                  <button type="button" className="btn-ghost" onClick={() => onEdit(client)} title="Edit" aria-label={`Edit ${client.name}`}>
                    <PencilIcon size={16} />
                  </button>
                  {canDelete && (
                    <button type="button" className="btn-ghost hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(client)} title="Delete" aria-label={`Delete ${client.name}`}>
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
