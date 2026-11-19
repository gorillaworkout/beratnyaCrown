// Kehadiran atlit — dihitung dari baris kas harian (crown-kas-daily) sejak
// 1 Oktober 2026, plus batas izin H-8 jam sebelum jam latihan.
// Baris kas adalah catatan kehadiran: statusnya (hadir/telat/alpa/izin)
// diisi admin di Kas Harian, dan izin dari jadwal diteruskan ke kas (Bundel A).
import { kasStatusOf } from "./kas-status";
import type { KasRecord } from "./types/kas";

/** Kehadiran dihitung sejak tanggal ini (permintaan user, 2026-11-18). */
export const ATTENDANCE_START = "2026-10-01";

/** Izin masih boleh diisi sampai sekian jam sebelum jam latihan. */
export const IZIN_CUTOFF_HOURS = 8;

export interface AttendanceSummary {
  total: number;
  hadir: number;
  izin: number;
  alpa: number;
  hadirPct: number;
  izinPct: number;
  alpaPct: number;
}

/**
 * Ringkas kehadiran per atlit dari baris kas. Satu baris = satu sesi yang
 * ditagihkan ke atlit itu (kas-sync hanya membuat baris untuk sesi setelah
 * atlit bergabung, dan melewati masa vakum) — jadi penyebutnya adalah sesi
 * yang memang wajib dihadiri atlit itu. Telat (hadir+telat / denda telat
 * saja) tetap dihitung hadir: dia datang, hanya terlambat.
 */
export function summarizeAttendance(
  records: readonly KasRecord[],
  fromDate: string = ATTENDANCE_START,
): Map<string, AttendanceSummary> {
  const byAthlete = new Map<string, { total: number; hadir: number; izin: number; alpa: number }>();
  for (const record of records) {
    if (!record.athleteId || !record.date || record.date < fromDate) continue;
    const acc = byAthlete.get(record.athleteId) ?? { total: 0, hadir: 0, izin: 0, alpa: 0 };
    acc.total += 1;
    switch (kasStatusOf(record)) {
      case "hadir":
      case "telat":
      case "telat_saja":
        acc.hadir += 1;
        break;
      case "izin_kerja":
      case "izin_lain":
        acc.izin += 1;
        break;
      default:
        acc.alpa += 1;
        break;
    }
    byAthlete.set(record.athleteId, acc);
  }
  const out = new Map<string, AttendanceSummary>();
  for (const [athleteId, acc] of byAthlete) {
    const pct = (n: number) => (acc.total > 0 ? Math.round((100 * n) / acc.total) : 0);
    out.set(athleteId, { ...acc, hadirPct: pct(acc.hadir), izinPct: pct(acc.izin), alpaPct: pct(acc.alpa) });
  }
  return out;
}

/**
 * Jam mulai latihan default per kota bila tanggal itu tidak punya dokumen
 * jadwal (sesi virtual). Bandung Minggu 10:00, Rabu/Sabtu 17:30;
 * Jakarta Rabu/Sabtu 19:00.
 */
export function defaultSessionStart(date: string, city: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (city === "Jakarta") return "19:00";
  if (weekday === 0) return "10:00";
  return "17:30";
}

/** Batas akhir pengisian izin: jam mulai latihan dikurangi 8 jam (waktu lokal). */
export function izinCutoffAt(sessionDate: string, timeStart: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeStart.trim());
  if (!m) return null;
  const [y, mo, d] = sessionDate.split("-").map(Number);
  if (!y || !mo || !d) return null;
  const start = new Date(y, mo - 1, d, Number(m[1]), Number(m[2]), 0, 0);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() - IZIN_CUTOFF_HOURS * 60 * 60 * 1000);
}

/** Izin masih boleh diisi (batas H-8 jam belum lewat). Tanpa jam mulai → terbuka. */
export function isIzinOpen(
  sessionDate: string,
  timeStart: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!timeStart) return true;
  const cutoff = izinCutoffAt(sessionDate, timeStart);
  if (!cutoff) return true;
  return now.getTime() <= cutoff.getTime();
}
