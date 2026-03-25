const fs = require('fs');

const file = '/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Tambah variabel state dynamicAthletes
if (!content.includes('const [dynamicAthletes')) {
  content = content.replace(
    'const [absenceForm, setAbsenceForm] = useState<{ name: string; reason: string }[]>([]);',
    'const [absenceForm, setAbsenceForm] = useState<{ name: string; reason: string }[]>([]);\n  const [dynamicAthletes, setDynamicAthletes] = useState<string[]>([]);'
  );
}

// 2. Tambah useEffect Firestore listener untuk crown-athletes
if (!content.includes('collection(db, "crown-athletes")')) {
  content = content.replace(
    '// Listen to crown-absences',
    '// Listen to crown-athletes\n    const unsubAthletes = onSnapshot(collection(db, "crown-athletes"), (snap) => {\n      const athletesList = snap.docs.map(d => d.data().name).filter(Boolean);\n      if (athletesList.length > 0) {\n        setDynamicAthletes(athletesList);\n      }\n    });\n\n    // Listen to crown-absences'
  );
  
  content = content.replace(
    'unsubAbsences();',
    'unsubAthletes();\n      unsubAbsences();'
  );
}

// 3. Ganti ATHLETES mapping dengan array baru yang diprioritaskan
if (content.includes('ATHLETES.filter(')) {
  content = content.replace(
    'const filteredAthletes = ATHLETES.filter((a)',
    'const listToFilter = dynamicAthletes.length > 0 ? dynamicAthletes : ATHLETES;\n  const filteredAthletes = listToFilter.filter((a)'
  );
}

fs.writeFileSync(file, content);
console.log('Jadwal page patched successfully.');
