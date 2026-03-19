import { db } from "../firebase";
import { collection, doc, getDocs, setDoc, query, orderBy, where, serverTimestamp, deleteDoc } from "firebase/firestore";
import type { KasRecord, KasAthlete, KasTransaction } from "../types/kas";

export async function getKasAthletes(): Promise<KasAthlete[]> {
  const q = query(collection(db, "crown-kas-athletes"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<KasAthlete, 'id'>),
  }));
}

export async function addKasAthlete(name: string, division: string) {
  const newRef = doc(collection(db, "crown-kas-athletes"));
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
    if (data.isSettled) {
      totalSettled += data.totalBilled || 0;
    }
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

export async function getTrainingDates(): Promise<string[]> {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const dates = new Set<string>();
  
  // 1. Get Custom Events (Libur/Tambahan)
  const q = query(collection(db, "crown-events"));
  const snapshot = await getDocs(q);
  const customEvents = new Map<string, any>();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.date) {
      customEvents.set(data.date, data);
    }
  });

  // 2. Generate Regular Training Days (Wed, Sat, Sun) starting from April 1, 2026
  const TRAINING_START = new Date(2026, 3, 1);
  const REGULAR_DAYS = new Set([0, 3, 6]); // Sun, Wed, Sat
  
  // Look 1 month back and 2 months ahead
  for (let m = -2; m <= 3; m++) {
    const targetDate = new Date(year, month + m, 1);
    const y = targetDate.getFullYear();
    const mo = targetDate.getMonth();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, mo, day);
      if (d < TRAINING_START) continue;

      const dateStr = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (customEvents.has(dateStr)) {
        if (customEvents.get(dateStr).status !== "libur") {
          dates.add(dateStr); // Tambahan atau ganti hari
        }
        continue;
      }
      
      if (REGULAR_DAYS.has(d.getDay())) {
        dates.add(dateStr);
      }
    }
  }

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}
