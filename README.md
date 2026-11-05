# Mascotas

Aplicación móvil desarrollada con Expo, React Native y TypeScript.

## Arquitectura

El proyecto combina Clean Architecture y organización por funcionalidades (Feature-Based Architecture).

- `src/app`: rutas y layouts de Expo Router. No contiene reglas de negocio.
- `src/features`: funcionalidades de la aplicación, separadas en `presentation`, `domain` y `data`.
- `src/core`: infraestructura transversal, configuración, Firebase y persistencia local.
- `src/shared`: componentes, hooks, tipos y constantes compartidos.

## Navegación

Expo Router administra la navegación mediante rutas basadas en archivos:

- `src/app/(auth)`: flujos de autenticación.
- `src/app/(app)`: área autenticada.
- `src/app/(app)/(tabs)`: navegación principal por pestañas.

La pantalla inicial redirige al grupo de autenticación. La restauración de sesión y la protección de rutas se implementarán junto con Firebase Auth en la etapa 4.

## Comandos

```bash
npm install
npm run start
npm run android
npm run ios
npm run typecheck
```

## Estado

La estructura y navegación base están preparadas. Firebase, Zustand, SQLite, cámara, ubicación, mapas y las funcionalidades del dominio se incorporarán en sus respectivas etapas, verificando compatibilidad con la versión de Expo instalada.
