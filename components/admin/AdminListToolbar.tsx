"use client";

import { Search } from "lucide-react";

export type AdminListToolbarSortOption = { value: string; label: string };

type Props = {
  className?: string;
  query: string;
  onQueryChange: (v: string) => void;
  queryPlaceholder?: string;
  sortValue: string;
  onSortChange: (v: string) => void;
  sortOptions: AdminListToolbarSortOption[];
  shown: number;
  total: number;
  /** Kata benda jamak, mis. "siswa" */
  itemLabel?: string;
};

export function AdminListToolbar({
  className = "",
  query,
  onQueryChange,
  queryPlaceholder = "Cari nama atau NISN…",
  sortValue,
  onSortChange,
  sortOptions,
  shown,
  total,
  itemLabel = "siswa",
}: Props) {
  const filtered = total > 0 && shown < total;
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={queryPlaceholder}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-indigo-500/30 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
          />
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
            Urutkan
          </span>
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full min-w-[11rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 sm:w-auto"
            aria-label="Urutkan daftar"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Menampilkan{" "}
        <strong className="text-slate-700 dark:text-slate-200">{shown}</strong>{" "}
        dari{" "}
        <strong className="text-slate-700 dark:text-slate-200">{total}</strong>{" "}
        {itemLabel}
        {filtered ? (
          <span className="text-indigo-600 dark:text-indigo-400">
            {" "}
            · hasil saring pencarian
          </span>
        ) : null}
        .
      </p>
    </div>
  );
}
