"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  X,
  Clock,
  Edit2,
  UserX,
  Search,
  RefreshCw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { isHoliday } from "@/lib/holidays";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

// ─── Constants ───────────────────────────────────────────────────────────────

const glassCardClass = "border-white/10 bg-white/5 backdrop-blur-md shadow-xl";

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

const FALLBACK_ATHLETES = [
  "Bayu", "Helmi", "Kurniawan", "Karysa", "Amalia",
  "Moch Ihsan Tripamungkas", "Muhammad Akmal", "Muhammad Rizki Firdaus",
  "Nanda Natasya", "Renaldy Hardyanto", "Renanda Suwandi Putri",
  "Rangga Cornelis", "Wahyu Cahyadi", "Kijay", "Aissa Raihana Khyani Putri",
  "Aurel Zahra Dila", "Dewi Ramdhan Tri Mulya", "Kaisha Lula Arsyawijaya",
  "Malika Sakhi Nurachman", "Namina Mikayla Mikha", "Nadiya Hazizah Mulyanto",
  "Selma Daiva Fedora", "Siti Ramadhani", "Radinda Feyfey",
  "Zihan Yurifa Aldevara", "Fairuz Kania",
];

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

// ─── Types ───────────────────────────────────────────────────────────────────

const SHIRT_COLORS = [
  { name: "Merah", hex: "#ef4444" },
  { name: "Hitam", hex: "#374151" },
  { name: "Biru", hex: "#3b82f6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Putih", hex: "#f8fafc" },
  { name: "Pink", hex: "#ec4899" },
];

type ScheduleStatus = "latihan" | "libur" | "tambahan" | "event";

type ScheduleEntry = {
  id?: string;
  date: string;
  dayName: string;
  isRegular: boolean;
  status: ScheduleStatus;
  timeStart?: string;
  timeEnd?: string;
  note?: string;
  shirtColor?: typeof SHIRT_COLORS[number];
  holidayName?: string | null;
  eventName?: string;
  eventEmoji?: string;
};

