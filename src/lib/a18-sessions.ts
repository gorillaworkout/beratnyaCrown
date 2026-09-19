// Angkatan 18 open-recruitment sessions: every Wed + Sat, 26 Aug – 26 Sep 2026.
// 26 Sep doubles as training + final assessment day.
//
// ponytail: fixed list on purpose. If A19 ever reuses this, promote to a
// generator (weekday rule + range) instead of copying the array.
export const A18_SESSIONS = [
  "2026-08-26",
  "2026-08-29",
  "2026-09-02",
  "2026-09-05",
  "2026-09-09",
  "2026-09-12",
  "2026-09-16",
  "2026-09-19",
  "2026-09-23",
  "2026-09-26",
] as const;

export type AttendanceStatus = "hadir" | "izin" | "alpa";

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Sessions on or before today — the denominator of the attendance percentage.
export function pastSessions(today: string = todayStr()): string[] {
  return A18_SESSIONS.filter((s) => s <= today);
}

// hadir ÷ past sessions × 100. Missing record on a past session counts as
// not-present (same as alpa) — the session still happened.
export function attendancePct(
  records: Partial<Record<string, AttendanceStatus>>,
  today: string = todayStr()
): number {
  const past = pastSessions(today);
  if (past.length === 0) return 0;
  const hadir = past.filter((s) => records[s] === "hadir").length;
  return Math.round((hadir / past.length) * 100);
}
