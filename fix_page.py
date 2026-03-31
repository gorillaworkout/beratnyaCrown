import re
import sys

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# remove division column
content = content.replace('<th className="px-6 py-4 font-medium">Divisi</th>', '')

# Remove division cell
content = re.sub(r'<td className="px-6 py-4">\s*<span[^>]*>[^<]*</span>\s*</td>', '', content, flags=re.MULTILINE)

# Remove modal and references
content = content.replace('addKasAthlete,', '')
content = re.sub(r'async function handleAddAthlete.*?^  }', '', content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(r'\{\/\* MODAL ATHLETE \*\/}.*?<\/div>\s*<\/main>', '</div>\n    </main>', content, flags=re.MULTILINE | re.DOTALL)
content = content.replace('const [showAddModal, setShowAddModal] = useState(false);', '')
content = content.replace('const [newName, setNewName] = useState("");', '')
content = content.replace('const [newDivision, setNewDivision] = useState("Coed");', '')
content = re.sub(r'<button[^>]*onClick=\{\(\) => setShowAddModal\(true\)\}[^>]*>.*?Tambah Atlet\s*<\/button>', '', content, flags=re.MULTILINE | re.DOTALL)

# Remove property assignments
content = content.replace('division: athlete.division,', '')
content = content.replace('division: r.record.division', '')
content = content.replace('"Divisi", ', '')
content = content.replace('r.division, ', '')

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
