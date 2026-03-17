"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Scale, Calendar, Menu, X, ClipboardCheck, LogOut, Megaphone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const getNavItems = (isAdmin: boolean) => [
  {
    label: "Info Board",
    href: "/dashboard/info",
    icon: Megaphone,
  },
  {
    label: "Berat Flyer",
    href: "/dashboard",
    icon: Scale,
  },
  {
    label: "Jadwal Latihan",
    href: "/dashboard/jadwal",
    icon: Calendar,
  },
  {
    label: "Absensi",
    href: "/dashboard/absensi",
    icon: ClipboardCheck,
  },
  ...(isAdmin
    ? [
        {
          label: "Data Atlet",
          href: "/dashboard/athletes",
          icon: ShieldAlert,
        },
      ]
    : []),
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";
  const navItems = getNavItems(isAdmin);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/20 bg-black/60 p-2 backdrop-blur-md md:hidden"
        aria-label="Toggle menu"
      >
        {open ? (
          <X className="h-5 w-5 text-slate-100" />
        ) : (
          <Menu className="h-5 w-5 text-slate-100" />
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-white/10 bg-black/90 backdrop-blur-xl transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Image
              src="/crown-logo.jpg"
              alt="Crown Allstar"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Crown Allstar</h1>
            <p className="text-xs text-slate-400">Crown Allstar</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/15 text-white shadow-lg shadow-white/5"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-cyan-400" : ""}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 p-4">
          {user && (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-white">
                  {user.displayName || "Athlete"}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  {user.email}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="mt-3 text-center text-[10px] text-slate-600">
            © 2026 Crown Allstar
          </p>
        </div>
      </aside>
    </>
  );
}
