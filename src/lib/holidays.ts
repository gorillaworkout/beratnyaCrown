// Helper untuk daftar tanggal merah statis
export const PUBLIC_HOLIDAYS_2026: Record<string, string> = {
  "2026-01-01": "Tahun Baru Masehi",
  "2026-02-14": "Isra Mikraj Nabi Muhammad SAW",
  "2026-02-17": "Tahun Baru Imlek",
  "2026-03-19": "Hari Suci Nyepi",
  "2026-03-20": "Idul Fitri",
  "2026-03-21": "Idul Fitri",
  "2026-04-03": "Wafat Isa Al Masih",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Isa Al Masih",
  "2026-05-24": "Hari Waisak",
  "2026-05-27": "Idul Adha",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-16": "Tahun Baru Islam",
  "2026-08-17": "Hari Kemerdekaan RI",
  "2026-11-20": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",
};

export function isHoliday(dateStr: string): string | null {
  return PUBLIC_HOLIDAYS_2026[dateStr] || null;
}
