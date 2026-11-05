import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AuthCard({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.brand}>Mascotas</Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function ActionButton({ title, onPress, busy = false, disabled = false, secondary = false }: {
  title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }}
    disabled={busy || disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled || busy) && styles.dim]}>
    {busy && <ActivityIndicator color={secondary ? '#174d3c' : '#fff'} />}
    <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>;
}
export function FormMessage({ message, error = false }: { message: string | null; error?: boolean }) {
  return message ? <Text accessibilityRole={error ? 'alert' : 'text'} accessibilityLiveRegion="polite"
    style={[styles.notice, error && styles.error]}>{message}</Text> : null;
}
export const formStyles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', color: '#263e34', marginTop: 14 },
  input: { backgroundColor: '#fff', color: '#142e23', borderColor: '#a8bdb0', borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 17, marginTop: 6, marginBottom: 8, minHeight: 52 },
  link: { color: '#174d3c', paddingVertical: 18, textAlign: 'center', fontSize: 16, fontWeight: '600' },
});
const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: '#f3f8f4' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { color: '#174d3c', fontSize: 22, fontWeight: '700', marginBottom: 32 },
  title: { fontSize: 30, fontWeight: '700', color: '#153e2e', marginBottom: 10 },
  subtitle: { fontSize: 17, lineHeight: 25, color: '#4b6054', marginBottom: 18 },
  button: { minHeight: 52, backgroundColor: '#174d3c', borderRadius: 12, padding: 15, marginTop: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  secondary: { backgroundColor: '#e1ece4' }, dim: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, secondaryText: { color: '#174d3c' },
  notice: { fontSize: 15, lineHeight: 22, color: '#23563c', marginTop: 12 },
  error: { color: '#a32828' },
});
