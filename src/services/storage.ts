import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from './firebase';

// ============================================
// Storage Service
// ============================================

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  path: string,
  file: File | Blob,
  metadata?: Record<string, string>
): Promise<{ storagePath: string; downloadURL: string }> {
  const storageRef = ref(storage, path);
  const uploadMetadata = metadata
    ? { customMetadata: metadata }
    : undefined;

  await uploadBytes(storageRef, file, uploadMetadata);
  const downloadURL = await getDownloadURL(storageRef);

  return { storagePath: path, downloadURL };
}

/**
 * Upload raw data as a file
 */
export async function uploadData(
  path: string,
  data: string,
  contentType: string = 'application/json'
): Promise<{ storagePath: string; downloadURL: string }> {
  const blob = new Blob([data], { type: contentType });
  return uploadFile(path, blob);
}

/**
 * Get download URL for a file
 */
export async function getFileURL(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Delete all files in a directory
 */
export async function deleteDirectory(path: string): Promise<void> {
  const dirRef = ref(storage, path);
  const listResult = await listAll(dirRef);

  const deletePromises = listResult.items.map((itemRef) =>
    deleteObject(itemRef)
  );

  // Recursively delete subdirectories
  const subDirPromises = listResult.prefixes.map((prefix) =>
    deleteDirectory(prefix.fullPath)
  );

  await Promise.all([...deletePromises, ...subDirPromises]);
}

/**
 * Generate storage path for user files
 */
export function getStoragePath(
  userId: string,
  clientId: string,
  platform: string,
  fileType: string,
  fileName: string
): string {
  return `users/${userId}/clients/${clientId}/${platform}/${fileType}/${fileName}`;
}
