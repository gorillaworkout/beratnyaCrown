export interface KasRecord {
  id?: string;
  date: string;
  athleteId: string;
  name: string;
  division: string;
  paidKas: boolean;
  isLate: boolean;
  noNews: boolean;
  isExcused: boolean;
  /** LEGACY (sebelum Nov 2026): izin kerja/sekolah → free (Rp 0). Tidak lagi ditawarkan; hanya untuk membaca baris lama. */
  isExcusedWork?: boolean;
  /** LEGACY (sebelum Nov 2026): izin lainnya → Rp 23,000 (kas 13rb + denda 10rb). Tidak lagi ditawarkan; hanya untuk membaca baris lama. */
  isExcusedOther?: boolean;
  totalBilled: number;
  /** Nominal yang sudah diterima. Dibutuhkan saat kas sudah dibayar lalu kena denda. */
  paidAmount?: number;
  isSettled: boolean;
  updatedAt?: any;
}

export interface KasAthlete {
  id?: string;
  name: string;
  division: string;
  gender?: "L" | "P" | "";
  city?: string;
  /** Bebas kas — tidak muncul di tabel kas harian */
  kasExempt?: boolean;
  /** Bebas iuran pelatih */
  coachFeeExempt?: boolean;
  /** Vakum — tidak ditagih kas harian & iuran pelatih selama vakum */
  vakum?: boolean;
  createdAt?: any;
}

export type TransactionType = 'IN_JOB' | 'IN_OTHER' | 'OUT_EXPENSE';

export interface KasTransaction {
  id?: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  /** Kota (Jakarta/Bandung) untuk split kas per kota; kosong = gabungan/tanpa kota. */
  city?: string;
  source?: string;
  raw_payload?: any;
  createdAt?: any;
}

export interface KasDebt {
  id?: string;
  date: string;
  /** Pihak yang harus dibayar, mis. nama orang. */
  creditor: string;
  amount: number;
  /** Kota (Jakarta/Bandung) yang menanggung hutang; kosong = Gabungan. */
  city?: string;
  description?: string;
  isSettled: boolean;
  createdAt?: any;
}
