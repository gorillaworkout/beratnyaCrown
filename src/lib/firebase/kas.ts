import { db } from "../firebase";
import { collection, doc, getDocs, setDoc, query, orderBy, where, serverTimestamp, deleteDoc } from "firebase/firestore";
import type { KasRecord, KasAthlete, KasTransaction } from "../types/kas";
import { addIsoDays, listTrainingSessions } from "../team-schedule";
import { jakartaDateString } from "../jakarta-date";

export async function getKasAthletes(): Promise<KasAthlete[]> {
  const q = query(collection(db, "crown-athletes"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KasAthlete, 'id'>),
  }));
}

export async function addKasAthlete(name: string, division: string) {
  const newRef = doc(collection(db, "crown-athletes"));
  await setDoc(newRef, {
    name,
    division,
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function getKasRecordsByDate(date: string): Promise<KasRecord[]> {
  const q = query(collection(db, "crown-kas-daily"), where("date", "==", date));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KasRecord, 'id'>),
  }));
}

export async function getAllKasRecords(): Promise<KasRecord[]> {
  const q = query(collection(db, "crown-kas-daily"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KasRecord, 'id'>),
  }));
}

export async function saveKasRecord(record: Partial<KasRecord>) {
  const ref = record.id ? doc(db, "crown-kas-daily", record.id) : doc(collection(db, "crown-kas-daily"));
  const dataToSave: any = { ...record, updatedAt: serverTimestamp() };
  if (dataToSave.id === undefined) delete dataToSave.id;
  await setDoc(ref, dataToSave, { merge: true });
  return ref.id;
}

export async function getKasTransactions(): Promise<KasTransaction[]> {
  const q = query(collection(db, "crown-kas-transactions"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KasTransaction, 'id'>),
  }));
}

export async function addKasTransaction(transaction: Partial<KasTransaction>) {
  const newRef = doc(collection(db, "crown-kas-transactions"));
  await setDoc(newRef, {
    ...transaction,
    createdAt: serverTimestamp(),
  });
  return newRef.id;
}

export async function deleteKasTransaction(id: string) {
  await deleteDoc(doc(db, "crown-kas-transactions", id));
}

export async function getKasSummary() {
  const dailySnap = await getDocs(collection(db, "crown-kas-daily"));
  let totalBilled = 0;
  let totalSettled = 0;
  
  dailySnap.forEach(doc => {
    const data = doc.data();
    totalBilled += data.totalBilled || 0;
    totalSettled += data.paidAmount ?? (data.isSettled ? data.totalBilled || 0 : 0);
  });

  const trxSnap = await getDocs(collection(db, "crown-kas-transactions"));
  let totalJob = 0;
  let totalOtherIn = 0;
  let totalExpense = 0;

  trxSnap.forEach(doc => {
    const data = doc.data() as KasTransaction;
    if (data.type === 'IN_JOB') totalJob += (data.amount || 0);
    else if (data.type === 'IN_OTHER') totalOtherIn += (data.amount || 0);
    else if (data.type === 'OUT_EXPENSE') totalExpense += (data.amount || 0);
  });

  const currentBalance = totalSettled + totalJob + totalOtherIn - totalExpense;

  return { 
    totalBilled, 
    totalSettled, 
    totalJob, 
    totalOtherIn, 
    totalExpense, 
    currentBalance 
  };
}

export async function addCustomTrainingEvent(dateStr: string) {
  // If the user selects a manual date that is not a regular Wed/Sat/Sun training day, 
  // we record it as 'tambahan' in crown-events so it persists across the calendar and kas features
  const newRef = doc(collection(db, "crown-events"));
  await setDoc(newRef, {
    date: dateStr,
    status: "tambahan",
    note: "Latihan Tambahan (Auto-created from Kas)",
    timeStart: "19:00",
    timeEnd: "21:00"
  });
}

export async function getTrainingDates(athleteCity?: string): Promise<string[]> {
  const today = jakartaDateString();
  const start = addIsoDays(today, -70);
  const end = addIsoDays(today, 100);

  const snapshotEvents = await getDocs(query(collection(db, "crown-events")));
  const customEvents = new Map<string, { status?: string }>();
  snapshotEvents.forEach((doc) => {
    const data = doc.data();
    if (data.date) customEvents.set(data.date, data);
  });

  const snapshotSchedules = await getDocs(query(collection(db, "crown-schedules")));
  const stored = snapshotSchedules.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, date: data.date as string, status: data.status as string | undefined, city: data.city as string | undefined };
  });
  const scheduledDates = new Set(stored.map((schedule) => schedule.date));
  for (const [date, event] of customEvents) {
    if (!scheduledDates.has(date)) {
      stored.push({ id: `event:${date}`, date, status: event.status === "libur" ? "libur" : "tambahan", city: "Bandung" });
    }
  }

  const dates = new Set<string>();
  for (const session of listTrainingSessions(stored, start, end)) {
    if (!athleteCity || session.city === "Gabungan" || session.city === athleteCity) dates.add(session.date);
  }
  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}
