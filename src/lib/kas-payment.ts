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

export function reconcileKasPayment(record: KasPayment, legacyPaidAmount?: number): { paidAmount: number; isSettled: boolean } {
  const paidAmount = legacyPaidAmount ?? kasPaidAmount(record);
  return { paidAmount, isSettled: kasOutstanding({ ...record, paidAmount }) === 0 };
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

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return city === "Bandung" && (weekday === 0 || weekday === 3 || weekday === 6);
}

export function nextTrainingDates(dates: string[], today: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) throw new Error("Session count must be a positive integer");
  return [...new Set(dates)].filter((date) => isRealISODate(date) && date > today).sort().slice(0, count);
}
