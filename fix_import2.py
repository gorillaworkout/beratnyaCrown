import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Fix the duplicate block replacement in add_excused.py causing an issue
content = re.sub(
    r'<td className="px-6 py-4 text-center">\s*<input type="checkbox" disabled=\{!isKasAdmin\} checked=\{!!record\.noNews\}.*?<\/td>\s*<td className="px-6 py-4 text-center">\s*<input type="checkbox" disabled=\{!isKasAdmin\} checked=\{!!record\.isExcused\}.*?<\/td>',
    '<td className="px-6 py-4 text-center"><input type="checkbox" disabled={!isKasAdmin} checked={!!record.noNews} onChange={(e) => handleRecordChange(athlete, "noNews", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-red-500 focus:ring-red-500 focus:ring-offset-black disabled:opacity-50" /></td><td className="px-6 py-4 text-center"><input type="checkbox" disabled={!isKasAdmin} checked={!!record.isExcused} onChange={(e) => handleRecordChange(athlete, "isExcused", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-black disabled:opacity-50" /></td>',
    content,
    flags=re.MULTILINE | re.DOTALL
)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
