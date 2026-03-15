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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  RefreshCw,
  X,
  Sparkles,
} from "lucide-react";

const glassCardClass =
  "border-white/10 bg-white/5 backdrop-blur-md shadow-xl";

// Jersey colors with emoji + gradient for visual punch
const JERSEY_COLORS = [
  { name: "Merah", hex: "#ef4444", bg: "bg-red-500", emoji: "🔴", gradient: "from-red-500 to-red-700" },
  { name: "Biru", hex: "#3b82f6", bg: "bg-blue-500", emoji: "🔵", gradient: "from-blue-500 to-blue-700" },
  { name: "Pink", hex: "#ec4899", bg: "bg-pink-500", emoji: "🩷", gradient: "from-pink-500 to-pink-700" },
  { name: "Ungu", hex: "#8b5cf6", bg: "bg-violet-500", emoji: "🟣", gradient: "from-violet-500 to-violet-700" },
  { name: "Hijau", hex: "#22c55e", bg: "bg-green-500", emoji: "🟢", gradient: "from-green-500 to-green-700" },
  { name: "Hitam", hex: "#374151", bg: "bg-gray-700", emoji: "⚫", gradient: "from-gray-600 to-gray-800" },
] as const;

type JerseyColor = (typeof JERSEY_COLORS)[number];

type ScheduleEntry = {
  date: string;
  dayName: string;
  isRegular: boolean;
  isCustom: boolean;
  jerseyColor: JerseyColor;
};

// Seed-based random so colors are stable per date, avoids repeating previous color
function getJerseyForDate(dateStr: string, prevColorIdx?: number): JerseyColor {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  let idx = Math.abs(hash) % JERSEY_COLORS.length;
  // If same as previous, shift to next
  if (prevColorIdx !== undefined && idx === prevColorIdx) {
    idx = (idx + 1) % JERSEY_COLORS.length;
  }
  return JERSEY_COLORS[idx];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

const DAY_NAMES_ID = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];
const SHORT_DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Regular training days: 0=Sunday, 3=Wednesday, 6=Saturday
const REGULAR_DAYS = new Set([0, 3, 6]);

// Training starts from April 1, 2026
const TRAINING_START = new Date(2026, 3, 1); // April 1, 2026

// Events / Competitions
type CrownEvent = {
  name: string;
  date: string; // YYYY-MM-DD
  emoji: string;
  color: string; // gradient
};

const EVENTS_KEY = "beratnya-events";

const DEFAULT_EVENTS: CrownEvent[] = [
  {
    name: "Kejurda (Kejuaraan Daerah)",
    date: "2026-05-31",
    emoji: "🏆",
    color: "from-amber-500 to-yellow-600",
  },
  {
    name: "Kejurnas (Kejuaraan Nasional)",
    date: "2026-07-26",
    emoji: "🥇",
    color: "from-violet-500 to-purple-600",
  },
];

const STORAGE_KEY = "beratnya-custom-dates";
const JERSEY_OVERRIDE_KEY = "beratnya-jersey-overrides";

