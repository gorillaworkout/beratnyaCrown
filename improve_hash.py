import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Enhance hashing algorithm so dates that are 1 day apart don't cluster on the same hash value pattern easily
old_hash = """function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  let colorIndex = Math.abs(hash) % SHIRT_COLORS.length;
  if (colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % SHIRT_COLORS.length;
  }
  return colorIndex;
}"""

new_hash = """function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
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

content = content.replace(old_hash, new_hash)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
