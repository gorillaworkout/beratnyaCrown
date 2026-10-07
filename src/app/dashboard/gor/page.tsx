"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { cityOf, DAY_NAMES, dayNameOf, filterGorSessions, gorRateOf, summarizeGor, type GorCost, type GorSession } from "@/lib/gor";

type Schedule = GorSession & { status?: string };

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const TRAINING_DAYS = ["Rabu", "Sabtu", "Minggu"];
const selectClass = "rounded-lg border border-white/10 bg-black px-3 py-2 text-sm";

export default function GorPage() {
  const { user, isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [costs, setCosts] = useState<Record<string, GorCost>>({});
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [city, setCity] = useState("all");
  const [day, setDay] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => onSnapshot(collection(db, "crown-schedules"), (s) => setSchedules(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Schedule, "id">) })))), []);
  useEffect(() => onSnapshot(collection(db, "crown-gor-costs"), (s) => setCosts(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as GorCost])))), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const monthSessions = useMemo(() => schedules
    .filter((s) => (s.status === "latihan" || s.status === "tambahan") && s.date?.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date) || cityOf(a).localeCompare(cityOf(b))), [schedules, month]);
  const cities = useMemo(() => [...new Set(monthSessions.map(cityOf))].sort(), [monthSessions]);
  const days = useMemo(() => {
    const present = new Set(monthSessions.map((s) => dayNameOf(s.date)));
    return DAY_NAMES.filter((d) => present.has(d) || TRAINING_DAYS.includes(d));
  }, [monthSessions]);
  const sessions = useMemo(() => filterGorSessions(monthSessions, { city, day }), [monthSessions, city, day]);
  const summary = summarizeGor(sessions, costs);
  const unpaidVisible = sessions.filter((s) => !costs[s.id]?.paid);
  const selectedSessions = sessions.filter((s) => selected.has(s.id));
  const selectedTotal = selectedSessions.reduce((sum, s) => sum + gorRateOf(s, costs[s.id]), 0);
  const allUnpaidSelected = unpaidVisible.length > 0 && unpaidVisible.every((s) => selected.has(s.id));

  // Pilihan yang tidak terlihat (ganti filter/bulan) atau sudah lunas dibuang
  // agar tombol bayar tidak pernah melunasi baris yang tidak sedang dilihat.
  useEffect(() => {
    setSelected((prev) => {
      const visibleUnpaid = new Set(unpaidVisible.map((s) => s.id));
      const next = new Set([...prev].filter((id) => visibleUnpaid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [unpaidVisible]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function costPayload(s: Schedule, patch: Partial<GorCost>) {
    const current = costs[s.id] ?? { rate: gorRateOf(s), paid: false };
    const paid = patch.paid ?? current.paid;
    return {
      ...current,
      ...patch,
      date: s.date,
      city: cityOf(s),
      paidAt: paid ? serverTimestamp() : null,
      paidByName: paid ? user?.displayName || user?.email || "Admin" : null,
    };
  }

  async function save(s: Schedule, patch: Partial<GorCost>) {
    if (!isAdmin) return;
    try {
      const payload = patch.paid === undefined
        ? { ...(costs[s.id] ?? { rate: gorRateOf(s), paid: false }), ...patch, date: s.date, city: cityOf(s) }
        : costPayload(s, patch);
      await setDoc(doc(db, "crown-gor-costs", s.id), payload, { merge: true });
    } catch (error) {
      console.error(error);
      setToast({ ok: false, message: "Gagal menyimpan. Periksa koneksi lalu coba lagi." });
    }
  }

  async function paySelected() {
    if (!isAdmin || busy || selectedSessions.length === 0) return;
    setBusy(true);
    try {
      // Satu batch = semua tersimpan atau tidak sama sekali (tidak setengah lunas).
      const batch = writeBatch(db);
      for (const s of selectedSessions) batch.set(doc(db, "crown-gor-costs", s.id), costPayload(s, { paid: true }), { merge: true });
      await batch.commit();
      setToast({ ok: true, message: `${selectedSessions.length} sesi dilunasi — ${rupiah(selectedTotal)}` });
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (error) {
      console.error(error);
      setToast({ ok: false, message: "Gagal melunasi. Tidak ada data yang berubah, coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-[#050505] p-4 pb-28 text-white md:p-8 md:pb-28"><div className="mx-auto max-w-5xl space-y-5">
    <header><h1 className="text-2xl font-bold">Biaya Gor</h1><p className="text-sm text-slate-400">Mengikuti jadwal latihan. Centang beberapa sesi untuk melunasi sekaligus, atau klik status untuk satu sesi.</p></header>

    <div className="flex flex-wrap items-center gap-2">
      <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setCity("all"); setDay("all"); }} className={selectClass} aria-label="Bulan" />
      <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass} aria-label="Kota">
        <option value="all">Semua kota</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={day} onChange={(e) => setDay(e.target.value)} className={selectClass} aria-label="Hari">
        <option value="all">Semua hari</option>{days.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total" value={rupiah(summary.total)} />
      <Stat label="Sudah bayar" value={rupiah(summary.paid)} tone="text-emerald-300" />
      <Stat label="Belum bayar" value={rupiah(summary.unpaid)} tone="text-rose-300" />
      <Stat label="Sesi belum bayar" value={`${summary.unpaidCount} dari ${sessions.length}`} />
    </div>

    <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm">
      <thead className="bg-white/5 text-slate-400"><tr>
        {isAdmin && <th className="w-10 p-3"><input type="checkbox" aria-label="Pilih semua yang belum bayar" checked={allUnpaidSelected} disabled={!unpaidVisible.length} onChange={() => setSelected(allUnpaidSelected ? new Set() : new Set(unpaidVisible.map((s) => s.id)))} className="h-4 w-4 accent-cyan-500" /></th>}
        <th className="p-3">Hari</th><th className="p-3">Tanggal</th><th className="p-3">Kota</th><th className="p-3">Jam</th><th className="p-3">Total</th><th className="p-3">Status</th>
      </tr></thead>
      <tbody>{sessions.map((s) => {
        const c = costs[s.id] ?? { rate: gorRateOf(s), paid: false };
        const rate = gorRateOf(s, costs[s.id]);
        return <tr key={s.id} onClick={() => isAdmin && !c.paid && toggle(s.id)} className={`border-t border-white/5 ${selected.has(s.id) ? "bg-cyan-500/10" : ""} ${isAdmin && !c.paid ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}>
          {isAdmin && <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Pilih ${s.date}`} checked={selected.has(s.id)} disabled={c.paid} onChange={() => toggle(s.id)} className="h-4 w-4 accent-cyan-500 disabled:opacity-30" /></td>}
          <td className="p-3 font-medium">{dayNameOf(s.date)}</td>
          <td className="p-3 text-slate-300">{s.date}</td>
          <td className="p-3">{cityOf(s)}</td>
          <td className="p-3 text-slate-300">{s.timeStart || "-"}–{s.timeEnd || "-"}</td>
          <td className="p-3" onClick={(e) => e.stopPropagation()}>{isAdmin && !c.paid
            ? <TotalInput key={`${s.id}-${rate}`} value={rate} label={`Total ${s.date}`} onSave={(next) => save(s, { rate: next })} />
            : rupiah(rate)}</td>
          <td className="p-3" onClick={(e) => e.stopPropagation()}>{isAdmin
            ? <button onClick={() => save(s, { paid: !c.paid })} className={`rounded-full px-3 py-1 text-xs ${c.paid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{c.paid ? "Sudah bayar" : "Belum bayar"}</button>
            : <span className={c.paid ? "text-emerald-300" : "text-rose-300"}>{c.paid ? "Sudah bayar" : "Belum bayar"}</span>}</td>
        </tr>;
      })}</tbody></table>
      {!sessions.length && <p className="p-8 text-center text-slate-500">Tidak ada sesi untuk filter ini.</p>}
    </div>
  </div>

    {isAdmin && selectedSessions.length > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/95 p-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm"><b>{selectedSessions.length} sesi</b> dipilih · <b className="text-cyan-300">{rupiah(selectedTotal)}</b></p>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Batal pilih</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Lunasi terpilih</button>
          </div>
        </div>
      </div>
    )}

    {confirmOpen && selectedSessions.length > 0 && (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => !busy && setConfirmOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold">Lunasi {selectedSessions.length} sesi?</h2>
          <p className="mt-1 text-sm text-slate-400">Semua sesi di bawah akan ditandai sudah bayar.</p>
          <ul className="mt-4 max-h-60 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] text-sm">
            {selectedSessions.map((s) => <li key={s.id} className="flex justify-between gap-3 px-4 py-2"><span>{dayNameOf(s.date)}, {s.date} · {cityOf(s)}</span><span className="text-slate-300">{rupiah(gorRateOf(s, costs[s.id]))}</span></li>)}
          </ul>
          <div className="mt-3 flex justify-between px-1 text-sm"><span className="text-slate-400">Total</span><b className="text-cyan-300">{rupiah(selectedTotal)}</b></div>
          <div className="mt-5 flex justify-end gap-2">
            <button disabled={busy} onClick={() => setConfirmOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Kembali</button>
            <button disabled={busy} onClick={paySelected} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60">{busy ? "Menyimpan..." : "Ya, Lunasi"}</button>
          </div>
        </div>
      </div>
    )}

    {toast && <div role="status" className={`fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl ${toast.ok ? "border-emerald-500/30 bg-emerald-950/95 text-emerald-200" : "border-rose-500/30 bg-rose-950/95 text-rose-200"}`}>{toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{toast.message}</div>}
  </main>;
}

const MAX_TOTAL = 10_000_000;

// Total per sesi bisa diketik (durasi latihan beda-beda). Simpan saat Enter/keluar
// kolom; Esc atau input tidak valid mengembalikan nilai lama.
function TotalInput({ value, label, onSave }: { value: number; label: string; onSave: (next: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const next = Number(draft.replace(/\D/g, ""));
    if (!draft.trim() || !Number.isSafeInteger(next) || next > MAX_TOTAL) return setDraft(String(value));
    if (next !== value) onSave(next);
  };
  return (
    <div className="flex items-center gap-1 rounded border border-white/15 bg-black px-2 focus-within:border-cyan-500">
      <span className="text-xs text-slate-500">Rp</span>
      <input
        aria-label={label}
        inputMode="numeric"
        value={Number(draft || 0).toLocaleString("id-ID")}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setDraft(String(value)); requestAnimationFrame(() => (e.target as HTMLInputElement).blur()); }
        }}
        className="w-24 bg-transparent py-1 text-sm outline-none"
      />
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-xs text-slate-400">{label}</p><p className={`mt-0.5 font-semibold ${tone}`}>{value}</p></div>;
}

export const dynamic = "force-dynamic";