export default function JadwalPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [jerseyOverrides, setJerseyOverrides] = useState<Record<string, number>>({});
  const [newCustomDate, setNewCustomDate] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<CrownEvent[]>(DEFAULT_EVENTS);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCustomDates(JSON.parse(saved));
      const savedEvents = localStorage.getItem(EVENTS_KEY);
      if (savedEvents) setEvents(JSON.parse(savedEvents));
      const savedJerseys = localStorage.getItem(JERSEY_OVERRIDE_KEY);
      if (savedJerseys) setJerseyOverrides(JSON.parse(savedJerseys));
      fetch("/api/admin/session")
        .then((r) => r.json())
        .then((d) => setIsAdmin(!!d.isAdmin))
        .catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customDates));
  }, [customDates]);

  useEffect(() => {
    localStorage.setItem(JERSEY_OVERRIDE_KEY, JSON.stringify(jerseyOverrides));
  }, [jerseyOverrides]);

  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const schedule = useMemo(() => {
    const entries: ScheduleEntry[] = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dayOfWeek = d.getDay();
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isRegular = REGULAR_DAYS.has(dayOfWeek);
      const isCustom = customDates.includes(dateStr);

      // Skip dates before training start
      if (d < TRAINING_START && !isCustom) continue;

      if (isRegular || isCustom) {
        const colorIdx = jerseyOverrides[dateStr];
        const prevEntry = entries.length > 0 ? entries[entries.length - 1] : null;
        const prevColorIdx = prevEntry ? JERSEY_COLORS.indexOf(prevEntry.jerseyColor) : undefined;
        const jersey = colorIdx !== undefined ? JERSEY_COLORS[colorIdx] : getJerseyForDate(dateStr, prevColorIdx);
        entries.push({
          date: dateStr,
          dayName: DAY_NAMES_ID[dayOfWeek],
          isRegular,
          isCustom: isCustom && !isRegular,
          jerseyColor: jersey,
        });
      }
    }
    return entries;
  }, [currentYear, currentMonth, customDates, jerseyOverrides]);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const weeks: (null | { day: number; dateStr: string; entry?: ScheduleEntry })[][] = [];
    let week: (null | { day: number; dateStr: string; entry?: ScheduleEntry })[] = [];

    for (let i = 0; i < firstDay; i++) week.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = schedule.find((s) => s.date === dateStr);
      week.push({ day, dateStr, entry });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [currentYear, currentMonth, schedule]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(currentYear - 1); setCurrentMonth(11); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(currentYear + 1); setCurrentMonth(0); }
    else setCurrentMonth(currentMonth + 1);
  };

  const goToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const addCustomDate = () => {
    if (newCustomDate && !customDates.includes(newCustomDate)) {
      setCustomDates([...customDates, newCustomDate].sort());
      setNewCustomDate("");
    }
  };

  const removeCustomDate = (dateStr: string) => {
    setCustomDates(customDates.filter((d) => d !== dateStr));
  };

  const cycleJersey = (dateStr: string) => {
    const current = jerseyOverrides[dateStr];
    const nextIdx = current !== undefined ? (current + 1) % JERSEY_COLORS.length : 1;
    setJerseyOverrides({ ...jerseyOverrides, [dateStr]: nextIdx });
  };

  const randomizeAll = () => {
    const overrides: Record<string, number> = {};
    schedule.forEach((entry) => {
      overrides[entry.date] = Math.floor(Math.random() * JERSEY_COLORS.length);
    });
    setJerseyOverrides({ ...jerseyOverrides, ...overrides });
  };

  const addEvent = () => {
    if (newEventName && newEventDate) {
      setEvents([...events, {
        name: newEventName,
        date: newEventDate,
        emoji: "🏆",
        color: "from-cyan-500 to-blue-600",
      }].sort((a, b) => a.date.localeCompare(b.date)));
      setNewEventName("");
      setNewEventDate("");
    }
  };

  const removeEvent = (idx: number) => {
    setEvents(events.filter((_, i) => i !== idx));
  };

  const getCountdown = (dateStr: string) => {
    const target = new Date(`${dateStr}T00:00:00`);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "Sudah lewat";
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return "Besok!";
    if (days <= 7) return `${days} hari lagi`;
    const weeks = Math.floor(days / 7);
    return `${days} hari (${weeks} minggu)`;
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const totalSessions = schedule.length;
  const regularCount = schedule.filter((s) => s.isRegular).length;
  const customCount = schedule.filter((s) => s.isCustom).length;
  const todayEntry = schedule.find((s) => s.date === todayStr);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">

        {/* Header */}
        <header className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${glassCardClass}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Jadwal Latihan</h1>
              <p className="text-sm text-slate-400">Rabu • Sabtu • Minggu + Latihan Tambahan</p>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className={glassCardClass}>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-3xl font-bold text-cyan-400">{totalSessions}</span>
              <span className="text-xs text-slate-400">Total Latihan</span>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-3xl font-bold text-emerald-400">{regularCount}</span>
              <span className="text-xs text-slate-400">Rutin</span>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              <span className="text-3xl font-bold text-amber-400">{customCount}</span>
              <span className="text-xs text-slate-400">Tambahan</span>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="flex flex-col items-center gap-1 p-4">
              {todayEntry ? (
                <>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${todayEntry.jerseyColor.gradient} shadow-lg`}
                  >
                    <span className="text-lg">👕</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Hari Ini: <span className="font-semibold text-white">{todayEntry.jerseyColor.name}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-3xl">😴</span>
                  <span className="text-xs text-slate-400">Hari Ini Libur</span>
                </>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Upcoming Events */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">🏆 Event & Lomba</CardTitle>
            <CardDescription className="text-slate-400">
              Countdown menuju kompetisi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((evt, i) => {
              const d = new Date(`${evt.date}T00:00:00`);
              const isPast = d < today;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                    isPast
                      ? "border-white/5 bg-white/[0.02] opacity-50"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br ${evt.color} shadow-lg`}
                  >
                    <span className="text-2xl">{evt.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{evt.name}</p>
                    <p className="text-sm text-slate-400">
                      {d.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      className={`text-xs ${
                        isPast
                          ? "bg-slate-500/30 text-slate-300"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {isPast ? "Selesai" : getCountdown(evt.date)}
                    </Badge>
                    {isAdmin && (
                      <button
                        onClick={() => removeEvent(i)}
                        className="text-[10px] text-slate-600 hover:text-rose-400 transition-colors"
                      >
                        hapus
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isAdmin && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <Input
                  placeholder="Nama event..."
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="max-w-[200px] border-white/20 bg-white/5 text-white text-sm"
                />
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="max-w-[170px] border-white/20 bg-white/5 text-white [color-scheme:dark] text-sm"
                />
                <Button
                  onClick={addEvent}
                  disabled={!newEventName || !newEventDate}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                >
                  <Plus className="mr-1 h-4 w-4" /> Tambah
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={prevMonth} className="text-slate-300 hover:bg-white/10 hover:text-white">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="min-w-[200px] text-center text-xl">
                  {formatMonthYear(currentYear, currentMonth)}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={nextMonth} className="text-slate-300 hover:bg-white/10 hover:text-white">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={goToday} className="text-xs text-slate-300 hover:bg-white/10">
                  Hari Ini
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={randomizeAll} className="text-xs text-slate-300 hover:bg-white/10">
                    <Sparkles className="mr-1 h-3 w-3" /> Acak Warna
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Day headers */}
                <div className="mb-3 grid grid-cols-7 gap-2">
                  {SHORT_DAY_NAMES.map((d, i) => (
                    <div
                      key={d}
                      className={`py-2 text-center text-xs font-bold uppercase tracking-wider ${
                        REGULAR_DAYS.has(i) ? "text-cyan-400" : "text-slate-600"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="space-y-2">
                  {calendarGrid.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-2">
                      {week.map((cell, ci) => {
                        if (!cell) {
                          return <div key={`empty-${wi}-${ci}`} className="aspect-square" />;
                        }

                        const isToday = cell.dateStr === todayStr;
                        const hasTraining = !!cell.entry;
                        const isPast = new Date(`${cell.dateStr}T23:59:59`) < today;

                        return (
                          <div
                            key={cell.dateStr}
                            className={`relative flex aspect-square flex-col items-center justify-center rounded-xl transition-all duration-200 ${
                              hasTraining
                                ? isToday
                                  ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-black shadow-lg shadow-cyan-500/20"
                                  : "hover:scale-105 hover:shadow-lg"
                                : ""
                            } ${hasTraining && isAdmin ? "cursor-pointer active:scale-95" : ""}`}
                            style={
                              hasTraining
                                ? {
                                    background: `linear-gradient(135deg, ${cell.entry!.jerseyColor.hex}dd, ${cell.entry!.jerseyColor.hex}88)`,
                                  }
                                : {}
                            }
                            onClick={() => {
                              if (hasTraining && isAdmin) cycleJersey(cell.dateStr);
                            }}
                          >
                            {/* Date number */}
                            <span
                              className={`text-sm font-bold ${
                                hasTraining
                                  ? "text-white drop-shadow-md"
                                  : isPast
                                    ? "text-slate-700"
                                    : "text-slate-500"
                              }`}
                            >
                              {cell.day}
                            </span>

                            {/* Jersey emoji for training days */}
                            {hasTraining && (
                              <span className="text-lg leading-none drop-shadow-md">👕</span>
                            )}

                            {/* Custom training dot */}
                            {cell.entry?.isCustom && (
                              <div className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 shadow">
                                <Plus className="h-2 w-2 text-amber-900" />
                              </div>
                            )}

                            {/* Today indicator */}
                            {isToday && !hasTraining && (
                              <div className="absolute bottom-1 h-1 w-4 rounded-full bg-cyan-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-gradient-to-br from-cyan-400/40 to-cyan-600/40 ring-1 ring-cyan-400" />
                    <span>Hari Ini</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                    <span>Latihan Rutin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative h-4 w-4 rounded bg-gradient-to-br from-green-500 to-green-700">
                      <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
                    </div>
                    <span>Latihan Tambahan</span>
                  </div>
                  {isAdmin && (
                    <span className="ml-auto text-slate-500">Klik tanggal untuk ganti warna</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule List */}
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-white">📋 Jadwal Bulan Ini</CardTitle>
                <CardDescription className="text-slate-400">
                  {totalSessions} sesi latihan • {formatMonthYear(currentYear, currentMonth)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {schedule.map((entry, i) => {
                const isToday = entry.date === todayStr;
                const d = new Date(`${entry.date}T00:00:00`);
                return (
                  <div
                    key={entry.date}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      isToday
                        ? "border-cyan-400/40 bg-cyan-400/5 shadow-lg shadow-cyan-500/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* Color block */}
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br ${entry.jerseyColor.gradient} shadow-md`}
                    >
                      <span className="text-[10px] font-bold uppercase text-white/80">
                        {d.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                      <span className="text-lg font-black leading-none text-white">
                        {d.getDate()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{entry.dayName}</span>
                        {isToday && (
                          <Badge className="bg-cyan-500/30 text-cyan-200 text-[10px] px-1.5 py-0">
                            HARI INI
                          </Badge>
                        )}
                        {entry.isCustom && (
                          <Badge className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0">
                            EXTRA
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-lg leading-none">👕</span>
                        <span className="text-sm text-slate-300">{entry.jerseyColor.name}</span>
                      </div>
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

        {/* Admin: Custom Dates Manager */}
        {isAdmin && (
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle className="text-white">⚙️ Kelola Jadwal Tambahan</CardTitle>
              <CardDescription className="text-slate-400">
                Tambah latihan di luar hari Rabu, Sabtu, Minggu (untuk persiapan lomba).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newCustomDate}
                  onChange={(e) => setNewCustomDate(e.target.value)}
                  className="max-w-[200px] border-white/20 bg-white/5 text-white [color-scheme:dark]"
                />
                <Button onClick={addCustomDate} disabled={!newCustomDate} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Plus className="mr-1 h-4 w-4" /> Tambah
                </Button>
              </div>

              {customDates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customDates.map((dateStr) => {
                    const d = new Date(`${dateStr}T00:00:00`);
                    return (
                      <Badge
                        key={dateStr}
                        className="flex items-center gap-1 bg-amber-500/20 text-amber-200 px-3 py-1.5 text-xs"
                      >
                        {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        <button
                          onClick={() => removeCustomDate(dateStr)}
                          className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Color Legend */}
        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle className="text-white">🎨 Pilihan Warna Kaos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {JERSEY_COLORS.map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.08]"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} shadow-lg`}
                  >
                    <span className="text-2xl">👕</span>
                  </div>
                  <span className="text-sm font-medium text-white">{c.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
