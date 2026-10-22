import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Change password — Broker Data Sheet" };

export default async function ChangePasswordPage() {
  const user = await requirePageUser(true);
  return <ChangePasswordForm required={user.mustChangePassword} />;
}
