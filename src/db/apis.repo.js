import { dbPromise, STORES } from "./db";

export async function getApiById(apiId) {
  const db = await dbPromise;
  return db.get(STORES.APIS, apiId);
}

export async function addApi(api) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  await tx.objectStore(STORES.APIS).add({ ...api, enabled: api.enabled !== undefined ? api.enabled : true });
  await tx.done;
}

export async function getApisByCollection(collectionId) {
  const db = await dbPromise;
  const store = db
    .transaction(STORES.APIS)
    .objectStore(STORES.APIS)
    .index("collectionId");

  return store.getAll(IDBKeyRange.only(collectionId));
}

export async function updateApi(apiId, apiData) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  
  // Get existing API to preserve the id
  const existingApi = await store.get(apiId);
  if (existingApi) {
    await store.put({ ...existingApi, ...apiData, id: apiId });
  }
  await tx.done;
}

export async function deleteApi(apiId) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  await tx.objectStore(STORES.APIS).delete(apiId);
  await tx.done;
}

export async function toggleApiEnabled(apiId, enabled) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  
  const existingApi = await store.get(apiId);
  if (existingApi) {
    await store.put({ ...existingApi, enabled, id: apiId });
  }
  await tx.done;
}

export async function toggleApiPinned(apiId, pinned) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  const api = await store.get(apiId);
  if (api) await store.put({ ...api, pinned, id: apiId });
  await tx.done;
}

export async function reorderCollectionApis(collectionId, orderedIds) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  for (let i = 0; i < orderedIds.length; i++) {
    const api = await store.get(orderedIds[i]);
    if (api) await store.put({ ...api, position: i, id: orderedIds[i] });
  }
  await tx.done;
}

export async function duplicateApi(apiId) {
  const db = await dbPromise;
  const tx = db.transaction(STORES.APIS, "readwrite");
  const store = tx.objectStore(STORES.APIS);
  
  const existingApi = await store.get(apiId);
  if (existingApi) {
    const { id, ...apiData } = existingApi;
    await store.add({
      ...apiData,
      label: `${apiData.label} (Copy)`,
      createdAt: Date.now()
    });
  }
  await tx.done;
}
