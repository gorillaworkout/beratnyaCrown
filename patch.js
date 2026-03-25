const fs = require('fs');

const file = '/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/athletes/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Tambahkan import Tabs dan Firebase
if (!content.includes('import { Tabs')) {
  content = content.replace(
    'import { ShieldAlert, CheckCircle2, XCircle, Users } from "lucide-react";',
    'import { ShieldAlert, CheckCircle2, XCircle, Users, UserPlus, Trash2 } from "lucide-react";\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\nimport { db } from "@/lib/firebase";\nimport { collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";\nimport { Input } from "@/components/ui/input";\nimport { Button } from "@/components/ui/button";'
  );
}

// 2. Tambahkan state untuk Tab Atlit
if (!content.includes('const [crownAthletes')) {
  content = content.replace(
    'const [actionLoading, setActionLoading] = useState<string | null>(null);',
    'const [actionLoading, setActionLoading] = useState<string | null>(null);\n  const [crownAthletes, setCrownAthletes] = useState<{id: string, name: string}[]>([]);\n  const [newAthleteName, setNewAthleteName] = useState("");\n\n  useEffect(() => {\n    const unsub = onSnapshot(collection(db, "crown-athletes"), (snap) => {\n      setCrownAthletes(snap.docs.map(d => ({ id: d.id, name: d.data().name })));\n    });\n    return () => unsub();\n  }, []);\n\n  const handleAddAthlete = async () => {\n    if (!newAthleteName.trim()) return;\n    await addDoc(collection(db, "crown-athletes"), { name: newAthleteName });\n    setNewAthleteName("");\n  };\n\n  const handleDeleteAthlete = async (id: string) => {\n    if (window.confirm("Hapus atlit ini?")) {\n      await deleteDoc(doc(db, "crown-athletes", id));\n    }\n  };\n'
  );
}

// 3. Tambah tombol Role Admin
content = content.replace(
  '<TableHead className="text-slate-400 text-xs text-center w-24">Akses Role</TableHead>',
  '<TableHead className="text-slate-400 text-xs text-center w-24">Role</TableHead>\n<TableHead className="text-slate-400 text-xs text-center w-32">Akses Role</TableHead>'
);

content = content.replace(
  '<TableCell className="text-center">\\n                          {usr.disabled ? (\\n                            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-normal"><XCircle className="w-3 h-3 mr-1" /> Diblokir</Badge>\\n                          ) : (\\n                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal"><CheckCircle2 className="w-3 h-3 mr-1" /> Aktif</Badge>\\n                          )}\\n                        </TableCell>',
  '<TableCell className="text-center">\\n                          {usr.disabled ? (\\n                            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-normal"><XCircle className="w-3 h-3 mr-1" /> Diblokir</Badge>\\n                          ) : (\\n                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal"><CheckCircle2 className="w-3 h-3 mr-1" /> Aktif</Badge>\\n                          )}\\n                        </TableCell>\\n<TableCell className="text-center">\\n  {usr.role === "admin" ? <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Admin</Badge> : <Badge className="bg-slate-500/20 text-slate-400 border border-slate-500/30">User</Badge>}\\n</TableCell>'
);

if (!content.includes('usr.role === "admin" ? "remove_admin" : "make_admin"')) {
  content = content.replace(
    '</button>\\n                                <button\\n                                  onClick={() => handleUserAction(usr.uid, "delete")}',
    '</button>\\n                                <button\\n                                  onClick={() => handleRoleChange(usr.uid, usr.role === "admin" ? "remove_admin" : "make_admin")}\\n                                  disabled={actionLoading !== null}\\n                                  className="px-2.5 py-1 rounded text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/30"\\n                                >\\n                                  {actionLoading === usr.uid + (usr.role === "admin" ? "remove_admin" : "make_admin") ? "..." : (usr.role === "admin" ? "Cabut Admin" : "Jadi Admin")}\\n                                </button>\\n                                <button\\n                                  onClick={() => handleUserAction(usr.uid, "delete")}'
  );
}

// 4. Wrap dalam Tabs
if (!content.includes('<Tabs defaultValue="users" className="w-full">')) {
  content = content.replace(
    '<Card className="border-rose-500/20 bg-rose-950/10 backdrop-blur-md shadow-xl text-slate-100">',
    '<Tabs defaultValue="users" className="w-full">\\n<TabsList className="bg-black/40 border border-white/10 mb-4">\\n<TabsTrigger value="users" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-300">Pengguna App (Akun)</TabsTrigger>\\n<TabsTrigger value="athletes" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">Daftar Atlit (Latihan)</TabsTrigger>\\n</TabsList>\\n\\n<TabsContent value="users">\\n<Card className="border-rose-500/20 bg-rose-950/10 backdrop-blur-md shadow-xl text-slate-100">'
  );
  
  content = content.replace(
    '</Table>\\n            </div>\\n          </CardContent>\\n        </Card>',
    '</Table>\\n            </div>\\n          </CardContent>\\n        </Card>\\n</TabsContent>\\n\\n<TabsContent value="athletes">\\n  <Card className="border-cyan-500/20 bg-cyan-950/10 backdrop-blur-md shadow-xl text-slate-100">\\n    <CardHeader className="pb-3 border-b border-white/5">\\n      <div className="flex items-center justify-between">\\n        <div>\\n          <CardTitle className="text-lg text-cyan-100 flex items-center gap-2">\\n            <UserPlus className="h-5 w-5 text-cyan-400" />\\n            Daftar Atlit Latihan\\n          </CardTitle>\\n          <CardDescription className="text-cyan-200/60 mt-1">\\n            Nama di sini akan muncul di formulir absensi latihan kalender.\\n          </CardDescription>\\n        </div>\\n        <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">\\n          {crownAthletes.length} Atlit\\n        </Badge>\\n      </div>\\n    </CardHeader>\\n    <CardContent className="pt-4 space-y-4">\\n      <div className="flex gap-2">\\n        <Input \\n          placeholder="Nama Atlit Baru..." \\n          value={newAthleteName} \\n          onChange={(e) => setNewAthleteName(e.target.value)}\\n          className="bg-black/50 border-white/10 text-white max-w-sm"\\n        />\\n        <Button onClick={handleAddAthlete} className="bg-cyan-600 hover:bg-cyan-500 text-white">Tambah</Button>\\n      </div>\\n      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">\\n        {crownAthletes.sort((a,b) => a.name.localeCompare(b.name)).map(ath => (\\n          <div key={ath.id} className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-lg">\\n            <span className="text-sm text-slate-200">{ath.name}</span>\\n            <button onClick={() => handleDeleteAthlete(ath.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition">\\n              <Trash2 className="h-4 w-4" />\\n            </button>\\n          </div>\\n        ))}\\n      </div>\\n    </CardContent>\\n  </Card>\\n</TabsContent>\\n</Tabs>'
  );
}

fs.writeFileSync(file, content);
console.log('Athletes page patched successfully.');
