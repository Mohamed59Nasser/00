import { GoogleSheetsPanel } from "@/components/GoogleSheetsPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Sheets — Broker Data Sheet",
};

export default function SheetsPage() {
  return <GoogleSheetsPanel />;
}
