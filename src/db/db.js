import { openDB } from 'idb';

export const STORES = {
  COLLECTIONS: 'collections',
  APIS: 'apis'
};

export const dbPromise = openDB('api-mock-db', 2, {
  upgrade(db, oldVersion) {
    // Delete old stores if they exist to recreate with correct schema
    if (oldVersion < 2) {
      if (db.objectStoreNames.contains(STORES.COLLECTIONS)) {
        db.deleteObjectStore(STORES.COLLECTIONS);
      }
      if (db.objectStoreNames.contains(STORES.APIS)) {
        db.deleteObjectStore(STORES.APIS);
      }
    }

    if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
      db.createObjectStore(STORES.COLLECTIONS, {
        keyPath: 'id',
        autoIncrement: true
      });
    }

    if (!db.objectStoreNames.contains(STORES.APIS)) {
      const store = db.createObjectStore(STORES.APIS, {
        keyPath: 'id',
        autoIncrement: true
      });
      store.createIndex('collectionId', 'collectionId');
    }
  }
});
