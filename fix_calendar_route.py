import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'r') as f:
    content = f.read()

# 1. Update the hashing function in the iCal API to match the round-robin logic
old_hash = """function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  let colorIndex = Math.abs(hash) % SHIRT_COLORS.length;
  if (colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % SHIRT_COLORS.length;
  }
  return colorIndex;
}"""

new_hash = """function getDeterministicShirtColor(dateStr: string): number {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return 0;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const dayOfWeek = date.getDay(); // 0: Minggu, 3: Rabu, 6: Sabtu
  
  const refDate = new Date(2026, 3, 1);
  const utc1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utc2 = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffDays = Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
  
  const weekNumber = Math.floor(diffDays / 7);
  
  let sessionIndexInWeek = 0;
  if (dayOfWeek === 3) sessionIndexInWeek = 0; // Rabu
  else if (dayOfWeek === 6) sessionIndexInWeek = 1; // Sabtu
  else if (dayOfWeek === 0) sessionIndexInWeek = 2; // Minggu
  else return Math.abs(diffDays) % SHIRT_COLORS.length;
  
  const globalSessionIndex = (weekNumber * 3) + sessionIndexInWeek;
  return Math.abs(globalSessionIndex) % SHIRT_COLORS.length;
}"""
content = content.replace(old_hash, new_hash)

# 2. Update usage of getDeterministicShirtColor
content = content.replace("getDeterministicShirtColor(dateStr, prevColorIdx)", "getDeterministicShirtColor(dateStr)")

# 3. Add shirtColor override support to the iCal generator loop
# The customSchedule in calendar route is missing the shirtColor mapping
old_merge = """return {
            ...s,
            id: doc.id,
          };"""
new_merge = """const data = doc.data();
          return {
            ...s,
            id: doc.id,
            shirtColor: data.shirtColor
          };"""
content = content.replace(old_merge, new_merge)

old_custom_apply = """// Kalau tambahan/ganti hari, pastikan ada warna baju
          if (!custom.shirtColor && (custom.status === 'latihan' || custom.status === 'tambahan')) {
              colorIdx = getDeterministicShirtColor(dateStr);
              custom.shirtColor = SHIRT_COLORS[colorIdx];
              prevColorIdx = colorIdx;
          }"""
          
new_custom_apply = """// Kalau tambahan/ganti hari, pastikan ada warna baju
          if (custom.status === 'latihan' || custom.status === 'tambahan') {
              if (custom.shirtColor) {
                  // Gunakan warna custom dari database
              } else {
                  colorIdx = getDeterministicShirtColor(dateStr);
                  custom.shirtColor = SHIRT_COLORS[colorIdx];
                  prevColorIdx = colorIdx;
              }
          }"""
content = content.replace(old_custom_apply, new_custom_apply)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'w') as f:
    f.write(content)
