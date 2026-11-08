import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, collection, query, orderBy, onSnapshot, getDocFromServer, writeBatch } from 'firebase/firestore';
import type { WalkLocationDataSource } from '../datasources/walk-location-data-source';
import { toLocationDocument } from '../mappers/walk-location-mapper';

export function createWebWalkLocationSource(): WalkLocationDataSource {
  const app = getApp(), db = getFirestore(app), auth = getAuth(app);
  function check(uid: string) { if (!uid || auth.currentUser?.uid !== uid) throw { code: 'permission-denied' }; }
  function document(uid: string, path: string[], next: Parameters<WalkLocationDataSource['observeWalk']>[2], error: (value: unknown) => void) {
    check(uid);
    return onSnapshot(doc(db, path[0]!, ...path.slice(1)), { includeMetadataChanges: true }, (snapshot) => {
      try { check(uid); } catch (value) { error(value); return; }
      next({ data: snapshot.data() ?? null, fromCache: snapshot.metadata.fromCache, pendingWrites: snapshot.metadata.hasPendingWrites });
    }, error);
  }
  return {
    async getWalk(uid, id) { check(uid); const result = await getDocFromServer(doc(db, 'walks', id)); check(uid); return result.data() ?? null; },
    observeWalk: (uid, id, next, error) => document(uid, ['walks', id], next, error),
    observeCurrent: (uid, id, next, error) => document(uid, ['walks', id, 'tracking', 'current'], next, error),
    observeHistory(uid, id, next, error) {
      check(uid);
      return onSnapshot(query(collection(db, 'walks', id, 'locations'), orderBy('recordedAt', 'asc')), { includeMetadataChanges: true }, (snapshot) => {
        try { check(uid); } catch (value) { error(value); return; }
        next({ data: snapshot.docs.map((item) => item.data()), fromCache: snapshot.metadata.fromCache, pendingWrites: snapshot.metadata.hasPendingWrites });
      }, error);
    },
    async publish(uid, id, point) {
      check(uid);
      const data = toLocationDocument(point), batch = writeBatch(db);
      batch.set(doc(db, 'walks', id, 'tracking', 'current'), data);
      batch.set(doc(collection(db, 'walks', id, 'locations')), data);
      await batch.commit();
      check(uid);
    },
  };
}

