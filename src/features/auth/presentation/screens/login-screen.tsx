import { useState } from 'react';
import { Link } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { ActionButton, AuthCard, FormMessage, formStyles } from '../../../../core/ui/auth-card';
import { useAuthActions } from '../../../../composition/application-provider';
import { useAuthOperation } from '../hooks/use-auth-operation';

export function LoginScreen() {
  const auth = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const operation = useAuthOperation();
  async function submit() {
    if (!auth) return;
    const credentials = { email, password };
    setPassword('');
    await operation.run(() => auth.signIn(credentials));
  }
  return <AuthCard title="Bienvenido" subtitle="Entrá con la cuenta que ya usás en Mascotas.">
    <Text style={formStyles.label}>Correo electrónico</Text>
    <TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail}
      style={formStyles.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
      autoComplete="email" textContentType="emailAddress" editable={!operation.busy} />
    <Text style={formStyles.label}>Contraseña</Text>
    <TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword}
      style={formStyles.input} secureTextEntry autoCapitalize="none" autoCorrect={false}
      autoComplete="current-password" textContentType="password" editable={!operation.busy}
      returnKeyType="go" onSubmitEditing={() => { void submit(); }} />
    <FormMessage message={operation.message} error={operation.isError} />
    <ActionButton title={operation.busy ? 'Ingresando…' : 'Iniciar sesión'} onPress={() => { void submit(); }}
      busy={operation.busy} disabled={!auth || !email.trim() || !password} />
    <Link href="/(auth)/reset-password" style={formStyles.link}>Olvidé mi contraseña</Link>
    <Link href="/(auth)/register" style={formStyles.link}>Crear una cuenta</Link>
  </AuthCard>;
}
