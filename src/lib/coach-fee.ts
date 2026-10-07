// Uang pelatih: Rp100.000 per atlet per bulan, mulai Oktober 2026.
// Koleksi lama `crown_coach_fees/{athleteId}_{YYYY-MM}` dipakai ulang (status LUNAS/GRATIS/BELUM_BAYAR).
export const COACH_FEE = 100_000;
export const COACH_FEE_START = "2026-10";
export const COACH_FEE_COLLECTION = "crown_coach_fees";

export type FeeStatus = "BELUM_BAYAR" | "LUNAS" | "GRATIS";
export type FeeAthlete = { id: string; name: string; city: string; role?: string; coachFeeExempt?: boolean };
export type FeeRecord = { status: FeeStatus; amount?: number };

export const feeDocId = (athleteId: string, month: string) => `${athleteId}_${month}`;
export const isBillingMonth = (month: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= COACH_FEE_START;
// Pelatih tidak membayar; atlet bebas ditandai permanen dari Data Atlet.
export const isPayer = (a: FeeAthlete) => a.role !== "coach" && !a.coachFeeExempt;

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
