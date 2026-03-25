"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, UserX, Loader2, Save } from "lucide-react";

// Hardcoded athletes
const ATHLETES = [
  "Bayu", "Helmi", "Kurniawan", "Karysa", "Amalia",
  "Moch Ihsan Tripamungkas", "Muhammad Akmal", "Muhammad Rizki Firdaus",
  "Nanda Natasya", "Renaldy Hardyanto", "Renanda Suwandi Putri",
  "Rangga Cornelis", "Wahyu Cahyadi", "Kijay", "Aissa Raihana Khyani Putri",
  "Aurel Zahra Dila", "Dewi Ramdhan Tri Mulya", "Kaisha Lula Arsyawijaya",
  "Malika Sakhi Nurachman", "Namina Mikayla Mikha", "Nadiya Hazizah Mulyanto",
  "Selma Daiva Fedora", "Siti Ramadhani", "Radinda Feyfey",
  "Zihan Yurifa Aldevara", "Fairuz Kania",
];

interface AbsenceRecord {
  name: string;
  reason: string;
}

interface DailyAbsence {
  date: string;
  absences: AbsenceRecord[];
  updatedAt?: any;
}

export default function IzinLatihanPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";

  const [date, setDate] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [absenceData, setAbsenceData] = useState<DailyAbsence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
  }, []);

  // Fetch data
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "crown-absences"), (snap) => {
      const data: DailyAbsence[] = [];
      snap.forEach((doc) => {
        data.push({ date: doc.id, ...doc.data() } as DailyAbsence);
      });
      // Sort by date descending
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAbsenceData(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleAthlete = (name: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleReasonChange = (name: string, reason: string) => {
    setReasons((prev) => ({ ...prev, [name]: reason }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      alert("Pilih tanggal terlebih dahulu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const absencesToSave = selectedAthletes.map((name) => ({
        name,
        reason: reasons[name] || "",
      }));

      await setDoc(doc(db, "crown-absences", date), {
        date,
        absences: absencesToSave,
        updatedAt: serverTimestamp(),
      });

      alert("Data izin berhasil disimpan!");
      // Reset form but keep date
      setSelectedAthletes([]);
      setReasons({});
    } catch (error) {
      console.error("Error saving absences:", error);
      alert("Gagal menyimpan data izin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 pt-20 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 shadow-lg shadow-red-500/10">
            <UserX className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Izin Latihan
            </h1>
            <p className="text-sm text-slate-400">
              Kelola data atlet yang izin tidak ikut latihan
            </p>
          </div>
        </div>

        {isAdmin && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="border-b border-white/10 bg-white/5 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                Input Izin Baru
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
              <div className="space-y-2 max-w-xs">
                <label className="text-sm font-medium text-slate-300">
                  Tanggal Latihan
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-black/50 border-white/10 text-white"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-300">
                  Pilih Atlet yang Izin ({selectedAthletes.length} dipilih)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-2 border border-white/10 rounded-lg bg-black/20">
                  {ATHLETES.sort().map((athlete) => (
                    <div
                      key={athlete}
                      className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                        selectedAthletes.includes(athlete)
                          ? "border-cyan-500/50 bg-cyan-500/10"
                          : "border-white/5 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`athlete-${athlete}`}
                          checked={selectedAthletes.includes(athlete)}
                          onCheckedChange={() => handleToggleAthlete(athlete)}
                        />
                        <label
                          htmlFor={`athlete-${athlete}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-200 cursor-pointer flex-1"
                        >
                          {athlete}
                        </label>
                      </div>
                      {selectedAthletes.includes(athlete) && (
                        <Input
                          placeholder="Alasan (opsional)..."
                          value={reasons[athlete] || ""}
                          onChange={(e) =>
                            handleReasonChange(athlete, e.target.value)
                          }
                          className="h-8 text-xs bg-black/50 border-white/10 mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !date}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Simpan Data Izin
              </Button>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            Riwayat Izin Latihan
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : absenceData.length === 0 ? (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md p-8 text-center text-slate-400">
              Belum ada data izin latihan yang tersimpan.
            </Card>
          ) : (
            <div className="grid gap-4">
              {absenceData.map((record) => {
                const dateObj = new Date(record.date);
                const formattedDate = dateObj.toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });

                const isFullTeam = !record.absences || record.absences.length === 0;

                return (
                  <Card
                    key={record.date}
                    className="border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
                  >
                    <div className="border-b border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="font-medium text-white">
                        {formattedDate}
                      </div>
                      {isFullTeam ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/20 w-fit">
                          🔥 FULL TEAM
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/20 w-fit">
                          ⚠️ Minus {record.absences.length} Orang
                        </Badge>
                      )}
                    </div>
                    {!isFullTeam && (
                      <div className="p-4">
                        <ul className="space-y-3">
                          {record.absences.map((absentee, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-3 text-sm"
                            >
                              <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                              <div>
                                <span className="font-medium text-slate-200">
                                  {absentee.name}
                                </span>
                                {absentee.reason && (
                                  <span className="text-slate-400 ml-2">
                                    - {absentee.reason}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
