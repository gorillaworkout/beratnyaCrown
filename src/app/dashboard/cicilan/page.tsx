"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Search, Wallet, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  calculateInstallmentProgress,
  validateInstallmentPaymentInput,
  type InstallmentPayment,
  type InstallmentPlan,
  type InstallmentProgress,
} from "@/lib/installments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Athlete = { id: string; name: string; email?: string; role?: string };
type PaymentForm = { athleteId: string; athleteName: string; amount: string; date: string; note: string };

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const today = () => new Date().toLocaleDateString("sv-SE");
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const shortMonth = (month: string) => MONTH_SHORT[Number(month.slice(5)) - 1] ?? month;
const timestampMs = (value: unknown) => {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
};
const emptyForm = (athlete?: Athlete): PaymentForm => ({
  athleteId: athlete?.id ?? "",
  athleteName: athlete?.name ?? "",
  amount: "",
  date: today(),
  note: "",
});

export default function CicilanPage() {
  const { user, isAdmin } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<InstallmentPayment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const stopAthletes = onSnapshot(collection(db, "crown-athletes"), (snapshot) => {
      setAthletes(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            name: String(item.data().name || "Tanpa Nama"),
            email: String(item.data().email || ""),
            role: String(item.data().role || "athlete"),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    const stopPlans = onSnapshot(collection(db, "crown-installment-plans"), (snapshot) => {
      setPlans(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as InstallmentPlan));
    });
    const stopPayments = onSnapshot(collection(db, "crown-installment-payments"), (snapshot) => {
      setPayments(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as InstallmentPayment)
          .sort((a, b) => b.date.localeCompare(a.date) || timestampMs(b.createdAt) - timestampMs(a.createdAt)),
      );
    });
    return () => {
      stopAthletes();
      stopPlans();
      stopPayments();
    };
  }, []);

  const members = useMemo(
    () => athletes.filter((athlete) => athlete.role !== "coach"),
    [athletes],
  );

  const plan = useMemo(
    () =>
      plans.find((item) => item.id === selectedPlanId)
      ?? plans.find((item) => item.isActive)
      ?? plans[0]
      ?? null,
    [plans, selectedPlanId],
  );

  // Atlet milik user yang login — non-admin hanya melihat progresnya sendiri.
  // Cocokkan uid ke id doc atlet, atau email (case-insensitive).
  const selfAthlete = useMemo(() => {
    if (!user) return null;
    return members.find((athlete) =>
      (user.uid && athlete.id === user.uid)
      || (user.email && athlete.email && athlete.email.toLowerCase() === user.email.toLowerCase()),
    ) ?? null;
  }, [members, user]);
  const selfIsCoach = selfAthlete?.role === "coach";

  const progressByAthlete = useMemo(() => {
    const map = new Map<string, InstallmentProgress>();
    if (!plan) return map;
    for (const athlete of members) {
      map.set(
        athlete.id,
        calculateInstallmentProgress(
          plan,
          payments.filter((payment) => payment.planId === plan.id && payment.athleteId === athlete.id),
        ),
      );
    }
    return map;
  }, [members, plan, payments]);

  const rows = useMemo(() => {
    const list = members.map((athlete) => ({
      athlete,
      progress: progressByAthlete.get(athlete.id) ?? { paid: 0, remaining: plan?.totalTarget ?? 0, pct: 0, terms: [] },
      paymentCount: payments.filter((payment) => payment.planId === plan?.id && payment.athleteId === athlete.id && !payment.cancelledAt).length,
    }));
    return list
      .filter(({ athlete }) => athlete.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.progress.remaining - a.progress.remaining || a.athlete.name.localeCompare(b.athlete.name));
  }, [members, progressByAthlete, payments, plan, search]);

  const selected = rows.find(({ athlete }) => athlete.id === selectedAthleteId) ?? null;

  const totals = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    let lunas = 0;
    for (const { progress } of rows) {
      collected += progress.paid;
      outstanding += progress.remaining;
      if (progress.pct === 100) lunas += 1;
    }
    return { collected, outstanding, lunas, total: rows.length };
  }, [rows]);

  const termCollected = useMemo(() => {
    if (!plan) return [] as number[];
    const sums = plan.terms.map(() => 0);
    for (const { progress } of rows) {
      progress.terms.forEach((term, i) => { sums[i] += term.paid; });
    }
    return sums;
  }, [plan, rows]);

  // Atlet yang ditampilkan di panel detail: admin memilih dari daftar,
  // non-admin selalu dirinya sendiri.
  const detailAthlete = isAdmin ? selected?.athlete ?? null : selfIsCoach ? null : selfAthlete;
  const detailProgress = detailAthlete ? progressByAthlete.get(detailAthlete.id) : undefined;
  const detailPayments = useMemo(() => {
    if (!detailAthlete || !plan) return [];
    return payments
      .filter((payment) => payment.planId === plan.id && payment.athleteId === detailAthlete.id)
      .sort((a, b) => b.date.localeCompare(a.date) || timestampMs(b.createdAt) - timestampMs(a.createdAt));
  }, [detailAthlete, plan, payments]);

  function openCreate(athlete?: Athlete) {
    setForm(emptyForm(athlete));
    setError("");
    setFormOpen(true);
  }

  function chooseAthlete(id: string) {
    const athlete = members.find((item) => item.id === id);
    setForm((current) => ({ ...current, athleteId: id, athleteName: athlete?.name ?? "" }));
  }

  async function savePayment(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !plan?.id) return;
    setSaving(true);
    setError("");
    try {
      const validated = validateInstallmentPaymentInput({
        planId: plan.id,
        athleteId: form.athleteId,
        athleteName: form.athleteName,
        amount: Number(form.amount),
        date: form.date,
        note: form.note,
      });
      if (!validated.ok) {
        setError(validated.error);
        return;
      }
      await addDoc(collection(db, "crown-installment-payments"), {
        ...validated.value,
        createdByUid: user?.uid ?? "",
        createdByName: user?.displayName || user?.email || "Admin",
        createdAt: serverTimestamp(),
      });
      setFormOpen(false);
      setToast({ tone: "success", message: `Pembayaran ${rupiah.format(validated.value.amount)} untuk ${validated.value.athleteName} berhasil disimpan.` });
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan pembayaran.");
    } finally {
      setSaving(false);
    }
  }

  function openCancel(payment: InstallmentPayment) {
    setCancelTarget(payment);
    setCancelReason("Pembayaran tercatat dua kali");
    setCancelError("");
  }

  async function confirmCancel() {
    if (!cancelTarget?.id || cancelling) return;
    if (!cancelReason.trim()) {
      setCancelError("Alasan pembatalan wajib diisi.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      await updateDoc(doc(db, "crown-installment-payments", cancelTarget.id), {
        cancelledAt: serverTimestamp(),
        cancelledByUid: user?.uid ?? "",
        cancelledByName: user?.displayName || user?.email || "Admin",
        cancellationReason: cancelReason.trim(),
      });
      setCancelTarget(null);
      setToast({ tone: "success", message: "Pembayaran berhasil dibatalkan." });
    } catch (err) {
      console.error(err);
      setCancelError(err instanceof Error ? err.message : "Gagal membatalkan pembayaran.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2.5"><CalendarClock className="h-6 w-6" /></div>
              <h1 className="text-2xl font-bold sm:text-3xl">Cicilan</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {plan
                ? `${plan.name} · target ${rupiah.format(plan.totalTarget)} per atlet. Nominal bayar boleh beda tiap bulan.`
                : "Belum ada rencana cicilan."}
            </p>
          </div>
          {isAdmin && plan && <Button onClick={() => openCreate(selected?.athlete)} className="bg-amber-600 hover:bg-amber-500">Catat Pembayaran</Button>}
        </header>

        {plans.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Rencana</label>
            <select value={plan?.id ?? ""} onChange={(event) => setSelectedPlanId(event.target.value)} className="h-10 rounded-md border border-white/10 bg-black/40 px-3 text-sm">
              {plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        )}

        {plan && isAdmin && (
          <section className="grid gap-3 sm:grid-cols-3">
            <Summary label="Total Terkumpul" value={rupiah.format(totals.collected)} tone="emerald" />
            <Summary label="Total Sisa" value={rupiah.format(totals.outstanding)} tone="rose" />
            <Summary label="Atlet Lunas" value={`${totals.lunas} / ${totals.total}`} tone="cyan" />
          </section>
        )}

        {plan && (
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-slate-300">Rincian Biaya (per atlet)</h3>
                <ul className="mt-2 divide-y divide-white/5 text-sm">
                  {plan.items.map((item) => (
                    <li key={item.label} className="flex justify-between gap-3 py-1.5"><span className="text-slate-300">{item.label}</span><span className="font-medium text-white">{rupiah.format(item.amount)}</span></li>
                  ))}
                  <li className="flex justify-between gap-3 py-1.5 font-semibold"><span className="text-white">Total</span><span className="text-amber-300">{rupiah.format(plan.totalTarget)}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-300">Termin Cicilan</h3>
                <ul className="mt-2 divide-y divide-white/5 text-sm">
                  {plan.terms.map((term, i) => (
                    <li key={term.month} className="flex justify-between gap-3 py-1.5">
                      <span className="text-slate-300">{term.label}</span>
                      <span className="text-right">
                        <span className="font-medium text-white">{rupiah.format(term.expected)}</span>
                        {isAdmin && <span className="ml-2 text-xs text-slate-500">terkumpul {rupiah.format(termCollected[i] ?? 0)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {!plan && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-500">
            Belum ada rencana cicilan. Admin dapat menambahkan rencana di koleksi crown-installment-plans.
          </section>
        )}

        {plan && !isAdmin && (
          <section className="space-y-6">
            {!detailAthlete ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-500">
                Akun ini tidak terdaftar sebagai atlet, jadi tidak ada cicilan yang bisa ditampilkan.
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white">Cicilan Saya</h2>
                <DetailPanel
                  athlete={detailAthlete}
                  progress={detailProgress}
                  payments={detailPayments}
                  isAdmin={false}
                  onRecord={() => {}}
                  onCancel={() => {}}
                />
              </>
            )}
          </section>
        )}

        {plan && isAdmin && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 p-4">
                <label className="relative block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari atlet..." className="border-white/10 bg-black/30 pl-9" />
                </label>
              </div>
              <div className="max-h-[650px] divide-y divide-white/5 overflow-y-auto">
                {rows.map(({ athlete, progress, paymentCount }) => (
                  <button key={athlete.id} onClick={() => setSelectedAthleteId(athlete.id)} className={`w-full p-4 text-left transition ${selectedAthleteId === athlete.id ? "bg-amber-500/10" : "hover:bg-white/5"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-white">{athlete.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${progress.pct === 100 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300"}`}>{progress.pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${progress.pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${progress.pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {rupiah.format(progress.paid)} dari {rupiah.format(plan.totalTarget)} · sisa {rupiah.format(progress.remaining)} · {paymentCount} pembayaran
                    </p>
                  </button>
                ))}
                {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Atlet tidak ditemukan.</p>}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {!selected || !detailProgress ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center text-slate-500"><Wallet className="mb-3 h-10 w-10" /><p>Pilih atlet untuk melihat progres cicilan.</p></div>
              ) : (
                <DetailPanel
                  athlete={selected.athlete}
                  progress={detailProgress}
                  payments={detailPayments}
                  isAdmin
                  onRecord={() => openCreate(selected.athlete)}
                  onCancel={openCancel}
                />
              )}
            </section>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-neutral-950 text-white">
          <DialogHeader><DialogTitle>Catat Pembayaran Cicilan</DialogTitle><DialogDescription className="text-slate-400">Nominal bebas — tidak harus sama dengan nominal termin bulan itu.</DialogDescription></DialogHeader>
          <form onSubmit={savePayment} className="space-y-4">
            <Field label="Atlet"><select value={form.athleteId} onChange={(event) => chooseAthlete(event.target.value)} required className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm"><option value="">Pilih atlet</option>{members.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}</select></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Nominal"><Input type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required className="border-white/10 bg-black/40" /></Field><Field label="Tanggal"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="border-white/10 bg-black/40 [color-scheme:dark]" /></Field></div>
            <Field label="Catatan"><Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opsional — mis. transfer BCA" className="border-white/10 bg-black/40" /></Field>
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
            <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="border-white/10 bg-transparent">Batal</Button><Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-500">{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelling) setCancelTarget(null); }}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 sm:mx-0"><AlertTriangle className="h-6 w-6 text-rose-400" /></div>
            <DialogTitle>Batalkan pembayaran?</DialogTitle>
            <DialogDescription className="text-slate-400">Pembayaran tetap tersimpan di riwayat, tetapi tidak dihitung ke progres cicilan. Tindakan ini tidak dapat diubah kembali.</DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-slate-400">Atlet</span><span className="font-medium">{cancelTarget.athleteName}</span></div>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-slate-400">Pembayaran</span><span className="font-semibold text-white">{rupiah.format(cancelTarget.amount)}</span></div>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-slate-400">Tanggal</span><span>{cancelTarget.date}{cancelTarget.note ? ` · ${cancelTarget.note}` : ""}</span></div>
            </div>
          )}
          <Field label="Alasan pembatalan"><Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} disabled={cancelling} placeholder="Contoh: pembayaran tercatat dua kali" className="border-white/10 bg-black/40" /></Field>
          {cancelError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{cancelError}</p>}
          <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={cancelling} onClick={() => setCancelTarget(null)} className="border-white/10 bg-transparent">Kembali</Button><Button type="button" disabled={cancelling} onClick={confirmCancel} className="bg-rose-600 hover:bg-rose-500">{cancelling ? "Membatalkan..." : "Ya, Batalkan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div role="status" className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${toast.tone === "success" ? "border-emerald-500/30 bg-emerald-950/90 text-emerald-200" : "border-rose-500/30 bg-rose-950/90 text-rose-200"}`}>
          {toast.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}
    </main>
  );
}

function DetailPanel({ athlete, progress, payments, isAdmin, onRecord, onCancel }: {
  athlete: Athlete;
  progress?: InstallmentProgress;
  payments: InstallmentPayment[];
  isAdmin: boolean;
  onRecord: () => void;
  onCancel: (payment: InstallmentPayment) => void;
}) {
  if (!progress) return null;
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-semibold">{athlete.name}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {rupiah.format(progress.paid)} dari {rupiah.format(progress.paid + progress.remaining)} · sisa {rupiah.format(progress.remaining)}
          </p>
        </div>
        {isAdmin && <Button size="sm" onClick={onRecord} className="bg-amber-600 hover:bg-amber-500">Catat</Button>}
      </div>
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between text-sm"><span className="text-slate-400">Progres</span><span className="font-semibold text-white">{progress.pct}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${progress.pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${progress.pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {progress.terms.map((term) => (
            <span key={term.month} title={`${term.label}: ${rupiah.format(term.paid)} dari ${rupiah.format(term.expected)}`} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${term.status === "lunas" ? "bg-emerald-500/20 text-emerald-300" : term.status === "sebagian" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-400"}`}>
              {shortMonth(term.month)} · {term.status === "lunas" ? "Lunas" : term.status === "sebagian" ? "Sebagian" : "Belum"}
            </span>
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {payments.map((payment) => (
          <article key={payment.id} className={`p-4 ${payment.cancelledAt ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-white">
                  {rupiah.format(payment.amount)}
                  {!!payment.cancelledAt && <span className="ml-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">Dibatalkan</span>}
                </p>
                <p className="text-xs text-slate-400">{payment.date}{payment.note ? ` · ${payment.note}` : ""}</p>
                <p className="mt-1 text-[11px] text-slate-600">Dicatat oleh {payment.createdByName || "Admin"}{payment.cancelledAt ? ` · Dibatalkan: ${payment.cancellationReason}` : ""}</p>
              </div>
              {isAdmin && !payment.cancelledAt && (
                <button onClick={() => onCancel(payment)} className="shrink-0 text-xs text-rose-400 hover:text-rose-300">Batalkan</button>
              )}
            </div>
          </article>
        ))}
        {payments.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Belum ada pembayaran.</p>}
      </div>
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "cyan" }) {
  const colors = { emerald: "text-emerald-400 border-emerald-500/20", rose: "text-rose-400 border-rose-500/20", cyan: "text-cyan-400 border-cyan-500/20" };
  return <div className={`rounded-2xl border bg-white/5 p-4 ${colors[tone]}`}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-400">{label}</span>{children}</label>;
}

export const dynamic = "force-dynamic";
