import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Fix my mistake: The old search and replace target didn't match the actual triggerCalendarSync function in the user's code, so the version increment wasn't injected correctly.

old_trigger = """const triggerCalendarSync = async () => {
    try {
      const adminKey = "dupoin123";
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
    } catch {
      // Silent fail — calendar sync is best-effort
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

      const adminKey = "dupoin123";
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey }),
      });
    } catch {
      // Silent fail — calendar sync is best-effort
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };"""

content = content.replace(old_trigger, new_trigger)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
