import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeAttendance,
  defaultSessionStart,
  izinCutoffAt,
  isIzinOpen,
  ATTENDANCE_START,
} from "./attendance.ts";

const hadir = (athleteId: string, date: string) => ({
  athleteId, date, name: "A", division: "All Girl",
  paidKas: true, isLate: false, noNews: false, isExcused: false,
  totalBilled: 13000, isSettled: true,
});

test("summarizeAttendance counts hadir/izin/alpa since October", () => {
  const records = [
    hadir("a1", "2026-10-03"),
    { ...hadir("a1", "2026-10-07"), isLate: true, totalBilled: 18000 },
    { ...hadir("a1", "2026-10-10"), isExcused: true, paidKas: false, totalBilled: 13000 },
    { ...hadir("a1", "2026-10-14"), paidKas: true, noNews: true, totalBilled: 26000 },
    // September rows are ignored (before ATTENDANCE_START)
    hadir("a1", "2026-09-30"),
    hadir("a2", "2026-10-03"),
  ];
  const out = summarizeAttendance(records);
  assert.equal(ATTENDANCE_START, "2026-10-01");
  const a1 = out.get("a1")!;
  assert.equal(a1.total, 4);
  assert.equal(a1.hadir, 2);
  assert.equal(a1.izin, 1);
  assert.equal(a1.alpa, 1);
  assert.equal(a1.hadirPct, 50);
  assert.equal(a1.izinPct, 25);
  assert.equal(a1.alpaPct, 25);
  assert.equal(out.get("a2")!.total, 1);
});

test("summarizeAttendance skips rows without athleteId", () => {
  const out = summarizeAttendance([{ ...hadir("", "2026-10-03") }]);
  assert.equal(out.size, 0);
});

test("defaultSessionStart follows the city pattern", () => {
  // 2026-11-08 is a Sunday, 2026-11-07 a Saturday
  assert.equal(defaultSessionStart("2026-11-08", "Bandung"), "10:00");
  assert.equal(defaultSessionStart("2026-11-07", "Bandung"), "17:30");
  assert.equal(defaultSessionStart("2026-11-07", "Jakarta"), "19:00");
});

test("izinCutoffAt is 8 hours before session start", () => {
  const bandung = izinCutoffAt("2026-12-05", "17:30")!;
  assert.equal(bandung.getHours(), 9);
  assert.equal(bandung.getMinutes(), 30);
  assert.equal(bandung.getDate(), 5);
  const jakarta = izinCutoffAt("2026-12-05", "19:00")!;
  assert.equal(jakarta.getHours(), 11);
  assert.equal(izinCutoffAt("2026-12-05", "bogus"), null);
});

test("isIzinOpen closes after the cutoff", () => {
  const before = new Date(2026, 11, 5, 9, 29);
  const after = new Date(2026, 11, 5, 9, 31);
  assert.equal(isIzinOpen("2026-12-05", "17:30", before), true);
  assert.equal(isIzinOpen("2026-12-05", "17:30", after), false);
  assert.equal(isIzinOpen("2026-12-05", null), true);
});
