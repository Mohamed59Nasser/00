import { AllDataView } from "@/components/AllDataView";
import { requirePageUser } from "@/lib/auth";
import { loadClients } from "@/lib/server";
import { getAssignableUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AllDataPage() {
  const actor = await requirePageUser();
  const [{ clients, error }, assignableUsers] = await Promise.all([loadClients(actor), getAssignableUsers(actor)]);
  return <AllDataView initialClients={clients} initialError={error} currentUser={actor} assignableUsers={assignableUsers} />;
}
