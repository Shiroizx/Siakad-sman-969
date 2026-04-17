"use client";

import { logout } from "@/app/actions/auth";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/client";
import { LogOut, Menu, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type TopbarProps = {
  onMenuClick?: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [subline, setSubline] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Halo");

  useEffect(() => {
    const supabase = createClient();
    const apply = () => {
      void supabase.auth.getUser().then(({ data }) => {
        const u = data.user;
        const em = u?.email ?? null;
        setEmail(em);
        if (u && isSiswaUser(u)) {
          const metaNama = String(u.user_metadata?.nama ?? "").trim();
          const nisn = String(u.user_metadata?.nisn ?? "").trim();
          if (metaNama) {
            setGreeting(`Halo, ${metaNama.split(/\s+/)[0]}`);
          } else {
            setGreeting("Halo, Siswa");
          }
          setSubline(nisn ? `NISN ${nisn}` : em);
        } else {
          setGreeting(em ? `Halo, ${em.split("@")[0]}` : "Halo, Admin");
          setSubline(em);
        }
      });
    };
    apply();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      apply();
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700"
          aria-label="Buka menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-1 ring-amber-500/30 dark:bg-slate-950 lg:hidden"
          aria-hidden
        >
          <SiteLogo size={32} className="scale-110" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {greeting}
          </p>
          <p
            className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400"
            title={email ?? undefined}
          >
            {subline ?? "Semoga harimu produktif"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500"
          aria-label="Profil"
          title={email ?? "Profil"}
        >
          <UserRound className="h-5 w-5" />
        </button>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-900 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </form>
      </div>
    </header>
  );
}
