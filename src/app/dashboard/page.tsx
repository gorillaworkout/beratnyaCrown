"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Megaphone, Receipt, Users, Trophy, ChevronRight, FileText, CalendarDays, ExternalLink, Dumbbell, Flag, Plus, Trash2, RefreshCw, Pencil, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc, orderBy, query } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const glassCardClass =
  "border-white/10 bg-white/5 backdrop-blur-md shadow-xl text-slate-100 transition-all hover:bg-white/[0.07]";

type Milestone = {
  id: string;
  date: string;
  title: string;
  description: string;
  status: "done" | "current" | "upcoming" | "delayed";
};

export default function InfoDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isMilestonesLoading, setIsMilestonesLoading] = useState(true);

  // Form State for Admin
  const [newDate, setNewDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  
  // State for Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    const q = query(collection(db, "crown-milestones"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const ms: Milestone[] = [];
      snapshot.forEach((doc) => {
        ms.push({ id: doc.id, ...doc.data() } as Milestone);
      });
      setMilestones(ms);
      setIsMilestonesLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddMilestone = async () => {
    if (!newDate || !newTitle) return;
    await addDoc(collection(db, "crown-milestones"), {
      date: newDate,
      title: newTitle,
      description: newDesc,
      status: "upcoming"
    });
    setNewDate("");
    setNewTitle("");
    setNewDesc("");
  };

  const handleDeleteMilestone = async (id: string) => {
    if (confirm("Hapus milestone ini?")) {
      await deleteDoc(doc(db, "crown-milestones", id));
    }
  };

  const handleStatusChange = async (id: string, currentStatus: Milestone["status"]) => {
    const nextStatus = currentStatus === "upcoming" ? "current" : currentStatus === "current" ? "done" : currentStatus === "done" ? "delayed" : "upcoming";
    await updateDoc(doc(db, "crown-milestones", id), { status: nextStatus });
  };

  const startEditing = (ms: Milestone) => {
    setEditingId(ms.id);
    setEditDate(ms.date);
    setEditTitle(ms.title);
    setEditDesc(ms.description || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate("");
    setEditTitle("");
    setEditDesc("");
  };

  const handleUpdateMilestone = async (id: string) => {
    if (!editDate || !editTitle) return;
    await updateDoc(doc(db, "crown-milestones", id), {
      date: editDate,
      title: editTitle,
      description: editDesc,
    });
    cancelEditing();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
      case "current": return "bg-amber-500/20 border-amber-500/30 text-amber-400 animate-pulse";
      case "delayed": return "bg-rose-500/20 border-rose-500/30 text-rose-400";
      default: return "bg-slate-500/20 border-slate-500/30 text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done": return "✅";
      case "current": return "🔥";
      case "delayed": return "⚠️";
      default: return "⏳";
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Section */}
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-2.5 shadow-lg shadow-amber-500/20">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Information Board
            </h1>
          </div>
          <p className="text-sm text-slate-400 sm:text-base">
            Pusat informasi pembayaran, event, dan pengumuman tim Crown Allstar.
          </p>
        </div>

        {/* Progress Tracker (Timeline) */}
        <div className="pt-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Flag className="h-5 w-5 text-emerald-400" />
            Target & Timeline Tim
          </h2>

          <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-md shadow-xl text-slate-100 mb-6">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-emerald-100">Roadmap Menuju Kejurda 2026</CardTitle>
                  <CardDescription className="text-emerald-200/60 mt-1">
                    Pastikan semua atlet tahu target tim setiap minggunlu.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">TIMELINE</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">

              {/* Timeline Container */}
              <div className="relative border-l-2 border-white/10 ml-3 md:ml-4 space-y-6">

                {isMilestonesLoading ? (
                  <p className="text-slate-400 ml-6 text-sm">Memuat timeline...</p>
                ) : milestones.length === 0 ? (
                  <p className="text-slate-400 ml-6 text-sm">Belum ada target yang dibuat.</p>
                ) : milestones.map((ms, index) => (
                  <div key={ms.id} className="relative pl-6 md:pl-8 group">
                    {/* Dot Indicator */}
                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-black flex items-center justify-center text-[8px]
                      ${ms.status === 'done' ? 'bg-emerald-400' : ms.status === 'current' ? 'bg-amber-400 ring-2 ring-amber-400/30' : ms.status === 'delayed' ? 'bg-rose-400' : 'bg-slate-600'}
                    `}>
                    </div>

                    <div className={`p-4 rounded-xl border border-white/10 transition-all
                      ${ms.status === 'current' ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : ms.status === 'delayed' ? 'bg-rose-500/5' : 'bg-white/5'}
                    `}>
                      {editingId === ms.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400">Tanggal</label>
                              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="bg-black/40 border-white/20 text-white h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-400">Judul</label>
                              <Input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-black/40 border-white/20 text-white h-8 text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-400">Keterangan Tambahan</label>
                            <Input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-black/40 border-white/20 text-white h-8 text-sm" />
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <button onClick={() => handleUpdateMilestone(ms.id)} className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded transition-colors border border-emerald-500/20">
                              <Check className="h-3 w-3" /> Simpan Perubahan
                            </button>
                            <button onClick={cancelEditing} className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-300 bg-slate-500/10 hover:bg-slate-500/20 px-3 py-1.5 rounded transition-colors border border-slate-500/20">
                              <X className="h-3 w-3" /> Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {new Date(ms.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <h3 className={`text-lg font-bold ${ms.status === 'done' ? 'text-slate-300 line-through decoration-emerald-500/50' : ms.status === 'delayed' ? 'text-rose-200 line-through decoration-rose-500/50' : 'text-white'}`}>
                                {ms.title}
                              </h3>
                            </div>
                            <Badge className={`${getStatusColor(ms.status)} px-2 py-0.5 flex items-center gap-1.5 cursor-pointer select-none`} onClick={() => isAdmin && handleStatusChange(ms.id, ms.status)}>
                              <span>{getStatusIcon(ms.status)}</span>
                              <span className="capitalize text-xs font-semibold">{ms.status === 'current' ? 'In Progress' : ms.status === 'delayed' ? 'Tertunda' : ms.status}</span>
                            </Badge>
                          </div>

                          {ms.description && (
                            <p className={`text-sm ${ms.status === 'done' ? 'text-slate-500' : ms.status === 'delayed' ? 'text-rose-300/70' : 'text-slate-300'}`}>
                              {ms.description}
                            </p>
                          )}

                          {/* Admin Controls */}
                          {isAdmin && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(ms)} className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded">
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button onClick={() => handleDeleteMilestone(ms.id)} className="text-xs flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded">
                                <Trash2 className="h-3 w-3" /> Hapus
                              </button>
                              <button onClick={() => handleStatusChange(ms.id, ms.status)} className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded">
                                <RefreshCw className="h-3 w-3" /> Ubah Status
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Add Form */}
              {isAdmin && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Tambah Target Baru (Admin)
                  </h4>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1 md:col-span-1">
                      <label className="text-xs text-slate-400">Tanggal</label>
                      <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="bg-black/20 border-white/10 text-white [color-scheme:dark] h-9" />
                    </div>
                    <div className="space-y-1 md:col-span-1">
                      <label className="text-xs text-slate-400">Judul Target</label>
                      <Input type="text" placeholder="Contoh: Mulai Running" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-black/20 border-white/10 text-white h-9" />
                    </div>
                    <div className="space-y-1 md:col-span-2 flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400">Keterangan Tambahan</label>
                        <Input type="text" placeholder="Detail..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="bg-black/20 border-white/10 text-white h-9" />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddMilestone} disabled={!newTitle || !newDate} className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white px-3">
                          Tambah
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Section: Pembayaran & Administrasi */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Administrasi & Keuangan
            </h2>

            <Card className={glassCardClass}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Metode Pembayaran</CardTitle>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Official</Badge>
                </div>
                <CardDescription className="text-slate-400">
                  QRIS untuk pembayaran uang kas bulanan dan iuran ke Crown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-2 rounded-xl">
                    <img 
                      src="/qris-crown.jpg" 
                      alt="QRIS Bayu Darmawan" 
                      className="w-full max-w-[200px] h-auto rounded"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-t border-white/10 pt-3 pb-2 text-sm">
                    <span className="text-slate-300">Iuran Latihan</span>
                    <span className="font-semibold text-white">Rp 150.000 / bulan</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-slate-300">A.N. QRIS</span>
                    <span className="font-semibold text-white">Warung Crown</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={glassCardClass}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Biaya Kompetisi (Kejurda & Kejurnas)</CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Cicilan</Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Estimasi rincian biaya kompetisi dan termin pembayaran
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-black/20 rounded-lg p-3 border border-white/5 space-y-2">
                    <h4 className="font-semibold text-white text-sm mb-2">Total Biaya per Atlet (Basic)</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Atlet Putra (Cowo)</span>
                      <span className="font-semibold text-amber-400">Rp 1.625.000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Atlet Putri (Cewe)</span>
                      <span className="font-semibold text-amber-400">Rp 1.675.000</span>
                    </div>
                    <p className="text-xs text-slate-500 italic mt-1">*Belum termasuk GS (Tambahan +Rp50.000 untuk atlet putri jika ada additional div)</p>

                    <Accordion type="single" collapsible className="w-full mt-4">
                      <AccordionItem value="rincian" className="border-white/10 border-b-0">
                        <AccordionTrigger className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 hover:no-underline py-2">
                          Lihat Rincian Penggunaan Dana
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4 space-y-3">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-emerald-400 block uppercase">Transportasi</span>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Sewa Bus (1 unit x 2 hari)</span><span>Rp 4.000.000</span></div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-emerald-400 block uppercase">Akomodasi</span>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Sewa Hotel (14 room x 1 hari)</span><span>Rp 500.000</span></div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-emerald-400 block uppercase">Administrasi</span>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Registrasi Kejurda (40 pax)</span><span>Rp 200.000</span></div>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Registrasi Kejurnas (40 pax)</span><span>Rp 300.000</span></div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-emerald-400 block uppercase">Peralatan & Perlengkapan</span>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Kostum Atlet (40 pax)</span><span>Rp 400.000</span></div>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Kaos dan Celana (40 pax)</span><span>Rp 150.000</span></div>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>P3K (1 set)</span><span>Rp 1.000.000</span></div>
                            <div className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1"><span>Properti (1 set)</span><span>Rp 1.000.000</span></div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-emerald-400 block uppercase">Konsumsi</span>
                            <div className="flex justify-between text-xs text-slate-300"><span>Konsumsi (40 pax x 5 kali)</span><span>Rp 30.000</span></div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-white text-sm mt-4">Termin Pembayaran</h4>
                    {[
                      { date: "30 Januari", amount: "Rp 350.000", status: "passed" },
                      { date: "28 Februari", amount: "Rp 350.000", status: "passed" },
                      { date: "30 Maret", amount: "Rp 350.000", status: "upcoming" },
                      { date: "30 April", amount: "Rp 200.000", status: "upcoming" },
                      { date: "30 Mei", amount: "Rp 200.000", status: "upcoming" },
                      { date: "30 Juni", amount: "Rp 200.000", status: "upcoming", note: "Cewe +50k, Cowo/Cewe add div sisa" },
                    ].map((termin, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          {termin.status === "passed" ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                          )}
                          <span className={`text-sm ${termin.status === "passed" ? "text-slate-400 line-through decoration-slate-500" : "text-slate-200"}`}>{termin.date}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-medium ${termin.status === "passed" ? "text-slate-500" : "text-white"}`}>{termin.amount}</span>
                          {termin.note && <div className="text-[10px] text-amber-400/80 mt-0.5">{termin.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section: Events & Team Info */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <Trophy className="h-5 w-5 text-cyan-400" />
              Event & Kompetisi
            </h2>

            <Card className={glassCardClass}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Kejurda Jawa Barat 2026</CardTitle>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Upcoming</Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Kualifikasi menuju Kejurnas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/10 pb-2 text-sm">
                    <span className="text-slate-300">Tanggal Pelaksanaan</span>
                    <span className="font-semibold text-white">31 Mei 2026</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-slate-300">Status</span>
                    <span className="font-semibold text-amber-400">Persiapan Tim</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={glassCardClass}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Kejurnas ICA 2026</CardTitle>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Upcoming</Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Kejuaraan Nasional Cheerleading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-white/10 pb-2 text-sm">
                    <span className="text-slate-300">Tanggal Pelaksanaan</span>
                    <span className="font-semibold text-white">5 Juli 2026</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-slate-300">Status</span>
                    <span className="font-semibold text-amber-400">Menunggu Hasil Kejurda</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* PR Latihan Libur Lebaran */}
        <div className="pt-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <CalendarDays className="h-5 w-5 text-fuchsia-400" />
            Tugas Latihan: Libur Lebaran (18 - 30 Maret)
          </h2>

          <Card className="border-fuchsia-500/30 bg-fuchsia-950/20 backdrop-blur-md shadow-xl text-slate-100 mb-6">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-fuchsia-100">Wajib untuk Semua Atlet!</CardTitle>
                  <CardDescription className="text-fuchsia-200/60 mt-1">
                    Selama libur latihan, setiap atlet wajib menyetor video bukti latihan.
                  </CardDescription>
                </div>
                <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">MANDATORY</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-semibold text-white">Target Latihan</h3>
                  </div>
                  <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                    <li><strong className="text-cyan-300">2x Set</strong> Strength Training</li>
                    <li><strong className="text-amber-300">2x Set</strong> Cardio Training</li>
                    <li>Waktu bebas (18 - 30 Maret)</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-semibold text-white">Upload Bukti Video</h3>
                  </div>
                  <div className="space-y-2 mt-3">
                    <a href="https://drive.google.com/drive/folders/1aq6-xg0TJoeqFgJmaT1ZDPXIHfo0YlvV?usp=drive_link" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
                      <span className="text-xs font-medium text-cyan-200">Upload Strength</span>
                      <ChevronRight className="h-3 w-3 text-cyan-400" />
                    </a>
                    <a href="https://drive.google.com/drive/folders/1TkGCEmdf2OlVsHcCqvIa74Ea0lDZeirf?usp=sharing" target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors">
                      <span className="text-xs font-medium text-amber-200">Upload Cardio</span>
                      <ChevronRight className="h-3 w-3 text-amber-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Tabel Program Latihan */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Strength Table */}
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                  <div className="bg-cyan-900/30 py-2 px-3 border-b border-white/10">
                    <h4 className="font-semibold text-cyan-100 text-sm">💪 STRENGTH TRAINING (Lower & Upper)</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Gerakan</TableHead>
                        <TableHead className="text-slate-400 text-xs text-center w-20">Repetisi</TableHead>
                        <TableHead className="text-slate-400 text-xs text-center w-16">Set</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=CVaEhXotL7M" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Squat Jumps <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">10</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=IODxDxX7oi4" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Push up <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">15</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=L8fvypPrzzs" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Walking Lunges <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">20</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=pSHjTRCQxIw" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Plank <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=-M4-G8p8fmc" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Calf Raises <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">20</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=FjjdDItXEQQ" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Handstand <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=WxgJS48wf1M" target="_blank" className="hover:text-cyan-400 transition-colors flex items-center gap-1">Handstand Pushup <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">5</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Cardio Table */}
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                  <div className="bg-amber-900/30 py-2 px-3 border-b border-white/10">
                    <h4 className="font-semibold text-amber-100 text-sm">🏃‍♀️ CARDIO TRAINING</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Gerakan</TableHead>
                        <TableHead className="text-slate-400 text-xs text-center w-20">Repetisi</TableHead>
                        <TableHead className="text-slate-400 text-xs text-center w-16">Set</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=auBLPXO8Fww" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">Burpee <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">10</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=nmwgirgXLYM" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">Mountain Climber <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=DfjpR6dzLVg" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">High Knees <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-white/5">
                        <TableCell className="text-sm font-medium"><a href="https://www.youtube.com/watch?v=9FGilxCbdz8" target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">Bicycle Crunches <ExternalLink className="h-2.5 w-2.5" /></a></TableCell>
                        <TableCell className="text-sm text-center">30 Sec</TableCell>
                        <TableCell className="text-sm text-center">3</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* General Info / SOP */}
        <div className="pt-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Users className="h-5 w-5 text-blue-400" />
            Peraturan & Panduan Tim
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">SOP Latihan</p>
                  <p className="text-xs text-slate-400">Aturan keterlambatan & izin</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
            </div>

            <div className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-500/20 p-2 text-rose-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">Sistem Hukuman</p>
                  <p className="text-xs text-slate-400">Panduan fisik & denda</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
            </div>

            <div className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-white">Struktur Tim</p>
                  <p className="text-xs text-slate-400">Kapten & Pengurus 2026</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-slate-500">
            Punya pertanyaan terkait informasi di atas? Silakan hubungi pengurus tim atau pelatih.
          </p>
        </div>
      </div>
    </main>
  );
}
