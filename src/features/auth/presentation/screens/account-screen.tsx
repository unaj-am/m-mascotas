import { ActionButton, AuthCard, FormMessage } from '../../../../core/ui/auth-card';
import { useAuthActions, useSession } from '../../../../composition/application-provider';
import { useAuthOperation } from '../hooks/use-auth-operation';

export function AccountScreen() {
  const session = useSession();
  const auth = useAuthActions();
  const operation = useAuthOperation();
  const walker = session.status === 'authenticated' && session.role === 'WALKER';
  return <AuthCard title={walker ? 'Mi espacio de paseador' : 'Mi espacio de dueño'}
    subtitle={walker ? 'Tu cuenta está conectada. Desde acá vas a organizar tus paseos y solicitudes.' : 'Tu cuenta está conectada. Desde acá vas a organizar las mascotas y sus paseos.'}>
    <FormMessage message={operation.message} error={operation.isError} />
    <ActionButton title={operation.busy ? 'Cerrando sesión…' : 'Cerrar sesión'} busy={operation.busy}
      disabled={!auth}
      onPress={() => { if (auth) void operation.run(() => auth.signOut()); }} />
  </AuthCard>;
}
