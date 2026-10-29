import assert from "node:assert/strict";
import test from "node:test";
import { kasRecordCity, summarizeCityKas } from "./kas-city.ts";

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
