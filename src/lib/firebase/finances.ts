import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

export type FinanceType = 'INCOME' | 'EXPENSE' | 'DEBT';

export interface FinanceRecord {
  id?: string;
  type: FinanceType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  status?: 'PENDING' | 'LUNAS'; // Only relevant for DEBT
  createdAt?: any;
}

const COLLECTION_NAME = "crown_finances";

export async function addFinanceRecord(record: Omit<FinanceRecord, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...record,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getFinanceRecords(): Promise<FinanceRecord[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FinanceRecord));
}

export async function updateFinanceRecord(id: string, data: Partial<FinanceRecord>) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, data);
}

export async function deleteFinanceRecord(id: string) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
