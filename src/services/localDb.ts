import { ExpiryItem, NotificationSettings, UserProfile } from '../types';

const DB_NAME = 'ExpiTrack_User_LocalDB';
const DB_VERSION = 1;

const STORES = {
  ITEMS: 'vault_items',
  SETTINGS: 'app_settings',
  PROFILE: 'user_profile',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and opens the user's local IndexedDB database.
 */
export function openLocalDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this browser/environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Vault items store
      if (!db.objectStoreNames.contains(STORES.ITEMS)) {
        const itemStore = db.createObjectStore(STORES.ITEMS, { keyPath: 'id' });
        itemStore.createIndex('category', 'category', { unique: false });
        itemStore.createIndex('status', 'status', { unique: false });
        itemStore.createIndex('expiryDate', 'expiryDate', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Profile store
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Get all expiry items stored in user's local IndexedDB database.
 */
export async function getAllLocalItems(): Promise<ExpiryItem[]> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ITEMS, 'readonly');
      const store = tx.objectStore(STORES.ITEMS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        console.error('Error fetching items from IndexedDB:', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back:', err);
    return [];
  }
}

/**
 * Persists all vault items into user's local IndexedDB database.
 */
export async function saveAllLocalItems(items: ExpiryItem[]): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ITEMS, 'readwrite');
      const store = tx.objectStore(STORES.ITEMS);

      // Clear existing records and rewrite current snapshot
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const item of items) {
          store.put(item);
        }
      };

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        console.error('Error saving items to IndexedDB:', tx.error);
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB write error:', err);
  }
}

/**
 * Put/Update a single item in local database.
 */
export async function putLocalItem(item: ExpiryItem): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ITEMS, 'readwrite');
      const store = tx.objectStore(STORES.ITEMS);
      store.put(item);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB put error:', err);
  }
}

/**
 * Delete a single item by id in local database.
 */
export async function deleteLocalItem(id: string): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ITEMS, 'readwrite');
      const store = tx.objectStore(STORES.ITEMS);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
}

/**
 * Save notification settings in user's local database.
 */
export async function saveLocalSettings(settings: NotificationSettings): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      store.put({ key: 'current_settings', ...settings });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save settings error:', err);
  }
}

/**
 * Get notification settings from user's local database.
 */
export async function getLocalSettings(): Promise<NotificationSettings | null> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const req = store.get('current_settings');

      req.onsuccess = () => {
        if (req.result) {
          const { key, ...rest } = req.result;
          resolve(rest as NotificationSettings);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save user profile in user's local database.
 */
export async function saveLocalProfile(profile: UserProfile): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROFILE, 'readwrite');
      const store = tx.objectStore(STORES.PROFILE);
      store.put({ key: 'current_profile', ...profile });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save profile error:', err);
  }
}

/**
 * Get user profile from user's local database.
 */
export async function getLocalProfile(): Promise<UserProfile | null> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.PROFILE, 'readonly');
      const store = tx.objectStore(STORES.PROFILE);
      const req = store.get('current_profile');

      req.onsuccess = () => {
        if (req.result) {
          const { key, ...rest } = req.result;
          resolve(rest as UserProfile);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clears all data from user's local IndexedDB database.
 */
export async function clearAllLocalDatabase(): Promise<void> {
  try {
    const db = await openLocalDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.ITEMS, STORES.SETTINGS, STORES.PROFILE], 'readwrite');
      tx.objectStore(STORES.ITEMS).clear();
      tx.objectStore(STORES.SETTINGS).clear();
      tx.objectStore(STORES.PROFILE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear error:', err);
  }
}
