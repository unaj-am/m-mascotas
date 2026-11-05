import { Redirect } from 'expo-router';

export default function IndexRoute() {
  // La autenticación real y la restauración de sesión se implementarán en la etapa 4.
  return <Redirect href="/(auth)" />;
}
