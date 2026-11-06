// Status kehadiran kas — satu sumber kebenaran untuk flag & nominal.
// Nominal mengikuti calculateTotal di halaman Kas Harian.
// "izin_kerja" / "izin_lain" = legacy (sebelum Nov 2026). Tidak lagi ditawarkan
// di KAS_STATUS_OPTIONS; dipertahankan di tipe + patch agar baris lama tetap terbaca.
export type KasStatus = "hadir" | "telat" | "telat_saja" | "alpa" | "izin_kerja" | "izin_lain";

// Pilihan status kas (Nov 2026): opsi Izin dihapus. Atlet aktif wajib bayar kas;
// kerja atau tidak tetap bayar kas 13rb; tanpa izin sama sekali = Alpa (26rb).
export const KAS_STATUS_OPTIONS: { value: KasStatus; label: string }[] = [
  { value: "hadir", label: "Hadir — Rp 13.000" },
  { value: "telat", label: "Hadir + Telat — Rp 18.000" },
  { value: "telat_saja", label: "Denda telat saja — Rp 5.000" },
  { value: "alpa", label: "Alpa / Bolos — Rp 26.000" },
];

type Flags = {
  paidKas: boolean;
  isLate: boolean;
  noNews: boolean;
  isExcused: boolean;
  isExcusedWork: boolean;
  isExcusedOther: boolean;
  totalBilled: number;
};

const NONE = { paidKas: false, isLate: false, noNews: false, isExcused: false, isExcusedWork: false, isExcusedOther: false };

export function kasStatusPatch(status: KasStatus): Flags {
  switch (status) {
    case "hadir": return { ...NONE, paidKas: true, totalBilled: 13000 };
    case "telat": return { ...NONE, paidKas: true, isLate: true, totalBilled: 18000 };
    case "telat_saja": return { ...NONE, isLate: true, totalBilled: 5000 };
    case "alpa": return { ...NONE, paidKas: true, noNews: true, totalBilled: 26000 };
    case "izin_kerja": return { ...NONE, isExcusedWork: true, totalBilled: 0 };
    case "izin_lain": return { ...NONE, isExcusedOther: true, totalBilled: 23000 };
  }
}

export function kasStatusOf(record: Partial<Flags>): KasStatus {
  if (record.isExcusedWork || record.isExcused) return "izin_kerja";
  if (record.isExcusedOther) return "izin_lain";
  if (record.noNews) return "alpa";
  if (record.isLate) return record.paidKas ? "telat" : "telat_saja";
  return "hadir";
}
