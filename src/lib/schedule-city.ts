export type ScheduleCity = "Bandung" | "Jakarta" | "Gabungan";

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
