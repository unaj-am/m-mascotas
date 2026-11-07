# Mascotas

Aplicación para la gestión de mascotas y paseos, con perfiles de dueño y paseador. Desarrollada como trabajo práctico universitario para Android y web.

## Funcionalidades

- Inicio de sesión con correo y contraseña mediante Firebase Authentication.
- Registro de cuentas de dueño o paseador, con creación del perfil en Firestore.
- Recuperación de contraseña y verificación de correo electrónico.
- Acceso a paneles según el rol: dueño (`OWNER`) o paseador (`WALKER`).
- Panel de dueño con resumen de actividad, próximo paseo y consulta de mascotas, paseos y perfil.
- Panel de paseador con disponibilidad, resumen de actividad, solicitudes, agenda y perfil profesional.
- Persistencia y cierre de sesión.
- Validación del perfil y del estado de la cuenta en Firestore.

El proyecto se encuentra en desarrollo. El alta y edición de mascotas, la búsqueda de paseadores, la creación y resolución de solicitudes, el inicio y finalización de paseos, el seguimiento y las notificaciones están pendientes de implementación.

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

El panel de paseador consulta sus solicitudes y paseos por `walkerId`. El cambio de disponibilidad requiere un perfil profesional existente en `walkers/{uid}` y actualiza únicamente su campo `available`. La creación y edición de ese perfil todavía no están implementadas.

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

El proyecto utiliza una arquitectura por capas. `core` concentra el dominio y el acceso a datos; `features` organiza la presentación por funcionalidad.

```text
src/
├── app/                Rutas y navegación
├── composition/        Construcción e inyección de dependencias
├── core/
│   ├── domain/
│   │   ├── entities/       Entidades y modelos del negocio
│   │   ├── repositories/   Contratos (interfaces) de repositorios
│   │   └── use-cases/      Casos de uso y reglas del negocio
│   ├── data/
│   │   ├── datasources/    Fuentes de datos y coordinación
│   │   ├── firebase/       Adaptadores Android/web y configuración Firebase
│   │   ├── mappers/        Conversión y validación de datos
│   │   └── repositories/   Implementaciones de los contratos
│   ├── errors/             Errores compartidos de configuración
│   └── ui/                 Componentes visuales comunes
├── features/
│   ├── auth/
│   ├── home/
│   ├── users/
│   ├── pets/
│   ├── walkers/
│   ├── walks/
│   ├── tracking/
│   └── notifications/
└── shared/             Tipos compartidos
```

Cada módulo de `features` contiene su capa `presentation`, con pantallas, componentes, hooks y estado de interfaz. La construcción e inyección de dependencias se realiza en `composition`.

### Contratos e implementaciones de repositorios

| Contrato en `core/domain/repositories` | Implementación en `core/data/repositories` |
|---|---|
| `AuthRepository` — `auth-repository.ts` | `AuthRepositoryImpl` — `auth-repository-impl.ts` |
| `OwnerDashboardRepository` — `owner-dashboard-repository.ts` | `OwnerDashboardRepositoryImpl` — `owner-dashboard-repository-impl.ts` |
| `WalkerDashboardRepository` — `walker-dashboard-repository.ts` | `WalkerDashboardRepositoryImpl` — `walker-dashboard-repository-impl.ts` |

Los contratos declaran **qué operaciones existen**. Las clases con sufijo `Impl` definen **cómo se ejecutan**, implementando la interfaz y delegando en las fuentes de datos. Los contratos de los módulos pendientes se conservan en el dominio; sus implementaciones se agregarán cuando se desarrollen esas funcionalidades.

El dominio no importa Firebase, React ni la capa de datos. Las pantallas consumen los casos de uso mediante inyección y no acceden directamente a los SDKs ni a las implementaciones de repositorios.

## Pruebas y validación

```bash
npm run check
```

Ejecuta la comprobación de tipos y las pruebas automatizadas.
