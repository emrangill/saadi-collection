// Simple IndexedDB wrapper to store image blobs locally in the browser.
// Exports: putImage, getImageBlob, getImageUrl, deleteImage
// Usage:
//   const id = await putImage(fileOrBlob);
//   const blob = await getImageBlob(id);
//   const url = await getImageUrl(id); // creates an object URL for preview
//   await deleteImage(id);

const DB_NAME = 'ecom-local-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(fileOrBlob) {
  if (!fileOrBlob) throw new Error('No file/blob provided');
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry = {
      blob: fileOrBlob,
      name: fileOrBlob.name || null,
      type: fileOrBlob.type || null,
      createdAt: new Date().toISOString()
    };
    const req = store.add(entry);
    req.onsuccess = () => {
      const id = String(req.result);
      resolve(id);
      db.close();
    };
    req.onerror = () => {
      reject(req.error);
      db.close();
    };
  });
}

export async function getImageRecord(id) {
  if (id == null) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(Number(id));
    req.onsuccess = () => {
      resolve(req.result || null);
      db.close();
    };
    req.onerror = () => {
      reject(req.error);
      db.close();
    };
  });
}

export async function getImageBlob(id) {
  const rec = await getImageRecord(id);
  return rec ? rec.blob : null;
}

export async function getImageUrl(id) {
  const blob = await getImageBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteImage(id) {
  if (id == null) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(Number(id));
    req.onsuccess = () => {
      resolve(true);
      db.close();
    };
    req.onerror = () => {
      reject(req.error);
      db.close();
    };
  });
}