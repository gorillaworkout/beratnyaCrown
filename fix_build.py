with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Replace the block that causes the variable hoisting error
old_block = """      let summaryData = results[1];
      let autoUnpaidSum = 0;
      
      dates.forEach((d: string) => {
        if (d > todayDateStr) return; // Ignore future dates
        athletesMap.forEach((athlete, athleteId) => {
          if (!recordsByDateByAthlete.get(d)?.get(athleteId)) {
            autoUnpaidSum += 26000;
          }
        });
      });
      
      summaryData.totalBilled += autoUnpaidSum;
      setSummary(summaryData);
      
      const dates = results[2];"""

new_block = """      const dates = results[2];
      setTrainingDates(dates);
      
      const allRecs = results[3] || [];
      setAllRecords(allRecs);
      
      // Calculate global unpaid. For dates that have passed, if no record exists, they are considered Alpa (Rp 26000)
      const todayDateStr = new Date().toISOString().split('T')[0];
      const athletesMap = new Map(results[0].map((a: KasAthlete) => [a.id, a]));
      const recordsByDateByAthlete = new Map<string, Map<string, KasRecord>>();
      
      allRecs.forEach((r: KasRecord) => {
        if (!recordsByDateByAthlete.has(r.date)) recordsByDateByAthlete.set(r.date, new Map());
        recordsByDateByAthlete.get(r.date)!.set(r.athleteId, r);
      });
      
      let summaryData = results[1];
      let autoUnpaidSum = 0;
      
      dates.forEach((d: string) => {
        if (d > todayDateStr) return; // Ignore future dates
        athletesMap.forEach((athlete, athleteId) => {
          if (!recordsByDateByAthlete.get(d)?.get(athleteId)) {
            autoUnpaidSum += 26000;
          }
        });
      });
      
      summaryData.totalBilled += autoUnpaidSum;
      setSummary(summaryData);"""

content = content.replace(old_block, new_block)

# Remove the duplicated definitions further down that we just moved up
duplicate_block = """      // Calculate global unpaid. For dates that have passed, if no record exists, they are considered Alpa (Rp 26000)
      const todayDateStr = new Date().toISOString().split('T')[0];
      const unpaid: KasRecord[] = [];
      
      const athletesMap = new Map(results[0].map((a: KasAthlete) => [a.id, a]));
      const recordsByDateByAthlete = new Map<string, Map<string, KasRecord>>();
      
      allRecs.forEach((r: KasRecord) => {
        if (!recordsByDateByAthlete.has(r.date)) recordsByDateByAthlete.set(r.date, new Map());
        recordsByDateByAthlete.get(r.date)!.set(r.athleteId, r);
      });"""

content = content.replace(duplicate_block, "      const unpaid: KasRecord[] = [];")

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
