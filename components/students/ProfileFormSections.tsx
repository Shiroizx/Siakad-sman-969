"use client";

import type { KelasOption, StudentRecord } from "@/app/actions/students";

export type ProfileFormValues = {
  nisn: string;
  nama: string;
  jenis_kelamin: "L" | "P";
  kelas_id: string;
  kelas_nama: string;
  tanggal_lahir: string;
  nik: string;
  tempat_lahir: string;
  agama: string;
  alamat: string;
  no_hp: string;
  email: string;
  nama_ayah: string;
  pekerjaan_ayah: string;
  nama_ibu: string;
  pekerjaan_ibu: string;
  no_hp_ortu: string;
};

type ProfileFormSectionsProps = {
  values: ProfileFormValues;
  onChange: (key: keyof ProfileFormValues, value: string) => void;
  /** Portal siswa: NISN, JK, kelas, tanggal lahir hanya baca */
  siswaMode?: boolean;
  kelasOptions?: KelasOption[];
};

function cardClass() {
  return "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70";
}

function labelClass() {
  return "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
}

function inputClass(disabled?: boolean) {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
    disabled ? "cursor-not-allowed opacity-70" : ""
  }`;
}

export function profileValuesFromRecord(r: StudentRecord): ProfileFormValues {
  return {
    nisn: r.nisn,
    nama: r.nama,
    jenis_kelamin: r.jenis_kelamin === "P" ? "P" : "L",
    kelas_id: r.kelas_id ?? "",
    kelas_nama: r.kelas_nama ?? "",
    tanggal_lahir: r.tanggal_lahir ?? "",
    nik: r.nik ?? "",
    tempat_lahir: r.tempat_lahir ?? "",
    agama: r.agama ?? "",
    alamat: r.alamat ?? "",
    no_hp: r.no_hp ?? "",
    email: r.email ?? "",
    nama_ayah: r.nama_ayah ?? "",
    pekerjaan_ayah: r.pekerjaan_ayah ?? "",
    nama_ibu: r.nama_ibu ?? "",
    pekerjaan_ibu: r.pekerjaan_ibu ?? "",
    no_hp_ortu: r.no_hp_ortu ?? "",
  };
}

export function emptyProfileFormValues(): ProfileFormValues {
  return {
    nisn: "",
    nama: "",
    jenis_kelamin: "L",
    kelas_id: "",
    kelas_nama: "",
    tanggal_lahir: "",
    nik: "",
    tempat_lahir: "",
    agama: "",
    alamat: "",
    no_hp: "",
    email: "",
    nama_ayah: "",
    pekerjaan_ayah: "",
    nama_ibu: "",
    pekerjaan_ibu: "",
    no_hp_ortu: "",
  };
}

export function ProfileFormSections({
  values,
  onChange,
  siswaMode,
  kelasOptions,
}: ProfileFormSectionsProps) {
  const lock = Boolean(siswaMode);

  return (
    <div className="flex flex-col gap-6">
      <section className={cardClass()}>
        <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
          Data pribadi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className={labelClass()} htmlFor="pf-nisn">
              NISN
            </label>
            <input
              id="pf-nisn"
              className={inputClass(lock)}
              value={values.nisn}
              onChange={(e) => onChange("nisn", e.target.value)}
              disabled={lock}
              maxLength={10}
              inputMode="numeric"
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass()} htmlFor="pf-nama">
              Nama lengkap
            </label>
            <input
              id="pf-nama"
              className={inputClass()}
              value={values.nama}
              onChange={(e) => onChange("nama", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-jk">
              Jenis kelamin
            </label>
            <select
              id="pf-jk"
              className={inputClass(lock)}
              value={values.jenis_kelamin}
              onChange={(e) =>
                onChange("jenis_kelamin", e.target.value as "L" | "P")
              }
              disabled={lock}
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-kelas">
              Kelas
            </label>
            {lock ? (
              <input
                id="pf-kelas"
                className={inputClass(true)}
                value={values.kelas_nama || "—"}
                readOnly
              />
            ) : (
              <select
                id="pf-kelas"
                className={inputClass()}
                value={values.kelas_id}
                onChange={(e) => onChange("kelas_id", e.target.value)}
              >
                <option value="">— Pilih kelas —</option>
                {(kelasOptions ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label ?? k.nama}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-nik">
              NIK
            </label>
            <input
              id="pf-nik"
              className={inputClass()}
              value={values.nik}
              onChange={(e) => onChange("nik", e.target.value)}
              placeholder="16 digit (opsional)"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-tempat">
              Tempat lahir
            </label>
            <input
              id="pf-tempat"
              className={inputClass()}
              value={values.tempat_lahir}
              onChange={(e) => onChange("tempat_lahir", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-tgl">
              Tanggal lahir
            </label>
            <input
              id="pf-tgl"
              type="text"
              className={inputClass(lock)}
              value={values.tanggal_lahir}
              onChange={(e) => onChange("tanggal_lahir", e.target.value)}
              disabled={lock}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-agama">
              Agama
            </label>
            <input
              id="pf-agama"
              className={inputClass()}
              value={values.agama}
              onChange={(e) => onChange("agama", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()} htmlFor="pf-alamat">
              Alamat
            </label>
            <textarea
              id="pf-alamat"
              rows={3}
              className={inputClass()}
              value={values.alamat}
              onChange={(e) => onChange("alamat", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
          Data kontak
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()} htmlFor="pf-hp">
              No. HP
            </label>
            <input
              id="pf-hp"
              className={inputClass()}
              value={values.no_hp}
              onChange={(e) => onChange("no_hp", e.target.value)}
              inputMode="tel"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-email">
              Email
            </label>
            <input
              id="pf-email"
              type="email"
              className={inputClass()}
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
          Data orang tua
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()} htmlFor="pf-ayah">
              Nama ayah
            </label>
            <input
              id="pf-ayah"
              className={inputClass()}
              value={values.nama_ayah}
              onChange={(e) => onChange("nama_ayah", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-kerja-ayah">
              Pekerjaan ayah
            </label>
            <input
              id="pf-kerja-ayah"
              className={inputClass()}
              value={values.pekerjaan_ayah}
              onChange={(e) => onChange("pekerjaan_ayah", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-ibu">
              Nama ibu
            </label>
            <input
              id="pf-ibu"
              className={inputClass()}
              value={values.nama_ibu}
              onChange={(e) => onChange("nama_ibu", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="pf-kerja-ibu">
              Pekerjaan ibu
            </label>
            <input
              id="pf-kerja-ibu"
              className={inputClass()}
              value={values.pekerjaan_ibu}
              onChange={(e) => onChange("pekerjaan_ibu", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()} htmlFor="pf-hp-ortu">
              No. HP orang tua / wali
            </label>
            <input
              id="pf-hp-ortu"
              className={inputClass()}
              value={values.no_hp_ortu}
              onChange={(e) => onChange("no_hp_ortu", e.target.value)}
              inputMode="tel"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
