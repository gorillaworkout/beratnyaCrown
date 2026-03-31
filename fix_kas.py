from pathlib import Path

# 1. Fix Firebase save function to strip undefined IDs (Firestore hates undefined)
fb_path = Path('/home/ubuntu/apps/beratnyaCrown/src/lib/firebase/kas.ts')
fb_text = fb_path.read_text()
old_save = '''export async function saveKasRecord(record: Partial<KasRecord>) {
  const ref = record.id ? doc(db, "crown-kas-daily", record.id) : doc(collection(db, "crown-kas-daily"));
  await setDoc(ref, {
    ...record,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return ref.id;
}'''
new_save = '''export async function saveKasRecord(record: Partial<KasRecord>) {
  const ref = record.id ? doc(db, "crown-kas-daily", record.id) : doc(collection(db, "crown-kas-daily"));
  const dataToSave: any = { ...record, updatedAt: serverTimestamp() };
  if (dataToSave.id === undefined) delete dataToSave.id;
  await setDoc(ref, dataToSave, { merge: true });
  return ref.id;
}'''
fb_path.write_text(fb_text.replace(old_save, new_save))


# 2. Fix the React component so it catches the newly generated ID 
# and doesn't pass undefined ID to recordToSave
page_path = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
page_text = page_path.read_text()

old_handle = '''    const recordToSave: Partial<KasRecord> = {
      id: existingRecord.id,
      date: selectedDate,
      athleteId: athlete.id!,
      name: athlete.name,
      division: athlete.division,
      paidKas: newPaidKas,
      isLate: newIsLate,
      noNews: newNoNews,
      totalBilled,
      isSettled: !!existingRecord.isSettled,
    };

    try {
      setRecords((prev) => {
        const filtered = prev.filter((r) => r.athleteId !== athlete.id);
        return [...filtered, recordToSave as KasRecord];
      });
      await saveKasRecord(recordToSave);
      const s = await getKasSummary();
      setSummary(s);
    } catch (error) {
      console.error(error);
      await loadData();
    }'''

new_handle = '''    const recordToSave: Partial<KasRecord> = {
      date: selectedDate,
      athleteId: athlete.id!,
      name: athlete.name,
      division: athlete.division,
      paidKas: newPaidKas,
      isLate: newIsLate,
      noNews: newNoNews,
      totalBilled,
      isSettled: !!existingRecord.isSettled,
    };
    if (existingRecord.id) recordToSave.id = existingRecord.id;

    try {
      setRecords((prev) => {
        const filtered = prev.filter((r) => r.athleteId !== athlete.id);
        return [...filtered, recordToSave as KasRecord];
      });
      const newId = await saveKasRecord(recordToSave);
      
      // Update local state with the new ID so subsequent clicks update the same document!
      if (!recordToSave.id) {
        setRecords((prev) => prev.map(r => r.athleteId === athlete.id ? { ...r, id: newId } : r));
      }
      
      const s = await getKasSummary();
      setSummary(s);
    } catch (error) {
      console.error("Save error:", error);
      await loadData();
    }'''

page_path.write_text(page_text.replace(old_handle, new_handle))

