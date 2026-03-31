import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# 1. Add state to fetch the current version on the client side
state_addition = """const [isSyncing, setIsSyncing] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(1);"""

content = content.replace("const [isSyncing, setIsSyncing] = useState(false);", state_addition)

# 2. Update fetchScheduleData to also fetch the version
old_fetch = """const scheduleSnapshot = await getDocs(collection(db, "crown-schedules"));
      const schedules: ScheduleEntry[] = scheduleSnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScheduleEntry, "id">),
      }));
      setScheduleData(schedules);"""

new_fetch = """const scheduleSnapshot = await getDocs(collection(db, "crown-schedules"));
      const schedules: ScheduleEntry[] = scheduleSnapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScheduleEntry, "id">),
      }));
      setScheduleData(schedules);
      
      // Fetch calendar version
      try {
        const verDoc = await getDoc(doc(db, "crown-system", "calendar-version"));
        if (verDoc.exists()) {
          setCalendarVersion(verDoc.data().version || 1);
        }
      } catch (e) {
        console.error(e);
      }"""

content = content.replace(old_fetch, new_fetch)

# 3. Update the onSnapshot listener to also listen to the version
old_listener = """const unsubSchedules = onSnapshot(
      collection(db, "crown-schedules"),
      (snapshot) => {
        const schedules: ScheduleEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScheduleEntry, "id">),
        }));
        setScheduleData(schedules);
        setFirestoreLoading(false);
      }
    );"""

new_listener = """const unsubSchedules = onSnapshot(
      collection(db, "crown-schedules"),
      (snapshot) => {
        const schedules: ScheduleEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ScheduleEntry, "id">),
        }));
        setScheduleData(schedules);
        setFirestoreLoading(false);
      }
    );

    const unsubVersion = onSnapshot(
      doc(db, "crown-system", "calendar-version"),
      (docSnap) => {
        if (docSnap.exists()) {
          setCalendarVersion(docSnap.data().version || 1);
        }
      }
    );"""

content = content.replace(old_listener, new_listener)

# Ensure unsubVersion is called on unmount
content = content.replace("return () => {\n      unsubEvents();\n      unsubAthletes();\n      unsubSchedules();\n    };", "return () => {\n      unsubEvents();\n      unsubAthletes();\n      unsubSchedules();\n      unsubVersion();\n    };")


# 4. Inject the version number to the Kalender title
content = content.replace(
    '<CardTitle className="text-white">📅 Kalender</CardTitle>',
    '<CardTitle className="text-white flex items-center gap-2">📅 Kalender <span className="text-xs font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">v0.1.{calendarVersion}</span></CardTitle>'
)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
