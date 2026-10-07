export type GorSession = { id: string; date: string; city?: string; timeStart?: string; timeEnd?: string };
export type GorCost = { rate: number; paid: boolean; paidAt?: unknown; paidByName?: string };

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
const DEFAULT_RATE: Record<string, number> = { Jakarta: 50000, Bandung: 70000 };

// Parse sebagai UTC agar nama hari tidak bergeser karena zona waktu.
export function dayNameOf(date: string): string {
  return DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export const cityOf = (session: Pick<GorSession, "city">) => session.city || "Bandung";

export function gorRateOf(session: Pick<GorSession, "city">, cost?: GorCost): number {
  return cost?.rate ?? DEFAULT_RATE[cityOf(session)] ?? DEFAULT_RATE.Bandung;
}

export function filterGorSessions<T extends GorSession>(sessions: T[], filter: { city: string; day: string }): T[] {
  return sessions.filter((s) =>
    (filter.city === "all" || cityOf(s) === filter.city) && (filter.day === "all" || dayNameOf(s.date) === filter.day));
}

export function summarizeGor(sessions: GorSession[], costs: Record<string, GorCost>) {
  let total = 0, paid = 0, unpaidCount = 0;
  for (const s of sessions) {
    const rate = gorRateOf(s, costs[s.id]);
    total += rate;
    if (costs[s.id]?.paid) paid += rate; else unpaidCount++;
  }
  return { total, paid, unpaid: total - paid, unpaidCount };
}
