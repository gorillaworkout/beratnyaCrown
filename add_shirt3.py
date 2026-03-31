import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# I used the wrong wording in my regex search ("Waktu Mulai" instead of "Jam Mulai")
# so my previous python script didn't apply to the DOM. Fixing it now.

old_html = """{editForm.status !== "libur" && editForm.status !== "event" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Mulai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeStart}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeStart: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Selesai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeEnd}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeEnd: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
              </div>
            )}"""

new_html = """{editForm.status !== "libur" && editForm.status !== "event" && (
              <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Mulai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeStart}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeStart: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1.5">
                    Jam Selesai
                  </label>
                  <Input
                    type="time"
                    value={editForm.timeEnd}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeEnd: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="text-sm text-slate-400 block mb-1.5">
                  Warna Baju (Opsional)
                </label>
                <Select
                  value={editForm.shirtColorName || "auto"}
                  onValueChange={(v) => setEditForm({ ...editForm, shirtColorName: v === "auto" ? "" : v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                    <SelectValue placeholder="Otomatis" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-white">
                    <SelectItem value="auto" className="focus:bg-slate-700 focus:text-white cursor-pointer">Otomatis / Ikuti Algoritma</SelectItem>
                    {SHIRT_COLORS.map(c => (
                      <SelectItem key={c.name} value={c.name} className="focus:bg-slate-700 focus:text-white cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-white/20" style={{backgroundColor: c.hex}}></div>
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </>
            )}"""

content = content.replace(old_html, new_html)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
