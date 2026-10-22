import { pgTable, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ClientRole, MaritalStatus, PaymentMethod, PropertyType } from "../lib/types";

/**
 * Local PostgreSQL storage. It is used as the database until Google Sheets is
 * connected (see /sheets); once connected, Google Sheets becomes the database.
 */
export const clients = pgTable("clients", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
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
  propertyTypes: text("property_types")
    .array()
    .$type<PropertyType[]>()
    .notNull()
    .default(sql`ARRAY['residential']::text[]`),
  role: text("role").$type<ClientRole>().notNull().default("buyer"),
  paymentMethods: text("payment_methods").array().$type<PaymentMethod[]>().notNull().default(sql`'{}'::text[]`),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
