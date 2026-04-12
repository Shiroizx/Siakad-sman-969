export type FaktorTipe = "Core" | "Secondary";

export type IdealKriteria = {
  label: string;
  matchNames: string[];
  target: number;
  tipe: FaktorTipe;
};

export type JurusanIdeal = {
  kode: "MIPA" | "IPS";
  namaPanjang: string;
  kriteria: IdealKriteria[];
};

/** Profil ideal per jurusan — dipakai engine matching (bukan Server Action). */
export const PROFIL_IDEAL: Record<"MIPA" | "IPS", JurusanIdeal> = {
  MIPA: {
    kode: "MIPA",
    namaPanjang: "Matematika dan Ilmu Pengetahuan Alam (MIPA)",
    kriteria: [
      {
        label: "Matematika",
        matchNames: ["Matematika"],
        target: 85,
        tipe: "Core",
      },
      {
        label: "IPA / Biologi / Fisika",
        matchNames: ["IPA", "Biologi", "Fisika"],
        target: 80,
        tipe: "Core",
      },
      {
        label: "Bahasa Inggris",
        matchNames: ["Bahasa Inggris", "Bahasa Inggris Wajib", "English"],
        target: 75,
        tipe: "Secondary",
      },
    ],
  },
  IPS: {
    kode: "IPS",
    namaPanjang: "Ilmu Pengetahuan Sosial (IPS)",
    kriteria: [
      {
        label: "IPS / Ekonomi / Sosiologi",
        matchNames: ["IPS", "Ekonomi", "Sosiologi"],
        target: 80,
        tipe: "Core",
      },
      {
        label: "Sejarah",
        matchNames: ["Sejarah"],
        target: 80,
        tipe: "Core",
      },
      {
        label: "Bahasa Indonesia",
        matchNames: ["Bahasa Indonesia"],
        target: 80,
        tipe: "Secondary",
      },
    ],
  },
};

export type DetailMapelMatch = {
  label: string;
  tipe: FaktorTipe;
  mapelTerpakai: string | null;
  nilaiSiswa: number;
  target: number;
  gap: number;
  bobot: number;
};

export type HasilJurusan = {
  kode: "MIPA" | "IPS";
  namaPanjang: string;
  ncf: number;
  nsf: number;
  nilaiTotal: number;
  persentaseKecocokan: number;
  detail: DetailMapelMatch[];
};

function normMapel(s: string) {
  return s.trim().toLowerCase();
}

function gapKeBobot(gap: number): number {
  if (gap > 0) return 4.5;
  if (gap === 0) return 5;
  const w = 5 + gap;
  return Math.max(0, w);
}

function nilaiSiswaUntukKriteria(
  nilaiByMapel: Map<string, number>,
  matchNames: string[]
): { nilai: number; mapelTerpakai: string | null } {
  const keys = [...nilaiByMapel.keys()];
  const set = new Set(matchNames.map(normMapel));

  const hits: { key: string; nilai: number }[] = [];
  for (const k of keys) {
    if (set.has(normMapel(k))) {
      hits.push({ key: k, nilai: nilaiByMapel.get(k)! });
    }
  }

  if (hits.length === 0) {
    return { nilai: 0, mapelTerpakai: null };
  }

  const avg =
    hits.reduce((a, h) => a + h.nilai, 0) / Math.max(1, hits.length);
  const mapelTerpakai =
    hits.length === 1 ? hits[0].key : hits.map((h) => h.key).join(" · ");

  return {
    nilai: Math.round(avg * 100) / 100,
    mapelTerpakai,
  };
}

function hitungSatuJurusan(
  jurusan: JurusanIdeal,
  nilaiByMapel: Map<string, number>
): HasilJurusan {
  const detail: DetailMapelMatch[] = [];
  const bobotCore: number[] = [];
  const bobotSecondary: number[] = [];

  for (const k of jurusan.kriteria) {
    const { nilai, mapelTerpakai } = nilaiSiswaUntukKriteria(
      nilaiByMapel,
      k.matchNames
    );
    const gap = Math.round((nilai - k.target) * 100) / 100;
    const bobot = gapKeBobot(gap);
    detail.push({
      label: k.label,
      tipe: k.tipe,
      mapelTerpakai,
      nilaiSiswa: nilai,
      target: k.target,
      gap,
      bobot,
    });
    if (k.tipe === "Core") bobotCore.push(bobot);
    else bobotSecondary.push(bobot);
  }

  const ncf =
    bobotCore.length === 0
      ? 0
      : bobotCore.reduce((a, b) => a + b, 0) / bobotCore.length;
  const nsf =
    bobotSecondary.length === 0
      ? 0
      : bobotSecondary.reduce((a, b) => a + b, 0) / bobotSecondary.length;

  const nilaiTotal = Math.round((ncf * 0.6 + nsf * 0.4) * 1000) / 1000;
  const persentaseKecocokan = Math.min(
    100,
    Math.round((nilaiTotal / 5) * 1000) / 10
  );

  return {
    kode: jurusan.kode,
    namaPanjang: jurusan.namaPanjang,
    ncf: Math.round(ncf * 1000) / 1000,
    nsf: Math.round(nsf * 1000) / 1000,
    nilaiTotal,
    persentaseKecocokan,
    detail,
  };
}

export function computePeminatanResults(nilaiByMapel: Map<string, number>): {
  hasil: HasilJurusan[];
  rekomendasiUtama: "MIPA" | "IPS" | null;
} {
  const mipa = hitungSatuJurusan(PROFIL_IDEAL.MIPA, nilaiByMapel);
  const ips = hitungSatuJurusan(PROFIL_IDEAL.IPS, nilaiByMapel);
  const hasil = [mipa, ips].sort((a, b) => b.nilaiTotal - a.nilaiTotal);
  const rekomendasiUtama = hasil.length > 0 ? hasil[0].kode : null;
  return { hasil, rekomendasiUtama };
}
