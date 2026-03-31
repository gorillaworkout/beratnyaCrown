import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# 5. Fix setEditForm defaults for add
old_add_set = """setEditForm({
      status: "latihan",
      timeStart: defaultTimeStart,
      timeEnd: defaultTimeEnd,
      note: "",
    });"""

new_add_set = """setEditForm({
      status: "latihan",
      timeStart: defaultTimeStart,
      timeEnd: defaultTimeEnd,
      note: "",
      shirtColorName: "",
    });"""

content = content.replace(old_add_set, new_add_set)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
