"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ALL DATA", hint: "Every record in one sheet" },
  { href: "/search", label: "SEARCH", hint: "Buyer / Seller · Residential / Investment" },
  { href: "/sheets", label: "GOOGLE SHEETS", hint: "Connect Google Sheets as the database" },
];

export function SheetTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sheets" className="flex items-end gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            title={tab.hint}
            className={`relative -mb-px inline-flex items-center gap-2 rounded-t-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] transition ${
              active
                ? "border-slate-300 border-b-slate-100 bg-slate-100 text-emerald-700 shadow-[inset_0_3px_0_0_#059669]"
                : "border-transparent bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-500"}`} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
