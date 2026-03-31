import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Update triggerCalendarSync to increment the calendar version
old_trigger = """const triggerCalendarSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync calendar");
      // Optionally show a success toast here
    } catch (error) {
      console.error("Error triggering calendar sync:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };"""

new_trigger = """const triggerCalendarSync = async () => {
    try {
      setIsSyncing(true);
      // Increment the version document
      try {
        const verRef = doc(db, "crown-system", "calendar-version");
        const verDoc = await getDoc(verRef);
        if (verDoc.exists()) {
          await updateDoc(verRef, { version: (verDoc.data().version || 0) + 1, lastUpdated: new Date().toISOString() });
        } else {
          await setDoc(verRef, { version: 1, lastUpdated: new Date().toISOString() });
        }
      } catch (e) {
        console.error("Version tracking error", e);
      }

      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync calendar");
    } catch (error) {
      console.error("Error triggering calendar sync:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };"""

content = content.replace(old_trigger, new_trigger)

# Don't forget to import getDoc and setDoc
if "getDoc," not in content:
    content = content.replace("updateDoc,", "updateDoc, getDoc, setDoc,")

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
