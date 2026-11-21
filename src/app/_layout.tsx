import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApplicationBootstrap } from '../composition/use-application-bootstrap';
import { ApplicationProvider, useSession } from '../composition/application-provider';
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
  const { application, error, unsupported, retry } = useApplicationBootstrap();
  if (unsupported) return <AuthCard title="Abrí la versión de desarrollo" subtitle="Para iniciar sesión con tu cuenta necesitás instalar Mascotas como aplicación. El acceso no está disponible dentro de Expo Go." />;
  if (error) return <AuthCard title="No pudimos iniciar Mascotas" subtitle={error}>
    <ActionButton title="Volver a intentar" onPress={retry} />
  </AuthCard>;
  if (!application) return <AuthCard title="Mascotas" subtitle="Preparando tu sesión…" />;
  return <ApplicationProvider application={application}><WalkGpsCoordinator /><Routes /></ApplicationProvider>;
}
export default function RootLayout() {
  return <SafeAreaProvider><Bootstrap /></SafeAreaProvider>;
}
