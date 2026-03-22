"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { db } from "@/lib/firebase";

type PenaltyPlan = {
  level: number;
  title: string;
  duration: string;
  rounds: string;
  exercises: string[];
};

const penaltyPlans: PenaltyPlan[] = [
  {
    level: 1,
    title: "Level 1 (1x tanpa progres)",
    duration: "15 menit",
    rounds: "3 putaran",
    exercises: [
      "Jumping jacks x40",
      "Push-up x15",
      "Squat x20",
      "Mountain climbers x40",
      "Plank 40 detik",
      "Handstand 30 detik"
    ]
  },
  {
    level: 2,
    title: "Level 2 (2x tanpa progres)",
    duration: "20 menit",
    rounds: "4 putaran",
    exercises: [
      "High knees x50",
      "Lunges x20 per kaki",
      "Push-up x18",
      "Squat jumps x20",
      "Sit-up x25",
      "Side plank 35 detik per sisi",
      "Handstand 30 detik"
    ]
  },
  {
    level: 3,
    title: "Level 3 (3x tanpa progres)",
    duration: "25 menit",
    rounds: "5 putaran",
    exercises: [
      "Burpees x18",
      "Squat jumps x25",
      "Mountain climbers x60",
      "Push-up x22",
      "Plank 60 detik",
      "Sit-up x30",
      "Handstand 30 detik"
    ]
  },
  {
    level: 4,
    title: "Level 4 (4x tanpa progres)",
    duration: "30 menit",
    rounds: "6 putaran",
    exercises: [
      "Burpees x22",
      "Jump squats x30",
      "Mountain climbers x70",
      "Push-up x25",
      "Walking lunges x24 per kaki",
      "Plank 75 detik",
      "Handstand 30 detik"
    ]
  },
  {
    level: 5,
    title: "Level 5 (5x+ tanpa progres)",
    duration: "35 menit",
    rounds: "7 putaran",
    exercises: [
      "Burpees x25",
      "Jump squats x35",
      "Push-up x30",
      "Mountain climbers x80",
      "Sit-up x40",
      "Plank 90 detik",
      "Handstand 30 detik"
    ]
  }
];

const noProgressNote = "Tidak ada progres. Lihat hukuman aktif di riwayat.";
const keepTrainingNote = "Pertahankan pola latihan.";
const missingGoalNote = "Goal wajib diisi agar progres terhitung.";

const glassCardClass =
  "border-white/20 bg-white/10 backdrop-blur-xl text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.35)]";
const glassFieldClass =
  "border-white/20 bg-white/10 text-slate-100 placeholder:text-slate-400 focus-visible:ring-white/40";
const glassButtonClass =
  "border-white/30 bg-white/10 text-slate-100 hover:bg-white/20 focus-visible:ring-white/40";

const getTodayDateValue = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const formatDateValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const isFutureTrainingDate = (dateValue: string) =>
  dateValue > getTodayDateValue();

type Athlete = {
  id: string;
  name: string;
  currentWeight: number;
  previousWeight: number | null;
  goalWeight: number | null;
  trainingDate: Date | null;
  updatedAt: Date | null;
};

type WeightLog = {
  id: string;
  weight: number;
  trainingDate: Date | null;
  createdAt: Date | null;
};

type PenaltyInfo = {
  athleteId: string;
  athleteName: string;
  currentWeight: number;
  goalWeight: number | null;
  streak: number;
  penalty: PenaltyPlan | null;
};

const sortWeightLogs = (logs: WeightLog[]) =>
  [...logs].sort((a, b) => {
    const aTraining = a.trainingDate
      ? new Date(
          a.trainingDate.getFullYear(),
          a.trainingDate.getMonth(),
          a.trainingDate.getDate()
        ).getTime()
      : Number.NEGATIVE_INFINITY;
    const bTraining = b.trainingDate
      ? new Date(
          b.trainingDate.getFullYear(),
          b.trainingDate.getMonth(),
          b.trainingDate.getDate()
        ).getTime()
      : Number.NEGATIVE_INFINITY;

    if (aTraining !== bTraining) {
      return bTraining - aTraining;
    }

    const aCreated = a.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const bCreated = b.createdAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    return bCreated - aCreated;
  });

const getPenaltyForStreak = (streak: number) => {
  if (streak <= 0) {
    return null;
  }
  const index = Math.min(streak - 1, penaltyPlans.length - 1);
  return penaltyPlans[index];
};

