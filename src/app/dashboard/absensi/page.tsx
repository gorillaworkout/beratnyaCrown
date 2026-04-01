"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Navigation,
  Clock,
  X,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const glassCardClass =
  "border-white/10 bg-white/5 backdrop-blur-md shadow-xl";

// --- Types ---
type TrainingLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  mapsUrl?: string;
  isDefault?: boolean;
};

type AttendanceRecord = {
  id: string;
  athleteUid: string;
  athleteName: string;
  athleteEmail: string;
  date: string;
  timestamp: Date | null;
  lat: number;
  lng: number;
  distance: number;
  locationName?: string;
};

// --- Helpers ---
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseRecord(d: { id: string; data: () => Record<string, unknown> }): AttendanceRecord {
  const data = d.data();
  return {
    id: d.id,
    athleteUid: (data.athleteUid as string) ?? "",
    athleteName: (data.athleteName as string) ?? "",
    athleteEmail: (data.athleteEmail as string) ?? "",
    date: (data.date as string) ?? "",
    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : null,
    lat: (data.lat as number) ?? 0,
    lng: (data.lng as number) ?? 0,
    distance: (data.distance as number) ?? 0,
    locationName: (data.locationName as string) || undefined,
  };
}

// --- Component ---
export default function AbsensiPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Location state (from Firestore)
  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showLocManager, setShowLocManager] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", lat: "", lng: "", radius: "500", maps: "" });
  const [detecting, setDetecting] = useState(false);
  const [savingLoc, setSavingLoc] = useState(false);

  // Attendance state
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; distance?: number } | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  const todayStr = getTodayStr();
  const activeLoc = locations[activeIdx] || locations[0];
  const now = new Date();

  // Load locations from Firestore — wait for auth to be ready first
  useEffect(() => {
    if (authLoading) return; // Don't query until auth state is resolved
    const loadLocations = async () => {
      setLocationsLoading(true);
      try {
        const snap = await getDocs(collection(db, "crown-locations"));
        const locs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) ?? "",
            lat: (data.lat as number) ?? 0,
            lng: (data.lng as number) ?? 0,
            radius: (data.radius as number) ?? 200,
            mapsUrl: (data.mapsUrl as string) || undefined,
            isDefault: (data.isDefault as boolean) || false,
          } as TrainingLocation;
        });

        if (locs.length === 0) {
          // Seed default location if none exist
          const docRef = await addDoc(collection(db, "crown-locations"), {
            name: "Crown Allstar Cheerleading",
            lat: -6.9164893,
            lng: 107.624465,
            radius: 200,
            mapsUrl: "https://maps.app.goo.gl/rrZPnXS51HhDQvbs7",
            isDefault: true,
          });
          setLocations([{
            id: docRef.id,
            name: "Crown Allstar Cheerleading",
            lat: -6.9164893,
            lng: 107.624465,
            radius: 200,
            mapsUrl: "https://maps.app.goo.gl/rrZPnXS51HhDQvbs7",
            isDefault: true,
          }]);
        } else {
          setLocations(locs);
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
        // Fallback
        setLocations([{
          id: "fallback",
          name: "Crown Allstar Cheerleading",
          lat: -6.9164893,
          lng: 107.624465,
          radius: 200,
          mapsUrl: "https://maps.app.goo.gl/rrZPnXS51HhDQvbs7",
        }]);
      }
      setLocationsLoading(false);
    };
    loadLocations();
  }, [authLoading]);

  // Load attendance — wait for auth
  useEffect(() => {
    if (authLoading) return;
    const load = async () => {
      setLoading(true);
      try {
        const todayQ = query(collection(db, "crown-attendance"), where("date", "==", todayStr));
        const todaySnap = await getDocs(todayQ);
        const todayData = todaySnap.docs.map(parseRecord).sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
        setTodayRecords(todayData);
        if (user) setAlreadyCheckedIn(todayData.some((r) => r.athleteUid === user.uid));

        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
        const monthQ = query(collection(db, "crown-attendance"), where("date", ">=", monthStart), where("date", "<=", monthEnd));
        const monthSnap = await getDocs(monthQ);
        setMonthRecords(monthSnap.docs.map(parseRecord).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        console.error("Failed to load attendance:", err);
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr, user?.uid, authLoading]);

  // Check in
  const handleCheckIn = async () => {
    if (!user || !activeLoc) return;
    setChecking(true);
    setResult(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      const { latitude, longitude } = pos.coords;
      const distance = getDistanceMeters(latitude, longitude, activeLoc.lat, activeLoc.lng);

      if (distance <= activeLoc.radius) {
        await addDoc(collection(db, "crown-attendance"), {
          athleteUid: user.uid,
          athleteName: user.displayName || "",
          athleteEmail: user.email || "",
          date: todayStr,
          timestamp: serverTimestamp(),
          lat: latitude,
          lng: longitude,
          distance: Math.round(distance),
          locationName: activeLoc.name,
        });
        setResult({ success: true, message: `Absensi berhasil! Jarak: ${Math.round(distance)}m dari ${activeLoc.name}.`, distance: Math.round(distance) });
        setAlreadyCheckedIn(true);
        // Refresh
        const snap = await getDocs(query(collection(db, "crown-attendance"), where("date", "==", todayStr)));
        setTodayRecords(snap.docs.map(parseRecord).sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0)));
      } else {
        setResult({ success: false, message: `Lokasi terlalu jauh! Jarak kamu ${Math.round(distance)}m dari ${activeLoc.name} (max ${activeLoc.radius}m).`, distance: Math.round(distance) });
      }
    } catch (err: unknown) {
      const geoErr = err as GeolocationPositionError;
      const msgs: Record<number, string> = {
        1: "Akses lokasi ditolak. Izinkan lokasi di browser untuk absen.",
        2: "Tidak bisa mendapatkan lokasi. Pastikan GPS aktif.",
        3: "Timeout mendapatkan lokasi. Coba lagi.",
      };
      setResult({ success: false, message: msgs[geoErr?.code] || "Gagal absen. Coba lagi." });
    }
    setChecking(false);
  };

  // Location management (Firestore)
  const addLocation = async () => {
    if (!newLoc.name || !newLoc.lat || !newLoc.lng) return;
    setSavingLoc(true);
    try {
      const docRef = await addDoc(collection(db, "crown-locations"), {
        name: newLoc.name,
        lat: parseFloat(newLoc.lat),
        lng: parseFloat(newLoc.lng),
        radius: parseInt(newLoc.radius) || 500,
        mapsUrl: newLoc.maps || null,
        isDefault: false,
      });
      setLocations([...locations, {
        id: docRef.id,
        name: newLoc.name,
        lat: parseFloat(newLoc.lat),
        lng: parseFloat(newLoc.lng),
        radius: parseInt(newLoc.radius) || 500,
        mapsUrl: newLoc.maps || undefined,
      }]);
      setNewLoc({ name: "", lat: "", lng: "", radius: "500", maps: "" });
    } catch (err) {
      console.error("Failed to add location:", err);
      alert("Gagal menyimpan lokasi.");
    }
    setSavingLoc(false);
  };

  const removeLocation = async (i: number) => {
    if (locations.length <= 1) return;
    const loc = locations[i];
    try {
      await deleteDoc(doc(db, "crown-locations", loc.id));
      const newLocs = locations.filter((_, idx) => idx !== i);
      setLocations(newLocs);
      if (activeIdx >= newLocs.length) setActiveIdx(0);
    } catch (err) {
      console.error("Failed to remove location:", err);
    }
  };

  const detectMyLocation = () => {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setNewLoc((prev) => ({ ...prev, lat: p.coords.latitude.toFixed(7), lng: p.coords.longitude.toFixed(7) })); setDetecting(false); },
      () => { setDetecting(false); alert("Gagal mendapatkan lokasi."); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Monthly summary
  const monthSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    monthRecords.forEach((r) => {
      const e = map.get(r.athleteUid);
      if (e) e.count++;
      else map.set(r.athleteUid, { name: r.athleteName, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [monthRecords]);

  if (authLoading || locationsLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          <p className="text-sm text-slate-400">{authLoading ? "Memeriksa login..." : "Memuat lokasi..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {/* Header */}
        <header className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${glassCardClass}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Absensi Latihan</h1>
              <p className="text-sm text-slate-400">{activeLoc?.name ?? "Memuat..."} • Radius {activeLoc?.radius ?? 0}m</p>
            </div>
          </div>
          <Badge className="bg-white/10 text-white text-sm px-3 py-1">
            📅 {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </Badge>
        </header>

        {/* Check-in Card */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">📍 Absen Sekarang</CardTitle>
            <CardDescription className="text-slate-400">Pastikan kamu berada di lokasi latihan dan GPS aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alreadyCheckedIn ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-300">Kamu sudah absen hari ini! ✅</p>
                  <p className="text-sm text-slate-400">Terima kasih, semangat latihan!</p>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={checking || !user || !activeLoc}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 py-6 text-lg font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {checking ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengecek Lokasi...</>
                ) : (
                  <><Navigation className="mr-2 h-5 w-5" /> Absen Sekarang</>
                )}
              </Button>
            )}

            {result && (
              <div className={`flex items-start gap-3 rounded-xl border p-4 ${result.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
                {result.success ? <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-medium ${result.success ? "text-emerald-300" : "text-rose-300"}`}>{result.message}</p>
                  {result.distance !== undefined && !result.success && (
                    <p className="mt-1 text-xs text-slate-400">Kamu perlu berada dalam {activeLoc?.radius}m dari {activeLoc?.name}.</p>
                  )}
                </div>
              </div>
            )}

            {/* Location selector */}
            {locations.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">Pilih Lokasi Latihan:</p>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc, i) => (
                    <button key={loc.id} onClick={() => setActiveIdx(i)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all ${i === activeIdx ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]"}`}
                    >
                      <MapPin className="h-3 w-3" /> {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location info */}
            {activeLoc && (
              <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-slate-400">{activeLoc.name} • {activeLoc.lat.toFixed(4)}, {activeLoc.lng.toFixed(4)} • {activeLoc.radius}m</span>
                {activeLoc.mapsUrl && (
                  <a href={activeLoc.mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-cyan-400 hover:underline">Buka Maps →</a>
                )}
              </div>
            )}

            {/* Admin: Location manager */}
            {isAdmin && (
              <div className="space-y-3">
                <button onClick={() => setShowLocManager(!showLocManager)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  {showLocManager ? "▲ Tutup" : "⚙️ Kelola Lokasi"}
                </button>
                {showLocManager && (
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-medium text-slate-300">Lokasi Tersimpan ({locations.length}):</p>
                    {locations.map((loc, i) => (
                      <div key={loc.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                        <span className={`text-xs ${i === activeIdx ? "text-cyan-300" : "text-slate-400"}`}>
                          {i === activeIdx && "✓ "}{loc.name} ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}) • {loc.radius}m
                        </span>
                        {locations.length > 1 && (
                          <button onClick={() => removeLocation(i)} className="text-slate-600 hover:text-rose-400 transition-colors p-1">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <p className="text-xs font-medium text-slate-300">Tambah Lokasi Baru:</p>
                      <Input placeholder="Nama lokasi..." value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} className="border-white/20 bg-white/5 text-white text-xs [color-scheme:dark]" />
                      <div className="flex gap-2">
                        <Input placeholder="Latitude" value={newLoc.lat} onChange={(e) => setNewLoc({ ...newLoc, lat: e.target.value })} className="border-white/20 bg-white/5 text-white text-xs" />
                        <Input placeholder="Longitude" value={newLoc.lng} onChange={(e) => setNewLoc({ ...newLoc, lng: e.target.value })} className="border-white/20 bg-white/5 text-white text-xs" />
                        <Button variant="ghost" size="sm" onClick={detectMyLocation} disabled={detecting} className="text-xs text-cyan-400 hover:bg-white/10 flex-shrink-0">
                          {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "📍 Deteksi"}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Radius (meter)" value={newLoc.radius} onChange={(e) => setNewLoc({ ...newLoc, radius: e.target.value })} className="border-white/20 bg-white/5 text-white text-xs max-w-[120px]" />
                        <Input placeholder="Google Maps URL (opsional)" value={newLoc.maps} onChange={(e) => setNewLoc({ ...newLoc, maps: e.target.value })} className="border-white/20 bg-white/5 text-white text-xs" />
                      </div>
                      <Button onClick={addLocation} disabled={!newLoc.name || !newLoc.lat || !newLoc.lng || savingLoc} className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs w-full">
                        {savingLoc ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Menyimpan...</> : "Tambah Lokasi"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white">✅ Absensi Hari Ini</CardTitle>
                <CardDescription className="text-slate-400">{todayRecords.length} athlete sudah absen</CardDescription>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300">{todayRecords.length} hadir</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Memuat...</p>
            ) : todayRecords.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Belum ada yang absen hari ini.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {todayRecords.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-sm font-bold text-white">
                      {record.athleteName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-white text-sm">{record.athleteName}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {record.timestamp ? record.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                        <span>•</span>
                        <span>{record.distance}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">📊 Rekap Absensi Bulan Ini</CardTitle>
            <CardDescription className="text-slate-400">
              {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Memuat...</p>
            ) : monthSummary.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Belum ada data absensi bulan ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[400px] text-slate-100">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300 w-10">No</TableHead>
                      <TableHead className="text-slate-300">Nama</TableHead>
                      <TableHead className="text-slate-300 text-center">Kehadiran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthSummary.map((s, i) => (
                      <TableRow key={s.name} className={`${i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.06]"} hover:bg-white/10`}>
                        <TableCell className="text-sm text-slate-400">{i + 1}</TableCell>
                        <TableCell className="font-medium text-white">{s.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs ${s.count >= 10 ? "bg-emerald-500/30 text-emerald-200" : s.count >= 5 ? "bg-cyan-500/30 text-cyan-200" : "bg-amber-500/30 text-amber-200"}`}>
                            {s.count}x hadir
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat Personal */}
        {user && (
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle className="text-white">📝 Riwayat Kehadiran Kamu</CardTitle>
              <CardDescription className="text-slate-400">
                Data absensi bulan ini ({now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-400">Memuat...</p>
              ) : (() => {
                const personalRecords = monthRecords.filter(r => r.athleteUid === user.uid).sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
                if (personalRecords.length === 0) {
                  return <p className="py-4 text-center text-sm text-slate-500">Kamu belum ada data absensi bulan ini.</p>;
                }
                return (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[400px] text-slate-100">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-slate-300">Tanggal</TableHead>
                          <TableHead className="text-slate-300">Jam</TableHead>
                          <TableHead className="text-slate-300">Lokasi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personalRecords.map((r, i) => (
                          <TableRow key={r.id} className={`${i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.06]"} hover:bg-white/10`}>
                            <TableCell className="font-medium text-white">
                              {new Date(r.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                            </TableCell>
                            <TableCell className="text-sm text-slate-300">
                              {r.timestamp ? r.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                            </TableCell>
                            <TableCell className="text-sm text-cyan-400">
                              {r.locationName || "Crown Allstar Cheerleading"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
