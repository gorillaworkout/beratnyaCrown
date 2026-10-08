import test from "node:test";
import assert from "node:assert/strict";
import {
  kasOutstanding,
  kasPaidAmount,
  isTrainingDateForCity,
  nextTrainingDates,
  reconcileKasPayment,
} from "./kas-payment.ts";

test("legacy settled records remain fully paid", () => {
  const record = { totalBilled: 26_000, isSettled: true };
  assert.equal(kasPaidAmount(record), 26_000);
  assert.equal(kasOutstanding(record), 0);
});

test("prepaid kas leaves only an added alpa fine outstanding", () => {
  const record = { totalBilled: 26_000, paidAmount: 13_000, isSettled: false };
  assert.equal(kasPaidAmount(record), 13_000);
  assert.equal(kasOutstanding(record), 13_000);
});

test("prepaid kas remains consumed when attendance later becomes free", () => {
  const record = { totalBilled: 0, paidAmount: 13_000, isSettled: true };
  assert.equal(kasPaidAmount(record), 13_000);
  assert.equal(kasOutstanding(record), 0);
});

test("status changes preserve prepaid kas and expose only the remainder", () => {
  assert.deepEqual(reconcileKasPayment({ totalBilled: 26_000, isSettled: true }, 13_000), {
    paidAmount: 13_000,
    isSettled: false,
  });
  assert.deepEqual(reconcileKasPayment({ totalBilled: 26_000, paidAmount: 13_000 }), {
    paidAmount: 13_000,
    isSettled: false,
  });
  assert.deepEqual(reconcileKasPayment({ totalBilled: 13_000, paidAmount: 13_000 }), {
    paidAmount: 13_000,
    isSettled: true,
  });
  assert.deepEqual(reconcileKasPayment({ totalBilled: 0, paidAmount: 13_000 }), {
    paidAmount: 13_000,
    isSettled: true,
  });
});

test("next training dates excludes today, past dates, and duplicates", () => {
  assert.deepEqual(
    nextTrainingDates(["2026-10-11", "2026-10-08", "2026-10-10", "2026-10-10", "2026-10-07"], "2026-10-08", 8),
    ["2026-10-10", "2026-10-11"],
  );
});

test("next training dates respects requested session count", () => {
  assert.deepEqual(nextTrainingDates(["2026-10-14", "2026-10-10", "2026-10-11"], "2026-10-08", 2), ["2026-10-10", "2026-10-11"]);
});

test("session count must be a positive integer", () => {
  assert.throws(() => nextTrainingDates(["2026-10-10"], "2026-10-08", 0), /positive integer/);
  assert.throws(() => nextTrainingDates(["2026-10-10"], "2026-10-08", 1.5), /positive integer/);
});

test("training date validates real dates and city-specific overrides", () => {
  const jakartaOnly = [{ date: "2026-10-10", city: "Jakarta", status: "tambahan" }];
  assert.equal(isTrainingDateForCity("2026-10-10", "Bandung", jakartaOnly), true, "Jakarta extra session must not suppress Bandung regular Saturday");
  assert.equal(isTrainingDateForCity("2026-10-12", "Bandung", jakartaOnly), false);
  assert.equal(isTrainingDateForCity("2026-02-31", "Bandung", []), false);
});

test("gabungan applies to both cities and city libur overrides only that city", () => {
  const gabungan = [{ date: "2026-10-13", city: "Gabungan", status: "tambahan" }];
  assert.equal(isTrainingDateForCity("2026-10-13", "Bandung", gabungan), true);
  assert.equal(isTrainingDateForCity("2026-10-13", "Jakarta", gabungan), true);
  const mixed = [
    { date: "2026-10-14", city: "Bandung", status: "libur" },
    { date: "2026-10-14", city: "Jakarta", status: "latihan" },
  ];
  assert.equal(isTrainingDateForCity("2026-10-14", "Bandung", mixed), false);
  assert.equal(isTrainingDateForCity("2026-10-14", "Jakarta", mixed), true);
});
