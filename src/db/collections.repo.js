import { dbPromise, STORES } from './db';

export async function addCollection(name) {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    const id = await tx.objectStore(STORES.COLLECTIONS).add({
      name,
      enabled: true,
      createdAt: Date.now(),
    });
    await tx.done;
    console.log("Collection added:", name);
    return id;
  } catch (err) {
    console.error("Error adding collection:", err);
  }
}


export async function getCollections() {
  const db = await dbPromise;
  return await db.getAll(STORES.COLLECTIONS);
}

export async function getCollectionById(collectionId) {
  const db = await dbPromise;
  return db.get(STORES.COLLECTIONS, collectionId);
}

export async function updateCollection(collectionId, name) {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    const store = tx.objectStore(STORES.COLLECTIONS);
    
    const existingCollection = await store.get(collectionId);
    if (existingCollection) {
      await store.put({ ...existingCollection, name, id: collectionId });
    }
    await tx.done;
    console.log("Collection updated:", name);
  } catch (err) {
    console.error("Error updating collection:", err);
  }
}

export async function deleteCollection(collectionId) {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    await tx.objectStore(STORES.COLLECTIONS).delete(collectionId);
    await tx.done;
    console.log("Collection deleted:", collectionId);
  } catch (err) {
    console.error("Error deleting collection:", err);
  }
}

export async function toggleCollectionPinned(collectionId, pinned) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
  const store = tx.objectStore(STORES.COLLECTIONS);
  const col = await store.get(collectionId);
  if (col) await store.put({ ...col, pinned, id: collectionId });
  await tx.done;
}

export async function toggleCollectionEnabled(collectionId, enabled) {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
    const store = tx.objectStore(STORES.COLLECTIONS);
    
    const existingCollection = await store.get(collectionId);
    if (existingCollection) {
      await store.put({ ...existingCollection, enabled, id: collectionId });
    }
    await tx.done;
    console.log("Collection enabled status updated:", enabled);
  } catch (err) {
    console.error("Error updating collection enabled status:", err);
  }
}

// Removes every collection and API in one transaction (used by "Replace All" import).
export async function clearAllData() {
  const db = await dbPromise;
  const tx = db.transaction([STORES.COLLECTIONS, STORES.APIS], "readwrite");
  await Promise.all([
    tx.objectStore(STORES.COLLECTIONS).clear(),
    tx.objectStore(STORES.APIS).clear(),
    tx.done,
  ]);
}

// `sites` is a list of host patterns; an empty list means the collection applies to all sites.
export async function updateCollectionSites(collectionId, sites) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.COLLECTIONS, "readwrite");
  const store = tx.objectStore(STORES.COLLECTIONS);
  const col = await store.get(collectionId);
  if (col) await store.put({ ...col, sites: Array.isArray(sites) ? sites : [], id: collectionId });
  await tx.done;
}
