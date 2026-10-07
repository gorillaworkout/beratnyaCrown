import assert from "node:assert/strict";
import test from "node:test";
import { COACH_FEE, feeDocId, isBillingMonth, isPayer, statusOf, summarizeFees, type FeeAthlete, type FeeRecord } from "./coach-fee.ts";

const A = (id: string, extra: Partial<FeeAthlete> = {}): FeeAthlete => ({ id, name: id, city: "Bandung", ...extra });

test("billing starts October 2026 and rejects malformed months", () => {
  assert.equal(isBillingMonth("2026-09"), false);
  assert.equal(isBillingMonth("2026-10"), true);
  assert.equal(isBillingMonth("2027-01"), true);
  for (const bad of ["", "2026-13", "2026-00", "2026-1", "x"]) assert.equal(isBillingMonth(bad), false);
});

test("coach and exempt athletes never pay", () => {
  assert.equal(isPayer(A("a")), true);
  assert.equal(isPayer(A("b", { coachFeeExempt: true })), false);
  assert.equal(isPayer(A("c", { role: "coach" })), false);
});

test("status: exempt wins over stored record; default unpaid", () => {
  const rec: Record<string, FeeRecord> = { [feeDocId("b", "2026-10")]: { status: "LUNAS" } };
  assert.equal(statusOf(A("a"), rec, "2026-10"), "BELUM_BAYAR");
  assert.equal(statusOf(A("b", { coachFeeExempt: true }), rec, "2026-10"), "BEBAS");
});

test("summary separates paid / unpaid / free / exempt and ignores coaches", () => {
  const athletes = [A("a"), A("b"), A("c", { coachFeeExempt: true }), A("d", { role: "coach" }), A("e"), A("f")];
  const rec: Record<string, FeeRecord> = {
    [feeDocId("a", "2026-10")]: { status: "LUNAS", amount: COACH_FEE },
    [feeDocId("e", "2026-10")]: { status: "GRATIS" },
  };
  assert.deepEqual(summarizeFees(athletes, rec, "2026-10"), { lunas: 1, belum: 2, gratis: 1, bebas: 1, collected: 100000, outstanding: 200000 });
  assert.equal(summarizeFees(athletes, rec, "2026-11").lunas, 0);
});

test("money already collected stays counted if athlete is later marked exempt", () => {
  const rec: Record<string, FeeRecord> = { [feeDocId("c", "2026-10")]: { status: "LUNAS", amount: COACH_FEE } };
  const r = summarizeFees([A("c", { coachFeeExempt: true })], rec, "2026-10");
  assert.equal(r.collected, COACH_FEE);
  assert.equal(r.bebas, 1);
});
