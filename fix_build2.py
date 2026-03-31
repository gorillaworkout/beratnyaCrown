with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Remove duplicate variable definitions
duplicate_cleanup = """      setTrainingDates(dates);
      
      // Default selectedDate to latest training if not set
      if (selectedDate === "2026-04-01" && dates.length > 0 && activeTab === "daily" && !selectedDate) {
        setSelectedDate(dates[0]);
      }
      
      const allRecs = results[3] || [];
      setAllRecords(allRecs);"""

cleaned = """      // Default selectedDate to latest training if not set
      if (selectedDate === "2026-04-01" && dates.length > 0 && activeTab === "daily" && !selectedDate) {
        setSelectedDate(dates[0]);
      }"""

content = content.replace(duplicate_cleanup, cleaned)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
