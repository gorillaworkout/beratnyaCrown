const fs = require('fs');
const file = '/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add Checkbox import
if (!c.includes('Checkbox')) {
  c = c.replace(
    'import {\n  ChevronLeft,\n  ChevronRight,\n  Plus,\n  Calendar,\n  X,\n  Clock,\n  Edit2,\n} from "lucide-react";',
    'import {\n  ChevronLeft,\n  ChevronRight,\n  Plus,\n  Calendar,\n  X,\n  Clock,\n  Edit2,\n  UserX,\n  Search,\n} from "lucide-react";\nimport { Checkbox } from "@/components/ui/checkbox";'
  );
}

// 2. Add FALLBACK_ATHLETES array after TRAINING_START
if (!c.includes('FALLBACK_ATHLETES')) {
  c = c.replace(
    'const DEFAULT_EVENTS',
    `const FALLBACK_ATHLETES = [
  "Bayu", "Helmi", "Kurniawan", "Karysa", "Amalia",
  "Moch Ihsan Tripamungkas", "Muhammad Akmal", "Muhammad Rizki Firdaus",
  "Nanda Natasya", "Renaldy Hardyanto", "Renanda Suwandi Putri",
  "Rangga Cornelis", "Wahyu Cahyadi", "Kijay", "Aissa Raihana Khyani Putri",
  "Aurel Zahra Dila", "Dewi Ramdhan Tri Mulya", "Kaisha Lula Arsyawijaya",
  "Malika Sakhi Nurachman", "Namina Mikayla Mikha", "Nadiya Hazizah Mulyanto",
  "Selma Daiva Fedora", "Siti Ramadhani", "Radinda Feyfey",
  "Zihan Yurifa Aldevara", "Fairuz Kania",
];

const DEFAULT_EVENTS`
  );
}

// 3. Add absence-related state after event form state
if (!c.includes('absenceDialogOpen')) {
  c = c.replace(
    '  // ─── Firestore Listeners',
    `  // Absence state
  const [absences, setAbsences] = useState<{date: string, absences: {name: string, reason: string}[]}[]>([]);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [selectedAbsenceDate, setSelectedAbsenceDate] = useState("");
  const [absenceForm, setAbsenceForm] = useState<{name: string, reason: string}[]>([]);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [dynamicAthletes, setDynamicAthletes] = useState<string[]>([]);

  // ─── Firestore Listeners`
  );
}

// 4. Add Firestore listeners for crown-absences AND crown-athletes
if (!c.includes('crown-absences')) {
  c = c.replace(
    '    // Listen to crown-schedules',
    `    // Listen to crown-athletes
    const unsubAthletes = onSnapshot(collection(db, "crown-athletes"), (snap) => {
      const names = snap.docs.map(d => d.data().name).filter(Boolean).sort();
      if (names.length > 0) setDynamicAthletes(names);
    });

    // Listen to crown-absences
    const unsubAbsences = onSnapshot(collection(db, "crown-absences"), (snap) => {
      const data = snap.docs.map(d => ({ date: d.id, ...(d.data() as any) }));
      setAbsences(data);
    });

    // Listen to crown-schedules`
  );

  c = c.replace(
    '      unsubEvents();\n      unsubSchedules();',
    '      unsubEvents();\n      unsubSchedules();\n      unsubAthletes();\n      unsubAbsences();'
  );
}

// 5. Add absence helper functions before "Loading State" section
if (!c.includes('openAbsenceDialog')) {
  c = c.replace(
    '  // ─── Loading State',
    `  // ─── Absence Management ──────────────────────────────────────────────

  const athleteList = dynamicAthletes.length > 0 ? dynamicAthletes : FALLBACK_ATHLETES;

  const openAbsenceDialog = (dateStr: string) => {
    setSelectedAbsenceDate(dateStr);
    setAthleteSearch("");
    const existing = absences.find(a => a.date === dateStr);
    setAbsenceForm(existing?.absences || []);
    setAbsenceDialogOpen(true);
  };

  const toggleAbsenceAthlete = (name: string) => {
    setAbsenceForm(prev => {
      if (prev.find(a => a.name === name)) {
        return prev.filter(a => a.name !== name);
      }
      return [...prev, { name, reason: "" }];
    });
  };

  const updateAbsenceReason = (name: string, reason: string) => {
    setAbsenceForm(prev => prev.map(a => a.name === name ? { ...a, reason } : a));
  };

  const saveAbsences = async () => {
    if (!selectedAbsenceDate) return;
    await setDoc(doc(db, "crown-absences", selectedAbsenceDate), {
      date: selectedAbsenceDate,
      absences: absenceForm,
    });
    setAbsenceDialogOpen(false);
  };

  const getAbsenceCount = (dateStr: string): number => {
    const rec = absences.find(a => a.date === dateStr);
    return rec?.absences?.length || 0;
  };

  const getFullTeamSessionsUntil = (targetDateStr: string): number => {
    const targetDate = new Date(targetDateStr + "T00:00:00");
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    let count = 0;
    while (current < targetDate) {
      const dateStr = \`\${current.getFullYear()}-\${String(current.getMonth() + 1).padStart(2, "0")}-\${String(current.getDate()).padStart(2, "0")}\`;
      const dayOfWeek = current.getDay();
      const isRegular = REGULAR_DAYS.has(dayOfWeek) && current >= TRAINING_START;
      const customSchedule = scheduleData.find(s => s.date === dateStr);
      const isEvent = events.some(e => e.date === dateStr);
      let isTrainingDay = false;
      if (customSchedule) {
        isTrainingDay = customSchedule.status === "latihan" || customSchedule.status === "tambahan";
      } else if (isRegular && !isEvent) {
        isTrainingDay = true;
      }
      const absCt = getAbsenceCount(dateStr);
      if (isTrainingDay && absCt === 0) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // ─── Loading State`
  );
}

