import { boolean, integer, doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ClientRole, MaritalStatus, PaymentMethod, PropertyType } from "../lib/types";
import type { StaffRole } from "../lib/staff";

export const staffUsers = pgTable("staff_users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  username: text("username").notNull(),
  usernameNormalized: text("username_normalized").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<StaffRole>().notNull().default("agent"),
  leaderId: text("leader_id"),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdById: text("created_by_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedById: text("updated_by_id"),
});

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => staffUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

/** PostgreSQL storage and audit metadata for Google Sheets synchronization. */
export const clients = pgTable("clients", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  age: integer("age"),
  maritalStatus: text("marital_status").$type<MaritalStatus>().notNull().default("single"),
  childrenCount: integer("children_count").notNull().default(0),
  childrenNote: text("children_note"),
  areas: text("areas").array().$type<string[]>().notNull().default(sql`'{}'::text[]`),
  sizeSqm: doublePrecision("size_sqm"),
  price: doublePrecision("price"),
  propertyTypes: text("property_types").array().$type<PropertyType[]>().notNull().default(sql`ARRAY['residential']::text[]`),
  role: text("role").$type<ClientRole>().notNull().default("buyer"),
  paymentMethods: text("payment_methods").array().$type<PaymentMethod[]>().notNull().default(sql`'{}'::text[]`),
  notes: text("notes"),
  assignedToId: text("assigned_to_id"),
  assignedToName: text("assigned_to_name"),
  assignedById: text("assigned_by_id"),
  assignedByName: text("assigned_by_name"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdById: text("created_by_id"),
  createdByName: text("created_by_name"),
  updatedById: text("updated_by_id"),
  updatedByName: text("updated_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StaffUserRow = typeof staffUsers.$inferSelect;
export type NewStaffUserRow = typeof staffUsers.$inferInsert;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
