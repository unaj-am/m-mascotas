import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, query, where, onSnapshot, runTransaction } from 'firebase/firestore';
import type { PetDataSource } from '../datasources/pet-data-source';
import { toPetDocument } from '../mappers/pet-mapper';
import { updatePetTransaction } from '../datasources/pet-update-transaction';

export function createWebPetDataSource(): PetDataSource {
  const app = getApp();
  const db = getFirestore(app);
  const auth = getAuth(app);
  function check(uid: string) { if (!uid || auth.currentUser?.uid !== uid) throw { code: 'permission-denied' }; }
  return {
    newId: () => doc(collection(db, 'pets')).id,
    async create(pet) {
      check(pet.ownerId);
      await runTransaction(db, async (transaction) => {
        check(pet.ownerId);
        const profile = (await transaction.get(doc(db, 'users', pet.ownerId))).data();
        check(pet.ownerId);
        if (profile?.role !== 'OWNER' || (profile.active !== undefined && profile.active !== true)) throw { code: 'permission-denied' };
        transaction.set(doc(db, 'pets', pet.id), toPetDocument(pet));
      });
    },
    async update(ownerId, draft) {
      check(ownerId);
      await runTransaction(db, async (transaction) => {
        await updatePetTransaction({
          async get(name, id) {
            check(ownerId);
            const snapshot = await transaction.get(doc(db, name, id));
            check(ownerId);
            return snapshot.data() ?? null;
          },
          updatePet(id, data) { check(ownerId); transaction.update(doc(db, 'pets', id), data); },
        }, ownerId, draft);
        check(ownerId);
      });
    },
    observeByOwner(uid, listener, onError) {
      check(uid);
      return onSnapshot(query(collection(db, 'pets'), where('ownerId', '==', uid)), { includeMetadataChanges: true }, (snapshot) => {
        if (auth.currentUser?.uid !== uid) { onError({ code: 'permission-denied' }); return; }
        listener({ documents: snapshot.docs.map((document) => ({ id: document.id, data: document.data() })), fromCache: snapshot.metadata.fromCache, pendingWrites: snapshot.metadata.hasPendingWrites });
      }, onError);
    },
  };
}