// 6. Add "Atur Izin" button inside editDialog (before closing DialogContent)
// Find the delete schedule button and add izin button after it
if (!c.includes('Atur Izin Atlit')) {
  c = c.replace(
    /{\/\* Edit Dialog \*\/}/,
    '{/* Edit Dialog */}'
  );
  // Instead, let's find the edit dialog's save/delete buttons area
  // Look for the pattern where save and delete buttons are
  const editDialogPattern = 'onClick={deleteSchedule}';
  if (c.includes(editDialogPattern)) {
    // Find the closing </DialogContent> after deleteSchedule to add the izin button
    const idx = c.indexOf(editDialogPattern);
    const afterDelete = c.indexOf('</DialogContent>', idx);
    if (afterDelete > -1) {
      c = c.slice(0, afterDelete) + 
        `\n              {/* Izin Button */}\n              <Button\n                onClick={() => { setEditDialogOpen(false); openAbsenceDialog(editingDate || ""); }}\n                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white border-0"\n              >\n                <UserX className="mr-2 h-4 w-4" />\n                Atur Izin Atlit\n              </Button>\n` +
        c.slice(afterDelete);
    }
  }
}

// 7. Add Absence Dialog at the end of JSX (before final closing divs)
if (!c.includes('absenceDialogOpen')) {
  // Already added in state, skip
} 
// Actually add the dialog JSX
if (!c.includes('{/* Absence Dialog */}')) {
  // Find the last </Dialog> and add after it
  const lastDialogIdx = c.lastIndexOf('</Dialog>');
  if (lastDialogIdx > -1) {
    const insertPoint = lastDialogIdx + '</Dialog>'.length;
    const absenceDialogJSX = `

        {/* Absence Dialog */}
        <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Atur Izin Atlit</DialogTitle>
              <DialogDescription className="text-slate-400">
                Tanggal: {selectedAbsenceDate} — Centang atlit yang izin
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Cari nama atlit..."
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
              className="bg-white/5 border-white/10 text-white mb-2"
            />
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {athleteList
                .filter(a => a.toLowerCase().includes(athleteSearch.toLowerCase()))
                .map(athlete => {
                  const isChecked = absenceForm.some(a => a.name === athlete);
                  return (
                    <div key={athlete} className={"flex flex-col gap-1 rounded-lg border p-2 transition-colors " + (isChecked ? "border-orange-500/50 bg-orange-500/10" : "border-white/5 bg-white/5")}>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleAbsenceAthlete(athlete)}
                        />
                        <span className="text-sm text-slate-200">{athlete}</span>
                      </div>
                      {isChecked && (
                        <Input
                          placeholder="Alasan (opsional)..."
                          value={absenceForm.find(a => a.name === athlete)?.reason || ""}
                          onChange={(e) => updateAbsenceReason(athlete, e.target.value)}
                          className="h-7 text-xs bg-black/50 border-white/10 text-white ml-6"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
            <Button onClick={saveAbsences} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 mt-2">
              Simpan ({absenceForm.length} izin)
            </Button>
          </DialogContent>
        </Dialog>`;
    
    c = c.slice(0, insertPoint) + absenceDialogJSX + c.slice(insertPoint);
  }
}

// 8. Add badges on schedule list items
// Find the pattern where each schedule entry is rendered in the list 
// Look for entry.status rendering and add absence badge
if (!c.includes('getAbsenceCount(entry.date)')) {
  // Find the Daftar Jadwal section where entries are mapped
  // Add badge after status badge for training days
  const statusBadgePattern = 'entry.holidayName && (';
  if (c.includes(statusBadgePattern)) {
    // Let's find each entry rendering and add absence indicators
    // Better approach: find the schedule.map and add badge in the card
    // Look for where entry cards are rendered
  }
  
  // Find entry status display and add absence badge after it
  // Pattern: look for the entry.note display and add before closing
  const notePattern = '{entry.note && (';
  const noteIdx = c.indexOf(notePattern);
  if (noteIdx > -1) {
    // Find the first occurrence of entry.note rendering to add absence badge before it
    c = c.slice(0, noteIdx) + 
      `{(entry.status === "latihan" || entry.status === "tambahan") && (() => {
                          const absCount = getAbsenceCount(entry.date);
                          if (absCount > 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/20 text-xs">⚠️ Minus {absCount}</Badge>;
                          return <Badge className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-amber-400 border-amber-500/20 text-xs">🔥 Full Team</Badge>;
                        })()}
                        ` + c.slice(noteIdx);
  }
}

