"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { COACH_FEE, COACH_FEE_COLLECTION, feeDocId, isBillingMonth, statusOf, summarizeFees, type FeeAthlete, type FeeRecord } from "@/lib/coach-fee";

type Athlete = FeeAthlete & { divisions: string[] };

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const selectClass = "rounded-lg border border-white/10 bg-black px-3 py-2 text-sm";
const ym = (y: number, m0: number) => `${y + Math.floor(m0 / 12)}-${String((m0 % 12) + 1).padStart(2, "0")}`;
const monthNow = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
// Opsi bulan: Oktober 2026 sampai 3 bulan ke depan dari sekarang (min. 12 bulan).
function monthOptions() {
  const [ny, nm] = monthNow().split("-").map(Number);
  const end = Math.max(ny * 12 + (nm - 1) + 3, 2026 * 12 + 9 + 11);
  return Array.from({ length: end - (2026 * 12 + 9) + 1 }, (_, i) => ym(2026, 9 + i));
}
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const BADGE = {
  LUNAS: "bg-emerald-500/20 text-emerald-300", BELUM_BAYAR: "bg-rose-500/20 text-rose-300",
  GRATIS: "bg-cyan-500/20 text-cyan-300", BEBAS: "bg-slate-500/20 text-slate-300",
} as const;
const LABEL = { LUNAS: "Lunas", BELUM_BAYAR: "Belum bayar", GRATIS: "Gratis bulan ini", BEBAS: "Bebas (permanen)" } as const;

