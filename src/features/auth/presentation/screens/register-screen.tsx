import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, AuthCard, FormMessage, formStyles } from '../../../../core/ui/auth-card';
import type { UserRole } from '../../../../core/domain/entities/user-role';
import { useRegistrationForm } from '../hooks/use-registration-form';
import { SessionScreen } from './session-screen';

export function RegisterScreen() {
  const router = useRouter();
  const { canSubmit, session, operation, form, receipt, editable, update, submit } = useRegistrationForm();
  if (receipt) return <AuthCard title="Cuenta creada" subtitle={receipt.verificationEmailSent
    ? `Te enviamos un correo a ${receipt.email}. Verificá tu cuenta para poder ingresar.`
    : 'La cuenta y el perfil se guardaron, pero no pudimos enviar el correo de verificación. Podés reenviarlo desde la siguiente pantalla.'}>
    <ActionButton title="Continuar con la verificación" onPress={() => router.replace('/')} />
  </AuthCard>;
  if (session.status !== 'signed-out' && !operation.busy && !operation.message) return <SessionScreen />;

  return <AuthCard title="Crear una cuenta" subtitle="Completá tus datos y elegí cómo querés usar Mascotas.">
    <Text style={formStyles.label}>Nombre</Text>
    <TextInput accessibilityLabel="Nombre" style={formStyles.input} value={form.name}
      onChangeText={(value) => update('name', value)} autoCapitalize="words" autoComplete="given-name"
      maxLength={80} editable={editable} />
    <Text style={formStyles.label}>Apellido</Text>
    <TextInput accessibilityLabel="Apellido" style={formStyles.input} value={form.lastName}
      onChangeText={(value) => update('lastName', value)} autoCapitalize="words" autoComplete="family-name"
      maxLength={80} editable={editable} />
    <Text style={formStyles.label}>Teléfono</Text>
    <TextInput accessibilityLabel="Teléfono" style={formStyles.input} value={form.phone}
      onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" autoComplete="tel"
      maxLength={30} editable={editable} />
    <Text style={formStyles.label}>Correo electrónico</Text>
    <TextInput accessibilityLabel="Correo electrónico" style={formStyles.input} value={form.email}
      onChangeText={(value) => update('email', value)} keyboardType="email-address" autoComplete="email"
      autoCapitalize="none" autoCorrect={false} maxLength={254} editable={editable} />
    <Text style={formStyles.label}>Quiero registrarme como</Text>
    <View style={styles.roles} accessibilityRole="radiogroup" accessibilityLabel="Tipo de cuenta">
      {(['OWNER', 'WALKER'] as const).map((role: UserRole) => <Pressable key={role}
        accessibilityRole="radio" accessibilityLabel={role === 'OWNER' ? 'Dueño' : 'Paseador'}
        accessibilityState={{ checked: form.role === role, disabled: !editable }} disabled={!editable}
        onPress={() => update('role', role)} style={[styles.role, form.role === role && styles.selected]}>
        <Text style={[styles.roleText, form.role === role && styles.selectedText]}>{role === 'OWNER' ? 'Dueño' : 'Paseador'}</Text>
      </Pressable>)}
    </View>
    <Text style={formStyles.label}>Contraseña (mínimo 6 caracteres)</Text>
    <TextInput accessibilityLabel="Contraseña" style={formStyles.input} value={form.password}
      onChangeText={(value) => update('password', value)} secureTextEntry autoComplete="new-password"
      autoCapitalize="none" autoCorrect={false} maxLength={128} editable={editable} />
    <Text style={formStyles.label}>Confirmar contraseña</Text>
    <TextInput accessibilityLabel="Confirmar contraseña" style={formStyles.input} value={form.confirmPassword}
      onChangeText={(value) => update('confirmPassword', value)} secureTextEntry autoComplete="new-password"
      autoCapitalize="none" autoCorrect={false} maxLength={128} editable={editable}
      returnKeyType="go" onSubmitEditing={() => { void submit(); }} />
    <FormMessage message={operation.message} error={operation.isError} />
    <ActionButton title={operation.busy ? 'Creando cuenta…' : 'Crear cuenta'} busy={operation.busy}
      disabled={!canSubmit} onPress={() => { void submit(); }} />
    <ActionButton title="Volver al ingreso" secondary disabled={operation.busy} onPress={() => router.replace('/')} />
  </AuthCard>;
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', gap: 12, marginTop: 8 },
  role: { flex: 1, borderWidth: 1, borderColor: '#a8bdb0', borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: '#174d3c', borderColor: '#174d3c' },
  roleText: { color: '#174d3c', fontSize: 16, fontWeight: '600' },
  selectedText: { color: '#fff' },
});
