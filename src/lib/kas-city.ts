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

export function summarizeCityTransactions<T extends {
  city?: string | null;
  type?: string | null;
  amount?: number;
}>(
  transactions: T[],
  city: string,
) {
  let job = 0;
  let otherIn = 0;
  let expense = 0;
  let unknown = 0;
  for (const trx of transactions) {
    const trxCity = trx.city?.trim();
    if (!trxCity) {
      unknown += 1;
      if (city !== "all") continue;
    } else if (city !== "all" && trxCity !== city) {
      continue;
    }
    const amount = trx.amount || 0;
    if (trx.type === "IN_JOB") job += amount;
    else if (trx.type === "IN_OTHER") otherIn += amount;
    else if (trx.type === "OUT_EXPENSE") expense += amount;
  }
  return { job, otherIn, expense, unknown };
}

export function kasCityBalance({ settled, job, otherIn, expense }: {
  settled: number;
  job: number;
  otherIn: number;
  expense: number;
}): number {
  return settled + job + otherIn - expense;
}

/** Tarif kas saat hadir (Rp). Dipakai proyeksi bulanan sebagai baseline. */
export const KAS_PRESENT_AMOUNT = 13000;

/**
 * Atlet yang ditagih kas untuk satu sesi latihan.
 * - Sesi kota X menagih atlet kota X.
 * - Sesi Gabungan menagih semua atlet.
 * - Atlet tanpa kota tetap ditagih di semua sesi (perilaku lama dipertahankan,
 *   jangan diam-diam menghilangkan tagihannya).
 */
export function athletesForSession<T extends { city?: string | null }>(
  sessionCity: string,
  athletes: readonly T[],
): T[] {
  const session = sessionCity.trim();
  if (session === "Gabungan") return [...athletes];
  return athletes.filter((athlete) => {
    const city = athlete.city?.trim();
    if (!city) return true;
    return city === session;
  });
}

/**
 * Tanggal-tanggal berbeda dalam satu bulan saat atlet kota `city` latihan.
 * Tanggal Gabungan dihitung untuk kedua kota. Hasil terurut.
 */
export function sessionDatesForCity(
  sessions: readonly { date: string; city?: string | null }[],
  city: string,
): string[] {
  const dates = new Set<string>();
  for (const session of sessions) {
    const sessionCity = session.city?.trim();
    if (sessionCity === city || sessionCity === "Gabungan") dates.add(session.date);
  }
  return [...dates].sort();
}

export interface MonthlyProjectionInput {
  athleteCount: number;
  /** Tanggal-tanggal berbeda dalam bulan itu untuk kota ini. */
  sessionDates: string[];
  /** Total tagihan tercatat bulan lalu (kota ini). */
  billedPrevMonth: number;
  /** Total lunas tercatat bulan lalu (kota ini). */
  settledPrevMonth: number;
  /** Total lunas tercatat bulan yang diproyeksikan (kota ini). */
  settledThisMonth: number;
}

/**
 * Proyeksi kas satu kota dalam satu bulan.
 * baseline = atlet aktif x sesi x tarif hadir (kalau semua hadir).
 * realization = lunas / tagihan bulan lalu (null bila bulan lalu belum ada tagihan).
 * realistic = baseline x realization; remaining = max(0, realistic - sudah masuk).
 */
export function monthlyProjection(input: MonthlyProjectionInput) {
  const sessions = input.sessionDates.length;
  const baseline = Math.max(0, input.athleteCount) * sessions * KAS_PRESENT_AMOUNT;
  const realization =
    input.billedPrevMonth > 0 ? input.settledPrevMonth / input.billedPrevMonth : null;
  const realistic = realization === null ? null : Math.round(baseline * realization);
  const settled = Math.max(0, input.settledThisMonth);
  const remaining = realistic === null ? null : Math.max(0, realistic - settled);
  return { sessions, baseline, realization, realistic, settled, remaining };
}
