import { StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mascotas</Text>
      <Text style={styles.description}>
        Bienvenido. En esta etapa se prepara la estructura de navegación.
      </Text>
      <Text style={styles.note}>
        El inicio de sesión y el registro se implementarán en la etapa de autenticación.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#243B53',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#486581',
    marginBottom: 12,
  },
  note: {
    fontSize: 13,
    textAlign: 'center',
    color: '#829AB1',
  },
});
