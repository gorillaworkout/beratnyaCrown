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

export type NeedStatus = 'BELUM_DIBELI' | 'SUDAH_DIBELI';

export interface FinanceNeed {
  id?: string;
  itemName: string;
  estimatedPrice: number;
  status: NeedStatus;
  createdAt?: any;
}

const COLLECTION_NAME = "crown_finance_needs";

export async function addFinanceNeed(need: Omit<FinanceNeed, "id" | "createdAt">) {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...need,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getFinanceNeeds(): Promise<FinanceNeed[]> {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FinanceNeed));
}

export async function updateFinanceNeed(id: string, data: Partial<FinanceNeed>) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, data);
}

export async function deleteFinanceNeed(id: string) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
