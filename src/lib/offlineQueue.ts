// IndexedDB Offline Queue: Store transactions offline and auto-sync when online
// Architecture Spec: Client PWA -> IndexedDB Offline Queue -> sync when online

import { recordTransaction } from './api';

const DB_NAME = 'genrob_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_transactions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'client_id', autoIncrement: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflinePendingTransaction {
  client_id: string;
  shop_id: string;
  product_id: string;
  product_name?: string;
  type: 'in' | 'out' | 'adjustment';
  qty: number;
  unit: string;
  qty_in_base_unit: number;
  price: number;
  total_amount: number;
  source: 'voice' | 'manual' | 'whatsapp' | 'ocr';
  raw_transcript?: string;
  confidence?: number;
  notes?: string;
  queued_at: string;
}

export async function enqueueOfflineTransaction(
  tx: Omit<OfflinePendingTransaction, 'client_id' | 'queued_at'>
): Promise<string> {
  const db = await openDB();
  const client_id = 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const record: OfflinePendingTransaction = {
    ...tx,
    client_id,
    queued_at: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const txObj = db.transaction(STORE_NAME, 'readwrite');
    const store = txObj.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(client_id);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflinePendingCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const txObj = db.transaction(STORE_NAME, 'readonly');
      const store = txObj.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function getAllOfflinePending(): Promise<OfflinePendingTransaction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const txObj = db.transaction(STORE_NAME, 'readonly');
      const store = txObj.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearOfflineTransaction(client_id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txObj = db.transaction(STORE_NAME, 'readwrite');
    const store = txObj.objectStore(STORE_NAME);
    const req = store.delete(client_id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncOfflineQueueToSupabase(
  onSyncedCallback?: () => void
): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getAllOfflinePending();
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await recordTransaction({
        shop_id: item.shop_id,
        product_id: item.product_id,
        type: item.type,
        qty: item.qty,
        unit: item.unit,
        price: item.price,
        total_amount: item.total_amount || (item.qty * item.price),
        source: item.source,
        raw_transcript: item.raw_transcript,
        confidence: item.confidence,
        notes: (item.notes || '') + ' [Synced from Offline Queue]',
      });
      await clearOfflineTransaction(item.client_id);
      synced++;
    } catch (err) {
      console.error('Failed to sync offline item:', item.client_id, err);
      failed++;
    }
  }

  if (synced > 0 && onSyncedCallback) {
    onSyncedCallback();
  }

  return { synced, failed };
}

// Auto-sync listener on window online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueueToSupabase().then(({ synced }) => {
      if (synced > 0) {
        console.log(`[GenRob PWA] Automatically synced ${synced} offline transaction(s) to Supabase.`);
      }
    });
  });
}
