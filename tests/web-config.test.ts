import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readWebFirebaseConfig } from '../src/core/data/firebase/web-firebase-config';
import { FirebaseConfigurationError } from '../src/core/errors/firebase-configuration-error';

const valid = { apiKey: 'test-public-key', authDomain: 'mascotas-5d228.firebaseapp.com', projectId: 'mascotas-5d228', appId: '1:123456:web:test' };
it('web exige configuración explícita y no inventa valores a partir de Android', () => {
  assert.throws(() => readWebFirebaseConfig({}), FirebaseConfigurationError);
  assert.throws(() => readWebFirebaseConfig({ ...valid, appId: '1:123456:android:test' }), FirebaseConfigurationError);
});
it('web impide conectar las mismas pantallas a una base distinta por error', () => {
  assert.throws(() => readWebFirebaseConfig({ ...valid, projectId: 'other-project' }), FirebaseConfigurationError);
  assert.deepEqual(readWebFirebaseConfig(valid), valid);
});
