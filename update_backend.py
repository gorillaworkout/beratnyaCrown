import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'r') as f:
    content = f.read()

# Add fetching the calendar version from Firestore
old_fetch = """// Ambil jadwal custom dari Firestore
    const snapshot = await adminDb.collection("crown-schedules").get();"""
new_fetch = """// Ambil versi kalender
    let calendarVersion = 1;
    try {
      const verDoc = await adminDb.collection("crown-system").doc("calendar-version").get();
      if (verDoc.exists) {
        calendarVersion = verDoc.data()?.version || 1;
      }
    } catch(e) {}

    // Ambil jadwal custom dari Firestore
    const snapshot = await adminDb.collection("crown-schedules").get();"""
content = content.replace(old_fetch, new_fetch)

# Add version to the description of all events
old_summary_tambahan = """summary = `[Tambahan] Latihan Crown Allstar - Baju ${entry.shirtColor?.name || ""}`;"""
new_summary_tambahan = """summary = `[Tambahan] Latihan Crown Allstar - Baju ${entry.shirtColor?.name || ""}`;"""
content = content.replace(old_summary_tambahan, new_summary_tambahan)

old_description_var = """let description = entry.note ? `Catatan: ${entry.note}` : "";"""
new_description_var = """let description = entry.note ? `Catatan: ${entry.note}` : "";
    description += description ? `\\n\\n(Sync v0.1.${calendarVersion})` : `(Sync v0.1.${calendarVersion})`;"""
content = content.replace(old_description_var, new_description_var)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'w') as f:
    f.write(content)
