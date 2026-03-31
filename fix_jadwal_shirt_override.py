import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Fix the bug where customSchedule.shirtColor is overwritten by currentShirtColor
old_push = """entries.push({
          ...customSchedule,
          date: dateStr,
          dayName,
          isRegular: REGULAR_DAYS.has(dayOfWeek),
          timeStart: customSchedule.timeStart || defaultTimeStart,
          timeEnd: customSchedule.timeEnd || defaultTimeEnd,
          shirtColor: currentShirtColor,
          holidayName,
          eventName: isEventDay ? isEventDay.name : undefined,
          eventEmoji: isEventDay ? isEventDay.emoji : undefined,
        });"""

new_push = """entries.push({
          ...customSchedule,
          date: dateStr,
          dayName,
          isRegular: REGULAR_DAYS.has(dayOfWeek),
          timeStart: customSchedule.timeStart || defaultTimeStart,
          timeEnd: customSchedule.timeEnd || defaultTimeEnd,
          shirtColor: customSchedule.shirtColor || currentShirtColor,
          holidayName,
          eventName: isEventDay ? isEventDay.name : undefined,
          eventEmoji: isEventDay ? isEventDay.emoji : undefined,
        });"""

content = content.replace(old_push, new_push)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
