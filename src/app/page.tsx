import { AllDataView } from "@/components/AllDataView";
import { loadClients } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AllDataPage() {
  const { clients, error } = await loadClients();
  return <AllDataView initialClients={clients} initialError={error} />;
}
