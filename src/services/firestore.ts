import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Client, UploadedFile, ProcessedData, HistoryEntry, User, UserSettings } from '@/types';

// ============================================
// User Operations
// ============================================

export async function createOrUpdateUser(user: {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      ...user,
      settings: { theme: 'system', autoSave: true },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data() as User;
    return data.settings || { theme: 'system', autoSave: true };
  }
  return { theme: 'system', autoSave: true };
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    [`settings.${Object.keys(settings)[0]}`]: Object.values(settings)[0],
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Client Operations
// ============================================

export async function createClient(
  userId: string,
  name: string
): Promise<Client> {
  const clientsRef = collection(db, 'users', userId, 'clients');
  const clientDoc = doc(clientsRef);
  const now = new Date().toISOString();

  const client: Client = {
    id: clientDoc.id,
    name,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(clientDoc, {
    ...client,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return client;
}

export async function getClients(userId: string): Promise<Client[]> {
  const clientsRef = collection(db, 'users', userId, 'clients');
  const q = query(clientsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt,
    } as Client;
  });
}

export async function updateClient(
  userId: string,
  clientId: string,
  name: string
): Promise<void> {
  const clientRef = doc(db, 'users', userId, 'clients', clientId);
  await updateDoc(clientRef, {
    name,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClient(
  userId: string,
  clientId: string
): Promise<void> {
  // Delete all subcollections first
  const batch = writeBatch(db);

  // Delete files
  const filesRef = collection(db, 'users', userId, 'clients', clientId, 'files');
  const filesSnap = await getDocs(filesRef);
  filesSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete processed data
  const processedRef = collection(db, 'users', userId, 'clients', clientId, 'processed');
  const processedSnap = await getDocs(processedRef);
  processedSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete history
  const historyRef = collection(db, 'users', userId, 'clients', clientId, 'history');
  const historySnap = await getDocs(historyRef);
  historySnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete the client doc
  batch.delete(doc(db, 'users', userId, 'clients', clientId));

  await batch.commit();
}

// ============================================
// File Operations
// ============================================

export async function saveFileMetadata(
  userId: string,
  clientId: string,
  file: Omit<UploadedFile, 'id'>
): Promise<string> {
  const filesRef = collection(db, 'users', userId, 'clients', clientId, 'files');
  const fileDoc = doc(filesRef);

  await setDoc(fileDoc, {
    ...file,
    id: fileDoc.id,
    uploadedAt: serverTimestamp(),
  });

  return fileDoc.id;
}

export async function getFiles(
  userId: string,
  clientId: string,
  platform?: string
): Promise<UploadedFile[]> {
  const filesRef = collection(db, 'users', userId, 'clients', clientId, 'files');
  let q;

  if (platform) {
    q = query(filesRef, where('platform', '==', platform), orderBy('uploadedAt', 'desc'));
  } else {
    q = query(filesRef, orderBy('uploadedAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      uploadedAt: data.uploadedAt instanceof Timestamp
        ? data.uploadedAt.toDate().toISOString()
        : data.uploadedAt,
    } as UploadedFile;
  });
}

export async function deleteFileMetadata(
  userId: string,
  clientId: string,
  fileId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'clients', clientId, 'files', fileId));
}

// ============================================
// Processed Data Operations
// ============================================

export async function saveProcessedData(
  userId: string,
  clientId: string,
  data: Omit<ProcessedData, 'id'>
): Promise<string> {
  const processedRef = collection(db, 'users', userId, 'clients', clientId, 'processed');
  const processedDoc = doc(processedRef);

  await setDoc(processedDoc, {
    ...data,
    id: processedDoc.id,
    createdAt: serverTimestamp(),
  });

  return processedDoc.id;
}

export async function getProcessedData(
  userId: string,
  clientId: string,
  platform?: string
): Promise<ProcessedData[]> {
  const processedRef = collection(db, 'users', userId, 'clients', clientId, 'processed');
  let q;

  if (platform) {
    q = query(processedRef, where('platform', '==', platform), orderBy('createdAt', 'desc'));
  } else {
    q = query(processedRef, orderBy('createdAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    } as ProcessedData;
  });
}

export async function deleteProcessedData(
  userId: string,
  clientId: string,
  processedId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'clients', clientId, 'processed', processedId));
}

// ============================================
// History Operations
// ============================================

export async function addHistoryEntry(
  userId: string,
  clientId: string,
  entry: Omit<HistoryEntry, 'id' | 'createdAt'>
): Promise<string> {
  const historyRef = collection(db, 'users', userId, 'clients', clientId, 'history');
  const historyDoc = doc(historyRef);

  await setDoc(historyDoc, {
    ...entry,
    id: historyDoc.id,
    createdAt: serverTimestamp(),
  });

  return historyDoc.id;
}

export async function getHistory(
  userId: string,
  clientId: string,
  platform?: string
): Promise<HistoryEntry[]> {
  const historyRef = collection(db, 'users', userId, 'clients', clientId, 'history');
  let q;

  if (platform) {
    q = query(historyRef, where('platform', '==', platform), orderBy('createdAt', 'desc'));
  } else {
    q = query(historyRef, orderBy('createdAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
    } as HistoryEntry;
  });
}

export async function deleteHistoryEntry(
  userId: string,
  clientId: string,
  historyId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'clients', clientId, 'history', historyId));
}
