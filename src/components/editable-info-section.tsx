"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { InfoCategory, validateInfoItem } from "@/lib/info-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Item = { id: string; category: InfoCategory; title: string; description: string };
const cardClass = "border-white/10 bg-white/5 backdrop-blur-md shadow-xl text-slate-100";

export function EditableInfoSection({ category }: { category: InfoCategory }) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => onSnapshot(collection(db, "crown-info-board"), snap => {
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item)).filter(i => i.category === category));
  }), [category]);

  async function save(id?: string) {
    const item = { category, ...form };
    if (!validateInfoItem(item)) return;
    if (id) await updateDoc(doc(db, "crown-info-board", id), form);
    else await addDoc(collection(db, "crown-info-board"), item);
    setForm({ title: "", description: "" });
    setEditing(null);
  }

  return <div className="space-y-3">
    {items.length === 0 && !isAdmin && <p className="text-sm text-slate-500">Belum ada informasi.</p>}
    {items.map(item => <Card key={item.id} className={cardClass}><CardContent className="p-4">
      {editing === item.id ? <div className="space-y-2">
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul" className="bg-black/20 border-white/10" />
        <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan" className="bg-black/20 border-white/10" />
        <div className="flex gap-2"><Button size="sm" onClick={() => save(item.id)}>Simpan</Button><Button size="sm" variant="outline" onClick={() => setEditing(null)}>Batal</Button></div>
      </div> : <div className="flex justify-between gap-3"><div><h3 className="font-semibold text-white">{item.title}</h3>{item.description && <p className="text-sm text-slate-400 mt-1">{item.description}</p>}</div>
        {isAdmin && <div className="flex"><Button size="icon" variant="ghost" onClick={() => { setEditing(item.id); setForm({ title: item.title, description: item.description }); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => confirm("Hapus informasi ini?") && deleteDoc(doc(db, "crown-info-board", item.id))}><Trash2 className="h-4 w-4 text-rose-400" /></Button></div>}
      </div>}
    </CardContent></Card>)}
    {isAdmin && !editing && <Card className={cardClass}><CardContent className="p-4 space-y-2">
      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul informasi baru" className="bg-black/20 border-white/10" />
      <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan" className="bg-black/20 border-white/10" />
      <Button size="sm" onClick={() => save()}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
    </CardContent></Card>}
  </div>;
}
