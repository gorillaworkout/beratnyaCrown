import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Add isExcused to default getAthleteRecord
content = re.sub(
    r'noNews: false,',
    'noNews: false,\n        isExcused: false,',
    content,
    flags=re.MULTILINE
)

# Update calculateTotal to accept isExcused and return 0 if excused
content = re.sub(
    r'const calculateTotal = \(paidKas: boolean, isLate: boolean, noNews: boolean\) => \{',
    'const calculateTotal = (paidKas: boolean, isLate: boolean, noNews: boolean, isExcused: boolean) => {\n    if (isExcused) return 0;',
    content,
    flags=re.MULTILINE
)

# Update handleRecordChange signature
content = re.sub(
    r'field: "paidKas" \| "isLate" \| "noNews",',
    'field: "paidKas" | "isLate" | "noNews" | "isExcused",',
    content,
    flags=re.MULTILINE
)

# Update handleRecordChange inner logic to process isExcused
new_handle_logic = """    let newPaidKas = !!existingRecord.paidKas;
    let newIsLate = !!existingRecord.isLate;
    let newNoNews = !!existingRecord.noNews;
    let newIsExcused = !!existingRecord.isExcused;

    if (field === "paidKas") newPaidKas = value;
    if (field === "isLate") newIsLate = value;
    if (field === "isExcused") {
      newIsExcused = value;
      if (value) {
        newPaidKas = false;
        newIsLate = false;
        newNoNews = false;
      }
    }
    if (field === "noNews") {
      newNoNews = value;
      if (value) {
        newPaidKas = true;
        newIsLate = false;
        newIsExcused = false;
      }
    }

    const totalBilled = calculateTotal(newPaidKas, newIsLate, newNoNews, newIsExcused);"""

content = re.sub(
    r'let newPaidKas = !!existingRecord\.paidKas;.*?const totalBilled = calculateTotal\(newPaidKas, newIsLate, newNoNews\);',
    new_handle_logic,
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Add newIsExcused to recordToSave
content = re.sub(
    r'noNews: newNoNews,',
    'noNews: newNoNews,\n      isExcused: newIsExcused,',
    content,
    flags=re.MULTILINE
)

# Update CSV export headers
content = re.sub(
    r'const headers = \["Tanggal", "Nama Atlet", "Kas", "Telat", "Alpa", "Tagihan", "Lunas"\];',
    'const headers = ["Tanggal", "Nama Atlet", "Kas", "Telat", "Alpa", "Pengecualian", "Tagihan", "Lunas"];',
    content,
    flags=re.MULTILINE
)

# Update CSV rows
content = re.sub(
    r'r\.noNews \? "Ya" : "Tidak", r\.totalBilled,',
    'r.noNews ? "Ya" : "Tidak", r.isExcused ? "Ya" : "Tidak", r.totalBilled,',
    content,
    flags=re.MULTILINE
)

# Add Pengecualian column header in table
content = re.sub(
    r'<th className="px-6 py-4 text-center font-medium">Alpa \(No Kabar\)<\/th>',
    '<th className="px-6 py-4 text-center font-medium">Alpa (No Kabar)</th>\n                    <th className="px-6 py-4 text-center font-medium">Pengecualian</th>',
    content,
    flags=re.MULTILINE
)

# Add Pengecualian checkbox cell in table
new_td = """<td className="px-6 py-4 text-center">
                            <input type="checkbox" disabled={!isKasAdmin} checked={!!record.noNews} onChange={(e) => handleRecordChange(athlete, "noNews", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-red-500 focus:ring-red-500 focus:ring-offset-black disabled:opacity-50" />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input type="checkbox" disabled={!isKasAdmin} checked={!!record.isExcused} onChange={(e) => handleRecordChange(athlete, "isExcused", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-black disabled:opacity-50" />
                          </td>"""

content = re.sub(
    r'<td className="px-6 py-4 text-center">\s*<input type="checkbox" disabled=\{!isKasAdmin\} checked=\{!!record\.noNews\} onChange=\{\(e\) => handleRecordChange\(athlete, "noNews", e\.target\.checked\)\}.*?<\/td>',
    new_td,
    content,
    flags=re.MULTILINE | re.DOTALL
)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
