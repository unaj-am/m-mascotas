import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarLabel: 'Inicio' }}
      />
      <Tabs.Screen
        name="pets"
        options={{ title: 'Mis mascotas', tabBarLabel: 'Mascotas' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Mi perfil', tabBarLabel: 'Perfil' }}
      />
    </Tabs>
  );
}
