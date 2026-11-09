import { failure, success, type Result } from '../../../shared/types/result';

type LocationPermissions = Pick<typeof import('expo-location'),
  'hasServicesEnabledAsync' | 'getForegroundPermissionsAsync' | 'requestForegroundPermissionsAsync'>;
type GpsStage = 'módulo' | 'servicios' | 'permisos' | 'inicio';

export function nativeGpsFailure(stage: GpsStage, error: unknown): Result<never> {
  const detail = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof detail.code === 'string' && /^[A-Z_0-9]{1,80}$/.test(detail.code) ? detail.code : null;
  console.warn(`[GPS:${stage}]`, code ?? 'SIN_CODIGO', detail.message ?? String(error));
  if (code === 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED') {
    return failure('unavailable', 'Volvé a Mascotas y tocá Compartir ubicación con la aplicación abierta para iniciar el GPS.');
  }
  if (code === 'ERR_NO_PERMISSION_IN_MANIFEST' || code === 'ERR_FOREGROUND_SERVICE_PERMISSIONS' || stage === 'módulo') {
    return failure('unavailable', 'La instalación de Mascotas no tiene disponible el servicio GPS. Instalá Mascotas-gps-arm64.apk y volvé a abrirla.');
  }
  const messages: Record<GpsStage, string> = {
    módulo: '',
    servicios: 'Android no pudo consultar si la ubicación del teléfono está activa.',
    permisos: 'Android no pudo consultar o solicitar el permiso de ubicación de Mascotas.',
    inicio: 'Android no pudo iniciar el servicio de ubicación del paseo. Volvé a intentar Compartir ubicación con Mascotas abierta.',
  };
  return failure('unavailable', `${messages[stage]}${code ? ` (${code})` : ''}`);
}

export async function prepareNativeLocation(getLocation: () => LocationPermissions | null): Promise<Result<void>> {
  let stage: GpsStage = 'módulo';
  try {
    const location = getLocation();
    if (!location) return failure('unavailable', 'Instalá la nueva versión de Mascotas para habilitar el GPS.');
    stage = 'servicios';
    if (!await location.hasServicesEnabledAsync()) return failure('unavailable', 'Activá la ubicación del teléfono para iniciar el paseo.');
    stage = 'permisos';
    let foreground = await location.getForegroundPermissionsAsync();
    if (!foreground.granted) foreground = await location.requestForegroundPermissionsAsync();
    if (!foreground.granted) return failure('forbidden', 'Permití el acceso a tu ubicación mientras usás Mascotas para iniciar el paseo.');
    if (foreground.android?.accuracy === 'coarse') return failure('forbidden', 'Activá «Ubicación precisa» en los permisos de Mascotas para registrar el recorrido.');
    // El servicio con notificación se inicia desde la app visible, igual que en Kotlin.
    // Expo Location permite este modo con permiso de uso, sin ACCESS_BACKGROUND_LOCATION.
    return success(undefined);
  } catch (error) { return nativeGpsFailure(stage, error); }
}
