export type SavingsTransactionType = "DEPOSIT" | "WITHDRAWAL";

export type SavingsTransaction = {
  id?: string;
  athleteId: string;
  athleteName: string;
  type: SavingsTransactionType;
  amount: number;
  purpose: string;
  date: string;
  note: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt?: unknown;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt?: unknown;
};

export type SavingsInput = Pick<
  SavingsTransaction,
  "athleteId" | "athleteName" | "type" | "amount" | "purpose" | "date" | "note"
>;

export type SavingsAudit = {
  id: string;
  transactionId: string;
  before: SavingsTransaction;
  after: SavingsTransaction;
  reason: string;
  editedByUid: string;
  editedByName: string;
  editedAt?: unknown;
};

export type SavingsAuditChange = {
  label: string;
  before: string | number;
  after: string | number;
};

type ValidationResult =
  | { ok: true; value: SavingsInput }
  | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function calculateSavingsBalance(
  transactions: Pick<SavingsTransaction, "type" | "amount">[],
): number {
  return transactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "DEPOSIT" ? transaction.amount : -transaction.amount),
    0,
  );
}

export function getSavingsAuditChanges(
  before: SavingsTransaction,
  after: SavingsTransaction,
): SavingsAuditChange[] {
  const fields: Array<{
    label: string;
    value: (transaction: SavingsTransaction) => string | number;
  }> = [
    { label: "Atlet", value: (transaction) => transaction.athleteName },
    { label: "Jenis", value: (transaction) => transaction.type === "DEPOSIT" ? "Setoran" : "Penarikan" },
    { label: "Nominal", value: (transaction) => transaction.amount },
    { label: "Tujuan", value: (transaction) => transaction.purpose },
    { label: "Tanggal", value: (transaction) => transaction.date },
    { label: "Catatan", value: (transaction) => transaction.note || "—" },
  ];

  return fields.flatMap((field) => {
    const previous = field.value(before);
    const next = field.value(after);
    return previous === next ? [] : [{ label: field.label, before: previous, after: next }];
  });
}

export function validateSavingsInput(
  input: Partial<SavingsInput>,
  options: { requireReason?: boolean; reason?: string } = {},
): ValidationResult {
  const athleteId = input.athleteId?.trim() ?? "";
  const athleteName = input.athleteName?.trim() ?? "";
  const purpose = input.purpose?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  const date = input.date?.trim() ?? "";

  if (!athleteId || !athleteName) return { ok: false, error: "Atlet wajib dipilih." };
  if (input.type !== "DEPOSIT" && input.type !== "WITHDRAWAL") {
    return { ok: false, error: "Jenis transaksi tidak valid." };
  }
  const amount = input.amount;
  if (!Number.isSafeInteger(amount) || amount === undefined || amount <= 0) {
    return { ok: false, error: "Nominal harus berupa bilangan bulat positif." };
  }
  if (!purpose) return { ok: false, error: "Tujuan transaksi wajib diisi." };
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    !DATE_PATTERN.test(date)
    || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return { ok: false, error: "Tanggal transaksi tidak valid." };
  }
  if (options.requireReason && !options.reason?.trim()) {
    return { ok: false, error: "Alasan perubahan wajib diisi." };
  }

  return {
    ok: true,
    value: {
      athleteId,
      athleteName,
      type: input.type,
      amount,
      purpose,
      date,
      note,
    },
  };
}
