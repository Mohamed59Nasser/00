import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SheetTabs } from "@/components/SheetTabs";
import { BuildingIcon, DownloadIcon } from "@/components/icons";
import { appPath } from "@/lib/paths";
import { getStorageKind } from "@/lib/store";
import "./globals.css";

// The header shows where the data lives, which depends on runtime env variables.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broker Data Sheet — Real Estate Clients",
  description: "Professional real estate broker sheet: all client data, with Buyer/Seller and Residential/Investment search.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const storageKind = getStorageKind();
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 pt-4 pb-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <BuildingIcon size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight">Broker Data Sheet</h1>
                <p className="text-xs text-slate-400">Real estate clients · Buyers &amp; Sellers · Residential &amp; Investment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/sheets"
                className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${
                  storageKind === "sheets"
                    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40"
                    : "bg-amber-500/15 text-amber-200 ring-amber-400/40"
                }`}
                title="Where your data is stored"
              >
                <span className={`h-2 w-2 rounded-full ${storageKind === "sheets" ? "bg-emerald-400" : "bg-amber-400"}`} />
                Database: {storageKind === "sheets" ? "Google Sheets" : "Local (PostgreSQL)"}
              </Link>
              <a
                href={appPath("/api/export")}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500 hover:text-white"
                title="Download the whole sheet as an Excel workbook (ALL + SEARCH sheets)"
              >
                <DownloadIcon size={16} />
                <span className="hidden sm:inline">Export to Excel</span>
                <span className="sm:hidden">Excel</span>
              </a>
            </div>
          </div>
          <div className="mx-auto max-w-[1700px]">
            <SheetTabs />
          </div>
        </header>

        <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="mx-auto max-w-[1700px] px-4 pb-8 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          Broker Data Sheet · Data is stored securely in your database · Export anytime to Excel
        </footer>
      </body>
    </html>
  );
}
