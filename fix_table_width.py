import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Make the table have table-fixed layout and set specific widths for columns
content = re.sub(
    r'<table className="w-full text-left text-sm text-slate-300">',
    '<table className="w-full text-left text-sm text-slate-300 table-fixed">',
    content,
    count=1 # Only change the daily table, not the transactions table
)

old_headers = """<th className="px-6 py-4 font-medium">Nama Atlet</th>
                    
                    <th className="px-6 py-4 text-center font-medium">Kas</th>
                    <th className="px-6 py-4 text-center font-medium">Telat</th>
                    <th className="px-6 py-4 text-center font-medium">Alpa (No Kabar)</th>
                    <th className="px-6 py-4 text-center font-medium">Pengecualian</th>
                    <th className="px-6 py-4 text-right font-medium">Tagihan</th>
                    <th className="px-6 py-4 text-center font-medium">Status</th>"""

new_headers = """<th className="px-6 py-4 font-medium w-48 truncate">Nama Atlet</th>
                    <th className="px-4 py-4 text-center font-medium w-20">Kas</th>
                    <th className="px-4 py-4 text-center font-medium w-20">Telat</th>
                    <th className="px-4 py-4 text-center font-medium w-36">Alpa (No Kabar)</th>
                    <th className="px-4 py-4 text-center font-medium w-32">Pengecualian</th>
                    <th className="px-4 py-4 text-right font-medium w-36">Tagihan</th>
                    <th className="px-4 py-4 text-center font-medium w-28">Status</th>"""

content = content.replace(old_headers, new_headers)

# Ensure the status button width is fixed to avoid jumping
old_status_btn = """<button onClick={() => isKasAdmin && handleSettledToggle(athlete, !record.isSettled)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${record.isSettled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {record.isSettled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {record.isSettled ? "Lunas" : "Belum"}
                              </button>"""

new_status_btn = """<button onClick={() => isKasAdmin && handleSettledToggle(athlete, !record.isSettled)} className={`inline-flex items-center justify-center gap-1.5 rounded-full w-20 py-1 text-xs font-medium transition-colors ${record.isSettled ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                                {record.isSettled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {record.isSettled ? "Lunas" : "Belum"}
                              </button>"""

content = content.replace(old_status_btn, new_status_btn)

# Make sure td's with padding 6 match the th padding 4 changes to prevent overflow
content = re.sub(
    r'<td className="px-6 py-4 text-center">([\s\S]*?)</td>',
    r'<td className="px-4 py-4 text-center">\1</td>',
    content
)

content = re.sub(
    r'<td className="px-6 py-4 text-right',
    r'<td className="px-4 py-4 text-right',
    content
)

content = re.sub(
    r'<td colSpan=\{5\} className="px-6 py-4 text-right',
    r'<td colSpan={6} className="px-4 py-4 text-right',
    content
)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
