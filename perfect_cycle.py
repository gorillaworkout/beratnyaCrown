import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

old_hash = """function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
  let hash = 0;
  // Tambahkan pengali agar angka tanggal (12, 13, 14, 18, 19) punya hasil lompatan hash yang lebih jauh
  const seed = dateStr + "crown2026"; 
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  
  // Lompatan ekstra menggunakan hasil hash dikali tanggal
  const dateDay = parseInt(dateStr.split('-')[2]);
  let colorIndex = Math.abs(hash * dateDay) % SHIRT_COLORS.length;
  
  if (colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 2) % SHIRT_COLORS.length; // Lompat 2 agar lebih bervariasi
  }
  return colorIndex;
}"""

new_hash = """function getDeterministicShirtColor(dateStr: string): number {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return 0;
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const dayOfWeek = date.getDay(); // 0: Minggu, 3: Rabu, 6: Sabtu
  
  // Hitung selisih hari dari patokan awal (Rabu, 1 April 2026)
  const refDate = new Date(2026, 3, 1);
  const utc1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utc2 = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffDays = Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24));
  
  const weekNumber = Math.floor(diffDays / 7);
  
  let sessionIndexInWeek = 0;
  if (dayOfWeek === 3) sessionIndexInWeek = 0; // Rabu
  else if (dayOfWeek === 6) sessionIndexInWeek = 1; // Sabtu
  else if (dayOfWeek === 0) sessionIndexInWeek = 2; // Minggu
  else return Math.abs(diffDays) % SHIRT_COLORS.length; // Hari lain
  
  // Hitung index sesi global (3 kali latihan per minggu)
  const globalSessionIndex = (weekNumber * 3) + sessionIndexInWeek;
  
  // Menggunakan array colors [0,1,2,3,4,5] secara berurutan dan berulang sempurna (Round-Robin)
  return Math.abs(globalSessionIndex) % SHIRT_COLORS.length;
}"""

content = content.replace(old_hash, new_hash)
content = content.replace("const colorIndex = getDeterministicShirtColor(dateStr, prevColorIndex);", "const colorIndex = getDeterministicShirtColor(dateStr);")

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
