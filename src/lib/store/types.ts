import type { Client, ClientInput, ClientMutationMeta } from "../types";

export type StoreKind = "postgres" | "sheets";

/** Storage abstraction – implemented by PostgreSQL and by Google Sheets. */
export interface Store {
  kind: StoreKind;
  list(): Promise<Client[]>;
  create(input: ClientInput, meta: ClientMutationMeta): Promise<Client>;
  update(id: string, input: ClientInput, meta: ClientMutationMeta): Promise<Client | null>;
  remove(id: string): Promise<boolean>;
}
