export const PROPERTY_TYPES = ["residential", "investment"] as const;
export const CLIENT_ROLES = ["buyer", "seller"] as const;
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"] as const;
export const PAYMENT_METHODS = ["cash", "installment", "financing"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type ClientRole = (typeof CLIENT_ROLES)[number];
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: "Residential",
  investment: "Investment",
};

export const CLIENT_ROLE_LABELS: Record<ClientRole, string> = {
  buyer: "Buyer",
  seller: "Seller",
};

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  installment: "Installment",
  financing: "Financing",
};

/** Single people have no children, so the children fields are locked. */
export function allowsChildren(status: MaritalStatus): boolean {
  return status !== "single";
}

export interface ClientAuditFields {
  assignedToId: string | null;
  assignedToName: string | null;
  assignedById: string | null;
  assignedByName: string | null;
  assignedAt: string | null;
  createdById: string | null;
  createdByName: string | null;
  updatedById: string | null;
  updatedByName: string | null;
}

/** Shape returned by the API (dates serialized as ISO strings). */
export interface Client extends ClientAuditFields {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  maritalStatus: MaritalStatus;
  childrenCount: number;
  childrenNote: string | null;
  areas: string[];
  sizeSqm: number | null;
  price: number | null;
  propertyTypes: PropertyType[];
  role: ClientRole;
  paymentMethods: PaymentMethod[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Only fields a browser is allowed to edit. Ownership and audit fields stay server-controlled. */
export interface ClientInput {
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  maritalStatus: MaritalStatus;
  childrenCount: number;
  childrenNote: string | null;
  areas: string[];
  sizeSqm: number | null;
  price: number | null;
  propertyTypes: PropertyType[];
  role: ClientRole;
  paymentMethods: PaymentMethod[];
  notes: string | null;
}

export interface ClientMutationMeta {
  actorId: string;
  actorName: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
}

export interface DuplicateInfo {
  matchedOn: "phone" | "email" | "both";
  assignedToName: string;
  leaderName: string | null;
  phone: string;
  email: string | null;
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatSize(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} m²`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
