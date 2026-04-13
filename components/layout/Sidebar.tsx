"use client";

import {
  AlertTriangle,
  Archive,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  School,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isSiswaUser } from "@/lib/auth/siswa";
import { createClient } from "@/utils/supabase/client";

const NAV_ADMIN = [
  {
    href: "/admin/ews",
    label: "EWS Konseling",
    icon: AlertTriangle,
  },
  {
    href: "/admin/students",
    label: "Data Siswa",
    icon: Users,
  },
  {
    href: "/admin/kelas",
    label: "Master Kelas",
    icon: School,
  },
  {
    href: "/admin/akademik",
    label: "Akademik",
    icon: BookOpen,
  },
  {
    href: "/admin/kenaikan-kelas",
    label: "Kenaikan kelas",
    icon: School,
  },
  {
    href: "/admin/kelulusan",
    label: "Kelulusan",
    icon: GraduationCap,
  },
  {
    href: "/admin/kedisiplinan",
    label: "Kedisiplinan",
    icon: ShieldAlert,
  },
  {
    href: "/admin/arsip",
    label: "Arsip siswa",
    icon: Archive,
  },
  {
    href: "/admin/arsip-alumni",
    label: "Arsip alumni",
    icon: GraduationCap,
  },
  {
    href: "/admin/clustering",
    label: "Distribusi Kelas",
    icon: LayoutGrid,
  },
  {
    href: "/siswa/peminatan",
    label: "Cek Peminatan",
    icon: GraduationCap,
  },
] as const;

const NAV_SISWA = [
  {
    href: "/siswa/beranda",
    label: "Beranda Siswa",
    icon: LayoutDashboard,
  },
  {
    href: "/siswa/profil",
    label: "Profil Saya",
    icon: UserCog,
  },
  {
    href: "/siswa/ews",
    label: "EWS Saya",
    icon: AlertTriangle,
  },
  {
    href: "/siswa/akademik",
    label: "Akademik",
    icon: BookOpen,
  },
  {
    href: "/siswa/arsip",
    label: "Arsip saya",
    icon: Archive,
  },
  {
    href: "/siswa/kedisiplinan",
    label: "Kedisiplinan",
    icon: ShieldAlert,
  },
  {
    href: "/siswa/peminatan",
    label: "Cek Peminatan",
    icon: GraduationCap,
  },
] as const;

/** Portal siswa untuk akun yang sudah `is_alumni` (hanya arsip lengkap). */
const NAV_SISWA_ALUMNI = [
  {
    href: "/siswa/arsip-alumni",
    label: "Arsip alumni saya",
    icon: GraduationCap,
  },
] as const;

type SidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();
  const [siswaPortal, setSiswaPortal] = useState(false);
  const [siswaAlumni, setSiswaAlumni] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const apply = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const portal = isSiswaUser(u);
      setSiswaPortal(portal);
      if (!portal || !u) {
        setSiswaAlumni(false);
        return;
      }
      const sid = String(u.user_metadata?.student_id ?? "").trim();
      let q = supabase.from("students").select("is_alumni").limit(1);
      q = sid ? q.eq("id", sid) : q.eq("user_id", u.id);
      const { data: row } = await q.maybeSingle();
      setSiswaAlumni(Boolean(row?.is_alumni));
    };
    void apply();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void apply();
    });
    return () => subscription.unsubscribe();
  }, []);

  const nav = siswaPortal ? (siswaAlumni ? NAV_SISWA_ALUMNI : NAV_SISWA) : NAV_ADMIN;
  const homeHref = siswaPortal
    ? siswaAlumni
      ? "/siswa/arsip-alumni"
      : "/siswa/beranda"
    : "/";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-slate-900 text-slate-100 shadow-xl transition-transform duration-300 ease-out dark:border-slate-700/80 dark:bg-slate-950 ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
      aria-label="Navigasi utama"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-800/80 px-4 dark:border-slate-800">
        <Link
          href={homeHref}
          onClick={() => onOpenChange(false)}
          className="group flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-800/80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-md transition group-hover:bg-indigo-400">
            <LayoutDashboard className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-white">
              SIAKAD 969
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {siswaPortal ? "Portal siswa" : "Dashboard SPK"}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {siswaPortal ? "Menu" : "Modul"}
        </p>
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-900/30 ring-1 ring-indigo-400/40"
                  : "text-slate-300 hover:bg-slate-800/90 hover:text-white hover:shadow-sm"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                  active
                    ? "scale-110"
                    : "text-slate-400 group-hover:scale-105 group-hover:text-indigo-300"
                }`}
                aria-hidden
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/80 p-3 text-[11px] text-slate-500 dark:border-slate-800">
        <p className="px-2 leading-relaxed">
          {siswaPortal
            ? siswaAlumni
              ? "Akun alumni: hanya arsip akademik yang dapat diakses."
              : "Akses peminatan dan informasi untuk siswa."
            : "Navigasi ringkas untuk modul EWS, clustering, dan peminatan."}
        </p>
      </div>
    </aside>
  );
}
