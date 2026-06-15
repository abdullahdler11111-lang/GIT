import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { PatientRecord, ProcedureSplit } from '../types';

const sanitize = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  // Don't sanitize internal Firebase objects (like FieldValue for serverTimestamp)
  // These usually have certain internal properties or a different constructor
  if (obj.constructor && obj.constructor.name !== 'Object' && !Array.isArray(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) return obj.map(sanitize);
  
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, sanitize(v)])
  );
};

export const syncRecordToCloud = async (userId: string, record: PatientRecord) => {
  const path = `records/${record.id}`;
  try {
    const docRef = doc(db, 'records', record.id);
    const docSnap = await getDoc(docRef);
    
    await setDoc(docRef, sanitize({
      ...record,
      userId,
      updatedAt: serverTimestamp(),
      createdAt: docSnap.exists() ? docSnap.data()?.createdAt : serverTimestamp()
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteRecordFromCloud = async (recordId: string) => {
  const path = `records/${recordId}`;
  try {
    await deleteDoc(doc(db, 'records', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const syncSettingsToCloud = async (userId: string, settings: any) => {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), sanitize({
      ...settings,
      userId,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncProcedureSplitToCloud = async (userId: string, split: ProcedureSplit) => {
  const id = split.procedureType.replace(/\s+/g, '_');
  const path = `settings/${id}`;
  try {
    await setDoc(doc(db, 'settings', id), sanitize({
      ...split,
      userId,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const fetchUserData = async (userId: string) => {
  let records: PatientRecord[] = [];
  let userSettings: any = null;
  const splits: Record<string, ProcedureSplit> = {};

  // 1. Fetch records
  try {
    const recordsQuery = query(collection(db, 'records'), where('userId', '==', userId));
    const recordsSnap = await getDocs(recordsQuery);
    records = recordsSnap.docs.map(d => d.data() as PatientRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'records');
  }

  // 2. Fetch user settings
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    userSettings = userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }

  // 3. Fetch procedure splits
  try {
    const splitsQuery = query(collection(db, 'settings'), where('userId', '==', userId));
    const splitsSnap = await getDocs(splitsQuery);
    splitsSnap.docs.forEach(d => {
      const data = d.data() as ProcedureSplit;
      splits[data.procedureType] = data;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'settings');
  }

  return { records, userSettings, splits };
};