const getNoProgressStreak = (logs: WeightLog[], goalWeight: number | null) => {
  if (!logs.length) {
    return 0;
  }
  if (goalWeight === null) {
    return logs.length;
  }
  const latestDistance = Math.abs((logs[0]?.weight ?? 0) - goalWeight);
  if (latestDistance === 0) {
    return 0;
  }
  if (logs.length < 2) {
    return 0;
  }

  // Hitung streak terakhir tanpa progres: berat tidak turun
  // atau tidak makin dekat ke goal.
  let streak = 0;
  for (let index = 0; index < logs.length - 1; index += 1) {
    const current = logs[index];
    const previous = logs[index + 1];
    const didNotDecrease = current.weight >= previous.weight;
    const notCloserToGoal =
      Math.abs(current.weight - goalWeight) >= Math.abs(previous.weight - goalWeight);

    if (didNotDecrease || notCloserToGoal) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value) {
    const maybeDate = (value as { toDate: () => Date }).toDate();
    return maybeDate instanceof Date ? maybeDate : null;
  }
  return null;
};

const normalizeTrainingDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }
  return toDate(value);
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const formatDateCompact = (date: Date) =>
  date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

const getSummary = (items: Athlete[]) => {
  const withPrevious = items.filter((athlete) => athlete.previousWeight !== null);
  const improved = withPrevious.filter(
    (athlete) => athlete.currentWeight < (athlete.previousWeight ?? 0)
  );
  return {
    total: items.length,
    checked: withPrevious.length,
    improved: improved.length
  };
};

