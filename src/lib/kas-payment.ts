import { isHoliday } from "./holidays.ts";

type KasPayment = {
  totalBilled?: number;
  paidAmount?: number;
  isSettled?: boolean;
};

export function kasPaidAmount(record: KasPayment): number {
  const billed = Math.max(0, record.totalBilled ?? 0);
  return Math.max(0, record.paidAmount ?? (record.isSettled ? billed : 0));
}

export function kasOutstanding(record: KasPayment): number {
  return Math.max(0, (record.totalBilled ?? 0) - kasPaidAmount(record));
}

export type AthleteArrears = { amount: number; sessions: number };

/** Tunggakan kas per atlet: jumlah sisa tagihan + berapa sesi menunggak. */
export function summarizeArrears(records: (KasPayment & { athleteId: string })[]): Map<string, AthleteArrears> {
  const byAthlete = new Map<string, AthleteArrears>();
  for (const record of records) {
    const outstanding = kasOutstanding(record);
    if (outstanding <= 0) continue;
    const current = byAthlete.get(record.athleteId) ?? { amount: 0, sessions: 0 };
    current.amount += outstanding;
    current.sessions += 1;
    byAthlete.set(record.athleteId, current);
  }
  return byAthlete;
}

export function reconcileKasPayment(record: KasPayment, legacyPaidAmount?: number): { paidAmount: number; isSettled: boolean } {
  const paidAmount = legacyPaidAmount ?? kasPaidAmount(record);
  return { paidAmount, isSettled: kasOutstanding({ ...record, paidAmount }) === 0 };
}

export type DateAbsences = { date: string; absences: { name: string }[] };

/** Peta tanggal → nama atlet yang izin (dari crown-absences). Bundel A. */
export function excusedNamesByDate(records: DateAbsences[]): Map<string, Set<string>> {
  const byDate = new Map<string, Set<string>>();
  for (const record of records) {
    if (!record.date || !Array.isArray(record.absences)) continue;
    const names = byDate.get(record.date) ?? new Set<string>();
    for (const absence of record.absences) {
      const name = (absence?.name ?? "").trim();
      if (name) names.add(name);
    }
    byDate.set(record.date, names);
  }
  return byDate;
}

/** Apakah atlet `name` izin pada `date` (Bundel A: izin jadwal diteruskan ke kas). */
export function isExcusedOn(date: string, name: string, excusedByDate: Map<string, Set<string>>): boolean {
  return excusedByDate.get(date)?.has((name ?? "").trim()) ?? false;
}

type DefaultAlpaRow = {
  totalBilled?: number;
  paidKas?: boolean;
  isLate?: boolean;
  noNews?: boolean;
  isExcused?: boolean;
  isExcusedWork?: boolean;
  isExcusedOther?: boolean;
  isSettled?: boolean;
  paidAmount?: number;
};

/**
 * Baris kas default-Alpa yang belum disentuh (dibuat kas-sync, belum lunas,
 * belum dibayar sebagian, belum diubah manual). Hanya baris seperti ini yang
 * aman diubah otomatis saat izin diteruskan ke kas (Bundel A).
 */
export function isDefaultAlpaRow(record: DefaultAlpaRow): boolean {
  return (
    record.totalBilled === 26000 &&
    record.paidKas === true &&
    record.isLate === false &&
    record.noNews === true &&
    record.isExcused === false &&
    record.isExcusedWork === false &&
    record.isExcusedOther === false &&
    record.isSettled === false &&
    (record.paidAmount ?? 0) === 0
  );
}

export type KasSchedule = {
  date: string;
  city?: string;
  status?: string;
};

export function isRealISODate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function isTrainingDateForCity(date: string, city: string, schedules: KasSchedule[]): boolean {
  if (!isRealISODate(date) || date < "2026-04-01") return false;
  const sameDate = schedules.filter((schedule) => schedule.date === date);
  const applies = sameDate.filter((schedule) => schedule.city === "Gabungan" || (schedule.city ?? "Bandung") === city);
  if (applies.length > 0) return applies.some((schedule) => schedule.status === "latihan" || schedule.status === "tambahan");
  if (isHoliday(date)) return false;

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return city === "Bandung" && (weekday === 0 || weekday === 3 || weekday === 6);
}

export function nextTrainingDates(dates: string[], today: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) throw new Error("Session count must be a positive integer");
  return [...new Set(dates)].filter((date) => isRealISODate(date) && date > today).sort().slice(0, count);
}
