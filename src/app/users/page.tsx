import { redirect } from "next/navigation";
import { UsersView } from "@/components/UsersView";
import { requirePageUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/staff";
import { appPath } from "@/lib/paths";
import { listUsersForActor } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata = { title: "Staff — Broker Data Sheet" };

export default async function UsersPage() {
  const actor = await requirePageUser();
  if (!canManageUsers(actor.role)) redirect(appPath("/"));
  const users = await listUsersForActor(actor);
  return <UsersView initialUsers={users} currentUser={actor} />;
}
