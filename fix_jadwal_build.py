import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Add missing shirtColorName property to the openScheduleModal setEditForm call
old_setEditForm = """setEditForm({
      status: entry.status,
      timeStart: entry.timeStart || defaultTimeStart,
      timeEnd: entry.timeEnd || defaultTimeEnd,
      note: entry.note || "",
    });"""

new_setEditForm = """setEditForm({
      status: entry.status,
      timeStart: entry.timeStart || defaultTimeStart,
      timeEnd: entry.timeEnd || defaultTimeEnd,
      note: entry.note || "",
      shirtColorName: entry.shirtColor?.name || "",
    });"""

content = content.replace(old_setEditForm, new_setEditForm)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
