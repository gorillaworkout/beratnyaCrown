import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Add automatic generation of empty records to unpaid records calculation
old_unpaid_logic = "const unpaid = allRecs.filter((r: KasRecord) => r.totalBilled > 0 && !r.isSettled);"
new_unpaid_logic = """// Calculate global unpaid. For dates that have passed, if no record exists, they are considered Alpa (Rp 26000)
      const todayDateStr = new Date().toISOString().split('T')[0];
      const unpaid: KasRecord[] = [];
      
      const athletesMap = new Map(results[0].map((a: KasAthlete) => [a.id, a]));
      const recordsByDateByAthlete = new Map<string, Map<string, KasRecord>>();
      
      allRecs.forEach((r: KasRecord) => {
        if (!recordsByDateByAthlete.has(r.date)) recordsByDateByAthlete.set(r.date, new Map());
        recordsByDateByAthlete.get(r.date)!.set(r.athleteId, r);
      });

      dates.forEach((d: string) => {
        if (d > todayDateStr) return; // Ignore future dates
        
        athletesMap.forEach((athlete, athleteId) => {
          const record = recordsByDateByAthlete.get(d)?.get(athleteId);
          if (record) {
             if (record.totalBilled > 0 && !record.isSettled) unpaid.push(record);
          } else {
             // Missing record for past date -> Treat as Alpa
             unpaid.push({
               date: d,
               athleteId,
               name: athlete.name,
               division: athlete.division || "Coed",
               paidKas: true, // Auto Alpa rule
               isLate: false,
               noNews: true, // Auto Alpa rule
               isExcused: false,
               totalBilled: 26000,
               isSettled: false
             });
          }
        });
      });"""

content = content.replace(old_unpaid_logic, new_unpaid_logic)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
