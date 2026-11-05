import { ActionButton, AuthCard, FormMessage } from '../../../../core/ui/auth-card';
import { useAuthActions, useSession } from '../../../../composition/application-provider';
import { useAuthOperation } from '../hooks/use-auth-operation';
import { LoginScreen } from './login-screen';

export function SessionScreen() {
  const session = useSession();
  const auth = useAuthActions();
  const operation = useAuthOperation();
  if (session.status === 'signed-out') return <LoginScreen />;
  if (session.status === 'loading') return <AuthCard title="Un momento" subtitle="Estamos comprobando tu sesión…" />;
  if (session.status === 'needs-verification') return <AuthCard title="Verificá tu correo" subtitle={'Confirmá el correo ' + session.email + ' para continuar.'}>
    <FormMessage message={operation.message} error={operation.isError} />
    <ActionButton title="Ya verifiqué mi correo" busy={operation.busy}
      onPress={() => { if (auth) void operation.run(auth.refreshSession); }} />
    <ActionButton title="Reenviar correo de verificación" secondary busy={operation.busy}
      onPress={() => { if (auth) void operation.run(auth.sendVerificationEmail, 'Solicitamos el correo de verificación. Revisá tu bandeja y spam.'); }} />
    <ActionButton title="Usar otra cuenta" secondary disabled={operation.busy}
      onPress={() => { if (auth) void operation.run(auth.signOut); }} />
  </AuthCard>;
  return <AuthCard title={session.status === 'error' ? 'No pudimos abrir tu cuenta' : 'Mascotas'}
    subtitle={session.status === 'error' ? session.error.message : 'Todavía no está disponible la conexión con tu cuenta.'}>
    <FormMessage message={operation.message} error={operation.isError} />
    {auth && <>
      <ActionButton title="Volver a intentar" busy={operation.busy} onPress={() => { void operation.run(auth.refreshSession); }} />
      <ActionButton title="Cerrar sesión" secondary disabled={operation.busy} onPress={() => { void operation.run(auth.signOut); }} />
    </>}
  </AuthCard>;
}
