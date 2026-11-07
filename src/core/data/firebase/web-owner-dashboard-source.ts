import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocsFromServer } from 'firebase/firestore';
import type { OwnerDashboardDataSource } from '../datasources/owner-dashboard-data-source';

export function createWebOwnerDashboardSource(): OwnerDashboardDataSource {
  const app = getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  function check(uid: string) {
    if (!uid || auth.currentUser?.uid !== uid) throw { code: 'permission-denied' };
  }
  async function list(name: 'pets' | 'walks', uid: string) {
    check(uid);
    const snapshot = await getDocsFromServer(query(collection(db, name), where('ownerId', '==', uid)));
    return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
  }
  return {
    async getProfile(uid) { check(uid); const snapshot = await getDocFromServer(doc(db, 'users', uid)); return snapshot.data(); },
    getPets: (uid) => list('pets', uid),
    getWalks: (uid) => list('walks', uid),
  };
}
