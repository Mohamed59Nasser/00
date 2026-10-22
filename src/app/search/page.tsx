import { SearchView } from "@/components/SearchView";
import { requirePageUser } from "@/lib/auth";
import { loadClients } from "@/lib/server";
import { getAssignableUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search — Broker Data Sheet",
};

export default async function SearchPage() {
  const actor = await requirePageUser();
  const [{ clients, error }, assignableUsers] = await Promise.all([loadClients(actor), getAssignableUsers(actor)]);
  return <SearchView initialClients={clients} initialError={error} currentUser={actor} assignableUsers={assignableUsers} />;
}
