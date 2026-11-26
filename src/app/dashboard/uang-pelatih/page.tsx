"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { COACH_FEE, COACH_FEE_COLLECTION, COACH_FEE_START, COACH_PAYOUT_COLLECTION, feeDocId, isBillingMonth, PAYMENT_STATUS_ORDER, statusOf, summarizeFees, totalCollected, type CoachPayout, type FeeAthlete, type FeeRecord } from "@/lib/coach-fee";

type Athlete = FeeAthlete & { divisions: string[] };

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const fmtPayoutDate = (p: CoachPayout) => {
  const d = p.createdAt?.toDate?.();
  return d ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d) : "—";
};
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
  const { user, isAdmin, role, loading } = useAuth();
  const canViewCoachFee = isAdmin || role === "coach";
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [records, setRecords] = useState<Record<string, FeeRecord>>({});
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState(() => { const m = monthNow(); return isBillingMonth(m) ? m : "2026-10"; });
  const [city, setCity] = useState("all");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [payouts, setPayouts] = useState<(CoachPayout & { id: string })[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutCoach, setPayoutCoach] = useState("");
  const [payoutNote, setPayoutNote] = useState("");

  useEffect(() => onSnapshot(collection(db, "crown-athletes"), (s) => setAthletes(s.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return { id: d.id, name: String(x.name ?? ""), city: String(x.city || "Bandung"), role: String(x.role || "athlete"), coachFeeExempt: !!x.coachFeeExempt, vakum: !!x.vakum, divisions: Array.isArray(x.divisions) ? (x.divisions as string[]) : [] };
  }))), []);
  // Langganan seluruh bulan sekaligus: tabel per bulan + total sejak Okt 2026
  // dihitung dari data yang sama.
  useEffect(() => {
    setRecords({}); setReady(false); setLoadError(false);
    return onSnapshot(collection(db, COACH_FEE_COLLECTION),
      (s) => { setRecords(Object.fromEntries(s.docs.map((d) => [d.id, d.data() as FeeRecord]))); setReady(true); },
      (e) => { console.error(e); setLoadError(true); });
  }, []);
  useEffect(() => {
    return onSnapshot(query(collection(db, COACH_PAYOUT_COLLECTION), orderBy("createdAt", "desc")),
      (s) => setPayouts(s.docs.map((d) => ({ id: d.id, ...(d.data() as CoachPayout) }))),
      (e) => console.error(e));
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) setConfirmOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, busy]);

  const members = useMemo(() => athletes.filter((a) => a.role !== "coach").sort((a, b) => a.name.localeCompare(b.name)), [athletes]);
  const cities = useMemo(() => [...new Set(members.map((a) => a.city))].sort(), [members]);
  // Atlet bebas permanen (BEBAS) tidak muncul di list sama sekali.
  // Hitungan per status (mengikuti filter kota, sebelum filter status) untuk chip.
  const statusCounts = useMemo(() => {
    const c = { BELUM_BAYAR: 0, LUNAS: 0, GRATIS: 0 };
    for (const a of members) {
      if (city !== "all" && a.city !== city) continue;
      const st = statusOf(a, records, month);
      if (st !== "BEBAS") c[st]++;
    }
    return c;
  }, [members, city, records, month]);
  // Belum bayar selalu di atas supaya tidak tercampur dengan yang sudah lunas.
  const rows = useMemo(() => members
    .filter((a) => city === "all" || a.city === city)
    .filter((a) => statusOf(a, records, month) !== "BEBAS")
    .filter((a) => filter === "all" || statusOf(a, records, month) === filter)
    .sort((a, b) => {
      const sa = statusOf(a, records, month);
      const sb = statusOf(b, records, month);
      const ra = sa === "BEBAS" ? 99 : PAYMENT_STATUS_ORDER[sa];
      const rb = sb === "BEBAS" ? 99 : PAYMENT_STATUS_ORDER[sb];
      return ra - rb || a.name.localeCompare(b.name);
    }), [members, city, filter, records, month]);
  const summary = summarizeFees(members.filter((a) => city === "all" || a.city === city), records, month);
  // Saldo gaji pelatih: total masuk sejak Okt 2026 (semua kota) dikurangi yang sudah diambil.
  const collectedSinceOct = totalCollected(members, records, COACH_FEE_START, monthNow());
  const totalPayout = payouts.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  const remaining = collectedSinceOct - totalPayout;
  const coachNames = useMemo(() => athletes.filter((a) => a.role === "coach").map((a) => a.name).sort(), [athletes]);
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

  async function recordPayout() {
    const amount = Math.round(Number(payoutAmount));
    if (!isAdmin || busy || !payoutCoach.trim() || !(amount > 0)) return;
    setBusy(true);
    try {
      await addDoc(collection(db, COACH_PAYOUT_COLLECTION), {
        amount, coachName: payoutCoach.trim(), note: payoutNote.trim() || null,
        createdAt: serverTimestamp(), createdByName: user?.displayName || user?.email || "Admin",
      });
      setPayoutAmount(""); setPayoutNote("");
      setToast({ ok: true, message: `Pengambilan ${payoutCoach.trim()} ${rupiah(amount)} tercatat — sisa ${rupiah(remaining - amount)}` });
    } catch (error) {
      console.error(error);
      setToast({ ok: false, message: "Gagal mencatat pengambilan. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

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

  // Uang pelatih hanya untuk coach + admin. Atlet/viewer yang buka URL langsung
  // dapat pesan ini, bukan daftarnya.
  if (!loading && !canViewCoachFee) {
    return <main className="min-h-screen bg-[#050505] p-4 pb-28 text-white md:p-8 md:pb-28"><div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Uang Pelatih</h1>
        <p className="mt-2 text-sm text-slate-400">Halaman ini hanya bisa dilihat coach dan admin.</p>
      </header>
    </div></main>;
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
    </div>

    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status">
      {(["all", "BELUM_BAYAR", "LUNAS", "GRATIS"] as const).map((k) => {
        const active = filter === k;
        const count = k === "all" ? statusCounts.BELUM_BAYAR + statusCounts.LUNAS + statusCounts.GRATIS : statusCounts[k];
        const label = k === "all" ? "Semua" : LABEL[k];
        return <button key={k} onClick={() => setFilter(k)} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"}`}>{label} · {count}</button>;
      })}
    </div>

    {loadError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">Gagal memuat pembayaran uang pelatih. Muat ulang halaman; tombol bayar dikunci sampai data masuk.</p>}
    {!ready && !loadError && <p className="text-xs text-slate-500">Memuat pembayaran…</p>}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Terkumpul" value={rupiah(summary.collected)} tone="text-emerald-300" />
      <Stat label="Belum masuk" value={rupiah(summary.outstanding)} tone="text-rose-300" />
      <Stat label="Sudah / belum bayar" value={`${summary.lunas} / ${summary.belum}`} />
      <Stat label="Gratis / bebas" value={`${summary.gratis} / ${summary.bebas}`} />
    </div>

    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold">Saldo Gaji Pelatih</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Terkumpul sejak Okt 2026" value={rupiah(collectedSinceOct)} tone="text-emerald-300" />
        <Stat label="Sudah diambil pelatih" value={rupiah(totalPayout)} tone="text-amber-300" />
        <Stat label="Sisa" value={rupiah(remaining)} tone={remaining < 0 ? "text-rose-300" : "text-emerald-300"} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Saldo dihitung dari semua kota, dari Oktober 2026 sampai bulan ini. Pengambilan gaji mengurangi sisa langsung saat dicatat.</p>
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

    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="text-sm font-semibold">Pengambilan Gaji Pelatih</h2>
      <p className="mt-1 text-xs text-slate-500">Dicatat admin saat pelatih mengambil gaji dari kas yang terkumpul. Sisa di atas langsung berkurang.</p>
      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">Jumlah (Rp)
            <input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="2000000" className="w-40 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">Pelatih
            <input value={payoutCoach} onChange={(e) => setPayoutCoach(e.target.value)} list="coach-names" placeholder="Nama pelatih" className="w-44 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
            <datalist id="coach-names">{coachNames.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">Catatan (opsional)
            <input value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} placeholder="cth: gaji November" className="w-44 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white" />
          </label>
          <button disabled={busy || !payoutCoach.trim() || !(Number(payoutAmount) > 0)} onClick={recordPayout} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold hover:bg-amber-500 disabled:opacity-50">{busy ? "Menyimpan..." : "Catat pengambilan"}</button>
        </div>
      )}
      <ul className="mt-3 divide-y divide-white/5 text-sm">
        {payouts.length === 0 && <li className="py-2 text-slate-500">Belum ada pengambilan gaji.</li>}
        {payouts.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2">
          <span><span className="font-medium">{p.coachName}</span> <span className="text-slate-500">· {fmtPayoutDate(p)}{p.note ? ` · ${p.note}` : ""}</span></span>
          <span className="font-semibold text-amber-300">−{rupiah(p.amount)}</span>
        </li>)}
      </ul>
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
