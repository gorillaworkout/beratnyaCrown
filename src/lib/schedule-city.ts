export type ScheduleCity = "Bandung" | "Jakarta" | "Gabungan";

export type CalendarTileEntry = {
  status?: string | null;
  shirtColor?: { name?: string | null } | null;
};

// Warna tile kalender mengikuti jersey latihan. Libur / hari tanpa latihan
// tidak masuk peta ini — tile-nya harus polos.
const SHIRT_TILE_CLASS: Record<string, string> = {
  Merah: "bg-gradient-to-br from-red-500 to-red-700",
  Hitam: "bg-gradient-to-br from-slate-700 to-slate-900",
  Biru: "bg-gradient-to-br from-blue-500 to-blue-700",
  Orange: "bg-gradient-to-br from-orange-500 to-orange-700",
  Ungu: "bg-gradient-to-br from-purple-500 to-purple-700",
  Pink: "bg-gradient-to-br from-pink-500 to-pink-700",
  Kuning: "bg-gradient-to-br from-yellow-500 to-yellow-700",
  Hijau: "bg-gradient-to-br from-green-500 to-green-700",
};

const EVENT_TILE_CLASS = "bg-gradient-to-br from-indigo-500 to-purple-600";
const EXTRA_TILE_CLASS = "bg-gradient-to-br from-amber-500 to-amber-600";
const DEFAULT_TRAINING_TILE_CLASS = "bg-gradient-to-br from-blue-500 to-blue-600";

export function isRealTrainingStatus(status?: string | null): boolean {
  return status === "latihan" || status === "tambahan";
}

/**
 * Kelas warna sel kalender. Hanya sesi latihan sungguhan (💪/⚡) yang berwarna.
 * Libur, tanggal merah tanpa latihan, dan sel kosong mengembalikan string kosong
 * supaya tile-nya polos seperti hari kosong.
 */
export function calendarTileClass(entry?: CalendarTileEntry | null): string {
  if (!entry) return "";
  if (entry.status === "event") return EVENT_TILE_CLASS;
  if (!isRealTrainingStatus(entry.status)) return "";

  const shirtClass = entry.shirtColor?.name
    ? SHIRT_TILE_CLASS[entry.shirtColor.name]
    : undefined;
  if (shirtClass) return shirtClass;
  if (entry.status === "tambahan") return EXTRA_TILE_CLASS;
  return DEFAULT_TRAINING_TILE_CLASS;
}

/**
 * Satu tanggal bisa berisi libur + latihan kota lain. Warna dan ikon sel mengikuti
 * sesi latihan (atau event), bukan baris libur yang kebetulan urut pertama.
 */
export function selectCalendarPaintEntry<T extends { status?: string | null }>(
  entries: T[]
): T | undefined {
  return (
    entries.find((entry) => isRealTrainingStatus(entry.status)) ??
    entries.find((entry) => entry.status === "event") ??
    entries[0]
  );
}

export function resolveAdditionalCity(
  existingCities: ScheduleCity[],
  selectedCity: ScheduleCity
): ScheduleCity | null {
  if (selectedCity === "Gabungan") {
    return existingCities.length === 0 ? selectedCity : null;
  }

  const available = (["Bandung", "Jakarta"] as const).filter(
    (city) => !existingCities.includes(city)
  );
  return available.includes(selectedCity as "Bandung" | "Jakarta")
    ? selectedCity
    : available[0] ?? null;
}