type CrownEvent = {
  id?: string;
  name: string;
  date: string;
  emoji: string;
  color: string;
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  let colorIndex = Math.abs(hash) % SHIRT_COLORS.length;
  if (colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % SHIRT_COLORS.length;
  }
  return colorIndex;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  return `${hours}:${minutes}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JadwalPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";

  // ─── State ───────────────────────────────────────────────────────────────

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [events, setEvents] = useState<CrownEvent[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    status: "latihan" as ScheduleStatus,
    timeStart: "",
    timeEnd: "",
    note: "",
    shirtColorName: "",
  });

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: "",
    status: "tambahan" as ScheduleStatus,
    timeStart: "19:00",
    timeEnd: "22:00",
    note: "",
  });

  // Event form state
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  // Absence state
  const [absences, setAbsences] = useState<{date: string, absences: {name: string, reason: string}[]}[]>([]);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [selectedAbsenceDate, setSelectedAbsenceDate] = useState("");
  const [absenceForm, setAbsenceForm] = useState<{name: string, reason: string}[]>([]);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [dynamicAthletes, setDynamicAthletes] = useState<string[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // ─── Firestore Listeners ─────────────────────────────────────────────────

  const fetchScheduleData = useCallback(async () => {
    try {
      setIsSyncing(true);
      const scheduleSnapshot = await getDocs(collection(db, "crown-schedules"));
      const schedules: ScheduleEntry[] = scheduleSnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScheduleEntry, "id">),
      }));
      setScheduleData(schedules);
      setFirestoreLoading(false);
      setTimeout(() => setIsSyncing(false), 500);
    } catch (e) {
      console.error("Error syncing schedule:", e);
      setIsSyncing(false);
      setFirestoreLoading(false);
    }
  }, []);

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

    // Listen to crown-athletes
    const unsubAthletes = onSnapshot(collection(db, "crown-athletes"), (snap) => {
      const names = snap.docs.map(d => d.data().name).filter(Boolean).sort();
      if (names.length > 0) setDynamicAthletes(names);
    });

    // Listen to crown-absences
    const unsubAbsences = onSnapshot(collection(db, "crown-absences"), (snap) => {
      const data = snap.docs.map(d => ({ date: d.id, ...(d.data() as any) }));
      setAbsences(data);
    });

    // Listen to crown-schedules (new collection for editable schedules)
    const unsubSchedules = onSnapshot(
      collection(db, "crown-schedules"),
      (snapshot) => {
        const schedules: ScheduleEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScheduleEntry, "id">),
        }));
        setScheduleData(schedules);
        setFirestoreLoading(false);
      }
    );

    return () => {
      unsubEvents();
      unsubSchedules();
      unsubAthletes();
      unsubAbsences();
    };
  }, [authLoading]);

  // ─── Schedule Memo ───────────────────────────────────────────────────────

  const schedule = useMemo(() => {
    const entries: ScheduleEntry[] = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    let prevColorIndex = -1;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = date.getDay();
      const dayName = DAY_NAMES_ID[dayOfWeek];

      // Check if there's custom schedule in Firestore
      const customSchedule = scheduleData.find((s) => s.date === dateStr);
      const holidayName = isHoliday(dateStr);

      // Cek apakah ada event/lomba di hari ini
      const isEventDay = events.find((e) => e.date === dateStr);

      let currentShirtColor = undefined;
      const isRegular = REGULAR_DAYS.has(dayOfWeek) && date >= TRAINING_START;
      
      // Hari Latihan = jika ada custom jadwal Latihan, atau (hari reguler, TIDAK ADA event, TIDAK ADA jadwal libur)
      const isTrainingDay = 
        (customSchedule?.status === "latihan" || customSchedule?.status === "tambahan") || 
        (!customSchedule && isRegular && !isEventDay);
      
      if (isTrainingDay) {
        const colorIndex = getDeterministicShirtColor(dateStr, prevColorIndex);
        currentShirtColor = SHIRT_COLORS[colorIndex];
        prevColorIndex = colorIndex;
      }

      if (customSchedule) {
        // Fallback time to default if custom schedule doesn't have it defined properly
        const defaultTimeStart = dayOfWeek === 0 ? "10:00" : "19:00";
        const defaultTimeEnd = dayOfWeek === 0 ? "13:00" : "22:00";
        
        entries.push({
          ...customSchedule,
          date: dateStr,
          dayName,
          isRegular: REGULAR_DAYS.has(dayOfWeek),
          timeStart: customSchedule.timeStart || defaultTimeStart,
          timeEnd: customSchedule.timeEnd || defaultTimeEnd,
          shirtColor: currentShirtColor,
          holidayName,
          eventName: isEventDay ? isEventDay.name : undefined,
          eventEmoji: isEventDay ? isEventDay.emoji : undefined,
        });
      } else if (isEventDay) {
        entries.push({
          date: dateStr,
          dayName,
          isRegular: false, // Dianggap bukan hari latihan biasa
          status: "event",
          holidayName,
          eventName: isEventDay.name,
          eventEmoji: isEventDay.emoji,
        });
      } else {
        if (isRegular) {
          // Rabu (3) & Sabtu (6) -> 19:00 - 22:00 (7-10 malam)
          // Minggu (0) -> 10:00 - 13:00 (10-1 siang)
          const defaultTimeStart = dayOfWeek === 0 ? "10:00" : "19:00";
          const defaultTimeEnd = dayOfWeek === 0 ? "13:00" : "22:00";

          entries.push({
            date: dateStr,
            dayName,
            isRegular: true,
            status: "latihan",
            timeStart: defaultTimeStart,
            timeEnd: defaultTimeEnd,
            shirtColor: currentShirtColor,
            holidayName
          });
        } else if (holidayName) {
          // Tetap tampilkan hari libur nasional meskipun bukan jadwal reguler
          entries.push({
            date: dateStr,
            dayName,
            isRegular: false,
            status: "libur",
            shirtColor: undefined,
            holidayName
          });
        }
      }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [currentYear, currentMonth, scheduleData, events]);

  // ─── Calendar Grid Memo ──────────────────────────────────────────────────

  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOffset =
      (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const grid: (number | null)[] = [];

    for (let i = 0; i < firstDayOffset; i++) {
      grid.push(null);
    }

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
      const adminKey = "dupoin123";
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
    } catch {
      // Silent fail — calendar sync is best-effort
    }
  };

  // ─── Schedule Management ─────────────────────────────────────────────────

  const openEditDialog = (entry: ScheduleEntry) => {
    setEditingDate(entry.date);
    
    // Apply correct default time based on day if missing
    const dateObj = new Date(entry.date + "T00:00:00");
    const dayOfWeek = dateObj.getDay();
    const defaultTimeStart = dayOfWeek === 0 ? "10:00" : "19:00";
    const defaultTimeEnd = dayOfWeek === 0 ? "13:00" : "22:00";
    
    setEditForm({
      status: entry.status,
      timeStart: entry.timeStart || defaultTimeStart,
      timeEnd: entry.timeEnd || defaultTimeEnd,
      note: entry.note || "",
      shirtColorName: entry.shirtColor?.name || "",
    });
    setEditDialogOpen(true);
  };

  const saveSchedule = async () => {
    if (!editingDate) return;

    const date = new Date(editingDate + "T00:00:00");
    const dayOfWeek = date.getDay();

    const selectedShirt = SHIRT_COLORS.find(c => c.name === editForm.shirtColorName);
    
    const scheduleEntry: Omit<ScheduleEntry, "id"> = {
      date: editingDate,
      dayName: DAY_NAMES_ID[dayOfWeek],
      isRegular: REGULAR_DAYS.has(dayOfWeek),
      status: editForm.status,
      timeStart: editForm.timeStart,
      timeEnd: editForm.timeEnd,
      note: editForm.note,
      ...(selectedShirt ? { shirtColor: selectedShirt } : {}),
    };

    // Check if entry already exists
    const existing = scheduleData.find((s) => s.date === editingDate);

    if (existing?.id) {
      await updateDoc(doc(db, "crown-schedules", existing.id), scheduleEntry);
    } else {
      await addDoc(collection(db, "crown-schedules"), scheduleEntry);
    }

    triggerCalendarSync();
    setEditDialogOpen(false);
    setEditingDate(null);
  };

  const deleteSchedule = async () => {
    if (!editingDate) return;

    const existing = scheduleData.find((s) => s.date === editingDate);
    if (existing?.id) {
      await deleteDoc(doc(db, "crown-schedules", existing.id));
    }

    triggerCalendarSync();
    setEditDialogOpen(false);
    setEditingDate(null);
  };

  const addCustomSchedule = async () => {
    if (!addForm.date) return;

    const date = new Date(addForm.date + "T00:00:00");
    const dayOfWeek = date.getDay();

    const scheduleEntry: Omit<ScheduleEntry, "id"> = {
      date: addForm.date,
      dayName: DAY_NAMES_ID[dayOfWeek],
      isRegular: false,
      status: addForm.status,
      timeStart: addForm.timeStart,
      timeEnd: addForm.timeEnd,
      note: addForm.note,
    };

    await addDoc(collection(db, "crown-schedules"), scheduleEntry);

    triggerCalendarSync();
    setAddDialogOpen(false);
    setAddForm({
      date: "",
      status: "tambahan",
      timeStart: "19:00",
      timeEnd: "22:00",
      note: "",
    });
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

  const getTrainingSessionsUntil = (targetDateStr: string): number => {
    const targetDate = new Date(targetDateStr + "T00:00:00");
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    
    let count = 0;
    
    // Iterasi dari hari ini sampai sehari sebelum target date
    while (current < targetDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const dayOfWeek = current.getDay();
      
      const isRegular = REGULAR_DAYS.has(dayOfWeek) && current >= TRAINING_START;
      const customSchedule = scheduleData.find((s) => s.date === dateStr);
      const isEvent = events.some((e) => e.date === dateStr);
      const holidayName = isHoliday(dateStr);
      
      // Logika "Hari Latihan" yang akurat
      let isTrainingDay = false;
      if (customSchedule) {
        if (customSchedule.status === "latihan" || customSchedule.status === "tambahan") {
          isTrainingDay = true;
        }
      } else if (isRegular && !isEvent) {
        isTrainingDay = true;
      }
      
      if (isTrainingDay) {
        count++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // ─── Absence Management ──────────────────────────────────────────────

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
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
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

  const getStatusColor = (entryObj?: ScheduleEntry) => {
    if (!entryObj) return "";
    if (entryObj.status === "libur") return "bg-gradient-to-br from-red-500 to-red-600";
    if (entryObj.status === "event") return "bg-gradient-to-br from-indigo-500 to-purple-600";
    if (entryObj.holidayName && entryObj.status !== "tambahan" && entryObj.status !== "latihan" && entryObj.status !== "event") return "bg-gradient-to-br from-zinc-600 to-zinc-800";
    
    // Jika Latihan / Latihan Tambahan dan ada warna bajunya, paksa ikuti warna bajunya
    if ((entryObj.status === "latihan" || entryObj.status === "tambahan") && entryObj.shirtColor) {
        switch(entryObj.shirtColor.name) {
          case "Merah": return "bg-gradient-to-br from-red-500 to-red-700";
          case "Hitam": return "bg-gradient-to-br from-slate-700 to-slate-900";
          case "Biru": return "bg-gradient-to-br from-blue-500 to-blue-700";
          case "Orange": return "bg-gradient-to-br from-orange-500 to-orange-700";
          case "Putih": return "bg-slate-200 text-slate-900 border border-slate-300";
          case "Pink": return "bg-gradient-to-br from-pink-500 to-pink-700";
        }
    }
    
    if (entryObj.status === "tambahan") return "bg-gradient-to-br from-amber-500 to-amber-600";
    
    return "bg-gradient-to-br from-blue-500 to-blue-600";
  };

  const todayStr = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const validSessions = schedule.filter(s => s.status !== "libur" && s.status !== "event");
  const totalSessions = validSessions.length;
  const regularCount = validSessions.filter((s) => s.isRegular).length;
  const extraCount = validSessions.filter((s) => !s.isRegular && s.status === "tambahan").length;
  const todayEntry = schedule.find((s) => s.date === todayStr);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-gray-900 to-black p-4 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-6 relative">
          <div className="flex items-center justify-center gap-3">
            <Calendar className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Jadwal Latihan
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Rabu • Sabtu • Minggu + Latihan Tambahan
          </p>
          
          <Button
            onClick={fetchScheduleData}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className={`absolute top-6 right-0 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Jadwal
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Total Latihan
              </p>
              <p className="text-3xl font-bold text-cyan-400 mt-1">
                {totalSessions}
              </p>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Rutin
              </p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">
                {regularCount}
              </p>
            </CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Tambahan
              </p>
              <p className="text-3xl font-bold text-amber-400 mt-1">
                {extraCount}
              </p>
            </CardContent>
          </Card>
          <Card className={`${glassCardClass} ${todayEntry ? getStatusColor(todayEntry) : ''}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-xs uppercase tracking-wider ${todayEntry?.shirtColor?.name === "Putih" ? "text-slate-600 font-bold" : "text-slate-400"}`}>
                Hari Ini
              </p>
              {todayEntry ? (
                <div className="mt-1">
                  <p className={`text-xl font-bold ${todayEntry.shirtColor?.name === "Putih" ? "text-slate-900" : "text-white"}`}>
                    {todayEntry.timeStart}
                  </p>
                  <p className={`text-xs ${todayEntry.shirtColor?.name === "Putih" ? "text-slate-700" : "text-slate-400"}`}>
                    {todayEntry.status === "libur"
                      ? "Libur"
                      : todayEntry.status === "tambahan"
                      ? "Latihan Extra"
                      : "Ada Latihan"}
                  </p>
                </div>
              ) : (
                <p className="text-3xl mt-1">
                  😴 <span className="text-sm text-slate-500">Libur</span>
                </p>
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
            <CardDescription className="text-slate-400">
              Acara mendatang dan countdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Full Team Summary */}
            {(() => {
              const kejurda = events.find(e => e.name.toLowerCase().includes("kejurda"));
              const kejurnas = events.find(e => e.name.toLowerCase().includes("kejurnas"));
              const hasKejurda = kejurda && new Date(kejurda.date) > new Date();
              const hasKejurnas = kejurnas && new Date(kejurnas.date) > new Date();
              if (!hasKejurda && !hasKejurnas) return null;
              return (
                <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-amber-500/10 to-cyan-500/10 border border-white/10 rounded-lg px-4 py-3 mb-1">
                  <span className="text-sm text-slate-300 font-medium">🔥 Sisa Full Team:</span>
                  {hasKejurda && (
                    <span className="text-sm">
                      <span className="text-amber-400 font-bold">{getFullTeamSessionsUntil(kejurda.date)}x</span>
                      <span className="text-slate-400 ml-1">ke Kejurda</span>
                    </span>
                  )}
                  {hasKejurda && hasKejurnas && <span className="text-slate-600">•</span>}
                  {hasKejurnas && (
                    <span className="text-sm">
                      <span className="text-cyan-400 font-bold">{getFullTeamSessionsUntil(kejurnas.date)}x</span>
                      <span className="text-slate-400 ml-1">ke Kejurnas</span>
                    </span>
                  )}
                </div>
              );
            })()}

            {events.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">
                Belum ada event
              </p>
            )}
            {events.map((ev) => {
              const countdown = getCountdown(ev.date);
              const sessionsLeft = getTrainingSessionsUntil(ev.date);
              const evDate = new Date(ev.date + "T00:00:00");
              const isPast = evDate < now;
              return (
                <div
                  key={ev.id || ev.date}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 rounded-lg px-4 py-3 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ev.emoji || "🏅"}</span>
                    <div>
                      <p className="font-semibold text-white text-lg">{ev.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {evDate.toLocaleDateString("id-ID", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isPast && sessionsLeft > 0 && (
                      <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {sessionsLeft}x Latihan Lagi
                      </Badge>
                    )}
                    <Badge
                      className={
                        isPast
                          ? "bg-slate-600 text-slate-300"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }
                    >
                      {countdown}
                    </Badge>
                    {isAdmin && ev.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEvent(ev.id!)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                      >
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
                <Button
                  onClick={addEvent}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
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
              <Button
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-bold text-white">
                {formatMonthYear(currentYear, currentMonth)}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToday}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-xs"
                >
                  Hari Ini
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextMonth}
                  className="text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Subscribe Buttons */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-medium text-white hover:from-cyan-500 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20"
              >
                <Calendar className="h-3.5 w-3.5" />
                Subscribe ke Google Calendar
              </a>
              <a
                href={
                  typeof window !== "undefined"
                    ? window.location.origin.replace(/^https?/, "webcal") +
                      "/api/calendar"
                    : "webcal:///api/calendar"
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10 transition"
              >
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                Apple Calendar
              </a>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
              {SHORT_DAY_NAMES.map((d, i) => (
                <div
                  key={d}
                  className={[2, 5, 6].includes(i) ? "text-cyan-400" : "text-slate-600"}
                >
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

                const dateStr = `${currentYear}-${String(
                  currentMonth + 1
                ).padStart(2, "0")}-${String(cell).padStart(2, "0")}`;
                const entry = schedule.find((s) => s.date === dateStr);
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;

                const getStatusIcon = (status?: ScheduleStatus, entryObj?: ScheduleEntry) => {
                  switch (status) {
                    case "latihan":
                      return "💪";
                    case "libur":
                      return "😴";
                    case "tambahan":
                      return "⚡";
                    case "event":
                      return entryObj?.eventEmoji || "🏆";
                    default:
                      return "";
                  }
                };

                return (
                  <div
                    key={dateStr}
                    onClick={() => isAdmin && entry && openEditDialog(entry)}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative text-xs transition-all
                      ${
                        entry
                          ? `${getStatusColor(entry)} shadow-lg ${
                              isAdmin ? "cursor-pointer hover:scale-105" : ""
                            }`
                          : isPast
                          ? "text-slate-700"
                          : "text-slate-500"
                      }
                      ${
                        isToday
                          ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-transparent"
                          : ""
                      }
                    `}
                  >
                    {entry && (
                      <span className="text-sm leading-none md:block hidden">
                        {getStatusIcon(entry.status, entry)}
                      </span>
                    )}
                    <span
                      className={`font-bold ${entry && (!entry.shirtColor || entry.shirtColor.name !== "Putih") ? "text-white" : ""}`}
                    >
                      {cell}
                    </span>
                    {entry?.timeStart && (
                      <span className={`text-[8px] ${entry.shirtColor?.name === "Putih" ? "text-slate-600 font-semibold" : "text-white/80"}`}>
                        {entry.timeStart}
                      </span>
                    )}
                    {entry?.holidayName && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-zinc-400 shadow-md shadow-zinc-400/50" title={entry.holidayName} />
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
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-600" />
                <span>Libur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-600" />
                <span>Latihan Extra</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                <span>Event / Lomba</span>
              </div>
              <div className="flex items-center gap-1.5 w-full mt-1">
                <span className="text-slate-500 mr-1">Warna Latihan Rutin:</span>
                <div className="w-3 h-3 rounded-full bg-red-600" title="Merah" />
                <div className="w-3 h-3 rounded-full bg-slate-800" title="Hitam" />
                <div className="w-3 h-3 rounded-full bg-blue-600" title="Biru" />
                <div className="w-3 h-3 rounded-full bg-orange-600" title="Orange" />
                <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400" title="Putih" />
                <div className="w-3 h-3 rounded-full bg-pink-600" title="Pink" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-600 shadow-md shadow-zinc-600/50" />
                <span>Tanggal Merah / Libur Nasional</span>
              </div>
              {isAdmin && (
                <span className="ml-auto text-slate-600 w-full text-right">
                  Klik tanggal untuk edit
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule List Card */}
        <Card className={glassCardClass}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">📋 Daftar Jadwal</CardTitle>
              <CardDescription className="text-slate-400">
                {totalSessions} sesi latihan •{" "}
                {formatMonthYear(currentYear, currentMonth)}
              </CardDescription>
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
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setAddDialogOpen(true)}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedule.map((entry) => {
                const isEntryToday = entry.date === todayStr;
                const d = new Date(entry.date + "T00:00:00");

                const getStatusBadge = (status: ScheduleStatus) => {
                  switch (status) {
                    case "latihan":
                      return {
                        bg: "bg-blue-500/20",
                        text: "text-blue-400",
                        border: "border-blue-500/30",
                        label: "Latihan",
                      };
                    case "libur":
                      return {
                        bg: "bg-red-500/20",
                        text: "text-red-400",
                        border: "border-red-500/30",
                        label: "Libur",
                      };
                    case "tambahan":
                      return {
                        bg: "bg-amber-500/20",
                        text: "text-amber-400",
                        border: "border-amber-500/30",
                        label: "Tambahan",
                      };
                    case "event":
                      return {
                        bg: "bg-indigo-500/20",
                        text: "text-indigo-400",
                        border: "border-indigo-500/30",
                        label: "Event",
                      };
                  }
                };

                const statusBadge = getStatusBadge(entry.status);

                return (
                  <div
                    key={entry.date}
                    onClick={() => isAdmin && openEditDialog(entry)}
                    className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                      isEntryToday
                        ? "bg-cyan-500/10 ring-1 ring-cyan-500/30"
                        : "bg-white/5 hover:bg-white/10"
                    } ${isAdmin ? "cursor-pointer" : ""}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl ${statusBadge.bg} flex flex-col items-center justify-center shrink-0`}
                    >
                      <span className="text-[10px] uppercase text-white/80 leading-none">
                        {d.toLocaleDateString("id-ID", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-white leading-none">
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">
                        {entry.status === "event" && entry.eventName ? entry.eventName : entry.dayName}
                        {entry.holidayName && (
                          <span className="ml-2 text-[10px] text-zinc-400 font-normal">({entry.holidayName})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isEntryToday && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] px-1.5">
                            HARI INI
                          </Badge>
                        )}
                        <Badge
                          className={`${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} text-[10px] px-1.5`}
                        >
                          {statusBadge.label}
                        </Badge>
                        {(entry.status === "latihan" || entry.status === "tambahan") && (() => {
                          const absCount = getAbsenceCount(entry.date);
                          if (absCount > 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/20 text-[10px] px-1.5">⚠️ Minus {absCount} Orang</Badge>;
                          return <Badge className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-amber-400 border-amber-500/20 text-[10px] px-1.5">🔥 FULL TEAM READY</Badge>;
                        })()}
                      </div>
                      
                      {/* Show names if absent */}
                      {(entry.status === "latihan" || entry.status === "tambahan") && getAbsenceCount(entry.date) > 0 && (
                        <div className="mt-1 text-[10px] text-red-300/80 leading-tight">
                          {absences.find(a => a.date === entry.date)?.absences.map(a => a.name).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {entry.timeStart && entry.timeEnd ? (
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">
                            {entry.timeStart}
                          </p>
                          <p className="text-xs text-slate-400">
                            s/d {entry.timeEnd}
                          </p>
                          {entry.shirtColor && entry.status !== "libur" && (
                            <Badge variant="outline" className="mt-1 text-[10px] bg-white/5 border border-white/10" style={{ color: entry.shirtColor.hex }}>
                              👕 {entry.shirtColor.name}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-2xl">
                          {entry.status === "libur" ? "😴" : entry.status === "event" ? (entry.eventEmoji || "🏆") : "💪"}
                        </p>
                      )}
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

        
        {/* Rekap Izin Bulan Ini */}
        <Card className={glassCardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">📊 Rekap Izin Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
              const monthAbsences = absences.filter(a => a.date.startsWith(monthPrefix) && a.absences?.length > 0).sort((a,b) => a.date.localeCompare(b.date));
              if (monthAbsences.length === 0) return <p className="text-slate-400 text-sm">Tidak ada yang izin di bulan ini. FULL TEAM! 🔥</p>;
              return (
                <div className="space-y-3">
                  {monthAbsences.map(rec => (
                    <div key={rec.date} className="border border-white/10 rounded-lg p-3 bg-black/20">
                      <p className="text-sm font-medium text-white mb-1">{new Date(rec.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.absences.map((a: any, i: number) => (
                          <Badge key={i} className="bg-red-500/20 text-red-300 border-red-500/20 text-xs">{a.name}{a.reason ? ` (${a.reason})` : ""}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4">
          👑 Crown Allstar Cheerleading
        </div>
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Jadwal</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingDate &&
                new Date(editingDate + "T00:00:00").toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Status
              </label>
              <Select
                value={editForm.status}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, status: v as ScheduleStatus })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="latihan" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Latihan Rutin</SelectItem>
                  <SelectItem value="libur" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Libur</SelectItem>
                  <SelectItem value="tambahan" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Latihan Tambahan</SelectItem>
                  <SelectItem value="event" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Event & Lomba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.status !== "libur" && editForm.status !== "event" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Mulai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeStart}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeStart: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Selesai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeEnd}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeEnd: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Catatan (opsional)
              </label>
              <Input
                type="text"
                placeholder="Mis: Bawa perlengkapan tambahan..."
                value={editForm.note}
                onChange={(e) =>
                  setEditForm({ ...editForm, note: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setEditDialogOpen(false)}
                variant="outline"
                className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              >
                Batal
              </Button>
              <Button
                onClick={deleteSchedule}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Hapus
              </Button>
              <Button
                onClick={saveSchedule}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Simpan
              </Button>
            </div>
          </div>
        
              {/* Izin Button */}
              <Button
                onClick={() => { setEditDialogOpen(false); openAbsenceDialog(editingDate || ""); }}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white border-0"
              >
                <UserX className="mr-2 h-4 w-4" />
                Atur Izin Atlit
              </Button>
</DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tambahkan jadwal latihan baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Tanggal
              </label>
              <Input
                type="date"
                value={addForm.date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const dayOfWeek = new Date(newDate + "T00:00:00").getDay();
                  setAddForm({ 
                    ...addForm, 
                    date: newDate,
                    timeStart: dayOfWeek === 0 ? "10:00" : "19:00",
                    timeEnd: dayOfWeek === 0 ? "13:00" : "22:00"
                  });
                }}
                className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Status
              </label>
              <Select
                value={addForm.status}
                onValueChange={(v) =>
                  setAddForm({ ...addForm, status: v as ScheduleStatus })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="latihan" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Latihan Rutin</SelectItem>
                  <SelectItem value="libur" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Libur</SelectItem>
                  <SelectItem value="tambahan" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Latihan Tambahan</SelectItem>
                  <SelectItem value="event" className="focus:bg-slate-700 focus:text-white cursor-pointer focus:bg-white/10">Event & Lomba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addForm.status !== "libur" && addForm.status !== "event" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Mulai
                  </label>
                  <Input
                    type="time"
                    value={addForm.timeStart}
                    onChange={(e) =>
                      setAddForm({ ...addForm, timeStart: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Selesai
                  </label>
                  <Input
                    type="time"
                    value={addForm.timeEnd}
                    onChange={(e) =>
                      setAddForm({ ...addForm, timeEnd: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-slate-400 block mb-1.5">
                Catatan (opsional)
              </label>
              <Input
                type="text"
                placeholder="Mis: Latihan khusus stunt..."
                value={addForm.note}
                onChange={(e) =>
                  setAddForm({ ...addForm, note: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setAddDialogOpen(false)}
                variant="outline"
                className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
              >
                Batal
              </Button>
              <Button
                onClick={addCustomSchedule}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Tambahkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        </Dialog>
    </div>
  );
}
