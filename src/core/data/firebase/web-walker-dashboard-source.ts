import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, query, where, getDocsFromServer, runTransaction } from 'firebase/firestore';
import type { WalkerDashboardDataSource } from '../datasources/walker-dashboard-data-source';

export function createWebWalkerDashboardSource(): WalkerDashboardDataSource {
  const app = getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  function check(uid: string) { if (!uid || auth.currentUser?.uid !== uid) throw { code: 'permission-denied' }; }
  async function read(name: 'users' | 'walkers', uid: string) {
    check(uid);
    const snapshot = await getDocFromServer(doc(db, name, uid));
    return snapshot.data() ?? null;
  }
  async function list(name: 'walkRequests' | 'walks', uid: string) {
    check(uid);
    const snapshot = await getDocsFromServer(query(collection(db, name), where('walkerId', '==', uid)));
    return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
  }
  return {
    getProfile: (uid) => read('users', uid), getWalker: (uid) => read('walkers', uid),
    getRequests: (uid) => list('walkRequests', uid), getWalks: (uid) => list('walks', uid),
    async updateAvailability(uid, available) {
      check(uid);
      await runTransaction(db, async (transaction) => {
        check(uid);
        const profile = (await transaction.get(doc(db, 'users', uid))).data();
        const reference = doc(db, 'walkers', uid);
        const walker = await transaction.get(reference);
        if (profile?.role !== 'WALKER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
        if (!walker.exists()) throw { code: 'not-found' };
        transaction.update(reference, { available });
      });
    },
  };
}
