// Uang pelatih: Rp100.000 per atlet per bulan, mulai Oktober 2026.
// Koleksi lama `crown_coach_fees/{athleteId}_{YYYY-MM}` dipakai ulang (status LUNAS/GRATIS/BELUM_BAYAR).
export const COACH_FEE = 100_000;
export const COACH_FEE_START = "2026-10";
export const COACH_FEE_COLLECTION = "crown_coach_fees";

export type FeeStatus = "BELUM_BAYAR" | "LUNAS" | "GRATIS";
export type FeeAthlete = { id: string; name: string; city: string; role?: string; coachFeeExempt?: boolean; vakum?: boolean };
export type FeeRecord = { status: FeeStatus; amount?: number };

export const feeDocId = (athleteId: string, month: string) => `${athleteId}_${month}`;
export const isBillingMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= COACH_FEE_START;
// Pelatih tidak membayar; atlet bebas ditandai permanen dari Data Atlet.
// Atlet vakum juga tidak ditagih selama vakum.
// Urutan tampil di daftar: yang belum bayar dulu, baru lunas, lalu gratis.
export const PAYMENT_STATUS_ORDER: Record<FeeStatus, number> = { BELUM_BAYAR: 0, LUNAS: 1, GRATIS: 2 };
export const isPayer = (a: FeeAthlete) => a.role !== "coach" && !a.coachFeeExempt && !a.vakum;

export function statusOf(a: FeeAthlete, records: Record<string, FeeRecord>, month: string): FeeStatus | "BEBAS" {
  if (!isPayer(a)) return "BEBAS";
  return records[feeDocId(a.id, month)]?.status ?? "BELUM_BAYAR";
}

export function summarizeFees(athletes: FeeAthlete[], records: Record<string, FeeRecord>, month: string) {
  const s = { lunas: 0, belum: 0, gratis: 0, bebas: 0, collected: 0, outstanding: 0 };
  for (const a of athletes.filter((x) => x.role !== "coach")) {
    const st = statusOf(a, records, month);
    // Uang yang sudah masuk tetap dihitung walau atlet baru ditandai bebas.
    if (st === "BEBAS") { s.bebas++; const r = records[feeDocId(a.id, month)]; if (r?.status === "LUNAS") s.collected += r.amount ?? COACH_FEE; }
    else if (st === "GRATIS") s.gratis++;
    else if (st === "LUNAS") { s.lunas++; s.collected += records[feeDocId(a.id, month)]?.amount ?? COACH_FEE; }
    else { s.belum++; s.outstanding += COACH_FEE; }
  }
  return s;
}

// Pengambilan gaji pelatih: dicatat admin, mengurangi sisa kas pelatih.
// Koleksi `crown-coach-payouts` (auto-id): { amount, coachName, note?, createdAt, createdByName }.
export const COACH_PAYOUT_COLLECTION = "crown-coach-payouts";
export type CoachPayout = { amount: number; coachName: string; note?: string | null; createdAt?: { toDate?: () => Date } | null; createdByName?: string };

export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const out: string[] = [];
  let [y, m] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

// Total uang pelatih yang sudah masuk dari fromMonth s.d. toMonth (inklusif).
export function totalCollected(athletes: FeeAthlete[], records: Record<string, FeeRecord>, fromMonth: string, toMonth: string) {
  return monthsBetween(fromMonth, toMonth).reduce((t, mm) => t + summarizeFees(athletes, records, mm).collected, 0);
}
