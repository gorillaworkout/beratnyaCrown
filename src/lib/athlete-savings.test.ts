import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSavingsBalance,
  getSavingsAuditChanges,
  validateSavingsInput,
  type SavingsTransaction,
} from "./athlete-savings.ts";

const base = {
  athleteId: "athlete-1",
  athleteName: "Rani",
  amount: 100_000,
  purpose: "Kejurnas",
  date: "2026-10-07",
  note: "",
};

test("balance equals deposits minus withdrawals and may become debt", () => {
  const transactions = [
    { type: "DEPOSIT", amount: 100_000 },
    { type: "WITHDRAWAL", amount: 150_000 },
  ] as SavingsTransaction[];

  assert.equal(calculateSavingsBalance(transactions), -50_000);
});

test("cancelled transactions do not affect balance", () => {
  const transactions = [
    { type: "DEPOSIT", amount: 100_000 },
    { type: "DEPOSIT", amount: 100_000, cancelledAt: {} },
  ] as SavingsTransaction[];

  assert.equal(calculateSavingsBalance(transactions), 100_000);
});

test("validates a deposit transaction", () => {
  assert.deepEqual(validateSavingsInput({ ...base, type: "DEPOSIT" }), {
    ok: true,
    value: { ...base, type: "DEPOSIT" },
  });
});

test("rejects invalid amount, date, type, athlete, and purpose", () => {
  assert.equal(validateSavingsInput({ ...base, type: "DEPOSIT", amount: 0 }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "DEPOSIT", date: "07-10-2026" }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "DEPOSIT", date: "2026-02-31" }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "OTHER" }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "DEPOSIT", athleteId: "" }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "DEPOSIT", purpose: "" }).ok, false);
});

test("edit requires a reason", () => {
  assert.equal(validateSavingsInput({ ...base, type: "WITHDRAWAL" }, { requireReason: true, reason: "" }).ok, false);
  assert.equal(validateSavingsInput({ ...base, type: "WITHDRAWAL" }, { requireReason: true, reason: "Salah nominal" }).ok, true);
});

test("audit changes include every edited business field", () => {
  const before = { ...base, type: "DEPOSIT", note: "Awal" } as SavingsTransaction;
  const after = {
    ...before,
    athleteName: "Rani Putri",
    type: "WITHDRAWAL",
    amount: 75_000,
    purpose: "Asia",
    date: "2026-10-08",
    note: "Koreksi",
  } as SavingsTransaction;

  assert.deepEqual(getSavingsAuditChanges(before, after), [
    { label: "Atlet", before: "Rani", after: "Rani Putri" },
    { label: "Jenis", before: "Setoran", after: "Penarikan" },
    { label: "Nominal", before: 100_000, after: 75_000 },
    { label: "Tujuan", before: "Kejurnas", after: "Asia" },
    { label: "Tanggal", before: "2026-10-07", after: "2026-10-08" },
    { label: "Catatan", before: "Awal", after: "Koreksi" },
  ]);
});

test("audit changes show transaction cancellation", () => {
  const before = { ...base, type: "DEPOSIT" } as SavingsTransaction;
  const after = { ...before, cancelledAt: {} } as SavingsTransaction;

  assert.deepEqual(getSavingsAuditChanges(before, after), [
    { label: "Status", before: "Aktif", after: "Dibatalkan" },
  ]);
});
