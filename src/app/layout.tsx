import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { BuildingIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth";
import { appPath } from "@/lib/paths";
import { STAFF_ROLE_LABELS, canManageUsers } from "@/lib/staff";

export const metadata: Metadata = {
  title: "Broker Data Sheet",
  description: "One organized workspace for all your real-estate client records.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-slate-900 text-white shadow-lg shadow-slate-900/10">
          <div className="container-wide flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
            <div className="flex flex-wrap items-center gap-5">
              <Link href={appPath("/")} className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-white shadow-sm">
                  <BuildingIcon size={19} />
                </span>
                <span className="text-[15px] font-bold tracking-tight">Broker Data Sheet</span>
              </Link>
              {currentUser && !currentUser.mustChangePassword && (
                <nav className="flex items-center gap-1" aria-label="Main navigation">
                  <Link href={appPath("/")} className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">All Data</Link>
                  <Link href={appPath("/search")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><SearchIcon size={14} /> Search</Link>
                  {canManageUsers(currentUser.role) && <Link href={appPath("/users")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><UsersIcon size={14} /> Staff</Link>}
                  {currentUser.role === "admin" && <Link href={appPath("/sheets")} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-emerald-300 transition hover:bg-white/10 hover:text-white">Google Sheets</Link>}
                </nav>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  <span className="text-right text-xs leading-tight text-slate-300"><span className="block font-semibold text-white">{currentUser.displayName}</span>{STAFF_ROLE_LABELS[currentUser.role]}</span>
                  <Link href={appPath("/change-password")} className="text-xs font-semibold text-slate-300 hover:text-white">Password</Link>
                  <LogoutButton />
                </>
              ) : <span className="text-xs font-medium text-slate-400">Secure staff access</span>}
            </div>
          </div>
        </header>
        <main className="container-wide py-5">{children}</main>
      </body>
    </html>
  );
}
