import type { StudentMini } from "@/app/actions/akademik";
import type { StudentForClustering } from "@/app/actions/clustering";
import type { StudentRecord } from "@/app/actions/students";

export const adminListCollator = new Intl.Collator("id", {
  sensitivity: "base",
  numeric: true,
});

export function filterStudentMiniByQuery(
  list: StudentMini[],
  query: string
): StudentMini[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const digits = query.replace(/\D/g, "");
  return list.filter((s) => {
    if (s.nama.toLowerCase().includes(q)) return true;
    if (String(s.nisn).toLowerCase().includes(q)) return true;
    if (digits && String(s.nisn).replace(/\D/g, "").includes(digits)) return true;
    return false;
  });
}

export type StudentMiniSort = "nama-asc" | "nama-desc" | "nisn-asc";

export function sortStudentMini(
  list: StudentMini[],
  mode: StudentMiniSort
): StudentMini[] {
  const out = [...list];
  out.sort((a, b) => {
    if (mode === "nisn-asc") {
      return adminListCollator.compare(String(a.nisn), String(b.nisn));
    }
    const c = adminListCollator.compare(a.nama, b.nama);
    return mode === "nama-desc" ? -c : c;
  });
  return out;
}

export function filterStudentRecordByQuery(
  list: StudentRecord[],
  query: string
): StudentRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const digits = query.replace(/\D/g, "");
  return list.filter((s) => {
    if (s.nama.toLowerCase().includes(q)) return true;
    if (String(s.nisn).toLowerCase().includes(q)) return true;
    const kn = (s.kelas_nama ?? "").toLowerCase();
    if (kn.includes(q)) return true;
    if (digits && String(s.nisn).replace(/\D/g, "").includes(digits)) return true;
    return false;
  });
}

export type StudentRecordSort =
  | "nama-asc"
  | "nama-desc"
  | "nisn-asc"
  | "kelas-asc";

export function sortStudentRecords(
  list: StudentRecord[],
  mode: StudentRecordSort
): StudentRecord[] {
  const out = [...list];
  out.sort((a, b) => {
    if (mode === "kelas-asc") {
      const k = adminListCollator.compare(
        a.kelas_nama ?? "",
        b.kelas_nama ?? ""
      );
      if (k !== 0) return k;
      return adminListCollator.compare(a.nama, b.nama);
    }
    if (mode === "nisn-asc") {
      return adminListCollator.compare(String(a.nisn), String(b.nisn));
    }
    const c = adminListCollator.compare(a.nama, b.nama);
    return mode === "nama-desc" ? -c : c;
  });
  return out;
}

/** Skor risiko kasar untuk urutan "prioritas" EWS (bukan ambang resmi). */
export function ewsRiskScore(r: {
  totalAlpa: number;
  totalPoinPelanggaran: number;
  jumlahMapelDiBawahKkm: number;
}): number {
  return (
    r.totalAlpa * 3 +
    r.jumlahMapelDiBawahKkm * 8 +
    Math.min(200, r.totalPoinPelanggaran)
  );
}

export type EwsSortPreset =
  | "prioritas"
  | "nama-asc"
  | "nama-desc"
  | "kelas-asc"
  | "alpa-desc"
  | "poin-desc"
  | "mapel-desc";

export type EwsSortableRow = {
  nama: string;
  nisn: string;
  kelas: string | null;
  kritis: boolean;
  totalAlpa: number;
  totalPoinPelanggaran: number;
  jumlahMapelDiBawahKkm: number;
};

export function filterEwsRows<T extends EwsSortableRow>(
  rows: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const digits = query.replace(/\D/g, "");
  return rows.filter((r) => {
    if (r.nama.toLowerCase().includes(q)) return true;
    if (String(r.nisn).toLowerCase().includes(q)) return true;
    const k = (r.kelas ?? "").toLowerCase();
    if (k.includes(q)) return true;
    if (digits && String(r.nisn).replace(/\D/g, "").includes(digits)) return true;
    return false;
  });
}

export function sortEwsRows<T extends EwsSortableRow>(
  rows: T[],
  mode: EwsSortPreset
): T[] {
  const out = [...rows];
  out.sort((a, b) => {
    switch (mode) {
      case "prioritas": {
        if (a.kritis !== b.kritis) return a.kritis ? -1 : 1;
        const ra = ewsRiskScore(a);
        const rb = ewsRiskScore(b);
        if (rb !== ra) return rb - ra;
        return adminListCollator.compare(a.nama, b.nama);
      }
      case "nama-desc": {
        return adminListCollator.compare(b.nama, a.nama);
      }
      case "kelas-asc": {
        const k = adminListCollator.compare(a.kelas ?? "", b.kelas ?? "");
        if (k !== 0) return k;
        return adminListCollator.compare(a.nama, b.nama);
      }
      case "alpa-desc": {
        if (b.totalAlpa !== a.totalAlpa) return b.totalAlpa - a.totalAlpa;
        return adminListCollator.compare(a.nama, b.nama);
      }
      case "poin-desc": {
        if (b.totalPoinPelanggaran !== a.totalPoinPelanggaran) {
          return b.totalPoinPelanggaran - a.totalPoinPelanggaran;
        }
        return adminListCollator.compare(a.nama, b.nama);
      }
      case "mapel-desc": {
        if (b.jumlahMapelDiBawahKkm !== a.jumlahMapelDiBawahKkm) {
          return b.jumlahMapelDiBawahKkm - a.jumlahMapelDiBawahKkm;
        }
        return adminListCollator.compare(a.nama, b.nama);
      }
      case "nama-asc":
      default:
        return adminListCollator.compare(a.nama, b.nama);
    }
  });
  return out;
}

export type ClusterSiswaSort =
  | "nama-asc"
  | "nama-desc"
  | "nilai-desc"
  | "nisn-asc"
  | "skor-jurusan-desc";

export function sortClusterStudents(
  list: StudentForClustering[],
  mode: ClusterSiswaSort
): StudentForClustering[] {
  const out = [...list];
  out.sort((a, b) => {
    if (mode === "skor-jurusan-desc") {
      const sa = a.skorMapelJurusan ?? 0;
      const sb = b.skorMapelJurusan ?? 0;
      if (sb !== sa) return sb - sa;
      return adminListCollator.compare(a.nama, b.nama);
    }
    if (mode === "nilai-desc") {
      if (b.nilaiRata !== a.nilaiRata) return b.nilaiRata - a.nilaiRata;
      return adminListCollator.compare(a.nama, b.nama);
    }
    if (mode === "nisn-asc") {
      return adminListCollator.compare(a.nisn, b.nisn);
    }
    const c = adminListCollator.compare(a.nama, b.nama);
    return mode === "nama-desc" ? -c : c;
  });
  return out;
}
