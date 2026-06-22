import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export interface LedgerEntry {
  id: string;
  offerId: string;
  offerName: string;
  creativeImage?: string;
  sourceData: string;
  targetMix: string;
  listDateRange: string;
  dataType: string;
  category: string;
  revenue: number;
  length: number;
  createdDate: string; // YYYY-MM-DD
  timestamp_created: string; // YYYY-MM-DD HH:mm:ss
  createdAt: any;
  updatedAt: any;
  userId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => {
    // Phase 9: Initialize from local storage for instant access
    const userJson = localStorage.getItem('last_user_id');
    if (userJson) {
      const cached = localStorage.getItem(`ledger_cache_${userJson}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        localStorage.setItem('last_user_id', u.uid);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      if (entries.length > 0) {
        setEntries([]);
        setLoading(false);
      }
      return;
    }

    const path = 'ledger';
    const q = query(
      collection(db, path),
      where('userId', '==', user.uid),
      orderBy('timestamp_created', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LedgerEntry[];
      setEntries(data);
      setLoading(false);
      // Permanent Data Storage: Update local cache
      try {
        localStorage.setItem(`ledger_cache_${user.uid}`, JSON.stringify(data));
      } catch (e) {
        console.warn('Storage quota exceeded for ledger cache:', e);
        try {
          // Attempt recovery: Clear any other user's caches from localStorage to free space
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ledger_cache_') && key !== `ledger_cache_${user.uid}`) {
              localStorage.removeItem(key);
            }
          }
          // Retry setting current cache
          localStorage.setItem(`ledger_cache_${user.uid}`, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to set ledger cache even after clearing other caches:', retryError);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user]);

  const addOrUpdateEntry = useCallback(async (entry: Omit<LedgerEntry, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'timestamp_created'>) => {
    if (!user) {
      toast.error("Handshake Failed: Identity Required");
      throw new Error("User not authenticated");
    }

    const path = 'ledger';
    const nowFormatted = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const hourKey = format(new Date(), 'yyyyMMddHH');

    try {
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        where('offerId', '==', entry.offerId),
        where('targetMix', '==', entry.targetMix),
        where('sourceData', '==', entry.sourceData)
      );
      
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(doc => {
        const ts = doc.data().timestamp_created;
        return ts && ts.replace(/[^0-9]/g, '').startsWith(hourKey);
      });

      if (existing) {
        const docRef = doc(db, path, existing.id);
        await updateDoc(docRef, {
          ...entry,
          updatedAt: serverTimestamp()
        });
        toast.success("Intelligence Ledger: Entry Synchronized");
        return existing.id;
      } else {
        const docId = format(new Date(), 'yyyyMMddHHmmss');
        const docRef = doc(db, path, docId);
        await setDoc(docRef, {
          ...entry,
          userId: user.uid,
          timestamp_created: nowFormatted,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Intelligence Ledger: New Data Point Secured");
        return docId;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, [user]);

  const updateEntryField = useCallback(async (id: string, field: keyof LedgerEntry, value: any) => {
    const path = `ledger/${id}`;
    try {
      const docRef = doc(db, 'ledger', id);
      await updateDoc(docRef, {
        [field]: value,
        updatedAt: serverTimestamp()
      });
      toast.success("Database Updated: Registry Field Modified", { duration: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const path = `ledger/${id}`;
    const toastId = toast.loading("Purging Data Point...");
    try {
      await deleteDoc(doc(db, 'ledger', id));
      toast.success("Database Updated: Registry Purged", { id: toastId });
    } catch (error) {
      toast.error("Purge Failed: Handshake Denied", { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, []);

  const deleteEntries = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const toastId = toast.loading(`Bulk Purging ${ids.length} Data Points...`);
    const batch = writeBatch(db);
    
    try {
      ids.forEach(id => {
        batch.delete(doc(db, 'ledger', id));
      });
      await batch.commit();
      toast.success("Database Updated: Bulk Purge Complete", { id: toastId });
    } catch (error) {
      toast.error("Bulk Purge Failed", { id: toastId });
      handleFirestoreError(error, OperationType.DELETE, 'ledger_bulk');
    }
  }, []);

  return { 
    entries, 
    loading, 
    user, 
    addOrUpdateEntry, 
    updateEntryField, 
    deleteEntry,
    deleteEntries
  };
}
