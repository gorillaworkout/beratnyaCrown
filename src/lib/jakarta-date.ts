export function jakartaDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(now);
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
