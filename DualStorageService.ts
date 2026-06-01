
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  writeBatch,
  DocumentData
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

const COLLECTIONS = {
  CUSTOMERS: 'customers',
  SALES_INVOICES: 'salesInvoices',
  DELIVERY_NOTES: 'deliveryNotes',
  BOTTLE_TRANSACTIONS: 'bottleTransactions',
  RECORDS: 'records',
  PO_CUSTOMERS: 'poCustomers'
};

class DualStorageService {
  private listeners: (() => void)[] = [];
  private onDataUpdateCallback?: (collectionName: string, data: any[]) => void;
  private onErrorCallback?: (message: string, type: 'error' | 'warning') => void;
  private isInitializing = false;

  private convertTimestamps(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    // If it's a Firestore Timestamp object
    if (typeof obj.toDate === 'function') return obj.toDate();
    
    // If it's a plain object with timestamp-like structure (e.g. from local storage JSON)
    if (obj.seconds !== undefined && (obj.nanoseconds !== undefined || obj.nanos !== undefined)) {
      return new Date(obj.seconds * 1000 + (obj.nanoseconds || obj.nanos || 0) / 1000000);
    }
    
    // If it's a string that looks like an ISO date, we leave it as string 
    // because the app components usually do new Date(date) on them.
    // However, for consistency we could convert to Date objects here.
    
    if (Array.isArray(obj)) return obj.map(item => this.convertTimestamps(item));
    
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = this.convertTimestamps(obj[key]);
    }
    return newObj;
  }

  /**
   * Prepares data for Firestore by converting JS Dates to ISO strings.
   * This ensures backward compatibility with older app versions that expect 
   * date fields to be strings in the database.
   */
  private prepareForFirestore(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(item => this.prepareForFirestore(item));
    
    const newObj: any = {};
    for (const key in obj) {
      const val = obj[key];
      if (val instanceof Date) {
        newObj[key] = val.toISOString();
      } else if (typeof val === 'object' && val !== null) {
        newObj[key] = this.prepareForFirestore(val);
      } else {
        newObj[key] = val;
      }
    }
    return newObj;
  }

  /**
   * Initialize real-time listeners for all collections.
   * Updates LocalStorage whenever Firestore changes.
   */
  async initialize(onDataUpdate: (collectionName: string, data: any[]) => void, onError?: (message: string, type: 'error' | 'warning') => void) {
    if (this.isInitializing) return;
    this.isInitializing = true;

    this.onDataUpdateCallback = onDataUpdate;
    this.onErrorCallback = onError;
    // Clear existing listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];

    // Prioritize instant loading: Emit all existing cached local data immediately so UI renders in <15ms!
    Object.values(COLLECTIONS).forEach(collectionName => {
      const localData = this.getLocalData(collectionName);
      if (localData && localData.length > 0) {
        onDataUpdate(collectionName, localData);
      }
    });

    try {
      Object.values(COLLECTIONS).forEach(collectionName => {
        // Skip SALES_INVOICES initial full sync to allow staged loading
        if (collectionName === COLLECTIONS.SALES_INVOICES) return;

        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cloudData = snapshot.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
          
          console.log(`DualStorage: [Realtime] Received ${cloudData.length} docs for ${collectionName}`);
          
          this.processDataUpdate(collectionName, cloudData);
        }, (error) => {
          console.error(`DualStorage: Snapshot error for ${collectionName}`, error);
          if (this.onErrorCallback && error.message.toLowerCase().includes('quota')) {
            this.onErrorCallback(`Firestore Quota Exceeded for ${collectionName}. Data may be incomplete.`, 'warning');
          }
          handleFirestoreError(error, OperationType.LIST, collectionName);
        });
        this.listeners.push(unsubscribe);
      });

      // Special Staged loading for SALES_INVOICES to improve initial speed
      if (navigator.onLine) {
        // Start runStagedInvoiceFetch in background but it controls its own sequence
        this.runStagedInvoiceFetch();
      } else {
        // If offline, still notify about existing local invoices
        this.onDataUpdateCallback?.(COLLECTIONS.SALES_INVOICES, this.getLocalData(COLLECTIONS.SALES_INVOICES));
      }
    } finally {
      this.isInitializing = false;
    }

    // Listen for online status to sync pending changes
    window.addEventListener('online', () => this.syncPendingChanges());

    // Sync any pending changes if already online on startup
    if (navigator.onLine) {
        // Run asynchronously so it doesn't block init
        setTimeout(() => this.syncPendingChanges(), 1000);
    }

    // NEW: Periodic sync retry every 30 seconds to catch transient failures 
    // where the 'online' event might not have fired correctly.
    setInterval(() => {
        if (navigator.onLine) {
            this.syncPendingChanges();
        }
    }, 30000);
  }

  /**
   * Processes cloud data updates, merging with local-only changes.
   * @param collectionName The collection being updated
   * @param cloudData The authoritative data from the cloud
   * @param isPartial If true, the cloudData is a subset (e.g. staged load) and shouldn't delete missing items.
   */
  private processDataUpdate(collectionName: string, cloudData: any[], isPartial: boolean = false) {
    const cloudIds = new Set(cloudData.map(d => d.id));
    const localData = this.getLocalData(collectionName);
    const queue = this.getPendingQueue();
    const mergedMap = new Map();
    
    if (isPartial) {
      // In partial mode (Phase 1 & 2), we preserve existing local data and update/add from cloud
      localData.forEach(item => mergedMap.set(item.id, item));
      cloudData.forEach(item => mergedMap.set(item.id, item));
    } else {
      // In full mode (onSnapshot), the cloudData is the complete truth
      cloudData.forEach(item => mergedMap.set(item.id, item));
    }
    
    // Always apply pending local changes regardless of mode
    // 2. Remove items that are pending local deletion
    queue.forEach(qItem => {
      if (qItem.collectionName === collectionName && qItem.action === 'delete') {
        mergedMap.delete(qItem.id);
      }
    });
    
    // 3. Apply local items from mirror if they are pending sync
    // This ensures local optimistic updates win over potentially stale cloud data in the mirror
    localData.forEach(item => {
      const isPendingSave = queue.some(q => q.collectionName === collectionName && q.id === item.id && q.action === 'save');
      if (isPendingSave) {
        mergedMap.set(item.id, item);
      }
    });
    
    const finalData = Array.from(mergedMap.values());
    localStorage.setItem(`fs_${collectionName}`, JSON.stringify(finalData));
    
    if (this.onDataUpdateCallback) {
      this.onDataUpdateCallback(collectionName, finalData);
    }
  }

  /**
   * Extremely efficient incremental fetching and synchronization of invoices:
   * 1. Loads all historical invoices instantly from localStorage.
   * 2. Queries Firestore only for invoices updated/modified since the last sync timestamp (with buffer).
   * 3. Merges new/modified invoices into the localStorage cache and updates UI.
   * 4. Establishes a lightweight realtime listener for any invoices updated during the active session.
   * 5. This prevents downloading thousands of historical invoices upon every app opening, resulting in near-instant load speeds.
   */
  private async runStagedInvoiceFetch() {
    try {
      const cachedInvoices = this.getLocalData(COLLECTIONS.SALES_INVOICES);
      const sessionStartTime = new Date().toISOString();

      // Step 1: Find the threshold timestamp (highest updatedAt in cache)
      let lastUpdatedStr = '';
      if (cachedInvoices && cachedInvoices.length > 0) {
        let maxTime = 0;
        cachedInvoices.forEach(inv => {
          if (inv.updatedAt) {
            const t = new Date(inv.updatedAt).getTime();
            if (t > maxTime) maxTime = t;
          }
        });
        if (maxTime > 0) {
          // Subtract a 2-hour buffer for clock safety/drift
          lastUpdatedStr = new Date(maxTime - 2 * 60 * 60 * 1000).toISOString();
        }
      }

      console.log(`DualStorage: Incremental fetch started. Highest local updatedAt threshold: ${lastUpdatedStr || 'None (Full Sync)'}`);

      // Step 2: Fetch only items updated since our local threshold
      let fetchedInvoices: any[] = [];
      if (lastUpdatedStr) {
        try {
          const qIncremental = query(
            collection(db, COLLECTIONS.SALES_INVOICES), 
            where('updatedAt', '>=', lastUpdatedStr)
          );
          const snap = await getDocs(qIncremental);
          fetchedInvoices = snap.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
          console.log(`DualStorage: Incremental fetch fetched ${fetchedInvoices.length} invoices updated/created since ${lastUpdatedStr}.`);
        } catch (err) {
          console.error("DualStorage: Incremental query failed, falling back to full query", err);
          // If query fails, fall back to limit query
          const qFallback = query(collection(db, COLLECTIONS.SALES_INVOICES));
          const snap = await getDocs(qFallback);
          fetchedInvoices = snap.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
        }
      } else {
        // No cached records found (Fresh install or clear cache), fetch all
        console.log("DualStorage: Cache empty. Fetching all history in background...");
        const qFull = query(collection(db, COLLECTIONS.SALES_INVOICES));
        const snap = await getDocs(qFull);
        fetchedInvoices = snap.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
      }

      // Step 3: Merge fetched data with cached list
      this.processDataUpdate(COLLECTIONS.SALES_INVOICES, fetchedInvoices, true); // Partial=true, so it updates and doesn't purge cached historical ones!

      // Step 4: Hook up a live lightweight realtime listener for any changes happening *during* this session
      console.log(`DualStorage: Starting lightweight live listener for session updates >= ${sessionStartTime}`);
      const qLive = query(
        collection(db, COLLECTIONS.SALES_INVOICES), 
        where('updatedAt', '>=', sessionStartTime)
      );

      const unsubscribeLive = onSnapshot(qLive, (snapshot) => {
        // We received updates during the session. Process and merge them right away.
        const liveUpdates = snapshot.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
        if (liveUpdates.length > 0) {
          console.log(`DualStorage: [Live Snapshot] Received ${liveUpdates.length} real-time session update(s).`);
          this.processDataUpdate(COLLECTIONS.SALES_INVOICES, liveUpdates, true); // Partial=true so it merges nicely
        }
      }, (error) => {
        console.error('DualStorage: Live session listener error:', error);
        handleFirestoreError(error, OperationType.LIST, COLLECTIONS.SALES_INVOICES);
      });

      this.listeners.push(unsubscribeLive);
      
      // Optional Step 5: Run a full background cache cleanup sync 5 seconds after startup to verify deletions & match completely with Cloud 
      setTimeout(() => {
        if (navigator.onLine) {
          console.log("DualStorage: Executing background integrity sync to reconcile deleted records...");
          this.fullSyncFromCloud();
        }
      }, 5000);

    } catch (error) {
      console.error('DualStorage: Error during staged loading:', error);
      // Fallback: Default to full listener if everything fails
      const qFull = query(collection(db, COLLECTIONS.SALES_INVOICES));
      const unsubscribeDefault = onSnapshot(qFull, (snap) => {
        const data = snap.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
        this.processDataUpdate(COLLECTIONS.SALES_INVOICES, data);
      });
      this.listeners.push(unsubscribeDefault);
    }
  }

  /**
   * Returns the count of pending changes in the queue, optionally filtered by branch.
   */
  getPendingCount(branchId?: string): number {
    const queue = this.getPendingQueue();
    if (!branchId) return queue.length;
    
    return queue.filter(item => {
        if (!item.data) return false;
        return item.data.branchId === branchId;
    }).length;
  }

  /**
   * Save data to Firestore and LocalStorage.
   * If offline, queue for later sync.
   */
  async save(collectionName: string, id: string, data: any) {
    const docRef = doc(db, collectionName, id);
    // Convert Dates to ISO strings before saving to Firestore for backward compatibility
    const firestoreData = this.prepareForFirestore({ ...data, updatedAt: new Date() });
    delete firestoreData.id;

    // Use original data for local storage (with actual Date objects)
    const timestampedData = { ...data, id, updatedAt: new Date().toISOString() };
    const originalLocalData = this.getLocalData(collectionName);
    const originalItem = originalLocalData.find((item: any) => item.id === id);

    // 1. ADD TO PENDING QUEUE IMMEDIATELY (Before optimistic update)
    // This ensures that even if the process dies, the intent is captured.
    this.addToPendingQueue(collectionName, id, firestoreData, 'save');

    // 2. Optimistically update local UI immediately
    const updatedLocalData = this.updateLocalMirror(collectionName, id, timestampedData);
    if (this.onDataUpdateCallback) {
        this.onDataUpdateCallback(collectionName, updatedLocalData);
    }

    if (navigator.onLine) {
      try {
        await setDoc(docRef, firestoreData);
        // 3. REMOVE FROM PENDING QUEUE ONLY AFTER SUCCESS
        this.removeFromPendingQueue(collectionName, id, 'save');
      } catch (error: any) {
        handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
        if (error?.code === 'permission-denied' || (error?.message && error.message.toLowerCase().includes('permission'))) {
            // Log warning but keep optimistic update in local storage (graceful offline fallback)
            console.warn(`Firestore permission denied for save on ${collectionName}/${id}. Saved in local storage only (fallback mode).`);
            this.removeFromPendingQueue(collectionName, id, 'save');
            // Do not revert or throw, so the user's data is safely preserved in browser local storage
            return;
        }
        // Keep in queue for other errors (network etc)
      }
    }
    // If offline, it stays in the queue (already added at step 1)
  }

  async delete(collectionName: string, id: string) {
    console.log(`DualStorage: Deleting from ${collectionName}, ID: ${id}`);
    const docRef = doc(db, collectionName, id);

    const originalLocalData = this.getLocalData(collectionName);
    const originalItem = originalLocalData.find((item: any) => item.id === id);

    // 1. ADD TO PENDING QUEUE IMMEDIATELY
    this.addToPendingQueue(collectionName, id, null, 'delete');

    // 2. Optimistically update local UI immediately
    const updatedLocalData = this.removeFromLocalMirror(collectionName, id);
    if (this.onDataUpdateCallback) {
        this.onDataUpdateCallback(collectionName, updatedLocalData);
    }

    if (navigator.onLine) {
      try {
        await deleteDoc(docRef);
        // 3. REMOVE FROM PENDING QUEUE ONLY AFTER SUCCESS
        this.removeFromPendingQueue(collectionName, id, 'delete');
      } catch (error: any) {
        handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
        if (error?.code === 'permission-denied' || (error?.message && error.message.toLowerCase().includes('permission'))) {
            // Log warning but keep optimistic deletion in local storage (graceful offline fallback)
            console.warn(`Firestore permission denied for delete on ${collectionName}/${id}. Deleted in local storage only (fallback mode).`);
            this.removeFromPendingQueue(collectionName, id, 'delete');
            // Do not revert or throw, so the deletion remains applied in local storage
            return;
        }
        // Keep in queue for other errors
      }
    }
  }

  private updateLocalMirror(collectionName: string, id: string, data: any): any[] {
    const localData = this.getLocalData(collectionName);
    const index = localData.findIndex((item: any) => item.id === id);
    if (index > -1) {
      localData[index] = { ...data, id };
    } else {
      localData.push({ ...data, id });
    }
    localStorage.setItem(`fs_${collectionName}`, JSON.stringify(localData));
    return localData;
  }

  private removeFromLocalMirror(collectionName: string, id: string): any[] {
    const localData = this.getLocalData(collectionName);
    const filtered = localData.filter((item: any) => item.id !== id);
    localStorage.setItem(`fs_${collectionName}`, JSON.stringify(filtered));
    return filtered;
  }

  getLocalData(collectionName: string): any[] {
    const saved = localStorage.getItem(`fs_${collectionName}`);
    return saved ? JSON.parse(saved) : [];
  }

  private addToPendingQueue(collectionName: string, id: string, data: any, action: 'save' | 'delete') {
    const queue = this.getPendingQueue();
    // Use upsert logic to avoid multiple entries for same document
    const existingIndex = queue.findIndex(item => item.collectionName === collectionName && item.id === id);
    const newItem = { collectionName, id, data, action, timestamp: Date.now() };
    
    if (existingIndex > -1) {
        queue[existingIndex] = newItem;
    } else {
        queue.push(newItem);
    }
    localStorage.setItem('fs_pending_queue', JSON.stringify(queue));
  }

  private removeFromPendingQueue(collectionName: string, id: string, action: 'save' | 'delete') {
    const queue = this.getPendingQueue();
    const filtered = queue.filter(item => 
        !(item.collectionName === collectionName && item.id === id && item.action === action)
    );
    localStorage.setItem('fs_pending_queue', JSON.stringify(filtered));
  }

  private getPendingQueue(): any[] {
    const saved = localStorage.getItem('fs_pending_queue');
    return saved ? JSON.parse(saved) : [];
  }

  private async syncPendingChanges() {
    const queue = this.getPendingQueue();
    if (queue.length === 0) return;

    console.log(`DualStorage: Syncing ${queue.length} pending changes to Firestore...`);
    
    const processedIds: string[] = [];

    // Process queue in order
    for (const item of queue) {
      try {
        const docRef = doc(db, item.collectionName, item.id);
        if (item.action === 'save') {
          await setDoc(docRef, item.data);
        } else if (item.action === 'delete') {
          await deleteDoc(docRef);
        }
        processedIds.push(`${item.collectionName}-${item.id}-${item.action}`);
      } catch (error: any) {
        console.error('DualStorage: Failed to sync pending change:', error);
        // Only remove if it's a permanent error like permission-denied
        if (error?.code === 'permission-denied' || (error?.message && error.message.toLowerCase().includes('permission'))) {
           processedIds.push(`${item.collectionName}-${item.id}-${item.action}`);
        }
        // Network/transient errors stay in queue
      }
    }

    // Remove processed items from queue
    const remainingQueue = this.getPendingQueue().filter(item => 
        !processedIds.includes(`${item.collectionName}-${item.id}-${item.action}`)
    );
    
    if (remainingQueue.length === 0) {
        localStorage.removeItem('fs_pending_queue');
    } else {
        localStorage.setItem('fs_pending_queue', JSON.stringify(remainingQueue));
    }
  }

  /**
   * Clear documents in a collection, optionally filtered by a field and value.
   */
  async clearCollection(collectionName: string, field?: string, value?: any) {
    if (navigator.onLine) {
      try {
        let q = query(collection(db, collectionName));
        if (field && value !== undefined) {
          q = query(collection(db, collectionName), where(field, '==', value));
        }
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, collectionName);
      }
    }

    // Always clear local mirror immediately for responsiveness
    const localData = this.getLocalData(collectionName);
    let filtered = [];
    if (field && value !== undefined) {
      filtered = localData.filter((item: any) => item[field] !== value);
    } 
    localStorage.setItem(`fs_${collectionName}`, JSON.stringify(filtered));
    if (this.onDataUpdateCallback) {
      this.onDataUpdateCallback(collectionName, filtered);
    }
  }

  /**
   * Returns the timestamp of the last successful full sync.
   */
  getLastSyncTime(): number {
    const lastSync = localStorage.getItem('fs_last_sync_time');
    return lastSync ? parseInt(lastSync) : 0;
  }

  /**
   * One-way sync from Cloud to Local, with recovery for local-only items.
   * This is called on app start to ensure local mirror is fresh.
   */
  async fullSyncFromCloud() {
    if (!navigator.onLine) {
        console.log('DualStorage: Offline, skipping cloud sync.');
        return;
    }

    console.log('DualStorage: Starting parallel cloud sync with recovery...');
    const syncPromises = Object.values(COLLECTIONS).map(async (collectionName) => {
      try {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        const cloudData = snapshot.docs.map(doc => ({ ...this.convertTimestamps(doc.data()), id: doc.id }));
        const cloudIds = new Set(cloudData.map(d => d.id));
        
        const localData = this.getLocalData(collectionName);
        
        // CLEANUP: If items in pending queue are already in cloud, remove them
        const queue = this.getPendingQueue();
        const updatedQueue = queue.filter(qItem => 
          !(qItem.collectionName === collectionName && cloudIds.has(qItem.id))
        );
        if (updatedQueue.length !== queue.length) {
            localStorage.setItem('fs_pending_queue', JSON.stringify(updatedQueue));
            console.log(`DualStorage: Cleaned up ${queue.length - updatedQueue.length} items from queue that are already in cloud.`);
        }

        // RECOVERY: Find items in local storage that ARE NOT in cloud
        // These are ONLY recovered if they are in the pending queue as 'save' actions.
        // If they aren't in the cloud and aren't in the pending save queue, they are likely 
        // deleted items from another device and should be removed from local.
        const localOnlyItems = localData.filter(item => {
            if (cloudIds.has(item.id)) return false;
            return queue.some(qItem => qItem.collectionName === collectionName && qItem.id === item.id && qItem.action === 'save');
        });
        
        if (localOnlyItems.length > 0) {
            console.log(`DualStorage: Recovering ${localOnlyItems.length} local-only items for ${collectionName}`);
            
            // Use batch for efficient recovery of multiple items
            const batchSize = 20;
            for (let i = 0; i < localOnlyItems.length; i += batchSize) {
                const chunk = localOnlyItems.slice(i, i + batchSize);
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    const docRef = doc(db, collectionName, item.id);
                    const firestoreData = this.prepareForFirestore({ ...item, updatedAt: new Date() });
                    delete firestoreData.id;
                    batch.set(docRef, firestoreData);
                });
                try {
                    await batch.commit();
                    console.log(`DualStorage: Successfully recovered batch of ${chunk.length} items for ${collectionName}`);
                } catch (e) {
                    console.error(`DualStorage: Failed to recover batch`, e);
                    // On failure, ensure they are in pending queue
                    chunk.forEach(item => {
                        const firestoreData = this.prepareForFirestore({ ...item, updatedAt: new Date() });
                        delete firestoreData.id;
                        this.addToPendingQueue(collectionName, item.id, firestoreData, 'save');
                    });
                }
            }
        }

        // Standard merge Cloud -> Local
        if (localData.length === 0 && cloudData.length > 0) {
            localStorage.setItem(`fs_${collectionName}`, JSON.stringify(cloudData));
            if (this.onDataUpdateCallback) {
                this.onDataUpdateCallback(collectionName, cloudData);
            }
        } else {
            const mergedMap = new Map();
            // Start with cloud data
            cloudData.forEach(cloudItem => mergedMap.set(cloudItem.id, cloudItem));
            
            // Apply pending local items (unsynced)
            // This ensures local optimistic updates win over stale cloud data
            localData.forEach(item => {
                const isPendingSave = queue.some(q => q.collectionName === collectionName && q.id === item.id && q.action === 'save');
                if (isPendingSave) {
                    mergedMap.set(item.id, item);
                }
            });

            // Respect pending deletions (even if in cloud snapshot)
            queue.forEach(qItem => {
                if (qItem.collectionName === collectionName && qItem.action === 'delete') {
                    mergedMap.delete(qItem.id);
                }
            });

            const mergedData = Array.from(mergedMap.values());
            localStorage.setItem(`fs_${collectionName}`, JSON.stringify(mergedData));
            
            if (this.onDataUpdateCallback) {
                this.onDataUpdateCallback(collectionName, mergedData);
            }
        }
      } catch (error: any) {
        console.error(`DualStorage: Failed to sync ${collectionName}`, error);
        handleFirestoreError(error, OperationType.LIST, collectionName);
      }
    });

    await Promise.all(syncPromises);
    localStorage.setItem('fs_last_sync_time', Date.now().toString());
    console.log('DualStorage: Parallel sync and recovery complete.');
  }

  /**
   * Forces a push of all local data for a specific branch to the cloud.
   * This is the "Force Upload" requested by the user.
   */
  async forcePushBranchData(branchId: string) {
    if (!navigator.onLine) {
        throw new Error('Cannot force push while offline');
    }

    console.log(`DualStorage: Force pushing data for branch ${branchId}...`);
    
    // 1. First, try to sync the general pending queue to clear any easy stuff
    await this.syncPendingChanges();

    // 2. Now, specifically look for data belonging to this branch in local storage 
    // that might not have made it to the cloud (recovery scan).
    const syncPromises = Object.values(COLLECTIONS).map(async (collectionName) => {
        const localData = this.getLocalData(collectionName);
        // Filter by branch
        const branchLocalData = localData.filter(item => item.branchId === branchId);
        
        if (branchLocalData.length === 0) return;

        try {
            // Fetch current cloud state for this branch to see what's missing
            const q = query(collection(db, collectionName), where('branchId', '==', branchId));
            const snapshot = await getDocs(q);
            const cloudIds = new Set(snapshot.docs.map(doc => doc.id));
            const queue = this.getPendingQueue();
            
            // Only push items that are in the pending queue with action 'save'
            // or if we're doing a total recovery (but safely)
            const missingItems = branchLocalData.filter(item => {
                if (cloudIds.has(item.id)) return false;
                // If it's not in the cloud AND it's in the pending queue, it's definitely new.
                const inQueue = queue.some(q => q.collectionName === collectionName && q.id === item.id && q.action === 'save');
                if (inQueue) return true;
                
                // If it's been created VERY recently (last 10 mins) we might treat it as "not yet queued" 
                // but this is risky. Let's stick to the queue.
                return false;
            });
            
            if (missingItems.length > 0) {
                console.log(`DualStorage: Found ${missingItems.length} missing items for branch ${branchId} in ${collectionName}. Pushing now...`);
                
                const batchSize = 50;
                for (let i = 0; i < missingItems.length; i += batchSize) {
                    const chunk = missingItems.slice(i, i + batchSize);
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const docRef = doc(db, collectionName, item.id);
                        const firestoreData = this.prepareForFirestore({ ...item, updatedAt: new Date() });
                        delete firestoreData.id;
                        batch.set(docRef, firestoreData);
                    });
                    await batch.commit();
                }
            }
        } catch (error) {
            console.error(`DualStorage: Error during force push for ${collectionName}:`, error);
        }
    });

    await Promise.all(syncPromises);
    localStorage.setItem('fs_last_sync_time', Date.now().toString());
    console.log(`DualStorage: Force push for branch ${branchId} complete.`);
  }

  /**
   * Export all collections data for backup.
   */
  exportAllData() {
    const backup: Record<string, any[]> = {};
    Object.values(COLLECTIONS).forEach(collectionName => {
      backup[collectionName] = this.getLocalData(collectionName);
    });
    return backup;
  }

  /**
   * Import data into all collections.
   * WARNING: This replaces local data and attempts to sync to Firestore.
   */
  async importAllData(backup: Record<string, any[]>) {
    console.log("DualStorage: Importing full backup...");
    for (const [collectionName, data] of Object.entries(backup)) {
      if (!Object.values(COLLECTIONS).includes(collectionName)) continue;
      
      // Update local first
      localStorage.setItem(`fs_${collectionName}`, JSON.stringify(data));
      if (this.onDataUpdateCallback) {
        this.onDataUpdateCallback(collectionName, data);
      }

      // Sync to Firestore if online
      if (navigator.onLine) {
        try {
          const batch = writeBatch(db);
          // 1. Clear existing in Firestore for this collection (Note: simple implemention, real app might prefer full clean)
          const q = query(collection(db, collectionName));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          
          // 2. Add new data
          data.forEach(item => {
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, item);
          });
          
          await batch.commit();
          console.log(`DualStorage: Successfully synced ${collectionName} import to cloud.`);
        } catch (error) {
          console.error(`DualStorage: Failed to sync import for ${collectionName}`, error);
        }
      }
    }
  }
}

export const dualStorage = new DualStorageService();
export { COLLECTIONS };
