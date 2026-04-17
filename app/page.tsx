import { LandingPage } from "@/components/landing/LandingPage";
import { isGuruBkUser } from "@/lib/auth/guru-bk";
import { isSiswaUser } from "@/lib/auth/siswa";
import { isWaliKelasUser } from "@/lib/auth/wali-kelas";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SIAKAD 969 — SMAN 969",
  description:
    "Sistem informasi akademik: EWS, distribusi kelas, dan rekomendasi peminatan untuk SMAN 969.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (isSiswaUser(user)) {
      const sid = String(user.user_metadata?.student_id ?? "").trim();
      let q = supabase.from("students").select("is_alumni").limit(1);
      q = sid ? q.eq("id", sid) : q.eq("user_id", user.id);
      const { data: row } = await q.maybeSingle();
      redirect(row?.is_alumni ? "/siswa/arsip-alumni" : "/siswa/beranda");
    }
    if (isWaliKelasUser(user)) {
      redirect("/wali-kelas/ews");
    }
    if (isGuruBkUser(user)) {
      redirect("/guru-bk/ews");
    }
    redirect("/beranda");
  }

  return <LandingPage />;
}
