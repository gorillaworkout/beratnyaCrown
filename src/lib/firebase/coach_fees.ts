import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  query, 
  where,
  setDoc,
  doc,
  serverTimestamp 
} from "firebase/firestore";

export type CoachFeeStatus = 'BELUM_BAYAR' | 'LUNAS' | 'GRATIS';

export interface CoachFeeRecord {
  id?: string;
  athleteId: string;
  athleteName: string;
  month: string; // YYYY-MM
  status: CoachFeeStatus;
  amount?: number;
  updatedAt?: any;
}

const COLLECTION_NAME = "crown_coach_fees";

// Get all coach fee records for a specific month
export async function getCoachFeesByMonth(month: string): Promise<CoachFeeRecord[]> {
  const q = query(collection(db, COLLECTION_NAME), where("month", "==", month));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CoachFeeRecord));
}

// Upsert (update or insert) a coach fee record
export async function saveCoachFeeRecord(record: Omit<CoachFeeRecord, "id" | "updatedAt">) {
  // Use a deterministic document ID format: athleteId_month
  const docId = `${record.athleteId}_${record.month}`;
  const docRef = doc(db, COLLECTION_NAME, docId);
  
  await setDoc(docRef, {
    ...record,
    updatedAt: serverTimestamp()
  }, { merge: true });
  
  return docId;
}
