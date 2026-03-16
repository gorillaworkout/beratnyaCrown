"use client";

import { useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  X,
  Sparkles,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// ─── Constants ───────────────────────────────────────────────────────────────

const glassCardClass = "border-white/10 bg-white/5 backdrop-blur-md shadow-xl";

const JERSEY_COLORS = [
  {
    name: "Merah",
    hex: "#ef4444",
    bg: "bg-red-500",
    emoji: "🔴",
    gradient: "from-red-500 to-red-600",
  },
  {
    name: "Biru",
    hex: "#3b82f6",
    bg: "bg-blue-500",
    emoji: "🔵",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    name: "Pink",
    hex: "#ec4899",
    bg: "bg-pink-500",
    emoji: "🩷",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    name: "Ungu",
    hex: "#8b5cf6",
    bg: "bg-violet-500",
    emoji: "🟣",
    gradient: "from-violet-500 to-violet-600",
  },
  {
    name: "Hijau",
    hex: "#22c55e",
    bg: "bg-green-500",
    emoji: "🟢",
    gradient: "from-green-500 to-green-600",
  },
  {
    name: "Hitam",
    hex: "#374151",
    bg: "bg-gray-700",
    emoji: "⚫",
    gradient: "from-gray-700 to-gray-800",
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type JerseyColor = (typeof JERSEY_COLORS)[number];

type ScheduleEntry = {
  date: string;
  dayName: string;
  isRegular: boolean;
  isCustom: boolean;
  jerseyColor: JerseyColor;
};

type CrownEvent = {
  id?: string;
  name: string;
  date: string;
  emoji: string;
  color: string;
};

type CustomDate = {
  id?: string;
  date: string;
  label: string;
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function getJerseyForDate(
  dateStr: string,
  index: number,
  prevColorIndex: number | null
): number {
  // Seed-based hash from date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  hash = Math.abs(hash + index * 7);

  let colorIndex = hash % JERSEY_COLORS.length;

  // Avoid repeating previous color
  if (prevColorIndex !== null && colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % JERSEY_COLORS.length;
  }

  return colorIndex;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const SHORT_DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const REGULAR_DAYS = new Set([0, 3, 6]); // Sun, Wed, Sat

const TRAINING_START = new Date(2026, 3, 1); // April 1, 2026

const DEFAULT_EVENTS: Omit<CrownEvent, "id">[] = [
  {
    name: "Kejurda",
    date: "2026-05-31",
    emoji: "🏆",
    color: "from-amber-500 to-yellow-600",
  },
  {
    name: "Kejurnas",
    date: "2026-07-26",
    emoji: "🥇",
    color: "from-violet-500 to-purple-600",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function JadwalPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";

  // ─── State ───────────────────────────────────────────────────────────────

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [customDates, setCustomDates] = useState<CustomDate[]>([]);
  const [jerseyOverrides, setJerseyOverrides] = useState<
    Record<string, number>
  >({});
  const [events, setEvents] = useState<CrownEvent[]>([]);
  const [newCustomDate, setNewCustomDate] = useState("");
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  // ─── Firestore Listeners ─────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;

    let firstSnapshot = true;

    // Listen to crown-events
    const unsubEvents = onSnapshot(
      collection(db, "crown-events"),
      async (snapshot) => {
        if (snapshot.empty && firstSnapshot) {
          // Seed default events
          for (const evt of DEFAULT_EVENTS) {
            await addDoc(collection(db, "crown-events"), evt);
          }
        } else {
          const evts: CrownEvent[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<CrownEvent, "id">),
          }));
          setEvents(evts);
        }
        if (firstSnapshot) {
          firstSnapshot = false;
        }
      }
    );

    // Listen to crown-custom-dates
    const unsubCustomDates = onSnapshot(
      collection(db, "crown-custom-dates"),
      (snapshot) => {
        const dates: CustomDate[] = snapshot.docs.map((d) => ({
          id: d.id,
          date: d.data().date as string,
          label: d.data().label as string,
        }));
        setCustomDates(dates);
      }
    );

    // Listen to jersey overrides
    const unsubOverrides = onSnapshot(
      doc(db, "crown-jersey-overrides", "overrides"),
      (snapshot) => {
        if (snapshot.exists()) {
          setJerseyOverrides(snapshot.data() as Record<string, number>);
        } else {
          setJerseyOverrides({});
        }
        setFirestoreLoading(false);
      }
    );

    return () => {
      unsubEvents();
      unsubCustomDates();
      unsubOverrides();
    };
  }, [authLoading]);

  // ─── Schedule Memo ───────────────────────────────────────────────────────

  const schedule = useMemo(() => {
    const entries: ScheduleEntry[] = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const customDateSet = new Set(customDates.map((cd) => cd.date));

    let prevColorIndex: number | null = null;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = date.getDay();
      const dayName = DAY_NAMES_ID[dayOfWeek];

      const isRegular = REGULAR_DAYS.has(dayOfWeek) && date >= TRAINING_START;
      const isCustom = customDateSet.has(dateStr);

      if (isRegular || isCustom) {
        let colorIndex: number;
        if (jerseyOverrides[dateStr] !== undefined) {
          colorIndex = jerseyOverrides[dateStr];
        } else {
          colorIndex = getJerseyForDate(dateStr, entries.length, prevColorIndex);
        }

        entries.push({
          date: dateStr,
          dayName,
          isRegular,
          isCustom,
          jerseyColor: JERSEY_COLORS[colorIndex],
        });

        prevColorIndex = colorIndex;
      }
    }

    return entries;
  }, [currentYear, currentMonth, customDates, jerseyOverrides]);

  // ─── Calendar Grid Memo ──────────────────────────────────────────────────

  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    // Monday-start offset: JS getDay() gives 0=Sun, we want Mon=0
    const firstDayOffset =
      (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const grid: (number | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < firstDayOffset; i++) {
      grid.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      grid.push(day);
    }

    return grid;
  }, [currentYear, currentMonth]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // ─── Calendar Sync Trigger ────────────────────────────────────────────────

  const triggerCalendarSync = async () => {
    try {
      const adminKey = "dupoin123"; // matches ADMIN_PASSWORD
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
    } catch {
      // Silent fail — calendar sync is best-effort
    }
  };

  // ─── Custom Date Management ──────────────────────────────────────────────

  const addCustomDate = async () => {
    if (!newCustomDate) return;
    await addDoc(collection(db, "crown-custom-dates"), {
      date: newCustomDate,
      label: newCustomLabel || "Latihan Tambahan",
    });
    setNewCustomDate("");
    setNewCustomLabel("");
    triggerCalendarSync();
  };

  const removeCustomDate = async (id: string) => {
    await deleteDoc(doc(db, "crown-custom-dates", id));
    triggerCalendarSync();
  };

  // ─── Jersey Override Management ──────────────────────────────────────────

  const cycleJersey = async (dateStr: string) => {
    const currentIndex = jerseyOverrides[dateStr];
    const entry = schedule.find((s) => s.date === dateStr);
    if (!entry) return;

    const currentColorIndex = JERSEY_COLORS.indexOf(entry.jerseyColor);
    const nextIndex =
      currentIndex !== undefined
        ? (currentIndex + 1) % JERSEY_COLORS.length
        : (currentColorIndex + 1) % JERSEY_COLORS.length;

    await setDoc(
      doc(db, "crown-jersey-overrides", "overrides"),
      { [dateStr]: nextIndex },
      { merge: true }
    );
    triggerCalendarSync();
  };

  const randomizeAll = async () => {
    const overrides: Record<string, number> = {};
    let prevIdx: number | null = null;

    for (const entry of schedule) {
      let idx = Math.floor(Math.random() * JERSEY_COLORS.length);
      if (prevIdx !== null && idx === prevIdx) {
        idx = (idx + 1) % JERSEY_COLORS.length;
      }
      overrides[entry.date] = idx;
      prevIdx = idx;
    }

    await setDoc(doc(db, "crown-jersey-overrides", "overrides"), overrides);
    triggerCalendarSync();
  };

  // ─── Event Management ────────────────────────────────────────────────────

  const addEvent = async () => {
    if (!newEventName || !newEventDate) return;
    await addDoc(collection(db, "crown-events"), {
      name: newEventName,
      date: newEventDate,
      emoji: "🏆",
      color: "from-amber-500 to-yellow-600",
    });
    setNewEventName("");
    setNewEventDate("");
    triggerCalendarSync();
  };

  const removeEvent = async (id: string) => {
    await deleteDoc(doc(db, "crown-events", id));
    triggerCalendarSync();
  };

  // ─── Countdown ───────────────────────────────────────────────────────────

  const getCountdown = (dateStr: string): string => {
    const target = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Sudah lewat";
    if (diffDays === 0) return "Hari ini!";
    if (diffDays === 1) return "Besok!";
    return `${diffDays} hari lagi`;
  };

  // ─── ICS Download ────────────────────────────────────────────────────────

  const downloadICS = () => {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Crown Allstar//Jadwal//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const entry of schedule) {
      const dateCompact = entry.date.replace(/-/g, "");
      const uid = `crown-${entry.date}@crownallstar.id`;

      lines.push("BEGIN:VEVENT");
      lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
      lines.push(`SUMMARY:Latihan Crown Allstar`);
      lines.push(`DESCRIPTION:Jersey: ${entry.jerseyColor.name}`);
      lines.push(`UID:${uid}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jadwal-crown-${formatMonthYear(currentYear, currentMonth).replace(/\s+/g, "-")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Google Calendar URL ─────────────────────────────────────────────────

  const getGoogleCalendarUrl = (entry: ScheduleEntry): string => {
    const dateCompact = entry.date.replace(/-/g, "");
    // For all-day event, end date is the next day
    const endDate = new Date(entry.date + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const endCompact = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Latihan Crown Allstar",
      dates: `${dateCompact}/${endCompact}`,
      details: `Jersey: ${entry.jerseyColor.name} ${entry.jerseyColor.emoji}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // ─── Computed Values ─────────────────────────────────────────────────────

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const totalSessions = schedule.length;
  const regularCount = schedule.filter((s) => s.isRegular).length;
  const customCount = schedule.filter((s) => s.isCustom && !s.isRegular).length;
  const todayEntry = schedule.find((s) => s.date === todayStr);

  // ─── Loading State ───────────────────────────────────────────────────────

  if (authLoading || firestoreLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80" />
          <p className="text-sm text-white/60">Memuat jadwal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <div className="flex items-center justify-center gap-3">
            <Calendar className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Jadwal Latihan
            </h1>
          </div>
          <p className="text-slate-400 text-sm">Rabu • Sabtu • Minggu + Latihan Tambahan</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Latihan</p>
              <p className="text-3xl font-bold text-cyan-400 mt-1">{totalSessions}</p>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rutin</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{regularCount}</p>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Tambahan</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{customCount}</p>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Hari Ini</p>
              {todayEntry ? (
                <div className="mt-1">
                  <span className="text-3xl">👕</span>
                  <p className="text-xs mt-1" style={{ color: todayEntry.jerseyColor.hex }}>
                    {todayEntry.jerseyColor.name}
                  </p>
                </div>
              ) : (
                <p className="text-3xl mt-1">😴 <span className="text-sm text-slate-500">Libur</span></p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events & Lomba Card */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span>🏆</span> Events & Lomba
            </CardTitle>
            <CardDescription className="text-slate-400">Acara mendatang dan countdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Belum ada event</p>
            )}
            {events.map((ev) => {
              const countdown = getCountdown(ev.date);
              const evDate = new Date(ev.date + "T00:00:00");
              const isPast = evDate < now;
              return (
                <div key={ev.id || ev.date} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ev.emoji || "🏅"}</span>
                    <div>
                      <p className="font-semibold text-white">{ev.name}</p>
                      <p className="text-xs text-slate-400">
                        {evDate.toLocaleDateString("id-ID", {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      isPast
                        ? "bg-slate-600 text-slate-300"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    }>
                      {countdown}
                    </Badge>
                    {isAdmin && ev.id && (
                      <Button variant="ghost" size="sm" onClick={() => removeEvent(ev.id!)} className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {isAdmin && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                <Input
                  type="text"
                  placeholder="Nama event..."
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                />
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white w-40 [color-scheme:dark]"
                />
                <Button onClick={addEvent} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar View Card */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">📅 Kalender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevMonth} className="text-slate-300 hover:text-white hover:bg-white/10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-bold text-white">{formatMonthYear(currentYear, currentMonth)}</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={goToday} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs">
                  Hari Ini
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={randomizeAll} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" /> Acak Warna
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={nextMonth} className="text-slate-300 hover:text-white hover:bg-white/10">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Subscribe & Export buttons */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-medium text-white hover:from-cyan-500 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20"
              >
                <Calendar className="h-3.5 w-3.5" />
                Subscribe ke Google Calendar
              </a>
              <a
                href={typeof window !== "undefined" ? window.location.origin.replace(/^https?/, "webcal") + "/api/calendar" : "webcal:///api/calendar"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                Apple Calendar
              </a>
              <Button variant="outline" size="sm" onClick={downloadICS} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs">
                <Download className="h-3 w-3 mr-1" /> Download .ics
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
              {SHORT_DAY_NAMES.map((d, i) => (
                <div key={d} className={[2, 5, 6].includes(i) ? "text-cyan-400" : "text-slate-600"}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, idx) => {
                if (cell === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(cell).padStart(2, "0")}`;
                const entry = schedule.find((s) => s.date === dateStr);
                const isToday = dateStr === todayStr;
                const isTraining = !!entry;
                const isPast = dateStr < todayStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => isAdmin && isTraining ? cycleJersey(dateStr) : undefined}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative text-xs transition-all
                      ${isTraining
                        ? `bg-gradient-to-br ${entry!.jerseyColor.gradient} shadow-lg ${isAdmin ? "cursor-pointer hover:scale-105" : ""}`
                        : isPast
                          ? "text-slate-700"
                          : "text-slate-500"
                      }
                      ${isToday ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-transparent" : ""}
                    `}
                  >
                    {isTraining && <span className="text-sm leading-none">👕</span>}
                    <span className={`font-bold ${isTraining ? "text-white" : ""}`}>{cell}</span>
                    {entry?.isCustom && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full ring-2 ring-cyan-400" />
                <span>Hari Ini</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600" />
                <span>Latihan Rutin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span>Latihan Tambahan</span>
              </div>
              {isAdmin && (
                <span className="ml-auto text-slate-600">Klik tanggal untuk ganti warna</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule List Card */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">📋 Daftar Jadwal</CardTitle>
            <CardDescription className="text-slate-400">
              {totalSessions} sesi latihan • {formatMonthYear(currentYear, currentMonth)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedule.map((entry) => {
                const isEntryToday = entry.date === todayStr;
                const d = new Date(entry.date + "T00:00:00");

                return (
                  <div
                    key={entry.date}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                      isEntryToday ? "bg-cyan-500/10 ring-1 ring-cyan-500/30" : "bg-white/5"
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${entry.jerseyColor.gradient} flex flex-col items-center justify-center shrink-0`}>
                      <span className="text-[10px] uppercase text-white/80 leading-none">
                        {d.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-white leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{entry.dayName}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isEntryToday && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] px-1.5">HARI INI</Badge>
                        )}
                        {entry.isCustom && (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-1.5">EXTRA</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg">👕</span>
                      <p className="text-[10px]" style={{ color: entry.jerseyColor.hex }}>{entry.jerseyColor.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {schedule.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                Tidak ada jadwal latihan bulan ini.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Admin Custom Dates Manager Card */}
        {isAdmin && (
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle className="text-white">⚙️ Kelola Latihan Tambahan</CardTitle>
              <CardDescription className="text-slate-400">Tambah atau hapus tanggal latihan tambahan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newCustomDate}
                  onChange={(e) => setNewCustomDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white w-44 [color-scheme:dark]"
                />
                <Input
                  type="text"
                  placeholder="Label (opsional)..."
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 flex-1"
                />
                <Button onClick={addCustomDate} size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customDates.map((cd) => (
                  <Badge
                    key={cd.id}
                    className="bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 py-1.5 px-3"
                  >
                    <span>
                      {new Date(cd.date + "T00:00:00").toLocaleDateString("id-ID", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                      {cd.label ? ` — ${cd.label}` : ""}
                    </span>
                    {cd.id && (
                      <button onClick={() => removeCustomDate(cd.id!)} className="ml-1 text-red-400 hover:text-red-300">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {customDates.length === 0 && (
                  <p className="text-slate-500 text-sm">Belum ada latihan tambahan</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Color Legend Card */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">🎨 Warna Jersey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {JERSEY_COLORS.map((color, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.gradient} shadow-lg`} />
                  <div>
                    <span className="text-lg">👕</span>
                    <p className="text-xs text-slate-300">{color.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4">
          👑 Crown Allstar Cheerleading
        </div>
      </div>
    </div>
  );
}
