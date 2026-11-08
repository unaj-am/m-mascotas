import { it } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, getApp, getApps } from 'firebase/app';
import { createPlatformApplication } from '../src/composition/create-platform-application.web';
import { createWebWalkLocationSource } from '../src/core/data/firebase/web-walk-location-source';

it('el arranque web inicializa Firebase antes del GPS y permite reintentar sin duplicar la app', async () => {
  const values = {
    EXPO_PUBLIC_FIREBASE_WEB_API_KEY: 'test-public-key',
    EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN: 'mascotas-5d228.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID: 'mascotas-5d228',
    EXPO_PUBLIC_FIREBASE_WEB_APP_ID: '1:123456:web:test',
  };
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  assert.equal(getApps().length, 0);
  try {
    Object.assign(process.env, values);
    // Reproduce la causa original con el SDK real, sin conectar a servicios remotos.
    assert.throws(() => createWebWalkLocationSource(), { code: 'app/no-app' });
    const application = createPlatformApplication();
    assert.ok(application.auth);
    assert.ok(application.tracking);
    assert.ok(application.pets);
    assert.ok(application.booking);
    assert.equal(getApp().options.projectId, 'mascotas-5d228');
    const initialized = getApp();
    assert.ok(createPlatformApplication().tracking);
    assert.equal(getApp(), initialized);
    assert.equal(getApps().length, 1);
  } finally {
    await Promise.all(getApps().map((app) => deleteApp(app)));
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
