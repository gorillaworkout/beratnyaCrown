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
