"use client";
import { getEvaluasiKelas, type EvalKelasBobot, type EvalKelasRow } from "@/app/actions/evaluasi-kelas";
import { Trophy, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const COLORS = ["#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];
const KAT_COLORS: Record<string,string> = {"Sangat Baik":"#10b981","Baik":"#3b82f6","Cukup":"#f59e0b","Perlu Perhatian":"#ef4444"};

function BarChart({ rows }: { rows: EvalKelasRow[] }) {
  const max = Math.max(...rows.map(r => r.skorV), 0.001);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.kelasId} className="flex items-center gap-2">
          <span className="w-28 truncate text-xs font-medium text-slate-700 dark:text-slate-300">{r.namaKelas}</span>
          <div className="relative h-7 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700" style={{width:`${(r.skorV/max)*100}%`,background:COLORS[i%COLORS.length]}}/>
            <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{r.skorV.toFixed(4)}</span>
          </div>
          <span className="w-6 text-center text-xs font-bold text-slate-500">#{r.rank}</span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ rows }: { rows: EvalKelasRow[] }) {
  const counts: Record<string,number> = {};
  for (const r of rows) counts[r.kategori] = (counts[r.kategori]??0)+1;
  const entries = Object.entries(counts);
  const total = rows.length;
  let cum = 0;
  const slices = entries.map(([k,v]) => {
    const start = cum; cum += v/total; const end = cum;
    return { label:k, count:v, pct:v/total, start, end, color: KAT_COLORS[k]??"#94a3b8" };
  });
  const r = 80, cx = 100, cy = 100;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0">
        {slices.map((s,i) => {
          const a1 = s.start*2*Math.PI - Math.PI/2, a2 = s.end*2*Math.PI - Math.PI/2;
          const large = s.pct > 0.5 ? 1 : 0;
          const d = `M${cx},${cy} L${cx+r*Math.cos(a1)},${cy+r*Math.sin(a1)} A${r},${r} 0 ${large} 1 ${cx+r*Math.cos(a2)},${cy+r*Math.sin(a2)} Z`;
          return <path key={i} d={d} fill={s.color} stroke="white" strokeWidth="2"/>;
        })}
      </svg>
      <div className="space-y-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{background:s.color}}/>
            <span className="font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
            <span className="font-mono text-xs text-slate-500">{s.count} ({(s.pct*100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ rows }: { rows: EvalKelasRow[] }) {
  const top = rows.slice(0, 5);
  const maxN = Math.max(...top.map(r=>r.avgNilai),1), maxK = Math.max(...top.map(r=>r.avgKehadiran),1);
  const maxP = Math.max(...top.map(r=>r.avgPelanggaran),1);
  const cx=150, cy=150, R=110;
  const axes = [{label:"Nilai",angle:-Math.PI/2},{label:"Kehadiran",angle:Math.PI/6},{label:"Pelanggaran",angle:5*Math.PI/6}];
  return (
    <svg viewBox="0 0 300 300" className="mx-auto h-64 w-64">
      {[0.25,0.5,0.75,1].map(s => (
        <polygon key={s} points={axes.map(a=>`${cx+R*s*Math.cos(a.angle)},${cy+R*s*Math.sin(a.angle)}`).join(" ")} fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3,3"/>
      ))}
      {axes.map((a,i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={cx+R*Math.cos(a.angle)} y2={cy+R*Math.sin(a.angle)} stroke="#94a3b8" strokeWidth="0.5"/>
          <text x={cx+(R+18)*Math.cos(a.angle)} y={cy+(R+18)*Math.sin(a.angle)} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-[10px] font-semibold">{a.label}</text>
        </g>
      ))}
      {top.map((r,i) => {
        const nN=r.avgNilai/maxN, nK=r.avgKehadiran/maxK, nP=maxP>0?1-r.avgPelanggaran/maxP:1;
        const vals=[nN,nK,nP];
        const pts=axes.map((a,j)=>`${cx+R*vals[j]*Math.cos(a.angle)},${cy+R*vals[j]*Math.sin(a.angle)}`).join(" ");
        return <polygon key={r.kelasId} points={pts} fill={COLORS[i]} fillOpacity="0.15" stroke={COLORS[i]} strokeWidth="1.5"/>;
      })}
      {top.map((r,i) => (
        <g key={`leg-${i}`}>
          <rect x={10} y={8+i*16} width={10} height={10} rx={2} fill={COLORS[i]}/>
          <text x={24} y={16+i*16} className="fill-slate-600 text-[9px] dark:fill-slate-300">{r.namaKelas}</text>
        </g>
      ))}
    </svg>
  );
}

function BobotSlider(p:{label:string;value:number;color:string;onChange:(v:number)=>void}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{p.label}</span>
        <span className={`rounded-md px-2 py-0.5 font-mono text-sm font-bold tabular-nums ${p.color}`}>{p.value}%</span>
      </div>
      <input type="range" min={0} max={100} value={p.value} onChange={e=>p.onChange(Number(e.target.value))} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"/>
    </div>
  );
}

export default function AdminEvaluasiKelasPage() {
  const [semester, setSemester] = useState<0|1|2>(0);
  const [bobot, setBobot] = useState<EvalKelasBobot>({nilai:50,kehadiran:30,pelanggaran:20});
  const [rows, setRows] = useState<EvalKelasRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [showMethod, setShowMethod] = useState(false);

  const totalBobot = bobot.nilai+bobot.kehadiran+bobot.pelanggaran;

  const handleHitung = useCallback(async()=>{
    setLoading(true); setError(null);
    const res = await getEvaluasiKelas(semester, bobot);
    if(res.error) setError(res.error); else setRows(res.rows);
    setLoading(false);
  },[semester, bobot]);

  const katCounts = useMemo(()=>{
    const m: Record<string,number> = {};
    for(const r of rows) m[r.kategori]=(m[r.kategori]??0)+1;
    return m;
  },[rows]);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <BarChart3 className="h-4 w-4" aria-hidden/> Admin - Evaluasi Kelas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Evaluasi Kinerja Kelas &mdash; Metode WP
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Me-ranking <strong>kelas</strong> berdasarkan performa agregat siswa menggunakan <strong>Weighted Product (WP)</strong>.
            Berbeda dari SAW, WP menggunakan perkalian berpangkat bobot sehingga perbedaan antar kriteria lebih terasa.
          </p>
        </header>

        {/* Filters */}
        <section className="mb-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semester</label>
              <select value={semester} onChange={e=>setSemester(Number(e.target.value) as 0|1|2)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value={0}>Semua Semester (gabungan)</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <BobotSlider label="C1 - Nilai Rata-rata" value={bobot.nilai} color="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950" onChange={v=>setBobot(b=>({...b,nilai:v}))}/>
            <BobotSlider label="C2 - Kehadiran" value={bobot.kehadiran} color="text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950" onChange={v=>setBobot(b=>({...b,kehadiran:v}))}/>
            <BobotSlider label="C3 - Pelanggaran" value={bobot.pelanggaran} color="text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950" onChange={v=>setBobot(b=>({...b,pelanggaran:v}))}/>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm font-medium ${totalBobot===100?"text-emerald-600":"text-rose-600"}`}>Total bobot: {totalBobot}% {totalBobot!==100&&"(disarankan 100%)"}</p>
            <button type="button" onClick={()=>void handleHitung()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-900/25 transition hover:bg-teal-500 disabled:opacity-50">
              <BarChart3 className="h-4 w-4"/>{loading?"Menghitung...":"Hitung Evaluasi"}
            </button>
          </div>
        </section>

        {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">{error}</div>}

        {rows.length>0 && (<>
          {/* Stats */}
          <section className="mb-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Total Kelas</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-white">{rows.length}</p>
            </div>
            {(["Sangat Baik","Baik","Perlu Perhatian"] as const).map(k=>(
              <div key={k} className={`rounded-xl border p-5 ${k==="Sangat Baik"?"border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/40":k==="Baik"?"border-sky-200/80 bg-sky-50/80 dark:border-sky-900/50 dark:bg-sky-950/40":"border-rose-200/80 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/40"}`}>
                <p className={`text-xs font-medium uppercase ${k==="Sangat Baik"?"text-emerald-700 dark:text-emerald-400":k==="Baik"?"text-sky-700 dark:text-sky-400":"text-rose-700 dark:text-rose-400"}`}>{k}</p>
                <p className={`mt-1 text-3xl font-black tabular-nums ${k==="Sangat Baik"?"text-emerald-900 dark:text-emerald-100":k==="Baik"?"text-sky-900 dark:text-sky-100":"text-rose-900 dark:text-rose-100"}`}>{katCounts[k]??0}</p>
              </div>
            ))}
          </section>

          {/* Charts */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Skor WP per Kelas</h2>
              <BarChart rows={rows}/>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Distribusi Kategori</h2>
              <PieChart rows={rows}/>
            </section>
          </div>

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Radar Perbandingan Top 5</h2>
            <RadarChart rows={rows}/>
          </section>

          {/* Table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tabel Ranking WP</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-3 py-3 text-center">Rank</th>
                    <th className="px-3 py-3">Kelas</th>
                    <th className="px-3 py-3 text-center">Tingkat</th>
                    <th className="px-3 py-3 text-center">Siswa</th>
                    <th className="px-3 py-3 text-right">Avg Nilai</th>
                    <th className="px-3 py-3 text-right">Avg Kehadiran</th>
                    <th className="px-3 py-3 text-right">Avg Pelanggaran</th>
                    <th className="px-3 py-3 text-right">Skor S</th>
                    <th className="px-3 py-3 text-right">Skor V</th>
                    <th className="px-3 py-3">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(r=>(
                    <tr key={r.kelasId} className={r.rank<=3?"bg-teal-50/60 dark:bg-teal-950/20":"hover:bg-slate-50/80 dark:hover:bg-slate-800/40"}>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">#{r.rank}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">{r.namaKelas}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.tingkat}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">{r.jumlahSiswa}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">{r.avgNilai.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">{r.avgKehadiran.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">{r.avgPelanggaran.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400">{r.skorS.toFixed(4)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{r.skorV.toFixed(4)}</td>
                      <td className="px-3 py-2.5"><span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase" style={{background:KAT_COLORS[r.kategori]+"22",color:KAT_COLORS[r.kategori]}}>{r.kategori}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Method */}
          <section className="mt-8">
            <button type="button" onClick={()=>setShowMethod(!showMethod)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <span>Langkah Perhitungan WP (Transparansi Metode)</span>
              {showMethod?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}
            </button>
            {showMethod && (
              <div className="mt-2 space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <div>
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">1. Kriteria &amp; Tipe</h3>
                  <p>C1: Rata-rata Nilai Kelas (Benefit, +w)</p>
                  <p>C2: Rata-rata Kehadiran Kelas (Benefit, +w)</p>
                  <p>C3: Rata-rata Pelanggaran Kelas (Cost, -w)</p>
                </div>
                <div>
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">2. Vektor S</h3>
                  <p><code className="rounded bg-slate-100 px-1 dark:bg-slate-800">S = C1^w1 x C2^w2 x C3^(-w3)</code></p>
                  <p className="mt-1 text-xs text-slate-500">Benefit: pangkat positif. Cost: pangkat negatif.</p>
                </div>
                <div>
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">3. Vektor V (Preferensi Relatif)</h3>
                  <p><code className="rounded bg-slate-100 px-1 dark:bg-slate-800">V = S_i / sum(S)</code></p>
                  <p className="mt-1">Ranking diurutkan dari V tertinggi.</p>
                </div>
              </div>
            )}
          </section>
        </>)}

        {!loading && rows.length===0 && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600"/>
            <p className="mt-4 text-lg font-semibold text-slate-500 dark:text-slate-400">Atur bobot lalu klik <span className="text-teal-600 dark:text-teal-400">Hitung Evaluasi</span></p>
          </div>
        )}
      </main>
    </div>
  );
}
