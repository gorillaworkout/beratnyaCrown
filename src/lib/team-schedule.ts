import { isHoliday } from "./holidays.ts";

export type ScheduleCity = "Bandung" | "Jakarta" | "Gabungan";

export type StoredSchedule = {
  id: string;
  date: string;
  status?: string | null;
  city?: string | null;
  timeStart?: string;
  timeEnd?: string;
};

export type TrainingSession = {
  id: string;
  date: string;
  city: ScheduleCity;
  status: "latihan" | "tambahan";
  timeStart?: string;
  timeEnd?: string;
  virtual: boolean;
};

const TRAINING_START = "2026-04-01";

export function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function isoWeekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${yearMonth}-01`, end: `${yearMonth}-${String(last).padStart(2, "0")}` };
}

function cityOf(city?: string | null): ScheduleCity {
  return city === "Jakarta" || city === "Gabungan" ? city : "Bandung";
}

/**
 * Sesi latihan yang benar-benar terjadi. Dokumen tersimpan tidak diubah.
 * Hari rutin Bandung dibuat virtual hanya bila tanggal itu belum punya dokumen,
 * dan libur nasional tanpa override tidak dihitung latihan.
 */
export function listTrainingSessions(
  schedules: StoredSchedule[],
  start: string,
  end: string,
): TrainingSession[] {
  const byDate = new Map<string, StoredSchedule[]>();
  for (const schedule of schedules) {
    if (!schedule.date) continue;
    byDate.set(schedule.date, [...(byDate.get(schedule.date) ?? []), schedule]);
  }

  const sessions: TrainingSession[] = [];
  for (let date = start; date <= end; date = addIsoDays(date, 1)) {
    const stored = byDate.get(date) ?? [];
    if (stored.length > 0) {
      for (const schedule of stored) {
        if (schedule.status !== "latihan" && schedule.status !== "tambahan") continue;
        sessions.push({
          id: schedule.id,
          date,
          city: cityOf(schedule.city),
          status: schedule.status,
          timeStart: schedule.timeStart,
          timeEnd: schedule.timeEnd,
          virtual: false,
        });
      }
      continue;
    }

    const regular = (isoWeekday(date) === 0 || isoWeekday(date) === 3 || isoWeekday(date) === 6) && date >= TRAINING_START;
    if (regular && !isHoliday(date)) {
      sessions.push({
        id: `virtual:Bandung:${date}`,
        date,
        city: "Bandung",
        status: "latihan",
        virtual: true,
      });
    }
  }
  return sessions;
}
