"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HeartPulse, Plus, X, Edit2, AlertCircle, CheckCircle2 } from "lucide-react";

type SupplyStatus = "Tersedia" | "Hampir Habis" | "Habis" | "Kosong (Belum Beli)";

interface P3KItem {
  id?: string;
  name: string;
  category: "Obat" | "Alat Medis" | "Lainnya";
  qty: string;
  status: SupplyStatus;
  note?: string;
}

const CATEGORIES = ["Obat", "Alat Medis", "Lainnya"];
const STATUSES: SupplyStatus[] = ["Tersedia", "Hampir Habis", "Habis", "Kosong (Belum Beli)"];

export default function P3KPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";
  
  const [items, setItems] = useState<P3KItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add/Edit Dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<P3KItem, "id">>({
    name: "",
    category: "Obat",
    qty: "",
    status: "Tersedia",
    note: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "crown-p3k"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as P3KItem));
      // Sort by status priority (Habis -> Hampir Habis -> Tersedia)
      data.sort((a, b) => {
        const priority = { "Habis": 1, "Kosong (Belum Beli)": 1, "Hampir Habis": 2, "Tersedia": 3 };
        return priority[a.status] - priority[b.status];
      });
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ name: "", category: "Obat", qty: "1", status: "Tersedia", note: "" });
    setOpen(true);
  };

  const handleOpenEdit = (item: P3KItem) => {
    setEditingId(item.id!);
    setForm({
      name: item.name,
      category: item.category,
      qty: item.qty,
      status: item.status,
      note: item.note || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.qty) return;
    
    if (editingId) {
      await updateDoc(doc(db, "crown-p3k", editingId), form);
    } else {
      await addDoc(collection(db, "crown-p3k"), form);
    }
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus item P3K ini?")) {
      await deleteDoc(doc(db, "crown-p3k", id));
      setOpen(false);
    }
  };

  const getStatusColor = (status: SupplyStatus) => {
    switch (status) {
      case "Tersedia": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Hampir Habis": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Habis": 
      case "Kosong (Belum Beli)": 
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  const getStatusIcon = (status: SupplyStatus) => {
    switch (status) {
      case "Tersedia": return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "Hampir Habis": return <AlertCircle className="w-4 h-4 mr-1" />;
      case "Habis":
      case "Kosong (Belum Beli)": 
        return <X className="w-4 h-4 mr-1" />;
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-red-500/50 border-t-red-500 w-12 h-12"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 py-6 relative">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <HeartPulse className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-red-400 to-rose-600 bg-clip-text text-transparent uppercase tracking-wider">
              P3K Crown
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Inventory Obat & Alat Medis Latihan
          </p>
          
          {isAdmin && (
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="absolute top-6 right-0 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Item
            </Button>
          )}
        </div>

        {/* Info Banner for Athletes */}
        {!isAdmin && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200">
              <span className="font-bold">Info untuk Atlit:</span> Semua obat dan alat P3K yang ada di daftar ini selalu dibawa saat jadwal latihan. Kalau kamu punya alergi spesifik, wajib bawa obat pribadi ya.
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Total Item</p>
            <p className="text-2xl font-black text-white mt-1">{items.length}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-400/80 uppercase font-bold tracking-widest">Tersedia</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{items.filter(i => i.status === "Tersedia").length}</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-400/80 uppercase font-bold tracking-widest">Hampir Habis</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{items.filter(i => i.status === "Hampir Habis").length}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-red-400/80 uppercase font-bold tracking-widest">Habis/Kosong</p>
            <p className="text-2xl font-black text-red-400 mt-1">{items.filter(i => i.status === "Habis" || i.status === "Kosong (Belum Beli)").length}</p>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 shadow-xl">
          {items.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Belum ada data P3K.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors first:rounded-t-xl last:rounded-b-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-white">{item.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>Qty: <span className="font-mono text-slate-200">{item.qty}</span></span>
                      {item.note && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="italic">{item.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </div>
                    
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenEdit(item)}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 shrink-0 h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingId ? "Edit Item P3K" : "Tambah Item P3K"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update stok barang P3K Crown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Nama Obat/Barang</label>
              <Input 
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Mis: Betadine / Counterpain..."
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Kategori</label>
                <Select value={form.category} onValueChange={(v: any) => setForm({...form, category: v})}>
                  <SelectTrigger className="bg-black/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Quantity</label>
                <Input 
                  value={form.qty}
                  onChange={e => setForm({...form, qty: e.target.value})}
                  placeholder="Mis: 1 Botol / 5 Strip"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Status Stok</label>
              <Select value={form.status} onValueChange={(v: any) => setForm({...form, status: v})}>
                <SelectTrigger className={`bg-black/50 border-white/10 ${
                  form.status === "Tersedia" ? "text-emerald-400" :
                  form.status === "Hampir Habis" ? "text-amber-400" : "text-red-400"
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Catatan (Opsional)</label>
              <Input 
                value={form.note}
                onChange={e => setForm({...form, note: e.target.value})}
                placeholder="Mis: Expired Jan 2027..."
                className="bg-black/50 border-white/10 text-white text-sm"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
              {editingId && (
                <Button variant="outline" onClick={() => handleDelete(editingId)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                  Hapus
                </Button>
              )}
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5">Batal</Button>
              <Button onClick={handleSave} className="flex-1 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]">Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}