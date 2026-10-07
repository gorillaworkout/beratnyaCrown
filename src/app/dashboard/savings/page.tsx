"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, History, Pencil, PiggyBank, Search, Wallet, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { newRequestId, sendMutation } from "@/lib/savings-client";
import {
  calculateSavingsBalance,
  getSavingsAuditChanges,
  type SavingsAudit,
  type SavingsInput,
  type SavingsTransaction,
  type SavingsTransactionType,
} from "@/lib/athlete-savings";
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

type Athlete = { id: string; name: string; role?: string };
type TransactionForm = Omit<SavingsInput, "amount"> & { amount: string; reason: string };

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const today = () => new Date().toLocaleDateString("sv-SE");
const emptyForm = (athlete?: Athlete): TransactionForm => ({
  athleteId: athlete?.id ?? "",
  athleteName: athlete?.name ?? "",
  type: "DEPOSIT",
  amount: "",
  purpose: "Kejurnas",
  date: today(),
  note: "",
  reason: "",
});
const timestampMs = (value: unknown) => {
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
};

export default function AthleteSavingsPage() {
  const { user, isAdmin } = useAuth();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [audits, setAudits] = useState<SavingsAudit[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsTransaction | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Satu requestId per pengisian form: retry/klik ganda memakai ID yang sama,
  // jadi server menyimpan transaksi tepat sekali.
  const [requestId, setRequestId] = useState("");
  const [cancelTarget, setCancelTarget] = useState<SavingsTransaction | null>(null);
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
          .map((item) => ({ id: item.id, name: item.data().name || "Tanpa Nama", role: item.data().role }))
          .filter((item) => item.role !== "coach")
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    const stopTransactions = onSnapshot(collection(db, "crown-athlete-savings-transactions"), (snapshot) => {
      setTransactions(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as SavingsTransaction)
          .sort((a, b) => b.date.localeCompare(a.date) || timestampMs(b.createdAt) - timestampMs(a.createdAt)),
      );
    });
    return () => {
      stopAthletes();
      stopTransactions();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setAudits([]);
      return;
    }
    return onSnapshot(collection(db, "crown-athlete-savings-audits"), (snapshot) => {
      setAudits(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as SavingsAudit)
          .sort((a, b) => timestampMs(b.editedAt) - timestampMs(a.editedAt)),
      );
    });
  }, [isAdmin]);

  const rows = useMemo(() => athletes.map((athlete) => {
    const athleteTransactions = transactions.filter((item) => item.athleteId === athlete.id);
    return { athlete, transactions: athleteTransactions, balance: calculateSavingsBalance(athleteTransactions) };
  }), [athletes, transactions]);

  const filteredRows = rows.filter(({ athlete }) => athlete.name.toLowerCase().includes(search.toLowerCase()));
  const selected = rows.find(({ athlete }) => athlete.id === selectedAthleteId) ?? null;
  const totalSavings = rows.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);
  const totalDebt = rows.reduce((sum, row) => sum + Math.abs(Math.min(row.balance, 0)), 0);

  function openCreate(athlete?: Athlete) {
    setEditing(null);
    setForm(emptyForm(athlete));
    setError("");
    setRequestId(newRequestId());
    setFormOpen(true);
  }

  function openEdit(transaction: SavingsTransaction) {
    setEditing(transaction);
    setForm({
      athleteId: transaction.athleteId,
      athleteName: transaction.athleteName,
      type: transaction.type,
      amount: String(transaction.amount),
      purpose: transaction.purpose,
      date: transaction.date,
      note: transaction.note || "",
      reason: "",
    });
    setError("");
    setFormOpen(true);
  }

  function chooseAthlete(id: string) {
    const athlete = athletes.find((item) => item.id === id);
    setForm((current) => ({ ...current, athleteId: id, athleteName: athlete?.name ?? "" }));
  }

  async function authHeaders() {
    if (!user) throw new Error("Silakan login kembali.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` };
  }

  async function saveTransaction(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        athleteId: form.athleteId,
        athleteName: form.athleteName,
        type: form.type,
        amount: Number(form.amount),
        purpose: form.purpose,
        date: form.date,
        note: form.note,
        ...(editing ? { reason: form.reason } : { requestId }),
      };
      const result = await sendMutation(fetch, editing ? `/api/savings/${editing.id}` : "/api/savings", {
        method: editing ? "PATCH" : "POST",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      setToast({ tone: "success", message: editing ? "Transaksi berhasil diubah." : "Transaksi berhasil disimpan." });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan transaksi.");
    } finally {
      setSaving(false);
    }
  }

  function openCancel(transaction: SavingsTransaction) {
    setCancelTarget(transaction);
    setCancelReason("Transaksi tercatat dua kali");
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
      // 409 = sudah dibatalkan (mis. percobaan pertama sukses tapi responsnya
      // hilang di jaringan). Hasil akhirnya sama, jadi diperlakukan sukses.
      const result = await sendMutation(fetch, `/api/savings/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ reason: cancelReason }),
      }, { successStatuses: [409] });
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      setCancelTarget(null);
      setToast({ tone: "success", message: "Transaksi berhasil dibatalkan." });
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Gagal membatalkan transaksi.");
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
              <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-2.5"><PiggyBank className="h-6 w-6" /></div>
              <h1 className="text-2xl font-bold sm:text-3xl">Tabungan Atlet</h1>
            </div>
            <p className="mt-2 text-sm text-slate-400">Dana persiapan Kejurnas, kejuaraan Asia, dan kebutuhan kompetisi lainnya.</p>
          </div>
          {isAdmin && <Button onClick={() => openCreate()} className="bg-emerald-600 hover:bg-emerald-500">Tambah Transaksi</Button>}
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <Summary label="Total Tabungan" value={rupiah.format(totalSavings)} tone="emerald" />
          <Summary label="Total Hutang" value={rupiah.format(totalDebt)} tone="rose" />
          <Summary label="Jumlah Atlet" value={String(rows.length)} tone="cyan" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 p-4">
              <label className="relative block">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari atlet..." className="border-white/10 bg-black/30 pl-9" />
              </label>
            </div>
            <div className="max-h-[650px] divide-y divide-white/5 overflow-y-auto">
              {filteredRows.map((row) => (
                <button key={row.athlete.id} onClick={() => setSelectedAthleteId(row.athlete.id)} className={`flex w-full items-center justify-between gap-3 p-4 text-left transition ${selectedAthleteId === row.athlete.id ? "bg-cyan-500/10" : "hover:bg-white/5"}`}>
                  <div className="min-w-0"><p className="truncate font-medium text-white">{row.athlete.name}</p><p className="text-xs text-slate-500">{row.transactions.length} transaksi</p></div>
                  <Balance amount={row.balance} />
                </button>
              ))}
              {filteredRows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Atlet tidak ditemukan.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {!selected ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center text-slate-500"><Wallet className="mb-3 h-10 w-10" /><p>Pilih atlet untuk melihat riwayat tabungan.</p></div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                  <div><h2 className="text-xl font-semibold">{selected.athlete.name}</h2><div className="mt-1"><Balance amount={selected.balance} large /></div></div>
                  {isAdmin && <Button size="sm" onClick={() => openCreate(selected.athlete)} className="bg-cyan-600 hover:bg-cyan-500">Tambah</Button>}
                </div>
                <div className="divide-y divide-white/5">
                  {selected.transactions.map((transaction) => {
                    const transactionAudits = audits.filter((audit) => audit.transactionId === transaction.id);
                    return (
                      <article key={transaction.id} className={`p-4 ${transaction.cancelledAt ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            {transaction.type === "DEPOSIT" ? <ArrowUpCircle className="mt-0.5 h-5 w-5 text-emerald-400" /> : <ArrowDownCircle className="mt-0.5 h-5 w-5 text-rose-400" />}
                            <div><p className="font-medium text-white">{transaction.purpose} {!!transaction.cancelledAt && <span className="ml-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">Dibatalkan</span>}</p><p className="text-xs text-slate-400">{transaction.date}{transaction.note ? ` · ${transaction.note}` : ""}</p><p className="mt-1 text-[11px] text-slate-600">Dicatat oleh {transaction.createdByName || "Admin"}{transaction.cancelledAt ? ` · Dibatalkan: ${transaction.cancellationReason}` : ""}</p></div>
                          </div>
                          <div className="text-right"><p className={`${transaction.cancelledAt ? "line-through text-slate-500" : transaction.type === "DEPOSIT" ? "text-emerald-400" : "text-rose-400"} font-semibold`}>{transaction.type === "DEPOSIT" ? "+" : "−"}{rupiah.format(transaction.amount)}</p>{isAdmin && !transaction.cancelledAt && <div className="mt-2 flex justify-end gap-2"><button onClick={() => openEdit(transaction)} className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"><Pencil className="h-3 w-3" /> Edit</button><button onClick={() => openCancel(transaction)} className="text-xs text-rose-400 hover:text-rose-300">Batalkan</button></div>}</div>
                        </div>
                        {isAdmin && transactionAudits.length > 0 && (
                          <details className="mt-3 rounded-lg bg-black/20 p-3 text-xs text-slate-400">
                            <summary className="cursor-pointer text-amber-300"><History className="mr-1 inline h-3 w-3" />{transactionAudits.length} riwayat perubahan</summary>
                            <div className="mt-2 space-y-3">
                              {transactionAudits.map((audit) => (
                                <div key={audit.id} className="border-l border-amber-500/30 pl-3">
                                  <p className="text-slate-300">{audit.reason} — {audit.editedByName}</p>
                                  <ul className="mt-1 space-y-1 text-slate-500">
                                    {getSavingsAuditChanges(audit.before, audit.after).map((change) => (
                                      <li key={change.label}>
                                        <span className="text-slate-400">{change.label}:</span>{" "}
                                        {change.label === "Nominal" ? rupiah.format(Number(change.before)) : String(change.before)}
                                        {" → "}
                                        {change.label === "Nominal" ? rupiah.format(Number(change.after)) : String(change.after)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </article>
                    );
                  })}
                  {selected.transactions.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Belum ada transaksi.</p>}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-neutral-950 text-white">
          <DialogHeader><DialogTitle>{editing ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle><DialogDescription className="text-slate-400">Penarikan boleh melebihi saldo dan akan tercatat sebagai hutang.</DialogDescription></DialogHeader>
          <form onSubmit={saveTransaction} className="space-y-4">
            <Field label="Atlet"><select value={form.athleteId} onChange={(event) => chooseAthlete(event.target.value)} required className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm"><option value="">Pilih atlet</option>{athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}</select></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Jenis"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SavingsTransactionType })} className="h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm"><option value="DEPOSIT">Setoran</option><option value="WITHDRAWAL">Penarikan</option></select></Field><Field label="Nominal"><Input type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required className="border-white/10 bg-black/40" /></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Tujuan"><Input value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} placeholder="Kejurnas / Asia" required className="border-white/10 bg-black/40" /></Field><Field label="Tanggal"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required className="border-white/10 bg-black/40 [color-scheme:dark]" /></Field></div>
            <Field label="Catatan"><Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Opsional" className="border-white/10 bg-black/40" /></Field>
            {editing && <Field label="Alasan perubahan"><Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Contoh: salah input nominal" required className="border-amber-500/30 bg-black/40" /></Field>}
            {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
            <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)} className="border-white/10 bg-transparent">Batal</Button><Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500">{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelling) setCancelTarget(null); }}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 sm:mx-0"><AlertTriangle className="h-6 w-6 text-rose-400" /></div>
            <DialogTitle>Batalkan transaksi?</DialogTitle>
            <DialogDescription className="text-slate-400">Transaksi tetap tersimpan di riwayat, tetapi tidak dihitung ke saldo. Tindakan ini tidak dapat diubah kembali.</DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-slate-400">Atlet</span><span className="font-medium">{cancelTarget.athleteName}</span></div>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-slate-400">{cancelTarget.type === "DEPOSIT" ? "Setoran" : "Penarikan"}</span><span className="font-semibold text-white">{rupiah.format(cancelTarget.amount)}</span></div>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-slate-400">Tanggal</span><span>{cancelTarget.date} · {cancelTarget.purpose}</span></div>
            </div>
          )}
          <Field label="Alasan pembatalan"><Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} disabled={cancelling} placeholder="Contoh: transaksi tercatat dua kali" className="border-white/10 bg-black/40" /></Field>
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

function Summary({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "cyan" }) {
  const colors = { emerald: "text-emerald-400 border-emerald-500/20", rose: "text-rose-400 border-rose-500/20", cyan: "text-cyan-400 border-cyan-500/20" };
  return <div className={`rounded-2xl border bg-white/5 p-4 ${colors[tone]}`}><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function Balance({ amount, large = false }: { amount: number; large?: boolean }) {
  return <span className={`${large ? "text-lg" : "text-sm"} font-semibold ${amount < 0 ? "text-rose-400" : "text-emerald-400"}`}>{amount < 0 ? `Hutang ${rupiah.format(Math.abs(amount))}` : rupiah.format(amount)}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-400">{label}</span>{children}</label>;
}
