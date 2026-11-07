import { getApps, initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, reload, getIdToken, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, sendEmailVerification, type User,
  createUserWithEmailAndPassword, deleteUser,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, onSnapshot, runTransaction } from 'firebase/firestore';
import type { AuthIdentity, FirebaseAuthGateway } from '../datasources/firebase-auth-gateway';
import { readWebFirebaseConfig } from './web-firebase-config';
import { FirebaseConfigurationError } from '../../errors/firebase-configuration-error';

export function createWebAuthGateway(): FirebaseAuthGateway {
  const config = readWebFirebaseConfig({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_WEB_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID,
  });
  const app = getApps().find((candidate) => candidate.name === '[DEFAULT]') ?? initializeApp(config);
  if (app.options.projectId !== config.projectId || app.options.appId !== config.appId) {
    throw new FirebaseConfigurationError('La conexión web existente pertenece a otra configuración. Recargá la página después de revisar .env.local.');
  }
  // getAuth conserva la sesión en el navegador con los mecanismos soportados por el SDK.
  const auth = getAuth(app);
  auth.languageCode = 'es';
  const db = getFirestore(app);
  function identity(user: User | null): AuthIdentity | null {
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
    async signOut() { await signOut(auth); },
    async sendPasswordReset(email) {
      try { await sendPasswordResetEmail(auth, email); }
      catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'auth/user-not-found') return;
        throw error;
      }
    },
    async sendVerificationEmail() {
      if (!auth.currentUser) throw { code: 'auth/invalid-credential' };
      await sendEmailVerification(auth.currentUser);
    },
  };
}
