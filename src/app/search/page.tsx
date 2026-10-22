import { SearchView } from "@/components/SearchView";
import { loadClients } from "@/lib/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search — Broker Data Sheet",
};

export default async function SearchPage() {
  const { clients, error } = await loadClients();
  return <SearchView initialClients={clients} initialError={error} />;
}
