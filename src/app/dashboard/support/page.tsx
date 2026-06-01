"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, storage } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query } from "firebase/firestore";
import { ref, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, CheckCircle2, Clock, Trash2, Edit, ImageIcon } from "lucide-react";

interface ShirtOrder {
  id?: string;
  nama: string;
  noHp: string;
  angkatan: string;
  ukuran: string;
  referral: string;
  status: "pending" | "lunas";
  buktiTransferUrl?: string;
  createdAt?: any;
}

export default function DanusSupportPage() {
  const { isAdmin } = useAuth();
  
  const [orders, setOrders] = useState<ShirtOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Dialog
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ShirtOrder | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [adminPaymentFile, setAdminPaymentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "danus_shirts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShirtOrder));
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  const handleOpenEdit = (order: ShirtOrder) => {
    setEditingOrder({ ...order });
    setAdminPaymentFile(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editingOrder?.id) return;
    
    setIsUploading(true);
    try {
      let updatedData: any = {
        status: editingOrder.status
      };

      if (adminPaymentFile) {
        const fileRef = ref(storage, `danus_payments/${editingOrder.id}_${adminPaymentFile.name}`);
        await uploadBytes(fileRef, adminPaymentFile);
        const url = await getDownloadURL(fileRef);
        updatedData.buktiTransferUrl = url;
      }

      await updateDoc(doc(db, "danus_shirts", editingOrder.id), updatedData);
      setOpen(false);
    } catch (error) {
      console.error("Gagal menyimpan pesanan:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus pesanan baju ini?")) {
      // Jika pesanan memiliki gambar, hapus juga dari Storage
      if (editingOrder?.buktiTransferUrl) {
        try {
          const imageRef = ref(storage, editingOrder.buktiTransferUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Gagal menghapus gambar dari storage:", error);
        }
      }
      
      await deleteDoc(doc(db, "danus_shirts", id));
      setOpen(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="animate-spin rounded-full border-2 border-red-500/50 border-t-red-500 w-12 h-12"></div>
    </div>
  );

  const totalPesanan = orders.length;
  const lunasCount = orders.filter(o => o.status === "lunas").length;
  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Shirt className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-red-400 to-rose-600 bg-clip-text text-transparent uppercase tracking-wider">
              Data Pesanan Danus Baju
            </h1>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Kejurnas 2026 Support
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Total Pesanan</p>
            <p className="text-3xl font-black text-white mt-1">{totalPesanan}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-400/80 uppercase font-bold tracking-widest">Lunas</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{lunasCount}</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-400/80 uppercase font-bold tracking-widest">Belum Lunas</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{pendingCount}</p>
          </div>
        </div>

        {/* Order List (Table style for Desktop, Card style for Mobile) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 shadow-xl overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Belum ada pesanan baju.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                    <th className="p-4 font-bold">Nama</th>
                    <th className="p-4 font-bold">No HP</th>
                    <th className="p-4 font-bold">Angkatan</th>
                    <th className="p-4 font-bold">Ukuran</th>
                    <th className="p-4 font-bold">Referral</th>
                    <th className="p-4 font-bold">Status</th>
                    {isAdmin && <th className="p-4 font-bold text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium text-white">{order.nama}</td>
                      <td className="p-4 text-slate-300 font-mono text-sm">{order.noHp}</td>
                      <td className="p-4 text-slate-300 text-center">{order.angkatan || '-'}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
                          {order.ukuran}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 italic text-sm">{order.referral || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {order.status === "lunas" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                          {order.buktiTransferUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={order.buktiTransferUrl} 
                              alt="Bukti"
                              className="w-10 h-10 object-cover rounded-md cursor-pointer border border-white/20 hover:opacity-80 transition-opacity shadow-lg shadow-black/50"
                              onClick={() => setPreviewImage(order.buktiTransferUrl!)}
                              title="Klik untuk melihat bukti transfer"
                            />
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleOpenEdit(order)}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Pesanan</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update status pembayaran untuk pesanan {editingOrder?.nama}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Status Pembayaran</label>
              <Select 
                value={editingOrder?.status || "pending"} 
                onValueChange={(v: any) => setEditingOrder(prev => prev ? {...prev, status: v} : null)}
              >
                <SelectTrigger className={`bg-black/50 border-white/10 ${
                  editingOrder?.status === "lunas" ? "text-emerald-400" : "text-amber-400"
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingOrder?.buktiTransferUrl && (
              <div className="mt-4 p-4 border border-white/10 rounded-xl bg-black/30">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Bukti Transfer</label>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={editingOrder.buktiTransferUrl} 
                    alt="Bukti Transfer" 
                    className="max-w-full max-h-[300px] rounded-lg object-contain border border-white/5"
                  />
                </div>
                <a 
                  href={editingOrder.buktiTransferUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block text-center text-xs text-blue-400 mt-2 hover:underline"
                >
                  Buka gambar di tab baru
                </a>
              </div>
            )}

            {!editingOrder?.buktiTransferUrl && (
              <div className="mt-4 p-4 border border-white/10 rounded-xl bg-black/30">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Upload Bukti Transfer (Admin)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAdminPaymentFile(e.target.files[0]);
                    }
                  }}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-red-600/10 file:text-red-500
                    hover:file:bg-red-600/20 transition-all disabled:opacity-50"
                />
                {adminPaymentFile && <p className="text-xs text-emerald-400 mt-2 truncate">File: {adminPaymentFile.name}</p>}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
              {editingOrder?.id && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDelete(editingOrder.id!)} 
                  className="px-3 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  title="Hapus Pesanan"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading} className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5">Batal</Button>
              <Button onClick={handleSave} disabled={isUploading} className="flex-1 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                {isUploading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 p-6 max-w-3xl flex flex-col items-center">
          <DialogHeader className="w-full text-left mb-4">
            <DialogTitle className="text-xl font-bold text-white">Bukti Transfer</DialogTitle>
          </DialogHeader>
          <div className="bg-black/50 p-2 rounded-xl border border-white/10 w-full flex justify-center shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewImage || ""} 
              alt="Preview Bukti Transfer" 
              className="max-w-full max-h-[70vh] rounded-lg object-contain" 
            />
          </div>
          <a 
            href={previewImage || ""} 
            target="_blank" 
            rel="noreferrer"
            className="text-blue-400 font-medium text-sm mt-6 hover:underline hover:text-blue-300 transition-colors"
          >
            Buka gambar ukuran penuh di tab baru
          </a>
        </DialogContent>
      </Dialog>
    </div>
  );
}
