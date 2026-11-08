import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FirebaseConfigurationError } from '../core/errors/firebase-configuration-error';
import { ApplicationProvider, useSession } from '../composition/application-provider';
import type { Application } from '../composition/create-application';
import { ActionButton, AuthCard } from '../core/ui/auth-card';
import { WalkGpsCoordinator } from '../features/tracking/presentation/components/walk-gps-coordinator';

function Routes() {
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={!authenticated}>
      <Stack.Screen name="(auth)/sign-in" />
      <Stack.Screen name="(auth)/reset-password" />
      <Stack.Screen name="(auth)/register" />
    </Stack.Protected>
    <Stack.Protected guard={authenticated && session.role === 'OWNER'}><Stack.Screen name="(owner)/home" /></Stack.Protected>
    <Stack.Protected guard={authenticated && session.role === 'WALKER'}><Stack.Screen name="(walker)/dashboard" /></Stack.Protected>
  </Stack>;
}
function Bootstrap() {
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const unsupported = Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  useEffect(() => {
    if (unsupported) return;
    let active = true;
    setError(null);
    import('../composition/create-platform-application')
      .then(({ createPlatformApplication }) => { if (active) setApplication(createPlatformApplication()); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof FirebaseConfigurationError ? cause.message : Platform.OS === 'web' ? 'No pudimos iniciar la aplicación web. Recargá la página y volvé a intentar.' : 'No encontramos la conexión Firebase en esta instalación. Instalá la nueva versión de desarrollo y volvé a abrir la app.'); });
    return () => { active = false; };
  }, [attempt, unsupported]);
  if (unsupported) return <AuthCard title="Abrí la versión de desarrollo" subtitle="Para iniciar sesión con tu cuenta necesitás instalar Mascotas como aplicación. El acceso no está disponible dentro de Expo Go." />;
  if (error) return <AuthCard title="No pudimos iniciar Mascotas" subtitle={error}>
    <ActionButton title="Volver a intentar" onPress={() => setAttempt((value) => value + 1)} />
  </AuthCard>;
  if (!application) return <AuthCard title="Mascotas" subtitle="Preparando tu sesión…" />;
  return <ApplicationProvider application={application}><WalkGpsCoordinator /><Routes /></ApplicationProvider>;
}
export default function RootLayout() {
  return <SafeAreaProvider><Bootstrap /></SafeAreaProvider>;
}