const getLatestUpdate = (items: Athlete[]) => {
  const trainingDates = items
    .map((athlete) => athlete.trainingDate)
    .filter((value): value is Date => Boolean(value));
  if (trainingDates.length) {
    const latestTraining = Math.max(...trainingDates.map((date) => date.getTime()));
    return new Date(latestTraining);
  }
  const updatedDates = items
    .map((athlete) => athlete.updatedAt)
    .filter((value): value is Date => Boolean(value));
  if (!updatedDates.length) {
    return null;
  }
  const latest = Math.max(...updatedDates.map((date) => date.getTime()));
  return new Date(latest);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function DashboardPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteWeight, setNewAthleteWeight] = useState("");
  const [newAthleteGoal, setNewAthleteGoal] = useState("");
  const [newAthleteDate, setNewAthleteDate] = useState(() => getTodayDateValue());
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [updatedWeight, setUpdatedWeight] = useState("");
  const [updatedGoal, setUpdatedGoal] = useState("");
  const [updatedDate, setUpdatedDate] = useState(() => getTodayDateValue());
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [detailAthleteId, setDetailAthleteId] = useState("");
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [seedError, setSeedError] = useState("");
  const [seedSuccess, setSeedSuccess] = useState("");
  const [isSeedingLogs, setIsSeedingLogs] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.email === "darmawanbayu1@gmail.com";
  const isCheckingSession = false;
  const [penaltyInfos, setPenaltyInfos] = useState<PenaltyInfo[]>([]);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [allAthleteLogs, setAllAthleteLogs] = useState<Record<string, WeightLog[]>>({});
  const [allLogsLoading, setAllLogsLoading] = useState(false);


  useEffect(() => {
    const athletesQuery = query(collection(db, "athletes"), orderBy("name"));
    const unsubscribe = onSnapshot(
      athletesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const docData = docSnap.data();
          return {
            id: docSnap.id,
            name: String(docData.name ?? ""),
            currentWeight: Number(docData.currentWeight ?? 0),
            previousWeight:
              docData.previousWeight === null || docData.previousWeight === undefined
                ? null
                : Number(docData.previousWeight),
            goalWeight:
              docData.goalWeight === null || docData.goalWeight === undefined
                ? null
                : Number(docData.goalWeight),
            trainingDate: normalizeTrainingDate(docData.trainingDate),
            updatedAt: toDate(docData.updatedAt)
          } as Athlete;
        });
        setAthletes(data);
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setLoadError("Gagal memuat data dari Firestore.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedAthleteId && !athletes.find((athlete) => athlete.id === selectedAthleteId)) {
      setSelectedAthleteId("");
    }
  }, [athletes, selectedAthleteId]);


  // Load all weight logs + compute penalties for all athletes
  useEffect(() => {
    if (!athletes.length) {
      setAllAthleteLogs({});
      setPenaltyInfos([]);
      return;
    }
    let cancelled = false;
    setAllLogsLoading(true);
    setPenaltyLoading(true);

    const loadAll = async () => {
      const result: Record<string, WeightLog[]> = {};
      const infos: PenaltyInfo[] = [];

      await Promise.all(
        athletes.map(async (athlete) => {
          try {
            const logsQuery = query(collection(db, "athletes", athlete.id, "weights"));
            const snapshot = await getDocs(logsQuery);
            const logs = sortWeightLogs(
              snapshot.docs.map((docSnap) => {
                const docData = docSnap.data();
                return {
                  id: docSnap.id,
                  weight: Number(docData.weight ?? 0),
                  trainingDate: normalizeTrainingDate(docData.trainingDate),
                  createdAt: toDate(docData.createdAt),
                } as WeightLog;
              })
            );
            result[athlete.id] = logs;

            // Compute penalty
            const effectiveLogs = logs.length > 0 ? logs : [
              { id: "current", weight: athlete.currentWeight, trainingDate: athlete.trainingDate, createdAt: athlete.updatedAt },
              ...(athlete.previousWeight !== null ? [{ id: "previous", weight: athlete.previousWeight, trainingDate: null, createdAt: null }] : []),
            ] as WeightLog[];
            const streak = getNoProgressStreak(effectiveLogs, athlete.goalWeight);
            if (streak > 0) {
              infos.push({
                athleteId: athlete.id,
                athleteName: athlete.name,
                currentWeight: athlete.currentWeight,
                goalWeight: athlete.goalWeight,
                streak,
                penalty: getPenaltyForStreak(streak),
              });
            }
          } catch (err) {
            console.error(`Failed to load logs for ${athlete.name}:`, err);
            result[athlete.id] = [];
          }
        })
      );

      if (!cancelled) {
        setAllAthleteLogs(result);
        setAllLogsLoading(false);
        infos.sort((a, b) => b.streak - a.streak);
        setPenaltyInfos(infos);
        setPenaltyLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [athletes]);

  // Get unique training dates across all athletes (sorted newest first), max 5
  const allTrainingDates = useMemo(() => {
    const dateSet = new Set<string>();
    Object.values(allAthleteLogs).forEach((logs) => {
      logs.forEach((log) => {
        if (log.trainingDate) {
          dateSet.add(formatDateValue(log.trainingDate));
        }
      });
    });
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a)).slice(0, 5);
  }, [allAthleteLogs]);

  useEffect(() => {
    if (detailAthleteId && !athletes.find((athlete) => athlete.id === detailAthleteId)) {
      setDetailAthleteId("");
    }
  }, [athletes, detailAthleteId]);

  useEffect(() => {
    if (!detailAthleteId) {
      setWeightLogs([]);
      setLogsLoading(false);
      setLogsError("");
      return;
    }

    setLogsLoading(true);
    setLogsError("");
    const logsQuery = query(collection(db, "athletes", detailAthleteId, "weights"));
    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logs = sortWeightLogs(
          snapshot.docs
          .map((docSnap) => {
            const docData = docSnap.data();
            return {
              id: docSnap.id,
              weight: Number(docData.weight ?? 0),
              trainingDate: normalizeTrainingDate(docData.trainingDate),
              createdAt: toDate(docData.createdAt)
            } as WeightLog;
          })
        );
        setWeightLogs(logs);
        setLogsLoading(false);
      },
      (error) => {
        console.error("Firestore weight logs error:", error);
        setLogsError("Gagal memuat riwayat berat.");
        setLogsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [detailAthleteId]);

  const summary = useMemo(() => getSummary(athletes), [athletes]);
  const lastUpdated = useMemo(() => getLatestUpdate(athletes), [athletes]);
  const detailAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === detailAthleteId) ?? null,
    [athletes, detailAthleteId]
  );
  const fallbackLogs = useMemo(() => {
    if (!detailAthlete) {
      return [];
    }
    const items: WeightLog[] = [];
    items.push({
      id: "current",
      weight: detailAthlete.currentWeight,
      trainingDate: detailAthlete.trainingDate,
      createdAt: detailAthlete.updatedAt
    });
    if (detailAthlete.previousWeight !== null) {
      items.push({
        id: "previous",
        weight: detailAthlete.previousWeight,
        trainingDate: null,
        createdAt: null
      });
    }
    return items;
  }, [detailAthlete]);
  const logsForPenalty = useMemo(
    () => (weightLogs.length > 0 ? weightLogs : fallbackLogs),
    [weightLogs, fallbackLogs]
  );
  const noProgressStreak = useMemo(
    () => getNoProgressStreak(logsForPenalty, detailAthlete?.goalWeight ?? null),
    [logsForPenalty, detailAthlete?.goalWeight]
  );
  const activePenalty = useMemo(
    () => getPenaltyForStreak(noProgressStreak),
    [noProgressStreak]
  );
  const historyLogs = useMemo(() => {
    const source = weightLogs.length > 0 ? weightLogs : fallbackLogs;
    return sortWeightLogs(source);
  }, [weightLogs, fallbackLogs]);
  const latestLog = historyLogs[0] ?? null;
  const goalGap = useMemo(() => {
    if (!detailAthlete || detailAthlete.goalWeight === null || !latestLog) {
      return null;
    }
    return latestLog.weight - detailAthlete.goalWeight;
  }, [detailAthlete, latestLog]);
  const goalProgressPercent = useMemo(() => {
    if (
      !detailAthlete ||
      detailAthlete.goalWeight === null ||
      !latestLog
    ) {
      return null;
    }
    if (latestLog.weight <= detailAthlete.goalWeight) {
      return 100;
    }

    // Baseline diambil dari berat tertinggi yang pernah tercatat,
    // jadi progres tetap terbaca walaupun data lama sempat naik-turun.
    const startWeight = Math.max(...historyLogs.map((log) => log.weight));
    const totalNeed = startWeight - detailAthlete.goalWeight;
    if (totalNeed <= 0) {
      return 100;
    }
    const achieved = startWeight - latestLog.weight;
    return clamp((achieved / totalNeed) * 100, 0, 100);
  }, [detailAthlete, latestLog, historyLogs]);

  

  const handleAddAthlete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!isAdmin) {
      setAddError("Hanya admin yang bisa menambah athlete.");
      return;
    }

    const trimmedName = newAthleteName.trim();
    const weightValue = Number(newAthleteWeight);
    const goalValue = Number(newAthleteGoal);

    if (!trimmedName || !newAthleteDate || newAthleteGoal.trim() === "") {
      setAddError("Semua kolom harus diisi.");
      return;
    }
    if (isFutureTrainingDate(newAthleteDate)) {
      setAddError("Tanggal latihan tidak boleh melebihi hari ini.");
      return;
    }

    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      setAddError("Berat awal harus berupa angka lebih dari 0.");
      return;
    }
    if (!Number.isFinite(goalValue) || goalValue <= 0) {
      setAddError("Goal berat harus berupa angka lebih dari 0.");
      return;
    }
    if (goalValue >= weightValue) {
      setAddError("Goal berat harus lebih kecil dari berat awal.");
      return;
    }

    try {
      setIsAdding(true);
      const response = await fetch("/api/athletes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName,
          currentWeight: weightValue,
          goalWeight: goalValue,
          trainingDate: newAthleteDate
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setAddError(payload.message ?? "Gagal menyimpan athlete.");
        return;
      }

      setAddSuccess("Athlete berhasil disimpan.");
      setNewAthleteName("");
      setNewAthleteWeight("");
      setNewAthleteGoal("");
      setNewAthleteDate(getTodayDateValue());
    } catch (error) {
      console.error("Add athlete error:", error);
      setAddError("Gagal menyimpan athlete.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateWeight = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateError("");
    setUpdateSuccess("");

    if (!isAdmin) {
      setUpdateError("Hanya admin yang bisa memperbarui data.");
      return;
    }

    if (!selectedAthleteId) {
      setUpdateError("Pilih athlete terlebih dahulu.");
      return;
    }

    if (!updatedDate) {
      setUpdateError("Tanggal latihan wajib diisi.");
      return;
    }
    if (isFutureTrainingDate(updatedDate)) {
      setUpdateError("Tanggal latihan tidak boleh melebihi hari ini.");
      return;
    }

    const weightValue = Number(updatedWeight);
    const athlete = athletes.find((item) => item.id === selectedAthleteId);
    const goalValue =
      updatedGoal.trim() === "" ? athlete?.goalWeight ?? null : Number(updatedGoal);
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      setUpdateError("Berat baru harus berupa angka lebih dari 0.");
      return;
    }
    if (goalValue === null) {
      setUpdateError("Goal berat wajib diisi terlebih dahulu.");
      return;
    }
    if (!Number.isFinite(goalValue) || goalValue <= 0) {
      setUpdateError("Goal berat harus berupa angka lebih dari 0.");
      return;
    }
    if (!athlete) {
      setUpdateError("Athlete tidak ditemukan.");
      return;
    }
    if (goalValue >= weightValue) {
      setUpdateError("Goal berat harus lebih kecil dari berat saat ini.");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/athletes/${athlete.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentWeight: weightValue,
          trainingDate: updatedDate,
          goalWeight: goalValue
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setUpdateError(payload.message ?? "Gagal memperbarui berat.");
        return;
      }
      setUpdateSuccess("Berat athlete berhasil diperbarui.");
      setUpdatedWeight("");
      setUpdatedGoal("");
      setUpdatedDate(getTodayDateValue());
    } catch (error) {
      console.error("Update weight error:", error);
      setUpdateError("Gagal memperbarui berat.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeedLogs = async () => {
    if (!detailAthlete) {
      return;
    }
    if (!isAdmin) {
      setSeedError("Hanya admin yang bisa menyimpan riwayat.");
      return;
    }
    setSeedError("");
    setSeedSuccess("");

    try {
      setIsSeedingLogs(true);
      const response = await fetch(`/api/athletes/${detailAthlete.id}/seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentWeight: detailAthlete.currentWeight,
          previousWeight: detailAthlete.previousWeight,
          trainingDate: detailAthlete.trainingDate
            ? formatDateValue(detailAthlete.trainingDate)
            : null
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setSeedError(payload.message ?? "Gagal membuat riwayat.");
        return;
      }

      setSeedSuccess("Riwayat berhasil dibuat dari data terakhir.");
    } catch (error) {
      console.error("Seed logs error:", error);
      setSeedError("Gagal membuat riwayat.");
    } finally {
      setIsSeedingLogs(false);
    }
  };

  
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1a1a1a,_#050505_55%,_#000_100%)] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 ${glassCardClass}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10">
              <Image
                src="/crown-logo.png"
                alt="Crown Allstar"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
                Crown Allstar
              </p>
              <h1 className="text-2xl font-semibold">Dashboard Catatan Berat</h1>
              <p className="text-sm text-slate-300">
                Update terakhir: {lastUpdated ? formatDate(lastUpdated) : "Belum ada data"}
              </p>
              <p className="text-xs text-slate-400">
                {isAdmin ? "Mode Admin Aktif" : "Mode Publik (Read-only)"}
              </p>
            </div>
          </div>
          
        </header>

        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Total Athlete</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.total}</CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Data Dibandingkan</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.checked}</CardContent>
          </Card>
          <Card className={glassCardClass}>
            <CardHeader>
              <CardTitle>Turun Berat</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{summary.improved}</CardContent>
          </Card>
        </section>

        {isAdmin ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className={glassCardClass}>
              <CardHeader>
                <CardTitle>Tambah Athlete</CardTitle>
                <CardDescription className="text-slate-300">
                  Simpan athlete baru ke Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleAddAthlete}>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-name">Nama</Label>
                    <Input
                      id="athlete-name"
                      className={glassFieldClass}
                      value={newAthleteName}
                      onChange={(event) => setNewAthleteName(event.target.value)}
                      placeholder="Nama athlete"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-weight">Berat Awal (kg)</Label>
                    <Input
                      id="athlete-weight"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className={glassFieldClass}
                      value={newAthleteWeight}
                      onChange={(event) => setNewAthleteWeight(event.target.value)}
                      placeholder="65.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-goal">Goal Berat (kg)</Label>
                    <Input
                      id="athlete-goal"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className={glassFieldClass}
                      value={newAthleteGoal}
                      onChange={(event) => setNewAthleteGoal(event.target.value)}
                      placeholder="Target berat"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="athlete-date">Tanggal Latihan</Label>
                    <Input
                      id="athlete-date"
                      type="date"
                      className={glassFieldClass}
                      value={newAthleteDate}
                      max={getTodayDateValue()}
                      onChange={(event) => setNewAthleteDate(event.target.value)}
                    />
                  </div>
                  {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
                  {addSuccess ? <p className="text-sm text-emerald-600">{addSuccess}</p> : null}
                  <Button type="submit" disabled={isAdding} className={glassButtonClass}>
                    {isAdding ? "Menyimpan..." : "Simpan Athlete"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className={glassCardClass}>
              <CardHeader>
                <CardTitle>Update Berat</CardTitle>
                <CardDescription className="text-slate-300">
                  Catat perubahan berat terbaru athlete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleUpdateWeight}>
                  <div className="space-y-2">
                    <Label htmlFor="update-athlete">Pilih Athlete</Label>
                    <select
                      id="update-athlete"
                      value={selectedAthleteId}
                      onChange={(event) => setSelectedAthleteId(event.target.value)}
                      className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${glassFieldClass}`}
                      disabled={athletes.length === 0}
                    >
                      <option value="">Pilih athlete</option>
                      {athletes.map((athlete) => (
                        <option key={athlete.id} value={athlete.id}>
                          {athlete.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="update-weight">Berat Baru (kg)</Label>
                    <Input
                      id="update-weight"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className={glassFieldClass}
                      value={updatedWeight}
                      onChange={(event) => setUpdatedWeight(event.target.value)}
                      placeholder="72.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="update-goal">Update Goal (isi jika ingin ubah)</Label>
                    <Input
                      id="update-goal"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      className={glassFieldClass}
                      value={updatedGoal}
                      onChange={(event) => setUpdatedGoal(event.target.value)}
                      placeholder="Target berat baru"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="update-date">Tanggal Latihan</Label>
                    <Input
                      id="update-date"
                      type="date"
                      className={glassFieldClass}
                      value={updatedDate}
                      max={getTodayDateValue()}
                      onChange={(event) => setUpdatedDate(event.target.value)}
                    />
                  </div>
                  {updateError ? <p className="text-sm text-destructive">{updateError}</p> : null}
                  {updateSuccess ? (
                    <p className="text-sm text-emerald-600">{updateSuccess}</p>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={isUpdating || athletes.length === 0}
                    className={glassButtonClass}
                  >
                    {isUpdating ? "Menyimpan..." : "Simpan Berat"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md">
            <p className="text-sm text-slate-400">Mode Publik. Anda dapat melihat progress athlete di bawah.</p>
          </div>
        )}

        {/* Excel-style Comparison Table */}
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>📋 Daftar Perbandingan Berat Athlete</CardTitle>
                <CardDescription className="text-slate-300">
                  Menampilkan 5 data timbang terbaru. Klik athlete untuk detail lengkap.
                </CardDescription>
              </div>
              {lastUpdated && (
                <Badge className="bg-cyan-500/25 text-cyan-100 text-sm px-3 py-1">
                  📅 {formatDate(lastUpdated)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allLogsLoading ? (
              <p className="text-sm text-slate-300">Memuat data timbang...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px] text-slate-100">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300 sticky left-0 bg-black/80 backdrop-blur-sm z-10 min-w-[120px]">Atlet</TableHead>
                      <TableHead className="text-slate-300 text-center">Goal</TableHead>
                      {allTrainingDates.map((dateStr) => {
                        const d = new Date(`${dateStr}T00:00:00`);
                        return (
                          <TableHead key={dateStr} className="text-slate-300 text-center min-w-[80px]">
                            <div className="text-xs">{d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</div>
                            <div className="text-[10px] text-slate-400">{d.getFullYear()}</div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={allTrainingDates.length + 3} className="text-center text-sm text-slate-300">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : athletes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={allTrainingDates.length + 3} className="text-center text-sm text-slate-300">
                          Belum ada data athlete.
                        </TableCell>
                      </TableRow>
                    ) : (
                      athletes.map((athlete, idx) => {
                        const previous = athlete.previousWeight;
                        const improved = previous !== null && athlete.currentWeight < previous;
                        const stable = previous !== null && athlete.currentWeight === previous;
                        const goalWeight = athlete.goalWeight ?? null;
                        const isSelected = athlete.id === detailAthleteId;
                        const logs = allAthleteLogs[athlete.id] ?? [];

                        return (
                          <TableRow
                            key={athlete.id}
                            className={`cursor-pointer hover:bg-white/10 transition-colors ${isSelected ? "bg-white/15" : idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.06]"}`}
                            onClick={() => setDetailAthleteId(athlete.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setDetailAthleteId(athlete.id);
                              }
                            }}
                          >
                            <TableCell className="sticky left-0 bg-black/80 backdrop-blur-sm z-10 font-medium">
                              {athlete.name}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {goalWeight !== null ? `${goalWeight.toFixed(1)}` : "-"}
                            </TableCell>
                            {allTrainingDates.map((dateStr) => {
                              const log = logs.find((l) => l.trainingDate && formatDateValue(l.trainingDate) === dateStr);
                              const logIdx = log ? logs.indexOf(log) : -1;
                              const prevLog = logIdx >= 0 && logIdx < logs.length - 1 ? logs[logIdx + 1] : null;
                              const logDelta = log && prevLog ? log.weight - prevLog.weight : null;
                              return (
                                <TableCell key={dateStr} className="text-center">
                                  {log ? (
                                    <div>
                                      <span className="font-semibold text-sm">{log.weight.toFixed(1)}</span>
                                      {logDelta !== null && (
                                        <div className={`text-[10px] ${logDelta < 0 ? "text-emerald-400" : logDelta > 0 ? "text-rose-400" : "text-slate-400"}`}>
                                          {logDelta > 0 ? "+" : ""}{logDelta.toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </TableCell>
                              );
                            })}

                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Penalty Summary Table */}
        <Card className={glassCardClass}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>⚠️ Daftar Athlete Kena Hukuman</CardTitle>
                <CardDescription className="text-slate-300">
                  Athlete yang tidak menunjukkan progres menuju goal berat.
                </CardDescription>
              </div>
              <Badge className={penaltyInfos.length > 0 ? "bg-rose-500/30 text-rose-100" : "bg-emerald-500/30 text-emerald-100"}>
                {penaltyLoading ? "Memuat..." : `${penaltyInfos.length} athlete`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {penaltyLoading ? (
              <p className="text-sm text-slate-300">Memuat data hukuman...</p>
            ) : penaltyInfos.length === 0 ? (
              <p className="text-sm text-emerald-300">✅ Semua athlete menunjukkan progres!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[650px] text-slate-100">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300 w-10">No</TableHead>
                      <TableHead className="text-slate-300">Nama</TableHead>
                      <TableHead className="text-slate-300">Berat</TableHead>
                      <TableHead className="text-slate-300">Goal</TableHead>
                      <TableHead className="text-slate-300">Streak</TableHead>
                      <TableHead className="text-slate-300">Level</TableHead>
                      <TableHead className="text-slate-300">Detail Hukuman</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penaltyInfos.map((info, i) => (
                      <TableRow key={info.athleteId} className={`hover:bg-white/10 ${i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.06]"}`}>
                        <TableCell className="text-sm">{i + 1}</TableCell>
                        <TableCell className="font-medium">{info.athleteName}</TableCell>
                        <TableCell>{info.currentWeight.toFixed(1)} kg</TableCell>
                        <TableCell>{info.goalWeight !== null ? `${info.goalWeight.toFixed(1)} kg` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">{info.streak}x</Badge>
                        </TableCell>
                        <TableCell>
                          {info.penalty ? (
                            <Badge className="bg-amber-500/30 text-amber-100 text-xs">Level {info.penalty.level}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 max-w-[200px]">
                          {info.penalty ? (
                            <div>
                              <span className="font-medium text-slate-200">{info.penalty.duration}</span>
                              {" • "}{info.penalty.rounds}
                              <br />
                              {info.penalty.exercises.slice(0, 3).join(", ")}
                              {info.penalty.exercises.length > 3 && ` +${info.penalty.exercises.length - 3} lagi`}
                            </div>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle>Riwayat Berat Athlete</CardTitle>
            <CardDescription className="text-slate-300">
              Klik baris athlete di atas untuk melihat riwayat lengkap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detailAthleteId ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {detailAthlete?.name ?? "Athlete"}
                    </p>
                    <p className="text-xs text-slate-300">ID: {detailAthleteId}</p>
                  </div>
                  <Badge className="bg-cyan-500/25 text-cyan-100">
                    Goal:{" "}
                    {detailAthlete?.goalWeight !== null &&
                    detailAthlete?.goalWeight !== undefined
                      ? `${detailAthlete.goalWeight.toFixed(1)} kg`
                      : "Belum diatur"}
                  </Badge>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/15 p-4">
                    <p className="text-xs uppercase tracking-wide text-cyan-100/80">
                      Goal Berat
                    </p>
                    <p className="mt-1 text-2xl font-bold text-cyan-100">
                      {detailAthlete?.goalWeight !== null &&
                      detailAthlete?.goalWeight !== undefined
                        ? `${detailAthlete.goalWeight.toFixed(1)} kg`
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-300">
                      Berat Terakhir
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {latestLog ? `${latestLog.weight.toFixed(1)} kg` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-300">
                      Selisih Ke Goal
                    </p>
                    <p
                      className={`mt-1 text-2xl font-bold ${
                        goalGap !== null && goalGap <= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {goalGap === null ? "-" : `${Math.abs(goalGap).toFixed(1)} kg`}
                    </p>
                    <p className="text-xs text-slate-300">
                      {goalGap === null
                        ? "Set goal dulu"
                        : goalGap <= 0
                          ? "Goal tercapai"
                          : "Masih di atas goal"}
                    </p>
                  </div>
                </div>

                {goalProgressPercent !== null ? (
                  <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-300">Progress ke Goal</p>
                      <p className="text-sm font-semibold text-cyan-100">
                        {goalProgressPercent.toFixed(0)}%
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-cyan-400"
                        style={{ width: `${goalProgressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {logsError ? <p className="text-sm text-destructive">{logsError}</p> : null}
                {logsLoading ? (
                  <p className="text-sm text-slate-300">Memuat riwayat...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-slate-300">Hukuman Aktif</p>
                      {activePenalty ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-base font-semibold">{activePenalty.title}</p>
                          <p className="text-sm text-slate-300">
                            {noProgressStreak}x tanpa progres • {activePenalty.duration} •{" "}
                            {activePenalty.rounds}
                          </p>
                          <ul className="list-disc space-y-1 pl-4 text-sm">
                            {activePenalty.exercises.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-slate-400">
                            Wajib diselesaikan penuh sesuai level.
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-300">
                          Tidak ada hukuman aktif. Progress sudah turun.
                        </p>
                      )}
                    </div>

                    {weightLogs.length === 0 ? (
                      <p className="text-sm text-slate-300">
                        Belum ada riwayat tersimpan. Data di bawah dari dokumen utama athlete.
                      </p>
                    ) : null}

                    <div className="rounded-xl border border-white/10 bg-white/5 p-1 sm:p-2">
                      <Table className="w-full table-fixed text-slate-100">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-2 py-2 text-xs text-slate-300 sm:text-sm">
                              Tanggal
                            </TableHead>
                            <TableHead className="px-2 py-2 text-xs text-slate-300 sm:text-sm">
                              Berat (kg)
                            </TableHead>
                            <TableHead className="px-2 py-2 text-xs text-slate-300 sm:text-sm">
                              Delta (kg)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyLogs.length === 0 ? (
                            <TableRow className="hover:bg-white/5">
                              <TableCell colSpan={3} className="px-2 py-2 text-xs text-slate-300 sm:text-sm">
                                Belum ada data timbang.
                              </TableCell>
                            </TableRow>
                          ) : (
                            historyLogs.map((log, index) => {
                              const previousLog = historyLogs[index + 1];
                              const delta = previousLog ? log.weight - previousLog.weight : null;

                              return (
                                <TableRow key={log.id} className="hover:bg-white/5">
                                  <TableCell className="px-2 py-2 text-xs sm:text-sm">
                                    {log.trainingDate ? (
                                      <>
                                        <span className="hidden sm:inline">
                                          {formatDate(log.trainingDate)}
                                        </span>
                                        <span className="sm:hidden">
                                          {formatDateCompact(log.trainingDate)}
                                        </span>
                                      </>
                                    ) : (
                                      "Belum ada"
                                    )}
                                  </TableCell>
                                  <TableCell className="px-2 py-2 text-xs sm:text-sm">
                                    {log.weight.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="px-2 py-2 text-xs sm:text-sm">
                                    {delta === null
                                      ? "-"
                                      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {weightLogs.length === 0 && isAdmin ? (
                      <>
                        {seedError ? (
                          <p className="text-sm text-destructive">{seedError}</p>
                        ) : null}
                        {seedSuccess ? (
                          <p className="text-sm text-emerald-600">{seedSuccess}</p>
                        ) : null}
                        <Button
                          type="button"
                          onClick={handleSeedLogs}
                          disabled={isSeedingLogs}
                          className={glassButtonClass}
                        >
                          {isSeedingLogs ? "Menyimpan..." : "Simpan ke Riwayat"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-300">
                Klik baris athlete untuk melihat riwayat lengkap.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={glassCardClass}>
          <CardHeader>
            <CardTitle>Hukuman Level</CardTitle>
            <CardDescription className="text-slate-300">
              Naik level otomatis jika timbang berulang tanpa progres menuju goal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {penaltyPlans.map((plan) => (
                <div
                  key={plan.level}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="font-semibold">{plan.title}</p>
                    <Badge className="bg-white/20 text-slate-100">
                      Level {plan.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300">
                    {plan.duration} • {plan.rounds}
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {plan.exercises.map((exercise) => (
                      <li key={exercise}>{exercise}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-slate-400">
                    Wajib diselesaikan penuh sesuai level.
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
