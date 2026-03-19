"use client";

import { useEffect, useState } from "react";
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
import { ShieldAlert, CheckCircle2, XCircle, Users } from "lucide-react";

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

export default function AthletesDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";
  const [usersList, setUsersList] = useState<FirebaseUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 p-2.5 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Manajemen Athlete
            </h1>
          </div>
          <p className="text-sm text-slate-400 sm:text-base">
            Admin Area: Blokir atau hapus orang asing yang mencoba masuk ke aplikasi CrownHub. 
            Hanya user yang pernah Login di CrownHub yang ditampilkan di sini.
          </p>
        </div>

        <Card className="border-rose-500/20 bg-rose-950/10 backdrop-blur-md shadow-xl text-slate-100">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-rose-100 flex items-center gap-2">
                  <Users className="h-5 w-5 text-rose-400" />
                  Daftar Pengguna Aplikasi Crown
                </CardTitle>
                <CardDescription className="text-rose-200/60 mt-1">
                  Aksi Block / Delete di sini akan berpengaruh juga ke akun Gorillatix-nya!
                </CardDescription>
              </div>
              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {isLoadingUsers ? "Memuat..." : `${usersList.length} Atlet`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs w-10">#</TableHead>
                    <TableHead className="text-slate-400 text-xs min-w-[200px]">Data Akun</TableHead>
                    <TableHead className="text-slate-400 text-xs">Aktivitas</TableHead>
                    <TableHead className="text-slate-400 text-xs text-center w-24">Akses Crown</TableHead>
                    <TableHead className="text-slate-400 text-xs text-center w-32">Aksi Bahaya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    <TableRow className="hover:bg-white/5">
                      <TableCell colSpan={5} className="text-sm text-center py-6 text-slate-400">
                        Menarik data dari Firebase Auth dan Firestore...
                      </TableCell>
                    </TableRow>
                  ) : usersList.length === 0 ? (
                    <TableRow className="hover:bg-white/5">
                      <TableCell colSpan={5} className="text-sm text-center py-6 text-slate-400">
                        Belum ada atlet yang mendaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersList.map((usr, i) => (
                      <TableRow key={usr.uid} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-xs text-slate-400 text-center">{i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {usr.photoURL ? (
                              <img src={usr.photoURL} alt="" className="h-8 w-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                {usr.displayName?.[0]?.toUpperCase() || usr.email?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {usr.displayName || "No Name"}
                                {usr.email === "darmawanbayu1@gmail.com" && (
                                  <span className="ml-2 text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30">OWNER</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500">{usr.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-300">
                          <p className="text-xs text-slate-400">Join: {new Date(usr.creationTime).toLocaleDateString('id-ID')}</p>
                          <p className="text-xs text-emerald-400/80">
                            Terakhir Login (Crown): {usr.lastLoginCrown ? new Date(usr.lastLoginCrown).toLocaleDateString('id-ID') : "Baru saja"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          {usr.disabled ? (
                            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-normal"><XCircle className="w-3 h-3 mr-1" /> Diblokir</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal"><CheckCircle2 className="w-3 h-3 mr-1" /> Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {usr.email !== "darmawanbayu1@gmail.com" && (
                              <>
                                <button
                                  onClick={() => handleUserAction(usr.uid, usr.disabled ? "unblock" : "block")}
                                  disabled={actionLoading !== null}
                                  className={`px-2.5 py-1 rounded text-xs transition-colors border ${usr.disabled ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"}`}
                                >
                                  {actionLoading === `${usr.disabled ? "unblock" : "block"}-${usr.uid}` ? "..." : usr.disabled ? "Unblock" : "Block"}
                                </button>
                                <button
                                  onClick={() => handleUserAction(usr.uid, "delete")}
                                  disabled={actionLoading !== null}
                                  className="px-2.5 py-1 rounded text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/30"
                                >
                                  {actionLoading === `delete-${usr.uid}` ? "..." : "Hapus"}
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
