import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { ActionButton, AuthCard, FormMessage, formStyles } from '../../../../core/ui/auth-card';
import { useAuthActions } from '../../../../composition/application-provider';
import { useAuthOperation } from '../hooks/use-auth-operation';

export function ResetPasswordScreen() {
  const auth = useAuthActions();
  const [email, setEmail] = useState('');
  const operation = useAuthOperation();
  return <AuthCard title="Recuperá tu acceso" subtitle="Ingresá tu correo para solicitar un enlace de recuperación.">
    <Text style={formStyles.label}>Correo electrónico</Text>
    <TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail}
      style={formStyles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
      autoComplete="email" editable={!operation.busy} />
    <FormMessage message={operation.message} error={operation.isError} />
    <ActionButton title="Enviar enlace" disabled={!auth || !email.trim()} busy={operation.busy}
      onPress={() => { if (auth) void operation.run(() => auth.sendPasswordReset(email), 'Si el correo corresponde a una cuenta, recibirás un enlace. Revisá también la carpeta de spam.'); }} />
    <Link href="/" style={formStyles.link}>Volver a iniciar sesión</Link>
  </AuthCard>;
}
