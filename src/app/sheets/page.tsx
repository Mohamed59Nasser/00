import { redirect } from "next/navigation";
import { GoogleSheetsPanel } from "@/components/GoogleSheetsPanel";
import { requirePageUser } from "@/lib/auth";
import { appPath } from "@/lib/paths";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Sheets — Broker Data Sheet",
};

export default async function SheetsPage() {
  const actor = await requirePageUser();
  if (actor.role !== "admin") redirect(appPath("/"));
  return <GoogleSheetsPanel />;
}
