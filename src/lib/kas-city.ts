import { kasPaidAmount } from "./kas-payment.ts";

export function kasRecordCity(
  record: { city?: string | null; athleteId?: string | null },
  athleteCities: ReadonlyMap<string, string | undefined>,
): string | null {
  const direct = record.city?.trim();
  if (direct) return direct;
  const derived = record.athleteId ? athleteCities.get(record.athleteId)?.trim() : "";
  return derived || null;
}

export function summarizeCityKas<T extends {
  city?: string | null;
  athleteId?: string | null;
  totalBilled?: number;
  paidAmount?: number;
  isSettled?: boolean;
}>(
  records: T[],
  athleteCities: ReadonlyMap<string, string | undefined>,
  city: string,
) {
  let billed = 0;
  let settled = 0;
  let unknown = 0;
  for (const record of records) {
    const recordCity = kasRecordCity(record, athleteCities);
    if (!recordCity) {
      unknown += 1;
      if (city !== "all") continue;
    } else if (city !== "all" && recordCity !== city) {
      continue;
    }
    billed += record.totalBilled || 0;
    settled += kasPaidAmount(record);
  }
  return { billed, settled, outstanding: Math.max(0, billed - settled), unknown };
}
