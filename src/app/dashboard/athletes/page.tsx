"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
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
import { ShieldAlert, CheckCircle2, XCircle, Users, UserPlus, Trash2, Edit2, Check, X, Plus, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FirebaseUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
  role?: string;
  creationTime: string;
  lastSignInTime: string;
  lastLoginCrown: string;
};

type Athlete = {
  id: string;
  name: string;
  division?: string;
};

const DIVISIONS = ["All Girl", "Coed"] as const;

function DivisionPill({ division, size = "sm" }: { division?: string; size?: "sm" | "xs" }) {
  if (!division) return (
    <span className={`inline-flex items-center rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/20 font-medium ${size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}>
      —
    </span>
  );
  const isAG = division === "All Girl";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${
      isAG 
        ? "bg-pink-500/15 text-pink-300 border border-pink-500/25" 
        : "bg-sky-500/15 text-sky-300 border border-sky-500/25"
    } ${size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}>
      {isAG ? "All Girl" : "Coed"}
    </span>
  );
}

export default function AthletesDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState<FirebaseUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [crownAthletes, setCrownAthletes] = useState<Athlete[]>([]);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteDivision, setNewAthleteDivision] = useState<string>("All Girl");
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [editingAthleteName, setEditingAthleteName] = useState("");
  const [editingAthleteDivision, setEditingAthleteDivision] = useState("");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "crown-athletes"), (snap) => {
      setCrownAthletes(snap.docs.map(d => ({ 
        id: d.id, 
        name: (d.data() as any).name || "", 
        division: (d.data() as any).division || "" 
      })));
    });
    return () => unsub();
  }, []);

  const filteredAthletes = useMemo(() => {
    const sorted = [...crownAthletes].sort((a, b) => a.name.localeCompare(b.name));
    if (filterDivision === "all") return sorted;
    return sorted.filter(a => a.division === filterDivision);
  }, [crownAthletes, filterDivision]);

  const divisionCounts = useMemo(() => ({
    all: crownAthletes.length,
    "All Girl": crownAthletes.filter(a => a.division === "All Girl").length,
    "Coed": crownAthletes.filter(a => a.division === "Coed").length,
    unset: crownAthletes.filter(a => !a.division).length,
  }), [crownAthletes]);

  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) return;
    await addDoc(collection(db, "crown-athletes"), { name: newAthleteName.trim(), division: newAthleteDivision });
    setNewAthleteName("");
    setNewAthleteDivision("All Girl");
    setShowAddForm(false);
  };

  const handleUpdateAthlete = async (id: string) => {
    if (!editingAthleteName.trim()) return;
    try {
      await updateDoc(doc(db, "crown-athletes", id), { name: editingAthleteName.trim(), division: editingAthleteDivision });
      setEditingAthleteId(null);
      setEditingAthleteName("");
      setEditingAthleteDivision("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAthlete = async (id: string) => {
    if (window.confirm("Hapus atlit ini dari daftar?")) {
      await deleteDoc(doc(db, "crown-athletes", id));
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRoleChange = async (uid: string, action: "make_admin" | "remove_admin") => {
    setActionLoading(uid + action);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action }),
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUsersList(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserAction = async (uid: string, action: "block" | "unblock" | "delete") => {
    if (action === "delete" && !window.confirm("Apakah kamu yakin ingin MENGHAPUS akun ini permanen? Akun ini akan terhapus dari SELURUH project Gorillatix!")) {
      return;
    }

    try {
      setActionLoading(`${action}-${uid}`);
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action }),
      });
      
      if (res.ok) {
        if (action === "delete") {
          setUsersList(usersList.filter(u => u.uid !== uid));
        } else {
          setUsersList(usersList.map(u => 
            u.uid === uid ? { ...u, disabled: action === "block" } : u
          ));
        }
      }
    } catch (error) {
      console.error("Failed to perform action", error);
      alert("Gagal memproses aksi.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Akses ditolak. Halaman ini hanya untuk Administrator.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-3 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header */}
        <div className="space-y-1 pt-2 pb-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-2.5 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Manajemen Athlete
            </h1>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm pl-[52px]">
            Kelola pengguna aplikasi & daftar atlit latihan
          </p>
        </div>

        <Tabs defaultValue="athletes" className="w-full">
          <TabsList className="w-full bg-black/40 border border-white/10 mb-4 p-1 h-auto">
            <TabsTrigger value="athletes" className="flex-1 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-slate-400 text-xs sm:text-sm py-2">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Daftar Atlit
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300 text-slate-400 text-xs sm:text-sm py-2">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Pengguna App
            </TabsTrigger>
          </TabsList>

          {/* ===== ATHLETES TAB ===== */}
          <TabsContent value="athletes" className="mt-0">
            <div className="space-y-4">

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button 
                  onClick={() => setFilterDivision("all")}
                  className={`rounded-xl border p-3 sm:p-4 text-center transition-all ${
                    filterDivision === "all" 
                      ? "border-cyan-500/40 bg-cyan-500/10 shadow-lg shadow-cyan-500/5" 
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-2xl sm:text-3xl font-bold text-white">{divisionCounts.all}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Total</p>
                </button>
                <button 
                  onClick={() => setFilterDivision("All Girl")}
                  className={`rounded-xl border p-3 sm:p-4 text-center transition-all ${
                    filterDivision === "All Girl" 
                      ? "border-pink-500/40 bg-pink-500/10 shadow-lg shadow-pink-500/5" 
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-2xl sm:text-3xl font-bold text-pink-300">{divisionCounts["All Girl"]}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">All Girl</p>
                </button>
                <button 
                  onClick={() => setFilterDivision("Coed")}
                  className={`rounded-xl border p-3 sm:p-4 text-center transition-all ${
                    filterDivision === "Coed" 
                      ? "border-sky-500/40 bg-sky-500/10 shadow-lg shadow-sky-500/5" 
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-2xl sm:text-3xl font-bold text-sky-300">{divisionCounts["Coed"]}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Coed</p>
                </button>
              </div>

              {/* Add Button / Form */}
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/30 bg-transparent hover:bg-cyan-500/5 p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-cyan-300 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Tambah Atlit Baru</span>
                </button>
              ) : (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-cyan-300">Tambah Atlit Baru</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/5 transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    placeholder="Nama lengkap atlit..."
                    value={newAthleteName}
                    onChange={(e) => setNewAthleteName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddAthlete(); }}
                    className="bg-black/40 border-white/10 text-white h-11 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    {DIVISIONS.map(div => (
                      <button
                        key={div}
                        onClick={() => setNewAthleteDivision(div)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          newAthleteDivision === div
                            ? div === "All Girl"
                              ? "bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-lg shadow-pink-500/5"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-lg shadow-sky-500/5"
                            : "bg-black/20 text-slate-400 border-white/10 hover:bg-white/5"
                        }`}
                      >
                        {div}
                      </button>
                    ))}
                  </div>
                  <Button 
                    onClick={handleAddAthlete} 
                    disabled={!newAthleteName.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white h-11 font-medium disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Tambah Atlit
                  </Button>
                </div>
              )}

              {/* Athletes List */}
              <div className="space-y-2">
                {filteredAthletes.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                    <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      {filterDivision === "all" ? "Belum ada atlit. Tambahkan atlit pertama!" : `Belum ada atlit di divisi ${filterDivision}.`}
                    </p>
                  </div>
                ) : (
                  filteredAthletes.map((ath, i) => (
                    <div 
                      key={ath.id} 
                      className="group rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-all overflow-hidden"
                    >
                      {editingAthleteId === ath.id ? (
                        /* Edit Mode */
                        <div className="p-3 sm:p-4 space-y-3 animate-in fade-in duration-150">
                          <Input 
                            value={editingAthleteName} 
                            onChange={(e) => setEditingAthleteName(e.target.value)}
                            onKeyDown={(e) => { 
                              if (e.key === "Enter") handleUpdateAthlete(ath.id); 
                              if (e.key === "Escape") setEditingAthleteId(null); 
                            }}
                            className="bg-black/40 border-white/10 text-white h-10 text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            {DIVISIONS.map(div => (
                              <button
                                key={div}
                                onClick={() => setEditingAthleteDivision(div)}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                                  editingAthleteDivision === div
                                    ? div === "All Girl"
                                      ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                                      : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                                    : "bg-black/20 text-slate-400 border-white/10"
                                }`}
                              >
                                {div}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleUpdateAthlete(ath.id)} 
                              size="sm" 
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-9"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Simpan
                            </Button>
                            <Button 
                              onClick={() => setEditingAthleteId(null)} 
                              size="sm" 
                              variant="outline" 
                              className="h-9 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="flex items-center gap-3 p-3 sm:p-4">
                          {/* Avatar */}
                          <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            ath.division === "All Girl" 
                              ? "bg-gradient-to-br from-pink-500/30 to-pink-600/20 text-pink-300 ring-1 ring-pink-500/20" 
                              : ath.division === "Coed"
                                ? "bg-gradient-to-br from-sky-500/30 to-sky-600/20 text-sky-300 ring-1 ring-sky-500/20"
                                : "bg-gradient-to-br from-slate-500/30 to-slate-600/20 text-slate-400 ring-1 ring-slate-500/20"
                          }`}>
                            {ath.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Name & Division */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{ath.name}</p>
                            <DivisionPill division={ath.division} size="xs" />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { 
                                setEditingAthleteId(ath.id); 
                                setEditingAthleteName(ath.name); 
                                setEditingAthleteDivision(ath.division || "All Girl"); 
                              }} 
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition-all"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAthlete(ath.id)} 
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer count */}
              {filteredAthletes.length > 0 && (
                <p className="text-center text-[11px] text-slate-600 pb-4">
                  Menampilkan {filteredAthletes.length} dari {crownAthletes.length} atlit
                </p>
              )}
            </div>
          </TabsContent>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="mt-0">
            <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader className="pb-3 border-b border-white/5 px-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-rose-400" />
                      Pengguna Aplikasi
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-1 text-xs">
                      Aksi Block/Delete berpengaruh ke akun Gorillatix
                    </CardDescription>
                  </div>
                  <Badge className="bg-white/10 text-slate-300 border border-white/10">
                    {isLoadingUsers ? "..." : `${usersList.length}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile Card Layout */}
                <div className="divide-y divide-white/5">
                  {isLoadingUsers ? (
                    <div className="p-8 text-center text-sm text-slate-500">Memuat data...</div>
                  ) : usersList.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">Belum ada pengguna.</div>
                  ) : (
                    usersList.map((usr) => (
                      <div key={usr.uid} className="p-4 sm:px-6 space-y-3">
                        {/* User info row */}
                        <div className="flex items-center gap-3">
                          {usr.photoURL ? (
                            <img src={usr.photoURL} alt="" className="h-10 w-10 rounded-full border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                              {usr.displayName?.[0]?.toUpperCase() || usr.email?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {usr.displayName || "No Name"}
                              </p>
                              {usr.email === "darmawanbayu1@gmail.com" && (
                                <span className="shrink-0 text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/20 font-medium">OWNER</span>
                              )}
                              {usr.role === "admin" && usr.email !== "darmawanbayu1@gmail.com" && (
                                <span className="shrink-0 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/20 font-medium">ADMIN</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{usr.email}</p>
                          </div>
                          {/* Status */}
                          {usr.disabled ? (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-rose-500" title="Diblokir" />
                          ) : (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-500" title="Aktif" />
                          )}
                        </div>

                        {/* Meta + Actions */}
                        <div className="flex items-center justify-between pl-[52px]">
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <p>Join {new Date(usr.creationTime).toLocaleDateString('id-ID')}</p>
                            <p className="text-emerald-500/70">
                              Login {usr.lastLoginCrown ? new Date(usr.lastLoginCrown).toLocaleDateString('id-ID') : "baru saja"}
                            </p>
                          </div>
                          {usr.email !== "darmawanbayu1@gmail.com" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRoleChange(usr.uid, usr.role === "admin" ? "remove_admin" : "make_admin")}
                                disabled={actionLoading !== null}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95 border ${
                                  usr.role === "admin" 
                                    ? "text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10" 
                                    : "text-slate-400 border-white/10 hover:bg-white/5"
                                }`}
                              >
                                {usr.role === "admin" ? "Cabut Admin" : "Jadikan Admin"}
                              </button>
                              <button
                                onClick={() => handleUserAction(usr.uid, usr.disabled ? "unblock" : "block")}
                                disabled={actionLoading !== null}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all active:scale-95 border ${
                                  usr.disabled 
                                    ? "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" 
                                    : "text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                                }`}
                              >
                                {usr.disabled ? "Unblock" : "Block"}
                              </button>
                              <button
                                onClick={() => handleUserAction(usr.uid, "delete")}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all active:scale-95"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
