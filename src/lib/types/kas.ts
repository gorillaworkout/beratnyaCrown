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
  /** Izin karena kerja/sekolah → free (Rp 0) */
  isExcusedWork?: boolean;
  /** Izin lainnya → Rp 23,000 (kas 13rb + denda 10rb) */
  isExcusedOther?: boolean;
  totalBilled: number;
  isSettled: boolean;
  updatedAt?: any;
}

export interface KasAthlete {
  id?: string;
  name: string;
  division: string;
  /** Bebas kas — tidak muncul di tabel kas harian */
  kasExempt?: boolean;
  createdAt?: any;
}

export type TransactionType = 'IN_JOB' | 'IN_OTHER' | 'OUT_EXPENSE';

export interface KasTransaction {
  id?: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  source?: string;
  raw_payload?: any;
  createdAt?: any;
}
