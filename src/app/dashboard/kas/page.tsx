"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Plus, XCircle, Wallet, ArrowUpCircle, ArrowDownCircle, Trash2, TrendingUp, Download } from "lucide-react";
import {
  
  getKasAthletes,
  getKasRecordsByDate,
  getKasSummary,
  saveKasRecord,
  getKasTransactions,
  addKasTransaction,
  deleteKasTransaction,
  getAllKasRecords,
  getTrainingDates,
  addCustomTrainingEvent
} from "@/lib/firebase/kas";
import type { KasAthlete, KasRecord, KasTransaction, TransactionType } from "@/lib/types/kas";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function KasPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "debt" | "transactions" | "recap">("daily");

  const [athletes, setAthletes] = useState<KasAthlete[]>([]);
  const [records, setRecords] = useState<KasRecord[]>([]);
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);
  const [allRecords, setAllRecords] = useState<KasRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("2026-04-01");
  const { user } = useAuth();
  const [isKasAdmin, setIsKasAdmin] = useState(false);
  
  useEffect(() => {
    if (user?.email === "darmawanbayu1@gmail.com") {
      setIsKasAdmin(true);
      return;
    }
    if (user?.uid) {
      getDoc(doc(db, "crown-athletes", user.uid)).then(d => {
        if (d.exists() && d.data().role === "admin") {
          setIsKasAdmin(true);
        }
      });
    }
  }, [user]);
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState({ 
    totalBilled: 0, totalSettled: 0, totalJob: 0, totalOtherIn: 0, totalExpense: 0, currentBalance: 0 
  });

  // Modal Add Athlete
  
  
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Transaction
  const [trainingDates, setTrainingDates] = useState<string[]>([]);
  const [unpaidRecords, setUnpaidRecords] = useState<KasRecord[]>([]);
  
  // Bulk Payment Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAthleteForBulk, setSelectedAthleteForBulk] = useState<KasAthlete | null>(null);
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState<string>("");
  const [bulkPaymentRecords, setBulkPaymentRecords] = useState<{record: KasRecord, toPay: number}[]>([]);

  const [showTrxModal, setShowTrxModal] = useState(false);
  const [trxType, setTrxType] = useState<TransactionType>("IN_JOB");
  const [trxAmount, setTrxAmount] = useState("");
  const [trxDesc, setTrxDesc] = useState("");

  useEffect(() => {
    void loadData();
  }, [selectedDate, activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      const p: Promise<any>[] = [
        getKasAthletes(),
        getKasSummary(),
        getTrainingDates(),
        getAllKasRecords() // Always fetch all records to find unpaid ones
      ];
      
      if (activeTab === "daily") {
        p.push(getKasRecordsByDate(selectedDate));
      } else if (activeTab === "transactions") {
        p.push(getKasTransactions());
      } else if (activeTab === "recap" || activeTab === "debt") {
        p.push(Promise.resolve([])); // Handled by allRecords
      }

      const results = await Promise.all(p);
      setAthletes(results[0].sort((a: KasAthlete, b: KasAthlete) => a.name.localeCompare(b.name)));
      const dates = results[2];
      setTrainingDates(dates);
      
      const allRecs = results[3] || [];
      setAllRecords(allRecs);
      
      // Calculate summary from actual Firestore records only (no auto-Alpa)
      // Auto-Alpa was inflating totals for dates where admin hasn't inputted data yet
      let summaryData = results[1];
      setSummary(summaryData);
      // Default selectedDate to latest training if not set
      if (selectedDate === "2026-04-01" && dates.length > 0 && activeTab === "daily" && !selectedDate) {
        setSelectedDate(dates[0]);
      }
      
      // Calculate global unpaid — only from actual Firestore records
      const unpaid: KasRecord[] = [];

      allRecs.forEach((r: KasRecord) => {
        if (r.totalBilled > 0 && !r.isSettled) {
          unpaid.push(r);
        }
      });
      setUnpaidRecords(unpaid);
      
      if (activeTab === "daily") setRecords(results[4] || []);
      else if (activeTab === "transactions") setTransactions(results[4] || []);

    } catch (error) {
      console.error("Failed to load kas data:", error);
    } finally {
      setLoading(false);
    }
  }

  

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!trxAmount || !trxDesc.trim()) return;
    setIsSubmitting(true);
    try {
      await addKasTransaction({
        date: new Date().toISOString().split('T')[0],
        type: trxType,
        amount: Number(trxAmount),
        description: trxDesc.trim()
      });
      setTrxAmount("");
      setTrxDesc("");
      setShowTrxModal(false);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTrx(id: string) {
    if(!confirm("Yakin hapus transaksi ini?")) return;
    try {
      await deleteKasTransaction(id);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  }

  const getAthleteRecord = (athleteId: string): Partial<KasRecord> => {
    const existing = records.find((r) => r.athleteId === athleteId);
    if (existing) return existing;
    
    // No record = no checkboxes checked, no auto-Alpa
    return {
      athleteId: athleteId as string,
      paidKas: false,
      isLate: false,
      noNews: false,
      isExcused: false,
      isExcusedWork: false,
      isExcusedOther: false,
      isSettled: false,
      totalBilled: 0,
    };
  };

  const calculateTotal = (paidKas: boolean, isLate: boolean, noNews: boolean, isExcused: boolean, isExcusedWork?: boolean, isExcusedOther?: boolean) => {
    // Izin Kerja/Sekolah → free
    if (isExcusedWork) return 0;
    // Izin Lainnya → Rp 23,000 (kas 13rb + denda 10rb)
    if (isExcusedOther) return 23000;
    // Legacy isExcused → free (backward compat)
    if (isExcused) return 0;
    if (noNews) return 26000;
    let total = 0;
    if (paidKas) total += 13000;
    if (isLate) total += 5000;
    return total;
  };

  async function handleRecordChange(
    athlete: KasAthlete,
    field: "paidKas" | "isLate" | "noNews" | "isExcused" | "isExcusedWork" | "isExcusedOther",
    value: boolean,
  ) {
    const existingRecord = getAthleteRecord(athlete.id!);
        let newPaidKas = !!existingRecord.paidKas;
    let newIsLate = !!existingRecord.isLate;
    let newNoNews = !!existingRecord.noNews;
    let newIsExcused = !!existingRecord.isExcused;
    let newIsExcusedWork = !!existingRecord.isExcusedWork;
    let newIsExcusedOther = !!existingRecord.isExcusedOther;

    if (field === "paidKas") newPaidKas = value;
    if (field === "isLate") newIsLate = value;
    if (field === "isExcusedWork") {
      newIsExcusedWork = value;
      if (value) {
        newIsExcusedOther = false;
        newIsExcused = false;
        newPaidKas = false;
        newIsLate = false;
        newNoNews = false;
      }
    }
    if (field === "isExcusedOther") {
      newIsExcusedOther = value;
      if (value) {
        newIsExcusedWork = false;
        newIsExcused = false;
        newPaidKas = false;
        newIsLate = false;
        newNoNews = false;
      }
    }
    // Legacy isExcused → treat as isExcusedWork
    if (field === "isExcused") {
      newIsExcused = value;
      if (value) {
        newPaidKas = false;
        newIsLate = false;
        newNoNews = false;
        newIsExcusedWork = false;
        newIsExcusedOther = false;
      }
    }
    if (field === "noNews") {
      newNoNews = value;
      if (value) {
        newPaidKas = true;
        newIsLate = false;
        newIsExcused = false;
        newIsExcusedWork = false;
        newIsExcusedOther = false;
      }
    }

    const totalBilled = calculateTotal(newPaidKas, newIsLate, newNoNews, newIsExcused, newIsExcusedWork, newIsExcusedOther);

    const recordToSave: Partial<KasRecord> = {
      date: selectedDate,
      athleteId: athlete.id!,
      name: athlete.name,
      
      paidKas: newPaidKas,
      isLate: newIsLate,
      noNews: newNoNews,
      isExcused: newIsExcused,
      isExcusedWork: newIsExcusedWork,
      isExcusedOther: newIsExcusedOther,
      totalBilled,
      isSettled: !!existingRecord.isSettled,
    };
    if (existingRecord.id) recordToSave.id = existingRecord.id;

    try {
      setRecords((prev) => {
        const filtered = prev.filter((r) => r.athleteId !== athlete.id);
        return [...filtered, recordToSave as KasRecord];
      });
      const newId = await saveKasRecord(recordToSave);
      
      // Update local state with the new ID so subsequent clicks update the same document!
      if (!recordToSave.id) {
        setRecords((prev) => prev.map(r => r.athleteId === athlete.id ? { ...r, id: newId } : r));
      }
      
      // Update summary in background WITHOUT full reload (prevents scroll jump)
      const s = await getKasSummary();
      setSummary(s);
    } catch (error) {
      console.error("Save error:", error);
      await loadData();
    }
  }

  async function handleSettledToggle(athlete: KasAthlete, isSettled: boolean) {
    const existingRecord = getAthleteRecord(athlete.id!);
    if ((existingRecord.totalBilled || 0) === 0) return;
    try {
      setRecords((prev) =>
        prev.map((r) => (r.athleteId === athlete.id ? { ...r, isSettled } : r)),
      );
      await saveKasRecord({
        id: existingRecord.id,
        date: selectedDate,
        athleteId: athlete.id!,
        name: athlete.name,
        
        isSettled,
      });
      // Update summary in background WITHOUT full reload
      const s = await getKasSummary();
      setSummary(s);
    } catch (error) {
      console.error(error);
      await loadData();
    }
  }

  const todayTotal = useMemo(
    () => records.reduce((sum, item) => sum + (item.totalBilled || 0), 0),
    [records],
  );

  const exportToCSV = () => {
    if (allRecords.length === 0) return alert("Data kosong");
    const headers = ["Tanggal", "Nama Atlet", "Kas", "Telat", "Alpa", "Pengecualian", "Tagihan", "Lunas"];
    const rows = allRecords.map(r => [
      r.date, r.name, r.paidKas ? "Ya" : "Tidak", r.isLate ? "Ya" : "Tidak", r.noNews ? "Ya" : "Tidak", r.isExcused ? "Ya" : "Tidak", r.totalBilled, r.isSettled ? "Ya" : "Tidak"
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n";
    rows.forEach(row => {
      csvContent += row.join(",") + "\\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Rekap_Kas_Crown.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-3 text-slate-100 sm:p-4">
      <div className="mx-auto flex w-full flex-col gap-4">
        
        {/* Header & Tabs */}
        <header className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Kas Crown</h1>
              <p className="mt-1 text-slate-400">
                Kelola kas harian, denda, uang job, dan saldo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isKasAdmin && (
                <>
                  <button
                    onClick={() => setShowTrxModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
                  >
                    <Wallet className="h-4 w-4" />
                    Catat Transaksi
                  </button>
                  
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 border-b border-white/10 pb-1 overflow-x-auto">
            <button onClick={() => setActiveTab("daily")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'daily' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Absen Kas (Harian)
            </button>
            <button onClick={() => setActiveTab("debt")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'debt' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Tunggakan Atlet
            </button>
            <button onClick={() => setActiveTab("transactions")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Uang Job & Pengeluaran
            </button>

            <button onClick={() => setActiveTab("recap")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'recap' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Export Rekap (CSV)
            </button>
          </div>
        </header>

        {/* Global Summary Cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-xl relative overflow-hidden group">
            <p className="text-sm font-medium text-emerald-500/80">Saldo Kas Total (Netto)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              Rp {summary.currentBalance.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Uang Job & Pemasukan</p>
            <p className="mt-2 text-2xl font-bold text-cyan-400">
              Rp {(summary.totalJob + summary.totalOtherIn).toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Total Atlet Lunas</p>
            <p className="mt-2 text-2xl font-bold text-cyan-400">
              Rp {summary.totalSettled.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Piutang Belum Lunas</p>
            <p className="mt-2 text-2xl font-bold text-red-400">
              Rp {(summary.totalBilled - summary.totalSettled).toLocaleString("id-ID")}
            </p>
          </div>
        </section>

        {/* TAB 1: KAS HARIAN */}
        {activeTab === "daily" && (
          <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Kas Harian Latihan</h2>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-400">Tanggal:</label>
                {trainingDates.length > 0 ? (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-xs truncate"
                  >
                    {trainingDates.map(date => (
                      <option key={date} value={date}>
                        {format(new Date(date), 'EEEE, dd MMM yyyy', {locale: idLocale})}
                      </option>
                    ))}
                    <option value="manual">-- Input Manual --</option>
                  </select>
                ) : null}

                {(!trainingDates.length || selectedDate === 'manual') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate === 'manual' ? '' : selectedDate}
                      min="2026-04-01"
                      onChange={async (e) => {
                        const val = e.target.value;
                        setSelectedDate(val);
                        if (val && val !== 'manual' && !trainingDates.includes(val)) {
                           if(confirm(`Tanggal ${val} tidak ada di jadwal. Tambahkan sebagai Latihan Tambahan di kalender?`)) {
                             await addCustomTrainingEvent(val);
                             // Reload data to fetch updated training dates
                             loadData();
                           }
                        }
                      }}
                      className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    {trainingDates.length === 0 && <span className="text-xs text-rose-400">Jadwal dari kalender kosong, silakan input manual.</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 table-fixed">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-[44px]" />
                  <col className="w-[44px]" />
                  <col className="w-[44px]" />
                  <col className="w-[52px]" />
                  <col className="w-[52px]" />
                  <col className="w-[90px]" />
                  <col className="w-[70px]" />
                </colgroup>
                <thead className="bg-white/5 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="pl-4 pr-2 py-3 font-medium text-left">Nama</th>
                    <th className="px-1 py-3 text-center font-medium">Kas</th>
                    <th className="px-1 py-3 text-center font-medium">Telat</th>
                    <th className="px-1 py-3 text-center font-medium">Alpa</th>
                    <th className="px-1 py-3 text-center font-medium leading-tight">Izin<br/><span className="text-emerald-400/70 normal-case">Kerja</span></th>
                    <th className="px-1 py-3 text-center font-medium leading-tight">Izin<br/><span className="text-yellow-400/70 normal-case">Lain</span></th>
                    <th className="px-2 py-3 text-right font-medium">Tagihan</th>
                    <th className="px-2 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Memuat data...</td>
                    </tr>
                  ) : athletes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Belum ada atlet.</td>
                    </tr>
                  ) : (
                    athletes.map((athlete) => {
                      const record = getAthleteRecord(athlete.id!);
                      const isAnyExcused = !!record.isExcusedWork || !!record.isExcusedOther || !!record.isExcused;
                      return (
                        <tr key={athlete.id} className="hover:bg-white/[0.02]">
                          <td className="pl-4 pr-2 py-3 font-medium text-white truncate text-sm">{athlete.name}</td>
                          <td className="px-1 py-3 text-center">
                            <input type="checkbox" disabled={!isKasAdmin || isAnyExcused} checked={!!record.paidKas} onChange={(e) => handleRecordChange(athlete, "paidKas", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black disabled:opacity-30" />
                          </td>
                          <td className="px-1 py-3 text-center">
                            <input type="checkbox" checked={!!record.isLate} disabled={!isKasAdmin || !!record.noNews || isAnyExcused} onChange={(e) => handleRecordChange(athlete, "isLate", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-orange-500 focus:ring-orange-500 focus:ring-offset-black disabled:opacity-30" />
                          </td>
                          <td className="px-1 py-3 text-center">
                            <input type="checkbox" disabled={!isKasAdmin || isAnyExcused} checked={!!record.noNews} onChange={(e) => handleRecordChange(athlete, "noNews", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-red-500 focus:ring-red-500 focus:ring-offset-black disabled:opacity-30" />
                          </td>
                          <td className="px-1 py-3 text-center">
                            <input type="checkbox" disabled={!isKasAdmin} checked={!!record.isExcusedWork} onChange={(e) => handleRecordChange(athlete, "isExcusedWork", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-black disabled:opacity-50" />
                          </td>
                          <td className="px-1 py-3 text-center">
                            <input type="checkbox" disabled={!isKasAdmin} checked={!!record.isExcusedOther} onChange={(e) => handleRecordChange(athlete, "isExcusedOther", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-black disabled:opacity-50" />
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-cyan-400 text-sm">
                            Rp {(record.totalBilled || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-2 py-3 text-center">
                            {(record.totalBilled || 0) > 0 ? (
                              <button onClick={() => isKasAdmin && handleSettledToggle(athlete, !record.isSettled)} className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${record.isSettled ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                                {record.isSettled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {record.isSettled ? "Lunas" : "Belum"}
                              </button>
                            ) : <span className="text-slate-600">-</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Total Tagihan Hari ini */}
                  <tr className="bg-white/[0.03]">
                    <td colSpan={6} className="pl-6 pr-3 py-3 text-right font-medium text-slate-400">Total Tagihan Hari Ini:</td>
                    <td className="px-3 py-3 text-right font-bold text-yellow-400">Rp {todayTotal.toLocaleString("id-ID")}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="px-4 pb-4 pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 border-t border-white/5">
              <span><span className="text-cyan-400">●</span> Kas = Rp 13rb</span>
              <span><span className="text-orange-400">●</span> Telat = +Rp 5rb</span>
              <span><span className="text-red-400">●</span> Alpa = Rp 26rb</span>
              <span><span className="text-emerald-400">●</span> Izin Kerja = Gratis</span>
              <span><span className="text-yellow-400">●</span> Izin Lain = Rp 23rb</span>
            </div>
          </section>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-white">Uang Job & Pengeluaran Manual</h2>
              </div>
            </div>

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
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Memuat...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Belum ada catatan transaksi.</td></tr>
                  ) : (
                    transactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">{format(new Date(trx.date), 'dd MMM yyyy', {locale: idLocale})}</td>
                        <td className="px-6 py-4">
                          {trx.type === 'IN_JOB' && <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Uang Job</span>}
                          {trx.type === 'IN_OTHER' && <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Pemasukan</span>}
                          {trx.type === 'OUT_EXPENSE' && <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs"><ArrowDownCircle className="w-3 h-3"/> Pengeluaran</span>}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {trx.description}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${trx.type === 'OUT_EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {trx.type === 'OUT_EXPENSE' ? '-' : '+'} Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isKasAdmin && <button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        

        {/* TAB 3: RECAP */}
        {activeTab === "recap" && (
          <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="w-12 h-12 text-cyan-500/50 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Rekap Kas Semua Tanggal</h2>
              <p className="text-slate-400 max-w-md mb-6">Unduh file CSV untuk melihat riwayat absensi, tagihan, dan tunggakan seluruh atlet di semua tanggal latihan.</p>
              
              <button
                onClick={exportToCSV}
                className="flex items-center justify-center gap-2 rounded-xl bg-white text-black px-6 py-3 font-semibold transition-all hover:bg-slate-200 active:scale-95"
              >
                <Download className="h-4 w-4" />
                Export Rekap Kas (CSV)
              </button>
            </div>
          </section>
        )}

        
        {/* TAB 2: TUNGGAKAN ATLET (BULK PAYMENT) */}
        {activeTab === "debt" && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="border-b border-white/10 bg-white/[0.02] p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Atlet dengan Tunggakan</h2>
            </div>
            <div className="p-4 sm:p-6">
              {athletes.filter(a => unpaidRecords.some(r => r.athleteId === a.id)).length === 0 ? (
                <div className="text-center text-slate-500 py-8">Hebat! Tidak ada atlet yang nunggak.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {athletes.map(athlete => {
                    const athleteUnpaid = unpaidRecords.filter(r => r.athleteId === athlete.id);
                    if (athleteUnpaid.length === 0) return null;
                    const totalUnpaid = athleteUnpaid.reduce((sum, r) => sum + r.totalBilled, 0);
                    return (
                      <div key={athlete.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-white text-lg">{athlete.name}</h3>
                          <p className="text-xs text-slate-400 mb-3">{athleteUnpaid.length}x Latihan Belum Bayar</p>
                          <div className="text-2xl font-black text-red-400 mb-4">Rp {totalUnpaid.toLocaleString('id-ID')}</div>
                        </div>
                        <button
                          onClick={() => {
                            if(!isKasAdmin) return;
                            setSelectedAthleteForBulk(athlete);
                            setBulkPaymentAmount(totalUnpaid.toString());
                            setBulkPaymentRecords(athleteUnpaid.map(r => ({record: r, toPay: r.totalBilled})));
                            setShowBulkModal(true);
                          }}
                          className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${isKasAdmin ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/5 text-slate-500 cursor-not-allowed"}`}
                        >
                          Bayar Tagihan
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}


        {/* MODAL TRANSAKSI */}
        {showTrxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
              <h3 className="mb-4 text-xl font-bold text-white">Catat Transaksi</h3>
              <form onSubmit={handleAddTransaction}>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-400">Jenis Transaksi</label>
                    <select value={trxType} onChange={(e) => setTrxType(e.target.value as TransactionType)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
                      <option value="IN_JOB">Pemasukan Uang Job / Lomba</option>
                      <option value="IN_OTHER">Pemasukan Lainnya (Donasi dll)</option>
                      <option value="OUT_EXPENSE">Pengeluaran Tim (Beli matras dll)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-400">Nominal (Rp)</label>
                    <input type="number" required value={trxAmount} onChange={(e) => setTrxAmount(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white placeholder-slate-600" placeholder="1000000" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-400">Keterangan</label>
                    <input type="text" required value={trxDesc} onChange={(e) => setTrxDesc(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white placeholder-slate-600" placeholder="Contoh: Honor DBL / Beli lakban..." />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setShowTrxModal(false)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-50">
                    {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        {/* MODAL BULK PAYMENT */}
        {showBulkModal && selectedAthleteForBulk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Bayar Tagihan {selectedAthleteForBulk.name}</h3>
                <button onClick={() => setShowBulkModal(false)}><XCircle className="w-6 h-6 text-slate-400 hover:text-white transition-colors" /></button>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm font-bold text-slate-300 mb-2">Rincian Latihan Belum Lunas:</p>
                  <ul className="space-y-2 text-sm">
                    {bulkPaymentRecords.map((r, i) => (
                      <li key={i} className="flex justify-between text-slate-400">
                        <span>{r.record.date} {r.record.isLate ? '(Telat)' : ''}{r.record.noNews ? '(Bolos)' : ''}</span>
                        <span className="text-cyan-400">Rp {r.toPay.toLocaleString('id-ID')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Masukkan Nominal Bayar (Rp)</label>
                  <input
                    type="number"
                    value={bulkPaymentAmount}
                    onChange={(e) => setBulkPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white placeholder-slate-600 font-bold text-lg"
                    placeholder="Contoh: 50000"
                  />
                  <p className="text-xs text-slate-500 mt-2">Jika nominal kurang dari total tagihan, sistem akan melunasi latihan terlama terlebih dahulu.</p>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={async () => {
                    setIsSubmitting(true);
                    let nominal = Number(bulkPaymentAmount);
                    if (nominal <= 0) {
                      setIsSubmitting(false);
                      return;
                    }
                    
                    try {
                      // Sort oldest first
                      const sorted = [...bulkPaymentRecords].sort((a,b) => new Date(a.record.date).getTime() - new Date(b.record.date).getTime());
                      
                      for (const r of sorted) {
                        if (nominal <= 0) break;
                        
                        if (nominal >= r.toPay) {
                          // Lunas full
                          await saveKasRecord({
                            id: r.record.id,
                            isSettled: true,
                            date: r.record.date,
                            athleteId: r.record.athleteId,
                            name: r.record.name,
                            
                          });
                          nominal -= r.toPay;
                        } else {
                          // TODO: Partial payment support
                          // For now, if nominal doesn't cover full, we break
                          break;
                        }
                      }
                      
                      setShowBulkModal(false);
                      await loadData();
                    } catch(e) {
                      console.error(e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || Number(bulkPaymentAmount) <= 0}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
                >
                  {isSubmitting ? "Memproses..." : `Proses Pembayaran Rp ${Number(bulkPaymentAmount).toLocaleString('id-ID')}`}
                </button>
              </div>
            </div>
          </div>
        )}


        </div>
    </main>
  );
}
