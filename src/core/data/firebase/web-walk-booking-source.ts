import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, query, where, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { WalkBookingDataSource, BookingListener } from '../datasources/walk-booking-data-source';
import { toNewBookingDocument } from '../mappers/walk-booking-mapper';
import { acceptWalkTransaction, updateWalkTransaction, type WalkExecutionTransaction } from '../datasources/walk-execution-transaction';

export function createWebWalkBookingSource(): WalkBookingDataSource {
  const app = getApp(), db = getFirestore(app), auth = getAuth(app);
  function check(uid: string) { if (!uid || auth.currentUser?.uid !== uid) throw { code: 'permission-denied' }; }
  function observe(name: 'walkers' | 'walkRequests' | 'walks', field: 'available' | 'ownerId' | 'walkerId', value: string | boolean, uid: string, listener: BookingListener, onError: (error: unknown) => void) {
    check(uid);
    return onSnapshot(query(collection(db, name), where(field, '==', value)), { includeMetadataChanges: true }, (snapshot) => {
      try { check(uid); } catch (error) { onError(error); return; }
      listener({ documents: snapshot.docs.map((document) => ({ id: document.id, data: document.data() })),
        fromCache: snapshot.metadata.fromCache, pendingWrites: snapshot.metadata.hasPendingWrites });
    }, onError);
  }
  function execute(uid: string, id: string, action: 'accept' | 'start' | 'complete') {
    check(uid);
    return runTransaction(db, async (transaction) => {
      check(uid);
      const port: WalkExecutionTransaction = {
        async get(name, documentId) {
          check(uid);
          const snapshot = await transaction.get(doc(db, name, documentId));
          check(uid);
          return snapshot.data() ?? null;
        },
        setWalk(documentId, data) { check(uid); transaction.set(doc(db, 'walks', documentId), data); },
        update(name, documentId, data) {
          check(uid);
          transaction.update(doc(db, name, documentId), name === 'walkRequests' ? { ...data, acceptedAt: serverTimestamp() } : data);
        },
      };
      const result = action === 'accept' ? await acceptWalkTransaction(port, uid, id) : await updateWalkTransaction(port, uid, id, action);
      check(uid);
      return result;
    });
  }
  return {
    newRequestId: () => doc(collection(db, 'walkRequests')).id,
    observeAvailableWalkers: (listener, onError) => observe('walkers', 'available', true, auth.currentUser?.uid ?? '', listener, onError),
    observeRequests: (uid, side, listener, onError) => observe('walkRequests', side === 'owner' ? 'ownerId' : 'walkerId', uid, uid, listener, onError),
    observeWalks: (uid, side, listener, onError) => observe('walks', side === 'owner' ? 'ownerId' : 'walkerId', uid, uid, listener, onError),
    acceptRequest: (uid, id) => execute(uid, id, 'accept'),
    updateWalk: (uid, id, action) => execute(uid, id, action),
    async createRequest(ownerId, draft) {
      check(ownerId);
      await runTransaction(db, async (transaction) => {
        check(ownerId);
        const [owner, walker, ...pets] = await Promise.all([
          transaction.get(doc(db, 'users', ownerId)), transaction.get(doc(db, 'walkers', draft.walkerId)),
          ...draft.petIds.map((id) => transaction.get(doc(db, 'pets', id))),
        ]);
        check(ownerId);
        const data = toNewBookingDocument(ownerId, draft, owner?.data() ?? null, walker?.data() ?? null,
          pets.map((pet) => ({ id: pet.id, data: pet.data() })));
        transaction.set(doc(db, 'walkRequests', draft.id), { ...data, createdAt: serverTimestamp() });
      });
    },
  };
}

