"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type Schedule = { id: string; date: string; city?: string; status?: string; timeStart?: string; timeEnd?: string };
type Cost = { rate: number; paid: boolean };
const DEFAULT_RATE = { Bandung: 70000, Jakarta: 50000 } as const;
const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function GorPage() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [costs, setCosts] = useState<Record<string, Cost>>({});
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => onSnapshot(collection(db, "crown-schedules"), (s) => setSchedules(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Schedule, "id">) })))), []);
  useEffect(() => onSnapshot(collection(db, "crown-gor-costs"), (s) => setCosts(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as Cost])))), []);

  const sessions = useMemo(() => schedules.filter((s) => s.status === "latihan" || s.status === "tambahan").filter((s) => s.date?.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)), [schedules, month]);
  const total = sessions.reduce((sum, s) => sum + (costs[s.id]?.rate ?? (s.city === "Jakarta" ? DEFAULT_RATE.Jakarta : DEFAULT_RATE.Bandung)), 0);
  const paid = sessions.filter((s) => costs[s.id]?.paid).reduce((sum, s) => sum + (costs[s.id]?.rate ?? 0), 0);

  async function save(id: string, patch: Partial<Cost>, schedule: Schedule) {
    if (!isAdmin) return;
    const current = costs[id] ?? { rate: schedule.city === "Bandung" ? 70000 : 50000, paid: false };
    await setDoc(doc(db, "crown-gor-costs", id), { ...current, ...patch, date: schedule.date, city: schedule.city || "Bandung" }, { merge: true });
  }

  return <main className="min-h-screen bg-[#050505] p-4 text-white md:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <header><h1 className="text-2xl font-bold">Biaya Gor</h1><p className="text-sm text-slate-400">Mengikuti jadwal latihan. Atur tarif Jakarta dan status pembayaran.</p></header>
    <div className="flex flex-wrap items-center gap-3"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm" /><div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">Total: <b>{rupiah(total)}</b></div><div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm">Sudah bayar: <b>{rupiah(paid)}</b></div><div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">Belum: <b>{rupiah(total - paid)}</b></div></div>
    <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-slate-400"><tr><th className="p-3">Tanggal</th><th className="p-3">Kota</th><th className="p-3">Jam</th><th className="p-3">Tarif</th><th className="p-3">Status</th></tr></thead><tbody>{sessions.map((s) => { const c = costs[s.id] ?? { rate: s.city === "Jakarta" ? 50000 : 70000, paid: false }; return <tr key={s.id} className="border-t border-white/5"><td className="p-3">{s.date}</td><td className="p-3">{s.city || "Bandung"}</td><td className="p-3">{s.timeStart || "-"}–{s.timeEnd || "-"}</td><td className="p-3">{isAdmin && s.city === "Jakarta" ? <select value={c.rate} onChange={(e) => save(s.id, { rate: Number(e.target.value) }, s)} className="rounded border border-white/10 bg-black px-2 py-1"><option value="35000">Rp 35.000/jam</option><option value="50000">Rp 50.000/jam</option></select> : rupiah(c.rate)}</td><td className="p-3">{isAdmin ? <button onClick={() => save(s.id, { paid: !c.paid }, s)} className={`rounded-full px-3 py-1 text-xs ${c.paid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{c.paid ? "Sudah bayar" : "Belum bayar"}</button> : <span className={c.paid ? "text-emerald-300" : "text-rose-300"}>{c.paid ? "Sudah bayar" : "Belum bayar"}</span>}</td></tr> })}</tbody></table>{!sessions.length && <p className="p-8 text-center text-slate-500">Tidak ada jadwal latihan bulan ini.</p>}</div>
  </div></main>;
}

export const dynamic = "force-dynamic";
