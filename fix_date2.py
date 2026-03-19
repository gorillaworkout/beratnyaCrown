from pathlib import Path

p = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
text = p.read_text()

old = '''                {(!trainingDates.length || selectedDate === 'manual') && (
                  <input
                    type="date"
                    value={selectedDate === 'manual' ? '' : selectedDate}
                    min="2026-04-01"
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                )}'''

new = '''                {(!trainingDates.length || selectedDate === 'manual') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDate === 'manual' ? '' : selectedDate}
                      min="2026-04-01"
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    {trainingDates.length === 0 && <span className="text-xs text-rose-400">Jadwal dari kalender kosong, silakan input manual.</span>}
                  </div>
                )}'''

p.write_text(text.replace(old, new))
