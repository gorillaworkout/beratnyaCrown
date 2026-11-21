import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateInstallmentProgress,
  validateInstallmentPaymentInput,
  validateInstallmentPlan,
  type InstallmentPayment,
  type InstallmentPlan,
} from "./installments.ts";

// Rencana Kejurda & Kejurnas yang sama dengan data seed — total 2.455.000.
const plan: InstallmentPlan = {
  name: "Kejurda & Kejurnas",
  totalTarget: 2_455_000,
  items: [
    { label: "Pendaftaran Kejurda", amount: 200_000 },
    { label: "Pendaftaran Kejurnas", amount: 300_000 },
    { label: "Kostum", amount: 500_000 },
    { label: "Pita", amount: 50_000 },
    { label: "Kaos dan celana", amount: 200_000 },
    { label: "Kaos kaki", amount: 30_000 },
    { label: "P3K", amount: 50_000 },
    { label: "Sewa bus", amount: 650_000 },
    { label: "Penginapan (3 hari x 150000)", amount: 450_000 },
    { label: "Properti", amount: 25_000 },
  ],
  terms: [
    { month: "2026-12", label: "Desember 2026", expected: 358_000 },
    { month: "2027-01", label: "Januari 2027", expected: 358_000 },
    { month: "2027-02", label: "Februari 2027", expected: 358_000 },
    { month: "2027-03", label: "Maret 2027", expected: 358_000 },
    { month: "2027-04", label: "April 2027", expected: 358_000 },
    { month: "2027-05", label: "Mei 2027", expected: 358_000 },
    { month: "2027-06", label: "Juni 2027", expected: 307_000 },
  ],
  isActive: true,
};

test("rencana Kejurda & Kejurnas valid: rincian dan termin sama dengan total", () => {
  assert.deepEqual(validateInstallmentPlan(plan), { ok: true });
});

test("rencana ditolak bila jumlah rincian tidak sama dengan total", () => {
  const bad = { ...plan, totalTarget: 2_500_000 };
  const result = validateInstallmentPlan(bad);
  assert.equal(result.ok, false);
});

test("rencana ditolak bila jumlah termin tidak sama dengan total", () => {
  const bad = { ...plan, terms: plan.terms.slice(0, 6) };
  const result = validateInstallmentPlan(bad);
  assert.equal(result.ok, false);
});

test("rencana ditolak bila ada bulan termin ganda atau tidak urut", () => {
  const dup = { ...plan, terms: [...plan.terms, { month: "2027-06", label: "Juni lagi", expected: 1 }] };
  assert.equal(validateInstallmentPlan(dup).ok, false);
  const unsorted = { ...plan, terms: [...plan.terms].reverse() };
  assert.equal(validateInstallmentPlan(unsorted).ok, false);
  const badMonth = { ...plan, terms: [{ month: "2027-6", label: "Juni", expected: 307_000 }] };
  assert.equal(validateInstallmentPlan(badMonth).ok, false);
});

const basePayment = {
  planId: "kejurda-kejurnas-2027",
  athleteId: "athlete-1",
  athleteName: "Rani",
  amount: 358_000,
  date: "2026-12-05",
  note: "",
};

test("pembayaran valid lolos validasi", () => {
  const result = validateInstallmentPaymentInput(basePayment);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.amount, 358_000);
});

test("pembayaran ditolak bila nominal bukan bilangan bulat positif", () => {
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, amount: 0 }).ok, false);
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, amount: -1000 }).ok, false);
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, amount: 100.5 }).ok, false);
});

test("pembayaran ditolak bila tanggal tidak valid", () => {
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, date: "2026-02-30" }).ok, false);
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, date: "05-12-2026" }).ok, false);
});

test("pembayaran ditolak bila atlet atau rencana kosong, dan alasan wajib saat diminta", () => {
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, athleteId: "" }).ok, false);
  assert.equal(validateInstallmentPaymentInput({ ...basePayment, planId: "" }).ok, false);
  assert.equal(validateInstallmentPaymentInput(basePayment, { requireReason: true }).ok, false);
  assert.equal(validateInstallmentPaymentInput(basePayment, { requireReason: true, reason: "salah input" }).ok, true);
});

const payment = (amount: number, date: string, cancelledAt?: unknown): InstallmentPayment => ({
  planId: "kejurda-kejurnas-2027",
  athleteId: "athlete-1",
  athleteName: "Rani",
  amount,
  date,
  note: "",
  ...(cancelledAt ? { cancelledAt } : {}),
});

test("progres nol bila belum ada pembayaran", () => {
  const progress = calculateInstallmentProgress(plan, []);
  assert.equal(progress.paid, 0);
  assert.equal(progress.remaining, 2_455_000);
  assert.equal(progress.pct, 0);
  assert.ok(progress.terms.every((term) => term.status === "belum" && term.paid === 0));
});

test("waterfall: satu bayaran mengisi termin awal dulu dan boleh menutupi beberapa termin", () => {
  const progress = calculateInstallmentProgress(plan, [payment(500_000, "2026-12-05")]);
  assert.equal(progress.paid, 500_000);
  assert.equal(progress.remaining, 1_955_000);
  assert.equal(progress.pct, 20);
  assert.deepEqual(progress.terms[0], { month: "2026-12", label: "Desember 2026", expected: 358_000, paid: 358_000, status: "lunas" });
  assert.deepEqual(progress.terms[1], { month: "2027-01", label: "Januari 2027", expected: 358_000, paid: 142_000, status: "sebagian" });
  assert.equal(progress.terms[2].status, "belum");
});

test("bayaran sebagian dan beberapa bayaran terakumulasi", () => {
  const progress = calculateInstallmentProgress(plan, [
    payment(100_000, "2026-12-05"),
    payment(258_000, "2027-01-10"),
  ]);
  assert.equal(progress.paid, 358_000);
  assert.equal(progress.terms[0].status, "lunas");
  assert.equal(progress.terms[1].status, "belum");
});

test("kelebihan bayar: sisa 0, persen mentok 100, semua termin lunas", () => {
  const progress = calculateInstallmentProgress(plan, [payment(2_500_000, "2026-12-05")]);
  assert.equal(progress.paid, 2_500_000);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.pct, 100);
  assert.ok(progress.terms.every((term) => term.status === "lunas"));
});

test("pembayaran yang dibatalkan tidak dihitung", () => {
  const progress = calculateInstallmentProgress(plan, [
    payment(358_000, "2026-12-05"),
    payment(358_000, "2026-12-06", new Date()),
  ]);
  assert.equal(progress.paid, 358_000);
  assert.equal(progress.terms[0].status, "lunas");
  assert.equal(progress.terms[1].status, "belum");
});