export default function UangPelatihPage() {
  const { user, isAdmin } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [records, setRecords] = useState<Record<string, FeeRecord>>({});
  const [loadedMonth, setLoadedMonth] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState(() => { const m = monthNow(); return isBillingMonth(m) ? m : "2026-10"; });
  const [city, setCity] = useState("all");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => onSnapshot(collection(db, "crown-athletes"), (s) => setAthletes(s.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return { id: d.id, name: String(x.name ?? ""), city: String(x.city || "Bandung"), role: String(x.role || "athlete"), coachFeeExempt: !!x.coachFeeExempt, divisions: Array.isArray(x.divisions) ? (x.divisions as string[]) : [] };
  }))), []);
  useEffect(() => {
    setRecords({}); setLoadedMonth(""); setLoadError(false);
    return onSnapshot(query(collection(db, COACH_FEE_COLLECTION), where("month", "==", month)),
      (s) => { setRecords(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as FeeRecord]))); setLoadedMonth(month); },
      (e) => { console.error(e); setLoadError(true); });
  }, [month]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setConfirmOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, busy]);

  const members = useMemo(() => athletes.filter((a) => a.role !== "coach").sort((a, b) => a.name.localeCompare(b.name)), [athletes]);
  const cities = useMemo(() => [...new Set(members.map((a) => a.city))].sort(), [members]);
  const ready = loadedMonth === month;
  const rows = useMemo(() => members
    .filter((a) => city === "all" || a.city === city)
    .filter((a) => filter === "all" || statusOf(a, records, month) === filter), [members, city, filter, records, month]);
  const summary = summarizeFees(members.filter((a) => city === "all" || a.city === city), records, month);
  // Selama data bulan ini belum termuat semua atlet tampak "belum bayar" — jangan bisa dipilih/ditimpa.
  const unpaidVisible = ready ? rows.filter((a) => statusOf(a, records, month) === "BELUM_BAYAR") : [];
  const selectedRows = rows.filter((a) => selected.has(a.id));
  const allSelected = unpaidVisible.length > 0 && unpaidVisible.every((a) => selected.has(a.id));

  // Pilihan yang tak terlihat lagi (filter/bulan berubah, atau sudah lunas) dibuang.
  useEffect(() => {
    setSelected((prev) => {
      const ok = new Set(unpaidVisible.map((a) => a.id));
      const next = new Set([...prev].filter((id) => ok.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [unpaidVisible]);

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function apply(targets: Athlete[], status: "LUNAS" | "GRATIS" | "BELUM_BAYAR", okMessage: string) {
    if (!isAdmin || busy || !ready || targets.length === 0 || !isBillingMonth(month)) return;
    setBusy(true);
    try {
      // Satu batch: semua tersimpan atau tidak sama sekali.
      const batch = writeBatch(db);
      for (const a of targets) {
        batch.set(doc(db, COACH_FEE_COLLECTION, feeDocId(a.id, month)), {
          athleteId: a.id, athleteName: a.name, month, status,
          amount: status === "LUNAS" ? COACH_FEE : 0,
          updatedAt: serverTimestamp(), updatedByName: user?.displayName || user?.email || "Admin",
        }, { merge: true });
      }
      await batch.commit();
      setToast({ ok: true, message: okMessage });
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (error) {
      console.error(error);
      setToast({ ok: false, message: "Gagal menyimpan. Tidak ada data yang berubah, coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-[#050505] p-4 pb-28 text-white md:p-8 md:pb-28"><div className="mx-auto max-w-5xl space-y-5">
    <header>
      <h1 className="text-2xl font-bold">Uang Pelatih</h1>
      <p className="text-sm text-slate-400">{rupiah(COACH_FEE)} per atlet per bulan, mulai Oktober 2026. Atlet yang bebas diatur permanen di menu Data Atlet (tombol “Iuran”).</p>
    </header>

    <div className="flex flex-wrap items-center gap-2">
      <select value={month} onChange={(e) => { setMonth(e.target.value); setSelected(new Set()); }} className={selectClass} aria-label="Bulan">
        {monthOptions().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
      </select>
      <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass} aria-label="Kota">
        <option value="all">Semua kota</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className={selectClass} aria-label="Status">
        <option value="all">Semua status</option>
        {(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}
      </select>
    </div>

    {loadError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Gagal memuat pembayaran bulan ini. Muat ulang halaman; tombol bayar dikunci sampai data masuk.</p>}
    {!ready && !loadError && <p className="text-xs text-slate-500">Memuat pembayaran…</p>}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Terkumpul" value={rupiah(summary.collected)} tone="text-emerald-300" />
      <Stat label="Belum masuk" value={rupiah(summary.outstanding)} tone="text-rose-300" />
      <Stat label="Sudah / belum bayar" value={`${summary.lunas} / ${summary.belum}`} />
      <Stat label="Gratis / bebas" value={`${summary.gratis} / ${summary.bebas}`} />
    </div>

    <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm">
      <thead className="bg-white/5 text-slate-400"><tr>
        {isAdmin && <th className="w-10 p-3"><input type="checkbox" aria-label="Pilih semua yang belum bayar" checked={allSelected} disabled={!unpaidVisible.length} onChange={() => setSelected(allSelected ? new Set() : new Set(unpaidVisible.map((a) => a.id)))} className="h-4 w-4 accent-cyan-500" /></th>}
        <th className="p-3">Nama</th><th className="p-3">Kota</th><th className="p-3">Tagihan</th><th className="p-3">Status</th>{isAdmin && <th className="p-3 text-right">Aksi</th>}
      </tr></thead>
      <tbody>{rows.map((a) => {
        const st = statusOf(a, records, month);
        const unpaid = ready && st === "BELUM_BAYAR";
        return <tr key={a.id} onClick={() => isAdmin && unpaid && toggle(a.id)} className={`border-t border-white/5 ${selected.has(a.id) ? "bg-cyan-500/10" : ""} ${isAdmin && unpaid ? "cursor-pointer hover:bg-white/[0.03]" : ""}`}>
          {isAdmin && <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Pilih ${a.name}`} checked={selected.has(a.id)} disabled={!unpaid} onChange={() => toggle(a.id)} className="h-4 w-4 accent-cyan-500 disabled:opacity-30" /></td>}
          <td className="p-3 font-medium">{a.name}</td>
          <td className="p-3 text-slate-300">{a.city}</td>
          <td className="p-3">{st === "BEBAS" || st === "GRATIS" ? <span className="text-slate-500">—</span> : rupiah(COACH_FEE)}</td>
          <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs ${BADGE[st]}`}>{LABEL[st]}</span></td>
          {isAdmin && <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
            {ready && st === "BELUM_BAYAR" && <button disabled={busy} onClick={() => apply([a], "GRATIS", `${a.name}: digratiskan bulan ini`)} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">Gratiskan</button>}
            {ready && (st === "LUNAS" || st === "GRATIS") && <button disabled={busy} onClick={() => apply([a], "BELUM_BAYAR", `${a.name}: dikembalikan ke belum bayar`)} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50">Batalkan</button>}
          </td>}
        </tr>;
      })}</tbody></table>
      {!rows.length && <p className="p-8 text-center text-slate-500">Tidak ada atlet untuk filter ini.</p>}
    </div>
  </div>

    {isAdmin && selectedRows.length > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/95 p-4 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm"><b>{selectedRows.length} atlet</b> dipilih · <b className="text-cyan-300">{rupiah(selectedRows.length * COACH_FEE)}</b></p>
          <div className="flex gap-2">
            <button onClick={() => setSelected(new Set())} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Batal pilih</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">Lunasi terpilih</button>
          </div>
        </div>
      </div>
    )}

    {confirmOpen && selectedRows.length > 0 && (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => !busy && setConfirmOpen(false)}>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-semibold">Lunasi uang pelatih {monthLabel(month)}?</h2>
          <p className="mt-1 text-sm text-slate-400">{selectedRows.length} atlet akan ditandai lunas.</p>
          <ul className="mt-4 max-h-60 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] text-sm">
            {selectedRows.map((a) => <li key={a.id} className="flex justify-between gap-3 px-4 py-2"><span>{a.name} · {a.city}</span><span className="text-slate-300">{rupiah(COACH_FEE)}</span></li>)}
          </ul>
          <div className="mt-3 flex justify-between px-1 text-sm"><span className="text-slate-400">Total</span><b className="text-cyan-300">{rupiah(selectedRows.length * COACH_FEE)}</b></div>
          <div className="mt-5 flex justify-end gap-2">
            <button disabled={busy} onClick={() => setConfirmOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Kembali</button>
            <button disabled={busy} onClick={() => apply(selectedRows, "LUNAS", `${selectedRows.length} atlet dilunasi — ${rupiah(selectedRows.length * COACH_FEE)}`)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60">{busy ? "Menyimpan..." : "Ya, Lunasi"}</button>
          </div>
        </div>
      </div>
    )}

    {toast && <div role="status" className={`fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl md:left-[calc(50%+8rem)] ${toast.ok ? "border-emerald-500/30 bg-emerald-950/95 text-emerald-200" : "border-rose-500/30 bg-rose-950/95 text-rose-200"}`}>{toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{toast.message}</div>}
  </main>;
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-xs text-slate-400">{label}</p><p className={`mt-0.5 font-semibold ${tone}`}>{value}</p></div>;
}

export const dynamic = "force-dynamic";
