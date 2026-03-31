import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# 1. Update editForm state to include shirtColorName
old_editForm = """const [editForm, setEditForm] = useState({
    status: "latihan" as ScheduleStatus,
    timeStart: "",
    timeEnd: "",
    note: "",
  });"""
new_editForm = """const [editForm, setEditForm] = useState({
    status: "latihan" as ScheduleStatus,
    timeStart: "",
    timeEnd: "",
    note: "",
    shirtColorName: "",
  });"""
content = content.replace(old_editForm, new_editForm)

# 2. Update setEditForm initialization in modal open
old_set_editForm = """setEditForm({
      status: schedule.status,
      timeStart: schedule.timeStart || "",
      timeEnd: schedule.timeEnd || "",
      note: schedule.note || "",
    });"""
new_set_editForm = """setEditForm({
      status: schedule.status,
      timeStart: schedule.timeStart || "",
      timeEnd: schedule.timeEnd || "",
      note: schedule.note || "",
      shirtColorName: schedule.shirtColor?.name || "",
    });"""
content = content.replace(old_set_editForm, new_set_editForm)

# 3. Update saveSchedule to save shirtColor object if selected
old_save_schedule = """const scheduleEntry: Omit<ScheduleEntry, "id"> = {
      date: editingDate,
      dayName: DAY_NAMES_ID[dayOfWeek],
      isRegular: REGULAR_DAYS.has(dayOfWeek),
      status: editForm.status,
      timeStart: editForm.timeStart,
      timeEnd: editForm.timeEnd,
      note: editForm.note,
    };"""

new_save_schedule = """const selectedShirt = SHIRT_COLORS.find(c => c.name === editForm.shirtColorName);
    
    const scheduleEntry: Omit<ScheduleEntry, "id"> = {
      date: editingDate,
      dayName: DAY_NAMES_ID[dayOfWeek],
      isRegular: REGULAR_DAYS.has(dayOfWeek),
      status: editForm.status,
      timeStart: editForm.timeStart,
      timeEnd: editForm.timeEnd,
      note: editForm.note,
      ...(selectedShirt ? { shirtColor: selectedShirt } : {}),
    };"""
content = content.replace(old_save_schedule, new_save_schedule)

# 4. Update the actual Modal UI to add a Shirt Color dropdown if it's a training day
old_modal_html = """{editForm.status !== "libur" && editForm.status !== "event" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/80">Waktu Mulai</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                    <Input
                      type="time"
                      value={editForm.timeStart}
                      onChange={(e) =>
                        setEditForm({ ...editForm, timeStart: e.target.value })
                      }
                      className="border-white/10 bg-black/40 pl-9 text-white focus:border-white/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Waktu Selesai</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                    <Input
                      type="time"
                      value={editForm.timeEnd}
                      onChange={(e) =>
                        setEditForm({ ...editForm, timeEnd: e.target.value })
                      }
                      className="border-white/10 bg-black/40 pl-9 text-white focus:border-white/20"
                    />
                  </div>
                </div>
              </div>
            )}"""

new_modal_html = """{editForm.status !== "libur" && editForm.status !== "event" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white/80">Waktu Mulai</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                      <Input
                        type="time"
                        value={editForm.timeStart}
                        onChange={(e) =>
                          setEditForm({ ...editForm, timeStart: e.target.value })
                        }
                        className="border-white/10 bg-black/40 pl-9 text-white focus:border-white/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Waktu Selesai</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                      <Input
                        type="time"
                        value={editForm.timeEnd}
                        onChange={(e) =>
                          setEditForm({ ...editForm, timeEnd: e.target.value })
                        }
                        className="border-white/10 bg-black/40 pl-9 text-white focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/80">Pilih Warna Baju (Opsional)</Label>
                  <Select
                    value={editForm.shirtColorName}
                    onValueChange={(v) => setEditForm({ ...editForm, shirtColorName: v === "auto" ? "" : v })}
                  >
                    <SelectTrigger className="border-white/10 bg-black/40 text-white focus:border-white/20">
                      <SelectValue placeholder="Otomatis / Ikuti Jadwal" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-zinc-900 text-white">
                      <SelectItem value="auto">Otomatis / Ikuti Jadwal</SelectItem>
                      {SHIRT_COLORS.map(c => (
                        <SelectItem key={c.name} value={c.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: c.hex}}></div>
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}"""
content = content.replace(old_modal_html, new_modal_html)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
