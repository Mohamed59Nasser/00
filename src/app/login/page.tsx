import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { appPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sign in — Broker Data Sheet" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(appPath(user.mustChangePassword ? "/change-password" : "/"));
  return <LoginForm />;
}
