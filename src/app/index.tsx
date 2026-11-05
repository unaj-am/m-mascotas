import { Redirect } from 'expo-router';
import { useSession } from '../composition/application-provider';
import { SessionScreen } from '../features/auth/presentation/screens/session-screen';
export default function Index() {
  const session = useSession();
  if (session.status === 'authenticated') return <Redirect href={session.role === 'OWNER' ? '/(owner)/home' : '/(walker)/dashboard'} />;
  return <SessionScreen />;
}
