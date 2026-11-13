import test from "node:test";
import assert from "node:assert/strict";
import {
  kasOutstanding,
  kasPaidAmount,
  isTrainingDateForCity,
  nextTrainingDates,
  reconcileKasPayment,
  summarizeArrears,
  excusedNamesByDate,
  isExcusedOn,
  isDefaultAlpaRow,
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

test("summarizeArrears totals outstanding per athlete and counts sessions", () => {
  const result = summarizeArrears([
    { athleteId: "a", totalBilled: 26_000, paidAmount: 13_000, isSettled: false },
    { athleteId: "a", totalBilled: 13_000, isSettled: false },
    { athleteId: "b", totalBilled: 13_000, isSettled: false },
  ]);
  assert.deepEqual(result.get("a"), { amount: 26_000, sessions: 2 });
  assert.deepEqual(result.get("b"), { amount: 13_000, sessions: 1 });
});

test("summarizeArrears ignores settled and zero-billed records", () => {
  const result = summarizeArrears([
    { athleteId: "a", totalBilled: 26_000, isSettled: true },
    { athleteId: "a", totalBilled: 0, paidAmount: 13_000, isSettled: true },
  ]);
  assert.equal(result.size, 0);
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

test("national holiday is not a default Bandung training day", () => {
  assert.equal(isTrainingDateForCity("2026-05-27", "Bandung", []), false);
  assert.equal(isTrainingDateForCity("2026-05-24", "Bandung", []), false);
  assert.equal(
    isTrainingDateForCity("2026-05-27", "Bandung", [{ date: "2026-05-27", city: "Bandung", status: "latihan" }]),
    true,
  );
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

test("excusedNamesByDate groups izin names per date and trims (Bundel A)", () => {
  const byDate = excusedNamesByDate([
    { date: "2026-11-14", absences: [{ name: "  Bayu " }, { name: "Amalia" }] },
    { date: "2026-11-14", absences: [{ name: "Bayu" }] },
    { date: "2026-11-18", absences: [{ name: "Karysa" }] },
    { date: "2026-11-21", absences: [] },
    { date: "", absences: [{ name: "Nobody" }] },
  ]);
  assert.deepEqual([...(byDate.get("2026-11-14") ?? [])].sort(), ["Amalia", "Bayu"]);
  assert.deepEqual([...(byDate.get("2026-11-18") ?? [])], ["Karysa"]);
  assert.equal(byDate.get("2026-11-21")?.size, 0);
  assert.equal(byDate.has(""), false);
});

test("isExcusedOn matches only the excused athlete on that date (Bundel A)", () => {
  const byDate = excusedNamesByDate([
    { date: "2026-11-14", absences: [{ name: "Bayu" }] },
  ]);
  assert.equal(isExcusedOn("2026-11-14", "Bayu", byDate), true);
  assert.equal(isExcusedOn("2026-11-14", " Bayu ", byDate), true, "spasi dirapikan");
  assert.equal(isExcusedOn("2026-11-14", "Amalia", byDate), false);
  assert.equal(isExcusedOn("2026-11-18", "Bayu", byDate), false);
  assert.equal(isExcusedOn("2026-11-14", "bayu", byDate), false, "nama case-sensitive");
});

test("isDefaultAlpaRow only matches untouched kas-sync rows (Bundel A)", () => {
  const alpa = {
    totalBilled: 26000, paidKas: true, isLate: false, noNews: true,
    isExcused: false, isExcusedWork: false, isExcusedOther: false,
    isSettled: false, paidAmount: 0,
  };
  assert.equal(isDefaultAlpaRow(alpa), true);
  assert.equal(isDefaultAlpaRow({ ...alpa, totalBilled: 13000 }), false, "sudah diubah jadi Kas");
  assert.equal(isDefaultAlpaRow({ ...alpa, isSettled: true }), false, "sudah lunas");
  assert.equal(isDefaultAlpaRow({ ...alpa, paidAmount: 13000 }), false, "sudah dibayar sebagian");
  assert.equal(isDefaultAlpaRow({ ...alpa, noNews: false }), false, "sudah dikoreksi");
  assert.equal(isDefaultAlpaRow({ ...alpa, isLate: true }), false, "sudah ditandai telat");
  assert.equal(isDefaultAlpaRow({ ...alpa, isExcusedWork: true }), false, "baris izin lama");
});
