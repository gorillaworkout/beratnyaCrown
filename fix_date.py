import re
from pathlib import Path

p = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
text = p.read_text()

old_date_input = '''                <input
                  type="date"
                  value={selectedDate}
                  min="2026-04-01"
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />'''

new_date_input = '''                {trainingDates.length > 0 ? (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-xs truncate"
                  >
                    {trainingDates.map(date => (
                      <option key={date} value={date}>
                        {format(new Date(date), 'EEEE, dd MMM yyyy', {locale: idLocale})}
                      </option>
                    ))}
                    <option value="manual">-- Input Manual --</option>
                  </select>
                ) : null}

                {(!trainingDates.length || selectedDate === 'manual') && (
                  <input
                    type="date"
                    value={selectedDate === 'manual' ? '' : selectedDate}
                    min="2026-04-01"
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                )}'''

if old_date_input in text:
    text = text.replace(old_date_input, new_date_input)
    p.write_text(text)
    print("Success replacing date input")
else:
    print("Could not find old date input")
