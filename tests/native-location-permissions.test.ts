import { it } from 'node:test';
import assert from 'node:assert/strict';
import { nativeGpsFailure, prepareNativeLocation } from '../src/core/data/location/native-location-permissions';
import type { LocationPermissionResponse } from 'expo-location';

function permission(granted: boolean, accuracy: 'fine' | 'coarse' = 'fine'): LocationPermissionResponse {
  return { granted, status: (granted ? 'granted' : 'denied') as LocationPermissionResponse['status'],
    canAskAgain: true, expires: 'never', android: { accuracy } };
}
function fixture() {
  let current = permission(true), requested = permission(true), services = true, requests = 0;
  const sdk = {
    async hasServicesEnabledAsync() { return services; },
    async getForegroundPermissionsAsync() { return current; },
    async requestForegroundPermissionsAsync() { requests++; return requested; },
    async requestBackgroundPermissionsAsync() { throw new Error('No hay permiso de ubicación en segundo plano en esta instalación'); },
  };
  return { sdk, get requests() { return requests; },
    current(value: LocationPermissionResponse) { current = value; },
    requested(value: LocationPermissionResponse) { requested = value; },
    services(value: boolean) { services = value; } };
}

it('inicia con permiso mientras se usa la app sin pedir Permitir siempre ni repetir permisos concedidos', async () => {
  const f = fixture();
  assert.deepEqual(await prepareNativeLocation(() => f.sdk), { ok: true, value: undefined });
  assert.equal(f.requests, 0);
});

it('pide ubicación en uso cuando falta y continúa al obtenerla', async () => {
  const f = fixture(); f.current(permission(false));
  assert.equal((await prepareNativeLocation(() => f.sdk)).ok, true);
  assert.equal(f.requests, 1);
});

it('distingue permiso rechazado, ubicación aproximada y GPS apagado', async () => {
  const f = fixture(); f.current(permission(false)); f.requested(permission(false));
  const denied = await prepareNativeLocation(() => f.sdk);
  assert.ok(!denied.ok); assert.equal(denied.error.code, 'forbidden'); assert.match(denied.error.message, /mientras usás/);
  f.current(permission(true, 'coarse'));
  const coarse = await prepareNativeLocation(() => f.sdk);
  assert.ok(!coarse.ok); assert.match(coarse.error.message, /precisa/);
  f.services(false);
  const disabled = await prepareNativeLocation(() => f.sdk);
  assert.ok(!disabled.ok); assert.match(disabled.error.message, /Activá la ubicación del teléfono/);
});

it('una excepción del SDK conserva etapa y código sin acusar al usuario de rechazar permisos', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const f = fixture();
  f.sdk.getForegroundPermissionsAsync = async () => { throw { code: 'ERR_PERMISSIONS_REQUEST', message: 'Native failure' }; };
  const result = await prepareNativeLocation(() => f.sdk);
  assert.ok(!result.ok);
  assert.match(result.error.message, /Android no pudo consultar o solicitar/);
  assert.match(result.error.message, /ERR_PERMISSIONS_REQUEST/);
});

it('identifica fallos al consultar los servicios y conserva el diagnóstico en consola', async (t) => {
  const log = t.mock.method(console, 'warn', () => {}), f = fixture();
  f.sdk.hasServicesEnabledAsync = async () => { throw new Error('Location provider failed'); };
  const result = await prepareNativeLocation(() => f.sdk);
  assert.ok(!result.ok); assert.match(result.error.message, /ubicación del teléfono está activa/);
  assert.deepEqual(log.mock.calls[0]?.arguments, ['[GPS:servicios]', 'SIN_CODIGO', 'Location provider failed']);
});

it('maneja instalaciones sin módulo GPS sin lanzar excepciones', async (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal((await prepareNativeLocation(() => null)).ok, false);
  const result = await prepareNativeLocation(() => { throw new Error('Native module unavailable'); });
  assert.ok(!result.ok); assert.match(result.error.message, /instalación de Mascotas/);
});

it('distingue restricciones de inicio en segundo plano de permisos faltantes en el APK', (t) => {
  t.mock.method(console, 'warn', () => {});
  const background = nativeGpsFailure('inicio', { code: 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED' });
  assert.ok(!background.ok); assert.match(background.error.message, /aplicación abierta/);
  const manifest = nativeGpsFailure('inicio', { code: 'ERR_FOREGROUND_SERVICE_PERMISSIONS' });
  assert.ok(!manifest.ok); assert.match(manifest.error.message, /instalación de Mascotas/);
});
