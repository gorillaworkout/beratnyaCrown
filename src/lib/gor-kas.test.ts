import assert from "node:assert/strict";
import test from "node:test";
import { KAS_STATUS_OPTIONS, kasStatusOf, kasStatusPatch } from "./kas-status.ts";
import { dayNameOf, filterGorSessions, gorRateOf, summarizeGor } from "./gor.ts";

test("kas status patch sets flags and recalculates bill", () => {
  assert.deepEqual(
    Object.fromEntries(KAS_STATUS_OPTIONS.map((o) => [o.value, kasStatusPatch(o.value).totalBilled])),
    { hadir: 13000, telat: 18000, telat_saja: 5000, alpa: 26000, izin_kerja: 0, izin_lain: 23000 },
  );
  const izin = kasStatusPatch("izin_kerja");
  assert.equal(izin.isExcusedWork, true);
  assert.equal(izin.noNews, false);
  assert.equal(izin.paidKas, false);
});

test("kas status is read back from stored flags", () => {
  for (const option of KAS_STATUS_OPTIONS) {
    assert.equal(kasStatusOf(kasStatusPatch(option.value)), option.value);
  }
  // Legacy isExcused dianggap izin kerja/sekolah (gratis)
  assert.equal(kasStatusOf({ isExcused: true }), "izin_kerja");
});

test("day name uses calendar date, not timezone", () => {
  assert.equal(dayNameOf("2026-10-07"), "Rabu");
  assert.equal(dayNameOf("2026-10-10"), "Sabtu");
  assert.equal(dayNameOf("2026-10-11"), "Minggu");
});

test("gor rate: stored rate wins, defaults by city", () => {
  assert.equal(gorRateOf({ city: "Jakarta" }), 50000);
  assert.equal(gorRateOf({ city: "Bandung" }), 70000);
  assert.equal(gorRateOf({}), 70000);
  assert.equal(gorRateOf({ city: "Jakarta" }, { rate: 35000, paid: false }), 35000);
});

test("gor filter by city and day, summary counts paid and unpaid", () => {
  const sessions = [
    { id: "a", date: "2026-10-07", city: "Bandung" },
    { id: "b", date: "2026-10-10", city: "Bandung" },
    { id: "c", date: "2026-10-07", city: "Jakarta" },
    { id: "d", date: "2026-10-11" },
  ];
  assert.deepEqual(filterGorSessions(sessions, { city: "Bandung", day: "all" }).map((s) => s.id), ["a", "b", "d"]);
  assert.deepEqual(filterGorSessions(sessions, { city: "all", day: "Rabu" }).map((s) => s.id), ["a", "c"]);
  assert.deepEqual(filterGorSessions(sessions, { city: "Jakarta", day: "Sabtu" }), []);

  const costs = { a: { rate: 70000, paid: true }, c: { rate: 35000, paid: false } };
  assert.deepEqual(summarizeGor(sessions, costs), { total: 245000, paid: 70000, unpaid: 175000, unpaidCount: 3 });
});
