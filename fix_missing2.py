import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Update loadData summary
old_summary_logic = "setSummary(results[1]);"
new_summary_logic = """let summaryData = results[1];
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

content = content.replace(old_summary_logic, new_summary_logic)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
