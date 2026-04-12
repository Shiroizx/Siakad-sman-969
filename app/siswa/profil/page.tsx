"use client";

import { getMyProfile, updateMyProfile } from "@/app/actions/students";
import {
  ProfileFormSections,
  profileValuesFromRecord,
  type ProfileFormValues,
} from "@/components/students/ProfileFormSections";
import { useCallback, useEffect, useState } from "react";

type Toast = { message: string; variant: "ok" | "err" };

export default function SiswaProfilPage() {
  const [values, setValues] = useState<ProfileFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const onField = useCallback((key: keyof ProfileFormValues, value: string) => {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setLoadError(null);
    const { profile, error } = await getMyProfile();
    if (error || !profile) {
      setLoadError(error ?? "Gagal memuat profil.");
      setValues(null);
    } else {
      setValues(profileValuesFromRecord(profile));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { profile, error } = await getMyProfile();
      if (cancelled) return;
      setLoading(false);
      if (error || !profile) {
        setLoadError(error ?? "Gagal memuat profil.");
        setValues(null);
      } else {
        setLoadError(null);
        setValues(profileValuesFromRecord(profile));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setSaving(true);
    setToast(null);
    const { error } = await updateMyProfile({
      nama: values.nama,
      nik: values.nik,
      tempat_lahir: values.tempat_lahir,
      agama: values.agama,
      alamat: values.alamat,
      no_hp: values.no_hp,
      email: values.email,
      nama_ayah: values.nama_ayah,
      pekerjaan_ayah: values.pekerjaan_ayah,
      nama_ibu: values.nama_ibu,
      pekerjaan_ibu: values.pekerjaan_ibu,
      no_hp_ortu: values.no_hp_ortu,
    });
    setSaving(false);
    if (error) {
      setToast({ message: error, variant: "err" });
    } else {
      setToast({ message: "Perubahan berhasil disimpan.", variant: "ok" });
      void load({ silent: true });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profil saya
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Perbarui data pribadi, kontak, dan orang tua. NISN, kelas, jenis kelamin,
          dan tanggal lahir dikelola sekolah.
        </p>
      </div>

      {toast ? (
        <div
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${
            toast.variant === "ok"
              ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-rose-300/80 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat data…</p>
      ) : loadError ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {loadError}
        </p>
      ) : values ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <ProfileFormSections
            values={values}
            onChange={onField}
            siswaMode
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
