export function jakartaDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(now);
}

export function jakartaParts(now = new Date()): { year: number; month: number; day: number; date: string } {
  const date = jakartaDateString(now);
  const [year, month, day] = date.split("-").map(Number);
  return { year, month: month - 1, day, date };
}

export function daysBetween(start: string, end: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000);
}

export const KAS_START = "2026-08-29";
export const KAS_SYNC_BATCH = 400;

export function isBillableTrainingDate(date: string, todayJakarta: string): boolean {
  return date >= KAS_START && date < todayJakarta;
}

export function chunkList<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new Error("Batch size must be a positive integer");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Tanggal join athlete dalam zona Asia/Jakarta.
 *  Prioritas: createTime dokumen Firestore, lalu field createdAt (string ISO
 *  atau Timestamp). Tanpa sinyal apa pun, kembalikan KAS_START (perilaku lama). */
export function athleteJoinDate(athlete: {
  createTime?: unknown;
  createdAt?: unknown;
}): string {
  return toJakartaDate(athlete.createTime) ?? toJakartaDate(athlete.createdAt) ?? KAS_START;
}

function toJakartaDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : jakartaDateString(d);
  }
  if (typeof value === "object") {
    const v = value as { toDate?: unknown; seconds?: unknown };
    if (typeof v.toDate === "function") {
      const d = (v.toDate as () => Date)();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? jakartaDateString(d) : null;
    }
    if (typeof v.seconds === "number") {
      return jakartaDateString(new Date(v.seconds * 1000));
    }
  }
  return null;
}
