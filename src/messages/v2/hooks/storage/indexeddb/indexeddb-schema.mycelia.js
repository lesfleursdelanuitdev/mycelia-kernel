/**
 * IndexedDB Schema Management
 * 
 * Handles database schema creation and migrations.
 */

/**
 * Get current schema version
 * @returns {number} Current schema version
 */
export function getCurrentSchemaVersion() {
  return 1;
}

/**
 * Handle database upgrade (schema creation/migration)
 * 
 * @param {IDBVersionChangeEvent} event - Upgrade event
 */
export function handleUpgrade(event) {
  const db = event.target.result;
  const oldVersion = event.oldVersion;
  const newVersion = event.newVersion || db.version;

  // Create storage_entries object store
  if (!db.objectStoreNames.contains('storage_entries')) {
    const entriesStore = db.createObjectStore('storage_entries', {
      keyPath: ['namespace', 'key']
    });

    // Create indexes
    entriesStore.createIndex('namespace', 'namespace', { unique: false });
    entriesStore.createIndex('createdAt', 'createdAt', { unique: false });
    entriesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
  }

  // Create storage_namespaces object store
  if (!db.objectStoreNames.contains('storage_namespaces')) {
    db.createObjectStore('storage_namespaces', {
      keyPath: 'name'
    });
  }

  // Future migrations
  // if (oldVersion < 2) {
  //   // Migration logic for version 2
  //   // Example: Add new index
  //   const entriesStore = event.target.transaction.objectStore('storage_entries');
  //   if (!entriesStore.indexNames.contains('newIndex')) {
  //     entriesStore.createIndex('newIndex', 'newField', { unique: false });
  //   }
  // }
}

/**
 * Initialize default namespace
 * 
 * @param {IDBDatabase} db - Database instance
 * @returns {Promise<void>}
 */
export async function initializeDefaultNamespace(db) {
  const transaction = db.transaction(['storage_namespaces'], 'readwrite');
  const store = transaction.objectStore('storage_namespaces');

  // Check if default namespace exists
  const defaultNs = await new Promise((resolve, reject) => {
    const request = store.get('default');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

  if (!defaultNs) {
    // Create default namespace
    await new Promise((resolve, reject) => {
      const request = store.put({
        name: 'default',
        metadata: {},
        createdAt: Date.now()
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Wait for transaction to complete
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}



