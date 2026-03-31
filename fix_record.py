import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Make the frontend treat missing records as Alpa visually on the grid if the date is past
old_get_athlete_record = """const getAthleteRecord = (athleteId: string): Partial<KasRecord> => {
    return (
      records.find((r) => r.athleteId === athleteId) || {
        athleteId,
        paidKas: false,
        isLate: false,
        noNews: false,
        isExcused: false,
        isSettled: false,
        totalBilled: 0,
      }
    );
  };"""

new_get_athlete_record = """const getAthleteRecord = (athleteId: string): Partial<KasRecord> => {
    const existing = records.find((r) => r.athleteId === athleteId);
    if (existing) return existing;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = selectedDate < todayStr;
    
    return {
      athleteId,
      paidKas: isPastDate,
      isLate: false,
      noNews: isPastDate, // Auto Alpa visually
      isExcused: false,
      isSettled: false,
      totalBilled: isPastDate ? 26000 : 0,
    };
  };"""

content = content.replace(old_get_athlete_record, new_get_athlete_record)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
