# Mascotas

Aplicación para la gestión de mascotas y paseos, con perfiles de dueño y paseador. Desarrollada como trabajo práctico universitario para Android y web.

## Funcionalidades

- Inicio de sesión con correo y contraseña mediante Firebase Authentication.
- Registro de cuentas de dueño o paseador, con creación del perfil en Firestore.
- Recuperación de contraseña y verificación de correo electrónico.
- Acceso a paneles según el rol: dueño (`OWNER`) o paseador (`WALKER`).
- Persistencia y cierre de sesión.
- Validación del perfil y del estado de la cuenta en Firestore.

El proyecto se encuentra en desarrollo. La gestión de mascotas, las solicitudes de paseo, el seguimiento y las notificaciones están pendientes de implementación.

## Tecnologías

- React Native y Expo.
- TypeScript.
- Expo Router.
- Firebase Authentication y Cloud Firestore.
- Zustand.
- React Native Web.

## Requisitos

- Node.js y npm.
- Android Studio, JDK y Android SDK para compilar Android.
- Configuración de Firebase para cada plataforma.

## Instalación

```bash
npm ci
```

### Configuración de Firebase

**Android:** colocar `google-services.json` en la raíz del proyecto. Debe corresponder al proyecto Firebase configurado y al paquete `com.app.mascotas`.

**Web:** crear `.env.local` a partir de `.env.example` y completar los valores públicos de la aplicación web registrada en Firebase:

```dotenv
EXPO_PUBLIC_FIREBASE_WEB_API_KEY=
EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_WEB_APP_ID=
```

El acceso utiliza el proyecto `mascotas-5d228`. Cada cuenta debe tener un documento `users/{uid}` con rol `OWNER` o `WALKER`. Las cuentas con `active: false` no pueden acceder a los paneles.

El registro solicita nombre, apellido, teléfono, correo, contraseña y tipo de cuenta. Después de crear el perfil envía el correo de verificación; el acceso al panel requiere confirmar esa dirección. Si falla el envío, la cuenta se conserva y permite reenviar el correo.

Las reglas de Firestore deben permitir a cada cuenta nueva consultar y crear su propio documento `users/{uid}` antes de verificar el correo, validando los campos y el rol. Las operaciones de negocio pueden exigir el correo verificado. El registro no modifica las reglas del proyecto ni habilita Cloud Functions.

## Ejecución

### Android

Generar e instalar la versión de desarrollo en un dispositivo o emulador:

```bash
npm run android
```

Para iniciar Metro con una versión de desarrollo ya instalada:

```bash
npm start
```

También se puede utilizar un túnel:

```bash
npm run start:tunnel
```

La aplicación requiere una compilación de desarrollo con los módulos nativos de Firebase; no es compatible con Expo Go.

### Web

```bash
npm run web
```

Generar la versión web en `dist/web`:

```bash
npm run build:web
```

## Arquitectura

El código se organiza en módulos por funcionalidad, separados en tres capas:

- **Domain:** entidades, contratos de repositorios y casos de uso.
- **Data:** fuentes de datos, adaptadores Firebase e implementaciones de repositorios.
- **Presentation:** pantallas, hooks y estado de la interfaz.

```text
src/
├── app/                Rutas y navegación
├── composition/        Construcción e inyección de dependencias
├── core/               Configuración y componentes comunes
├── features/
│   ├── auth/
│   ├── users/
│   ├── pets/
│   ├── walkers/
│   ├── walks/
│   ├── tracking/
│   └── notifications/
└── shared/             Tipos compartidos
```

## Pruebas y validación

```bash
npm run check
```

Ejecuta la comprobación de tipos y las pruebas automatizadas.
