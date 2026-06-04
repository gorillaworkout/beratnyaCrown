"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  addFinanceRecord, 
  getFinanceRecords, 
  updateFinanceRecord, 
  deleteFinanceRecord, 
  FinanceRecord, 
  FinanceType 
} from "@/lib/firebase/finances";
import { getKasAthletes } from "@/lib/firebase/kas";
import type { KasAthlete } from "@/lib/types/kas";
import { getCoachFeesByMonth, saveCoachFeeRecord, CoachFeeRecord, CoachFeeStatus } from "@/lib/firebase/coach_fees";
import { getFinanceNeeds, addFinanceNeed, deleteFinanceNeed, updateFinanceNeed, FinanceNeed } from "@/lib/firebase/needs";
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Plus, Trash2, CheckCircle2, Edit, RotateCcw, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function FinancesPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "debt" | "coach_fees" | "needs">("transactions");
  
  // Coach Fees state
  const [coachMonth, setCoachMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [athletes, setAthletes] = useState<KasAthlete[]>([]);
  const [coachFees, setCoachFees] = useState<CoachFeeRecord[]>([]);
  
  // Needs state
  const [needs, setNeeds] = useState<FinanceNeed[]>([]);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [needFormData, setNeedFormData] = useState({ itemName: "", estimatedPrice: "" });
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "INCOME" as FinanceType,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isAdmin]);

  async function loadData() {
    try {
      const data = await getFinanceRecords();
      setRecords(data);
      
      const athletesData = await getKasAthletes();
      // Filter out exempted kas athletes if needed, but here we probably show all 
      // or we just show everyone and let coach exempt them.
      setAthletes(athletesData);

      const needsData = await getFinanceNeeds();
      setNeeds(needsData);
    } catch (error) {
      console.error("Error loading finances:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    async function fetchCoachFees() {
      try {
        const fees = await getCoachFeesByMonth(coachMonth);
        setCoachFees(fees);
      } catch (err) {
        console.error("Failed to fetch coach fees", err);
      }
    }
    fetchCoachFees();
  }, [coachMonth, isAdmin]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalDebt = 0;

    records.forEach(r => {
      if (r.type === 'INCOME') totalIncome += r.amount;
      if (r.type === 'EXPENSE') totalExpense += r.amount;
      if (r.type === 'DEBT') {
        if (r.status === 'PENDING') totalDebt += r.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      totalDebt,
      balance: totalIncome - totalExpense
    };
  }, [records]);

  function openModal(record?: FinanceRecord) {
    if (record) {
      setEditingRecord(record);
      setFormData({
        type: record.type,
        amount: record.amount.toString(),
        description: record.description,
        date: record.date
      });
    } else {
      setEditingRecord(null);
      setFormData({
        type: "INCOME",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0]
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRecord(null);
  }

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    
    setIsSubmitting(true);
    try {
      if (editingRecord?.id) {
        // Edit existing
        await updateFinanceRecord(editingRecord.id, {
          type: formData.type,
          amount: Number(formData.amount),
          description: formData.description,
          date: formData.date,
          status: formData.type === 'DEBT' ? (editingRecord.status || 'PENDING') : undefined
        });
      } else {
        // Add new
        const newRecord: Omit<FinanceRecord, "id" | "createdAt"> = {
          type: formData.type,
          amount: Number(formData.amount),
          description: formData.description,
          date: formData.date,
        };
        if (formData.type === 'DEBT') {
          newRecord.status = 'PENDING';
        }
        await addFinanceRecord(newRecord);
      }
      
      closeModal();
      await loadData();
    } catch (error) {
      console.error("Failed to save record:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus catatan ini?")) return;
    try {
      await deleteFinanceRecord(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  }

  async function handleSettleDebt(id: string) {
    if (!confirm("Tandai hutang ini sebagai lunas?")) return;
    try {
      await updateFinanceRecord(id, { status: "LUNAS" });
      await loadData();
    } catch (error) {
      console.error("Failed to update debt:", error);
    }
  }

  async function handleUndoDebt(id: string) {
    if (!confirm("Kembalikan hutang ini menjadi BELUM DIBAYAR?")) return;
    try {
      await updateFinanceRecord(id, { status: "PENDING" });
      await loadData();
    } catch (error) {
      console.error("Failed to undo debt:", error);
    }
  }

  async function handleCoachFeeStatus(athlete: KasAthlete, status: CoachFeeStatus) {
    let amount = 0;
    if (status === 'LUNAS') {
      const input = prompt(`Masukkan nominal pembayaran untuk ${athlete.name} (Rp):`, "150000");
      if (input === null) return; // User cancelled
      amount = parseInt(input.replace(/\D/g, ''), 10) || 150000;
    }

    try {
      const record: Omit<CoachFeeRecord, "id" | "updatedAt"> = {
        athleteId: athlete.id!,
        athleteName: athlete.name,
        month: coachMonth,
        status,
        amount: status === 'LUNAS' ? amount : 0
      };
      await saveCoachFeeRecord(record);
      
      // Update local state
      setCoachFees(prev => {
        const existingIdx = prev.findIndex(r => r.athleteId === athlete.id);
        if (existingIdx >= 0) {
          const newFees = [...prev];
          newFees[existingIdx] = { ...newFees[existingIdx], ...record };
          return newFees;
        } else {
          return [...prev, record as CoachFeeRecord];
        }
      });
    } catch (error) {
      console.error("Failed to update coach fee:", error);
      alert("Gagal menyimpan data.");
    }
  }

  async function handleAddNeed(e: React.FormEvent) {
    e.preventDefault();
    if (!needFormData.itemName || !needFormData.estimatedPrice) return;
    setIsSubmitting(true);
    try {
      await addFinanceNeed({
        itemName: needFormData.itemName,
        estimatedPrice: Number(needFormData.estimatedPrice),
        status: 'BELUM_DIBELI'
      });
      setShowNeedModal(false);
      setNeedFormData({ itemName: "", estimatedPrice: "" });
      await loadData();
    } catch(error) {
      console.error("Failed to add need:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNeed(id: string) {
    if (!confirm("Hapus kebutuhan ini?")) return;
    try {
      await deleteFinanceNeed(id);
      await loadData();
    } catch(err) {
      console.error(err);
    }
  }

  async function handleMarkNeedBought(need: FinanceNeed) {
    const actualPriceStr = prompt(`Berapa harga asli saat membeli ${need.itemName}?\n(Estimasi: Rp ${need.estimatedPrice.toLocaleString('id-ID')})`, need.estimatedPrice.toString());
    if (actualPriceStr === null) return;
    
    const actualPrice = Number(actualPriceStr.replace(/\D/g, ""));
    if (isNaN(actualPrice)) return alert("Harga tidak valid");

    const isLunas = confirm("Apakah pembelian ini sudah DIBAYAR LUNAS (Kas)?\n\n[OK] = Ya, Lunas (Masuk Pengeluaran)\n[Cancel] = Tidak, Ngutang (Masuk Hutang Belum Dibayar)");

    try {
      // 1. Add to finances
      const newRecord: Omit<FinanceRecord, "id" | "createdAt"> = {
        type: isLunas ? 'EXPENSE' : 'DEBT',
        amount: actualPrice,
        description: `Beli: ${need.itemName}`,
        date: new Date().toISOString().split("T")[0],
      };
      if (!isLunas) newRecord.status = 'PENDING';
      
      await addFinanceRecord(newRecord);

      // 2. Update need status
      await updateFinanceNeed(need.id!, { status: 'SUDAH_DIBELI' });
      
      await loadData();
      alert("Berhasil dicatat ke Keuangan!");
    } catch(error) {
      console.error("Error updating need status:", error);
      alert("Gagal mengupdate status.");
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full border-2 border-indigo-500/50 border-t-indigo-500 w-12 h-12"></div>
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <p className="text-red-400">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    );
  }

  const transactions = records.filter(r => r.type === "INCOME" || r.type === "EXPENSE");
  const debts = records.filter(r => r.type === "DEBT");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-3 text-slate-100 sm:p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pt-20">

        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <Wallet className="h-6 w-6 text-indigo-400" />
                Keuangan Crown
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Catat pemasukan job, pengeluaran umum, dan hutang (di luar uang kas rutin).
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNeedModal(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                Wishlist
              </button>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                <Plus className="h-4 w-4" />
                Catat Keuangan
              </button>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Pemasukan</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400">
              Rp {summary.totalIncome.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Pengeluaran</p>
            <p className="text-xl sm:text-2xl font-black text-rose-400">
              Rp {summary.totalExpense.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Hutang (Belum Dibayar)</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400">
              Rp {summary.totalDebt.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet className="w-3 h-3"/> Saldo Bersih</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-400">
              Rp {summary.balance.toLocaleString("id-ID")}
            </p>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 pb-1 mt-4">
          <button 
            onClick={() => setActiveTab("transactions")} 
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "transactions" ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Pemasukan & Pengeluaran
          </button>
          <button 
            onClick={() => setActiveTab("debt")} 
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "debt" ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Daftar Hutang
          </button>
          <button 
            onClick={() => setActiveTab("coach_fees")} 
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "coach_fees" ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Uang Pelatih
          </button>
          <button 
            onClick={() => setActiveTab("needs")} 
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "needs" ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Kebutuhan Tim
          </button>
        </div>

        {/* Tab Content: Transactions */}
        {activeTab === "transactions" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">Tipe</th>
                    <th className="px-6 py-4 font-medium">Keterangan</th>
                    <th className="px-6 py-4 font-medium text-right">Nominal</th>
                    <th className="px-6 py-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Belum ada transaksi.</td></tr>
                  ) : (
                    transactions.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">{format(new Date(r.date), 'dd MMM yyyy', { locale: idLocale })}</td>
                        <td className="px-6 py-4">
                          {r.type === 'INCOME' 
                            ? <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs"><TrendingUp className="w-3 h-3" /> Pemasukan</span>
                            : <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs"><TrendingDown className="w-3 h-3" /> Pengeluaran</span>
                          }
                        </td>
                        <td className="px-6 py-4 text-white">{r.description}</td>
                        <td className={`px-6 py-4 text-right font-bold ${r.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.type === 'INCOME' ? '+' : '-'} Rp {r.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => openModal(r)} className="text-slate-500 hover:text-indigo-400 p-2 bg-white/5 rounded hover:bg-indigo-500/10 transition-colors" title="Edit">
                              <Edit className="w-4 h-4 mx-auto" />
                            </button>
                            <button onClick={() => handleDelete(r.id!)} className="text-slate-500 hover:text-red-400 p-2 bg-white/5 rounded hover:bg-rose-500/10 transition-colors" title="Hapus">
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Debt */}
        {activeTab === "debt" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">Keterangan Hutang</th>
                    <th className="px-6 py-4 font-medium text-right">Nominal</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {debts.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Tidak ada catatan hutang.</td></tr>
                  ) : (
                    debts.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">{format(new Date(r.date), 'dd MMM yyyy', { locale: idLocale })}</td>
                        <td className="px-6 py-4 text-white font-medium">{r.description}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-400">
                          Rp {r.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {r.status === 'PENDING' 
                            ? <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md text-xs font-bold"><AlertCircle className="w-3 h-3" /> Belum Dibayar</span>
                            : <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Lunas</span>
                          }
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {r.status === 'PENDING' ? (
                              <button onClick={() => handleSettleDebt(r.id!)} title="Tandai Lunas" className="text-emerald-500 hover:text-emerald-400 p-2 bg-emerald-500/10 rounded hover:bg-emerald-500/20 transition-colors">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleUndoDebt(r.id!)} title="Batal Lunas (Kembali ke Hutang)" className="text-amber-500 hover:text-amber-400 p-2 bg-amber-500/10 rounded hover:bg-amber-500/20 transition-colors">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => openModal(r)} title="Edit Catatan" className="text-slate-500 hover:text-indigo-400 p-2 bg-white/5 rounded hover:bg-indigo-500/10 transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(r.id!)} title="Hapus Catatan" className="text-rose-500 hover:text-rose-400 p-2 bg-rose-500/10 rounded hover:bg-rose-500/20 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Coach Fees */}
        {activeTab === "coach_fees" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Pembayaran Uang Pelatih</h2>
                <p className="text-sm text-slate-400">Pilih bulan dan kelola status pembayaran tiap atlet.</p>
              </div>
              <input 
                type="month" 
                value={coachMonth}
                onChange={(e) => setCoachMonth(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama Atlet</th>
                    <th className="px-6 py-4 font-medium text-center">Status Pembayaran</th>
                    <th className="px-6 py-4 font-medium text-right">Nominal</th>
                    <th className="px-6 py-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {athletes.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Memuat data atlet...</td></tr>
                  ) : (
                    athletes.map((athlete) => {
                      const fee = coachFees.find(f => f.athleteId === athlete.id);
                      const defaultStatus = athlete.coachFeeExempt ? 'GRATIS' : 'BELUM_BAYAR';
                      const status = fee?.status || defaultStatus;
                      
                      return (
                        <tr key={athlete.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4 font-medium text-white">{athlete.name}</td>
                          <td className="px-6 py-4 text-center">
                            {status === 'BELUM_BAYAR' && <span className="inline-block px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">Belum Bayar</span>}
                            {status === 'LUNAS' && <span className="inline-block px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">Lunas</span>}
                            {status === 'GRATIS' && <span className="inline-block px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/30">Gratis / Free</span>}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-200">
                            {status === 'LUNAS' && fee?.amount ? `Rp ${fee.amount.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {status !== 'LUNAS' && (
                                <button onClick={() => handleCoachFeeStatus(athlete, 'LUNAS')} className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-colors">Bayar</button>
                              )}
                              {status !== 'GRATIS' && (
                                <button onClick={() => handleCoachFeeStatus(athlete, 'GRATIS')} className="text-xs px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors">Free</button>
                              )}
                              {status !== 'BELUM_BAYAR' && (
                                <button onClick={() => handleCoachFeeStatus(athlete, 'BELUM_BAYAR')} className="text-xs px-3 py-1.5 rounded-md border border-slate-600 hover:bg-slate-800 text-slate-300 font-bold transition-colors">Batal</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Needs */}
        {activeTab === "needs" && (
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Kebutuhan Tim (Wishlist)</h2>
                <p className="text-sm text-slate-400">Daftar barang/keperluan yang akan dibeli. Jika dibeli, bisa langsung masuk ke Pengeluaran/Hutang.</p>
              </div>
              <button 
                onClick={() => setShowNeedModal(true)}
                className="rounded-xl border border-white/10 bg-black px-4 py-2 text-white hover:bg-white/5 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama Kebutuhan</th>
                    <th className="px-6 py-4 font-medium text-right">Estimasi Harga</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {needs.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Belum ada daftar kebutuhan.</td></tr>
                  ) : (
                    needs.map((need) => (
                      <tr key={need.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 font-medium text-white">{need.itemName}</td>
                        <td className="px-6 py-4 text-right font-bold text-amber-400">
                          Rp {need.estimatedPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {need.status === 'BELUM_DIBELI' 
                            ? <span className="inline-block px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">Belum Dibeli</span>
                            : <span className="inline-block px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">Sudah Dibeli</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {need.status === 'BELUM_DIBELI' && (
                              <button onClick={() => handleMarkNeedBought(need)} className="text-xs px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">Tandai Dibeli</button>
                            )}
                            <button onClick={() => handleDeleteNeed(need.id!)} className="text-slate-500 hover:text-red-400 p-1.5 bg-white/5 rounded hover:bg-rose-500/10 transition-colors" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal Add Record */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">{editingRecord ? "Edit Catatan Keuangan" : "Catat Keuangan Umum"}</h3>
            <form onSubmit={handleSaveRecord}>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Jenis Catatan</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value as FinanceType})} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  >
                    <option value="INCOME">Pemasukan (Uang Job, dsb)</option>
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="DEBT">Hutang Belum Dibayar</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Tanggal</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={(e) => setFormData({...formData, date: e.target.value})} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50" 
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Nominal (Rp)</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.amount ? Number(formData.amount).toLocaleString('id-ID') : ""} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setFormData({...formData, amount: rawValue});
                    }} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50" 
                    placeholder="Contoh: 500.000" 
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Keterangan</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50" 
                    placeholder="Contoh: Uang manggung DBL..." 
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  {isSubmitting ? "Menyimpan..." : "Simpan Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Need (Wishlist) */}
      {showNeedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-400" /> Tambah Kebutuhan Tim
            </h3>
            <form onSubmit={handleAddNeed}>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Nama Barang / Keperluan</label>
                  <input 
                    type="text" 
                    required 
                    value={needFormData.itemName} 
                    onChange={(e) => setNeedFormData({...needFormData, itemName: e.target.value})} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50" 
                    placeholder="Contoh: Beli Matras Baru"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Estimasi Harga (Rp)</label>
                  <input 
                    type="text" 
                    required 
                    value={needFormData.estimatedPrice ? Number(needFormData.estimatedPrice).toLocaleString('id-ID') : ""} 
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      setNeedFormData({...needFormData, estimatedPrice: rawValue});
                    }} 
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50" 
                    placeholder="Contoh: 5000000" 
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowNeedModal(false)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  {isSubmitting ? "Menyimpan..." : "Simpan Kebutuhan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
