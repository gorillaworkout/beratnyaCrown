// Cicilan (installment) untuk biaya event — mis. Kejurda & Kejurnas.
// Beda dengan tabungan: ada rencana (target total + termin bulanan) dan
// progres per atlet dihitung dari rencana itu. Nominal bayar bebas —
// atlet boleh bayar berapa saja tiap bulannya, tidak harus sama dengan
// nominal termin; alokasi ke termin memakai waterfall (bayaran tertua
// mengisi termin paling awal dulu).

export type InstallmentItem = {
  label: string;
  amount: number;
};

export type InstallmentTerm = {
  /** Bulan termin, format YYYY-MM. */
  month: string;
  label: string;
  /** Nominal yang diharapkan pada termin ini. */
  expected: number;
};

export type InstallmentPlan = {
  id?: string;
  name: string;
  totalTarget: number;
  items: InstallmentItem[];
  terms: InstallmentTerm[];
  isActive: boolean;
  createdAt?: unknown;
};

export type InstallmentPayment = {
  id?: string;
  planId: string;
  athleteId: string;
  athleteName: string;
  amount: number;
  /** Tanggal bayar, format YYYY-MM-DD. */
  date: string;
  note: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt?: unknown;
  cancelledAt?: unknown;
  cancelledByUid?: string;
  cancelledByName?: string;
  cancellationReason?: string;
};

export type InstallmentPaymentInput = Pick<
  InstallmentPayment,
  "planId" | "athleteId" | "athleteName" | "amount" | "date" | "note"
>;

export type InstallmentTermProgress = {
  month: string;
  label: string;
  expected: number;
  paid: number;
  status: "lunas" | "sebagian" | "belum";
};

export type InstallmentProgress = {
  paid: number;
  remaining: number;
  /** 0-100, dibulatkan; kelebihan bayar tetap 100. */
  pct: number;
  terms: InstallmentTermProgress[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function planItemsTotal(plan: Pick<InstallmentPlan, "items">): number {
  return plan.items.reduce((sum, item) => sum + item.amount, 0);
}

export function planTermsTotal(plan: Pick<InstallmentPlan, "terms">): number {
  return plan.terms.reduce((sum, term) => sum + term.expected, 0);
}

type PlanValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateInstallmentPlan(
  plan: Partial<InstallmentPlan>,
): PlanValidationResult {
  if (!plan.name?.trim()) return { ok: false, error: "Nama rencana wajib diisi." };
  if (
    plan.totalTarget === undefined
    || !Number.isSafeInteger(plan.totalTarget)
    || plan.totalTarget <= 0
  ) {
    return { ok: false, error: "Total target harus berupa bilangan bulat positif." };
  }
  if (!plan.items || plan.items.length === 0) {
    return { ok: false, error: "Rincian biaya wajib diisi." };
  }
  for (const item of plan.items) {
    if (!item.label?.trim()) return { ok: false, error: "Label rincian biaya wajib diisi." };
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) {
      return { ok: false, error: "Nominal rincian biaya harus berupa bilangan bulat positif." };
    }
  }
  if (!plan.terms || plan.terms.length === 0) {
    return { ok: false, error: "Termin cicilan wajib diisi." };
  }
  const months = new Set<string>();
  for (const term of plan.terms) {
    if (!MONTH_PATTERN.test(term.month)) {
      return { ok: false, error: `Bulan termin tidak valid: ${term.month}.` };
    }
    if (months.has(term.month)) {
      return { ok: false, error: `Termin bulan ${term.month} tercatat dua kali.` };
    }
    months.add(term.month);
    if (!term.label?.trim()) return { ok: false, error: "Label termin wajib diisi." };
    if (!Number.isSafeInteger(term.expected) || term.expected <= 0) {
      return { ok: false, error: "Nominal termin harus berupa bilangan bulat positif." };
    }
  }
  const sortedMonths = [...months].sort();
  const termMonths = plan.terms.map((term) => term.month);
  if (termMonths.some((month, i) => month !== sortedMonths[i])) {
    return { ok: false, error: "Termin harus urut berdasarkan bulan." };
  }
  if (planItemsTotal(plan as InstallmentPlan) !== plan.totalTarget) {
    return { ok: false, error: "Jumlah rincian biaya tidak sama dengan total target." };
  }
  if (planTermsTotal(plan as InstallmentPlan) !== plan.totalTarget) {
    return { ok: false, error: "Jumlah termin tidak sama dengan total target." };
  }
  return { ok: true };
}

type PaymentValidationResult =
  | { ok: true; value: InstallmentPaymentInput }
  | { ok: false; error: string };

export function validateInstallmentPaymentInput(
  input: Partial<InstallmentPaymentInput>,
  options: { requireReason?: boolean; reason?: string } = {},
): PaymentValidationResult {
  const planId = input.planId?.trim() ?? "";
  const athleteId = input.athleteId?.trim() ?? "";
  const athleteName = input.athleteName?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  const date = input.date?.trim() ?? "";

  if (!planId) return { ok: false, error: "Rencana cicilan wajib dipilih." };
  if (!athleteId || !athleteName) return { ok: false, error: "Atlet wajib dipilih." };
  const amount = input.amount;
  if (amount === undefined || !Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, error: "Nominal harus berupa bilangan bulat positif." };
  }
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    !DATE_PATTERN.test(date)
    || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return { ok: false, error: "Tanggal pembayaran tidak valid." };
  }
  if (options.requireReason && !options.reason?.trim()) {
    return { ok: false, error: "Alasan perubahan wajib diisi." };
  }

  return {
    ok: true,
    value: { planId, athleteId, athleteName, amount, date, note },
  };
}

/**
 * Progres cicilan satu atlet pada satu rencana. Pembayaran yang dibatalkan
 * tidak dihitung. Alokasi waterfall: bayaran tertua (urut tanggal) mengisi
 * termin paling awal dulu; satu bayaran boleh menutupi beberapa termin;
 * kelebihan bayar di luar termin terakhir tetap tercatat di `paid` tapi
 * `remaining` 0 dan `pct` mentok 100.
 */
export function calculateInstallmentProgress(
  plan: Pick<InstallmentPlan, "totalTarget" | "terms">,
  payments: Pick<InstallmentPayment, "amount" | "date" | "cancelledAt">[],
): InstallmentProgress {
  const active = payments.filter((payment) => !payment.cancelledAt);
  const paid = active.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, plan.totalTarget - paid);
  const pct = plan.totalTarget > 0
    ? Math.min(100, Math.round((100 * paid) / plan.totalTarget))
    : 0;

  let pool = paid;
  const terms: InstallmentTermProgress[] = plan.terms.map((term) => {
    const filled = Math.min(term.expected, Math.max(0, pool));
    pool -= filled;
    return {
      month: term.month,
      label: term.label,
      expected: term.expected,
      paid: filled,
      status: filled === 0 ? "belum" : filled < term.expected ? "sebagian" : "lunas",
    };
  });

  return { paid, remaining, pct, terms };
}
