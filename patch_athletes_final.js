const fs = require('fs');
const file = '/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/athletes/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'import { ShieldAlert, CheckCircle2, XCircle, Users } from "lucide-react";',
  'import { ShieldAlert, CheckCircle2, XCircle, Users, UserPlus, Trash2 } from "lucide-react";\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\nimport { db } from "@/lib/firebase";\nimport { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";\nimport { Input } from "@/components/ui/input";\nimport { Button } from "@/components/ui/button";'
);

c = c.replace(
  '  const [actionLoading, setActionLoading] = useState<string | null>(null);',
  `  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [crownAthletes, setCrownAthletes] = useState<{id: string; name: string}[]>([]);
  const [newAthleteName, setNewAthleteName] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "crown-athletes"), (snap) => {
      setCrownAthletes(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name || "" })));
    });
    return () => unsub();
  }, []);

  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) return;
    await addDoc(collection(db, "crown-athletes"), { name: newAthleteName.trim() });
    setNewAthleteName("");
  };

  const handleDeleteAthlete = async (id: string) => {
    if (window.confirm("Hapus atlit ini dari daftar?")) {
      await deleteDoc(doc(db, "crown-athletes", id));
    }
  };`
);

c = c.replace(
  '<TableHead className="text-slate-400 text-xs text-center w-32">Aksi Bahaya</TableHead>',
  '<TableHead className="text-slate-400 text-xs text-center w-24">Role</TableHead>\n                    <TableHead className="text-slate-400 text-xs text-center w-32">Aksi Bahaya</TableHead>'
);

c = c.replace(
  `<TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {usr.email !== "darmawanbayu1@gmail.com" && (`,
  `<TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {usr.email === "darmawanbayu1@gmail.com" ? (
                              <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30">Owner</Badge>
                            ) : usr.role === "admin" ? (
                              <button
                                onClick={() => handleRoleChange(usr.uid, "remove_admin")}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 rounded text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/30"
                              >
                                {actionLoading === usr.uid + "remove_admin" ? "..." : "Cabut Admin"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(usr.uid, "make_admin")}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 rounded text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/30"
                              >
                                {actionLoading === usr.uid + "make_admin" ? "..." : "Jadi Admin"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {usr.email !== "darmawanbayu1@gmail.com" && (`
);

c = c.replace(
  '        <Card className="border-rose-500/20 bg-rose-950/10 backdrop-blur-md shadow-xl text-slate-100">',
  `        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-black/40 border border-white/10 mb-4">
            <TabsTrigger value="users" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300 text-slate-400">Pengguna App</TabsTrigger>
            <TabsTrigger value="athletes" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-slate-400">Daftar Atlit (Latihan)</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-rose-500/20 bg-rose-950/10 backdrop-blur-md shadow-xl text-slate-100">`
);

// We need to safely close TabsContent
c = c.replace(
  `          </CardContent>
        </Card>
      </div>
    </main>`,
  `          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="athletes">
            <Card className="border-cyan-500/20 bg-cyan-950/10 backdrop-blur-md shadow-xl text-slate-100">
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-cyan-100 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-cyan-400" />
                      Daftar Atlit Latihan
                    </CardTitle>
                    <CardDescription className="text-cyan-200/60 mt-1">
                      Nama di sini otomatis muncul di formulir absensi latihan.
                    </CardDescription>
                  </div>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {crownAthletes.length} Atlit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama Atlit Baru..."
                    value={newAthleteName}
                    onChange={(e) => setNewAthleteName(e.target.value)}
                    className="bg-black/50 border-white/10 text-white max-w-sm"
                  />
                  <Button onClick={handleAddAthlete} className="bg-cyan-600 hover:bg-cyan-500 text-white">Tambah</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {crownAthletes.sort((a, b) => a.name.localeCompare(b.name)).map(ath => (
                    <div key={ath.id} className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-lg">
                      <span className="text-sm text-slate-200">{ath.name}</span>
                      <button onClick={() => handleDeleteAthlete(ath.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>`
);

fs.writeFileSync(file, c);
console.log('Athletes page correctly patched');
