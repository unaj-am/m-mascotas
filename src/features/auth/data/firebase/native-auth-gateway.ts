import { getApp } from '@react-native-firebase/app';
import {
  getAuth, onAuthStateChanged, reload, signInWithEmailAndPassword, signOut as firebaseSignOut,
  sendPasswordResetEmail, sendEmailVerification, getIdToken,
  createUserWithEmailAndPassword, deleteUser,
} from '@react-native-firebase/auth';
import { getFirestore, doc, getDocFromServer, onSnapshot, runTransaction } from '@react-native-firebase/firestore';
import type { AuthIdentity, FirebaseAuthGateway } from '../datasources/firebase-auth-gateway';

export function createNativeAuthGateway(): FirebaseAuthGateway {
  const app = getApp();
  if (app.options.projectId !== 'mascotas-5d228') throw new Error('La configuración no corresponde al proyecto Firebase de Mascotas.');
  const auth = getAuth(app);
  const db = getFirestore(app);
  function identity(user: typeof auth.currentUser): AuthIdentity | null {
    return user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null;
  }
  return {
    currentUser: () => identity(auth.currentUser),
    observeAuth: (listener) => onAuthStateChanged(auth, (user) => listener(identity(user))),
    async reloadUser(uid) {
      const user = auth.currentUser;
      if (!user || user.uid !== uid) return null;
      await reload(user);
      const fresh = auth.currentUser;
      if (fresh?.uid === uid && fresh.emailVerified) await getIdToken(fresh, true);
      return identity(auth.currentUser);
    },
    async getProfileFromServer(uid) {
      const snapshot = await getDocFromServer(doc(db, 'users', uid));
      return snapshot.exists() ? snapshot.data() : null;
    },
    observeProfile(uid, listener, error) {
      return onSnapshot(doc(db, 'users', uid), { includeMetadataChanges: true }, (snapshot) => {
        // Un rol autorizado se toma del servidor, nunca de una caché histórica.
        if (!snapshot.metadata.fromCache) listener(snapshot.exists() ? snapshot.data() : null);
      }, error);
    },
    async signIn(email, password) { await signInWithEmailAndPassword(auth, email, password); },
    async createAccount(email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { uid: credential.user.uid, email: credential.user.email, emailVerified: credential.user.emailVerified };
    },
    async createRegistrationProfile(uid, profile) {
      if (auth.currentUser?.uid !== uid) throw { code: 'auth/invalid-credential' };
      const reference = doc(db, 'users', uid);
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(reference);
        if (existing.exists()) throw { code: 'registration/profile-exists' };
        transaction.set(reference, profile);
      });
    },
    async deleteAccount(uid) {
      const user = auth.currentUser;
      if (!user || user.uid !== uid) throw { code: 'auth/invalid-credential' };
      await deleteUser(user);
    },
    async signOut() {
      try { await firebaseSignOut(auth); }
      catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        // La salida es idempotente si Firebase ya no tiene una cuenta activa.
        if (code === 'auth/no-current-user') return;
        throw error;
      }
    },
    async sendPasswordReset(email) {
      try { await sendPasswordResetEmail(auth, email); }
      catch (error) {
        // No revelar si existe un correo en proyectos antiguos sin protección de enumeración.
        if (typeof error === 'object' && error && 'code' in error && error.code === 'auth/user-not-found') return;
        throw error;
      }
    },
    async sendVerificationEmail() {
      const user = auth.currentUser;
      if (!user) throw { code: 'auth/invalid-credential' };
      await sendEmailVerification(user);
    },
  };
}