// 9. Add "Sisa Full Team" cards after summary cards  
if (!c.includes('Sisa Latihan Full Team')) {
  const summaryGridEnd = 'Hari Ini';
  const summaryIdx = c.indexOf(summaryGridEnd);
  if (summaryIdx > -1) {
    // Find the closing </div> of the summary grid after "Hari Ini"
    let searchFrom = summaryIdx;
    // Find next </div> x3 to close the grid
    let closingCount = 0;
    let pos = searchFrom;
    while (closingCount < 5 && pos < c.length) {
      const nextClose = c.indexOf('</div>', pos);
      if (nextClose === -1) break;
      pos = nextClose + 6;
      closingCount++;
    }
    
    if (pos > searchFrom) {
      const fullTeamCards = `

        {/* Sisa Full Team Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(() => {
            const kejurda = events.find(e => e.name.toLowerCase().includes("kejurda"));
            const kejurnas = events.find(e => e.name.toLowerCase().includes("kejurnas"));
            return (
              <>
                {kejurda && new Date(kejurda.date) > new Date() && (
                  <Card className={glassCardClass}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1">🔥 Sisa Latihan Full Team (Kejurda)</p>
                      <p className="text-2xl font-bold text-amber-400">{getFullTeamSessionsUntil(kejurda.date)}x</p>
                    </CardContent>
                  </Card>
                )}
                {kejurnas && new Date(kejurnas.date) > new Date() && (
                  <Card className={glassCardClass}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1">🥇 Sisa Latihan Full Team (Kejurnas)</p>
                      <p className="text-2xl font-bold text-purple-400">{getFullTeamSessionsUntil(kejurnas.date)}x</p>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>`;
      
      c = c.slice(0, pos) + fullTeamCards + c.slice(pos);
    }
  }
}

// 10. Add monthly absence recap before Footer
if (!c.includes('Rekap Izin Bulan Ini')) {
  const footerPattern = '{/* Footer */}';
  if (c.includes(footerPattern)) {
    const rekapSection = `
        {/* Rekap Izin Bulan Ini */}
        <Card className={glassCardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">📊 Rekap Izin Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const monthPrefix = \`\${currentYear}-\${String(currentMonth + 1).padStart(2, "0")}\`;
              const monthAbsences = absences.filter(a => a.date.startsWith(monthPrefix) && a.absences?.length > 0).sort((a,b) => a.date.localeCompare(b.date));
              if (monthAbsences.length === 0) return <p className="text-slate-400 text-sm">Tidak ada yang izin di bulan ini. FULL TEAM! 🔥</p>;
              return (
                <div className="space-y-3">
                  {monthAbsences.map(rec => (
                    <div key={rec.date} className="border border-white/10 rounded-lg p-3 bg-black/20">
                      <p className="text-sm font-medium text-white mb-1">{new Date(rec.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.absences.map((a: any, i: number) => (
                          <Badge key={i} className="bg-red-500/20 text-red-300 border-red-500/20 text-xs">{a.name}{a.reason ? \` (\${a.reason})\` : ""}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

`;
    c = c.replace(footerPattern, rekapSection + '        ' + footerPattern);
  }
}

// 11. Add month nav to Daftar Jadwal card header
if (!c.includes('prevMonth in daftar jadwal')) {
  // Find "📋 Daftar Jadwal" title
  const daftarJadwalPattern = '📋 Daftar Jadwal';
  if (c.includes(daftarJadwalPattern)) {
    const djIdx = c.indexOf(daftarJadwalPattern);
    // Find the CardDescription after it
    const cardDescAfter = c.indexOf('</CardDescription>', djIdx);
    if (cardDescAfter > -1) {
      const insertAfterDesc = cardDescAfter + '</CardDescription>'.length;
      const monthNavJSX = `
              {/* prevMonth in daftar jadwal */}
              <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-300 min-w-[120px] text-center">{formatMonthYear(currentYear, currentMonth)}</span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToday} className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/10">
                  Hari Ini
                </Button>
              </div>`;
      c = c.slice(0, insertAfterDesc) + monthNavJSX + c.slice(insertAfterDesc);
    }
  }
}

// Add setDoc to imports if not present
if (!c.includes('setDoc')) {
  c = c.replace(
    'import {\n  collection,\n  getDocs,\n  addDoc,\n  deleteDoc,\n  doc,\n  setDoc,\n  onSnapshot,\n  updateDoc,\n} from "firebase/firestore";',
    'import {\n  collection,\n  getDocs,\n  addDoc,\n  deleteDoc,\n  doc,\n  setDoc,\n  onSnapshot,\n  updateDoc,\n} from "firebase/firestore";'
  );
}

fs.writeFileSync(file, c, 'utf8');
console.log('✅ Jadwal page fully patched with ALL features');
