import assert from "node:assert/strict";
import test from "node:test";
import { athletesForSession, kasRecordCity, kasCityBalance, monthlyProjection, sessionDatesForCity, summarizeCityKas, summarizeCityTransactions } from "./kas-city.ts";

test("kas city comes from the record, then the athlete, and never invents one", () => {
  const athletes = new Map<string, string | undefined>([["a", "Jakarta"], ["b", "  "]]);
  assert.equal(kasRecordCity({ city: "Bandung", athleteId: "a" }, athletes), "Bandung");
  assert.equal(kasRecordCity({ athleteId: "a" }, athletes), "Jakarta");
  assert.equal(kasRecordCity({ athleteId: "b" }, athletes), null);
  assert.equal(kasRecordCity({ athleteId: "missing" }, athletes), null);
});

test("city totals skip other cities and keep unknown rows out of a city filter", () => {
  const athletes = new Map<string, string | undefined>([["j", "Jakarta"]]);
  const records = [
    { athleteId: "j", totalBilled: 13000, isSettled: true },
    { athleteId: "b", city: "Bandung", totalBilled: 26000, paidAmount: 0 },
    { totalBilled: 5000 },
  ];
  assert.deepEqual(summarizeCityKas(records, athletes, "Jakarta"), {
    billed: 13000, settled: 13000, outstanding: 0, unknown: 1,
  });
  assert.equal(summarizeCityKas(records, athletes, "all").billed, 44000);
});

test("transaction totals split by city and keep city-less rows out of a city", () => {
  const transactions = [
    { city: "Jakarta", type: "IN_JOB", amount: 100000 },
    { city: "Bandung", type: "IN_JOB", amount: 50000 },
    { city: "Jakarta", type: "OUT_EXPENSE", amount: 20000 },
    { type: "IN_OTHER", amount: 30000 },
    { type: "OUT_EXPENSE", amount: 5000 },
  ];
  assert.deepEqual(summarizeCityTransactions(transactions, "Jakarta"), {
    job: 100000, otherIn: 0, expense: 20000, unknown: 2,
  });
  assert.deepEqual(summarizeCityTransactions(transactions, "Bandung"), {
    job: 50000, otherIn: 0, expense: 0, unknown: 2,
  });
  assert.deepEqual(summarizeCityTransactions(transactions, "all"), {
    job: 150000, otherIn: 30000, expense: 25000, unknown: 2,
  });
});

test("city balance is settled plus income minus expense, and can go negative", () => {
  assert.equal(kasCityBalance({ settled: 13000, job: 100000, otherIn: 30000, expense: 20000 }), 123000);
  assert.equal(kasCityBalance({ settled: 0, job: 0, otherIn: 0, expense: 50000 }), -50000);
});

test("kas-sync bills only the session city, Gabungan bills everyone, city-less athletes always billed", () => {
  const athletes = [
    { id: "b1", city: "Bandung" },
    { id: "b2", city: "Bandung" },
    { id: "j1", city: "Jakarta" },
    { id: "n1", city: "" },
    { id: "n2" },
  ];
  assert.deepEqual(
    athletesForSession("Bandung", athletes).map((a) => a.id),
    ["b1", "b2", "n1", "n2"],
  );
  assert.deepEqual(
    athletesForSession("Jakarta", athletes).map((a) => a.id),
    ["j1", "n1", "n2"],
  );
  assert.deepEqual(
    athletesForSession("Gabungan", athletes).map((a) => a.id),
    ["b1", "b2", "j1", "n1", "n2"],
  );
  assert.deepEqual(athletesForSession("Bandung", []), []);
});

test("session dates for a city include Gabungan dates, deduped and sorted", () => {
  const sessions = [
    { date: "2026-11-07", city: "Gabungan" },
    { date: "2026-11-04", city: "Bandung" },
    { date: "2026-11-04", city: "Jakarta" },
    { date: "2026-11-08", city: "Jakarta" },
    { date: "2026-11-01", city: "Gabungan" },
  ];
  assert.deepEqual(sessionDatesForCity(sessions, "Bandung"), [
    "2026-11-01",
    "2026-11-04",
    "2026-11-07",
  ]);
  assert.deepEqual(sessionDatesForCity(sessions, "Jakarta"), [
    "2026-11-01",
    "2026-11-04",
    "2026-11-07",
    "2026-11-08",
  ]);
  assert.deepEqual(sessionDatesForCity([], "Bandung"), []);
});

test("monthly projection: baseline is athletes x sessions x 13000, realistic uses last month rate", () => {
  const base = {
    athleteCount: 37,
    sessionDates: ["2026-11-01", "2026-11-04", "2026-11-07", "2026-11-11", "2026-11-14", "2026-11-18", "2026-11-21", "2026-11-25", "2026-11-28"],
    billedPrevMonth: 3052000,
    settledPrevMonth: 687000,
    settledThisMonth: 0,
  };
  const result = monthlyProjection(base);
  assert.equal(result.sessions, 9);
  assert.equal(result.baseline, 4329000);
  assert.ok(Math.abs((result.realization ?? 0) - 687000 / 3052000) < 1e-9);
  assert.equal(result.realistic, Math.round(4329000 * (687000 / 3052000)));
  assert.equal(result.remaining, result.realistic);
});

test("monthly projection: no last-month billing means baseline only, remaining never negative", () => {
  const result = monthlyProjection({
    athleteCount: 21,
    sessionDates: ["2026-11-01", "2026-11-04"],
    billedPrevMonth: 0,
    settledPrevMonth: 0,
    settledThisMonth: 50000,
  });
  assert.equal(result.baseline, 546000);
  assert.equal(result.realization, null);
  assert.equal(result.realistic, null);
  assert.equal(result.remaining, null);
  assert.equal(result.settled, 50000);

  const over = monthlyProjection({
    athleteCount: 21,
    sessionDates: ["2026-11-01"],
    billedPrevMonth: 100000,
    settledPrevMonth: 50000,
    settledThisMonth: 200000,
  });
  assert.equal(over.realistic, 136500);
  assert.equal(over.remaining, 0);
});
