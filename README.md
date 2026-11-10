# Mascotas

Aplicación para la gestión de mascotas y paseos, con perfiles de dueño y paseador. Desarrollada como trabajo práctico universitario para Android y web.

## Funcionalidades

- Inicio de sesión con correo y contraseña mediante Firebase Authentication.
- Registro de cuentas de dueño o paseador, con creación del perfil en Firestore.
- Recuperación de contraseña y verificación de correo electrónico.
- Acceso a paneles según el rol: dueño (`OWNER`) o paseador (`WALKER`).
- Panel de dueño con resumen de actividad, próximo paseo y consulta de mascotas, paseos y perfil.
- Registro y edición de mascotas, con listado en tiempo real compartido entre Android y web.
- Búsqueda de paseadores disponibles por zona o descripción y envío de solicitudes de paseo.
- Solicitudes compartidas en tiempo real entre dueño y paseador.
- Aceptación de solicitudes por el paseador, con creación del paseo programado.
- Inicio y finalización de paseos, horarios reales, tiempo transcurrido e historial.
- Estados de los paseos actualizados en tiempo real en Android y web para ambos usuarios.
- Seguimiento GPS del paseador, mapa en vivo e historial del recorrido compartidos con la app Kotlin.
- Panel de paseador con disponibilidad, resumen de actividad, solicitudes, agenda y perfil profesional.
- Persistencia y cierre de sesión.
- Validación del perfil y del estado de la cuenta en Firestore.

El proyecto se encuentra en desarrollo. La eliminación de mascotas, la carga de fotos, el rechazo y cancelación de solicitudes, la cancelación de paseos y las notificaciones generales están pendientes de implementación.

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

En el panel de dueño, **Mascotas → Registrar mascota** permite guardar nombre, raza, edad, peso, tamaño, comportamiento, necesidades especiales y observaciones. Nombre, edad y peso son obligatorios. Las mascotas se guardan en `pets` con el `ownerId` de la sesión; el listado escucha los cambios de Firestore. Al usar la misma cuenta y proyecto Firebase en Android y web, los cambios aparecen sin recargar. El alta requiere conexión y se confirma cuando el servidor acepta el guardado.

Cada tarjeta incluye **Editar mascota**, que abre el formulario con sus datos actuales. **Guardar cambios** valida los mismos campos que el alta y actualiza el registro existente; conserva su identificador, dueño, foto y los campos ajenos al formulario. **Cancelar** descarta la edición. El guardado requiere conexión y verifica en una transacción que la mascota siga existiendo, pertenezca a la cuenta autenticada y que su perfil de dueño esté activo. Los cambios se reflejan en el listado en tiempo real, también entre Android y web.

Las reglas de Firestore deben permitir al dueño consultar `users/{uid}`, listar sus mascotas por `ownerId`, crear mascotas con su propio `ownerId` y actualizar los campos de sus propias mascotas sin cambiar el dueño. Los adaptadores no modifican las reglas del proyecto.

**Buscar paseador** abre el directorio de perfiles profesionales disponibles en `walkers` (`available: true`). Tener una cuenta de tipo paseador no crea por sí solo ese perfil. Las tarjetas muestran zona de servicio, descripción, experiencia, capacidad, precio y calificación sin consultar los documentos privados de otros usuarios.

Para solicitar un paseo se seleccionan las mascotas, una fecha futura, el horario local, la duración y las observaciones. El guardado verifica la disponibilidad y capacidad del paseador y la pertenencia de las mascotas. La solicitud se guarda como `PENDING` en `walkRequests`, con la fecha en formato ISO y los nombres necesarios para mostrarla. El dueño la consulta en **Paseos → Solicitudes** y el paseador en **Solicitudes**. Enviar una solicitud todavía no crea un paseo confirmado.

Las reglas deben permitir consultar los perfiles públicos disponibles de `walkers`, crear solicitudes con el `ownerId` autenticado y estado `PENDING`, y consultar las solicitudes únicamente por el dueño o paseador correspondiente. Los listados usan filtros por `ownerId` y `walkerId`. El alta se realiza en una transacción y requiere conexión.

El paseador puede **Aceptar paseo** desde sus solicitudes. Una transacción marca la solicitud como `ACCEPTED` y crea `walks/{requestId}` en estado `SCHEDULED`. La misma solicitud genera un solo paseo; volver a aceptar una solicitud aceptada conserva el paseo existente. La transacción sigue el contrato de la app Kotlin: lee la solicitud y su paseo, conserva la fecha y las observaciones originales y crea los campos `startedAt`, `finishedAt` y `distanceKm` con valor `null`.

En el panel de dueño, **Paseos** ofrece los mismos filtros con contadores que la app Kotlin: **Todas, Pendientes, Rechazadas, Confirmados, En curso, Finalizados y Cancelados**. El listado se divide en **Solicitudes**, **Próximos y en curso** e **Historial**, con fechas descendentes dentro de cada sección. Las solicitudes aceptadas dejan de aparecer en **Solicitudes** y se muestran como paseos confirmados. Su etiqueta cambia en tiempo real: **Confirmado → En curso → Finalizado**, según el estado del paseo. La solicitud conserva `ACCEPTED` como registro de su aceptación.

En **Agenda → Programados**, **Iniciar paseo** solicita los permisos de ubicación, cambia el estado a `IN_PROGRESS`, registra `startedAt` y activa la captura GPS. En **En curso**, **Finalizar paseo** guarda `COMPLETED` y `finishedAt` y detiene el GPS; el paseo queda en **Historial**. Los horarios usan cadenas ISO compatibles con la app nativa. El contador se calcula desde el horario guardado y se recupera al volver a abrir la app.

El dueño abre **Ver seguimiento** desde Inicio o Paseos. Si el paseo todavía está confirmado, la pantalla espera a que comience; durante el paseo muestra la última ubicación y los puntos del recorrido; al finalizar permite **Ver recorrido**. No solicita el GPS del dueño.

El GPS conserva las rutas y los campos de Kotlin: `walks/{id}/tracking/current` y `walks/{id}/locations/{pointId}`, con `latitude`, `longitude`, `accuracy`, `bearing`, `speed` y `recordedAt` en milisegundos. La última ubicación y el punto histórico se guardan en el mismo lote. Solo publica el paseador asignado mientras el paseo está en curso. El filtro descarta precisión peor que 35 m, puntos fuera de orden y movimientos pequeños, con una actualización al menos cada 30 segundos cuando hay señal válida. El mapa utiliza MapLibre y OpenFreeMap sin clave de Google Maps. La línea representa puntos GPS reales; los huecos largos o saltos de señal quedan separados. No realiza ajuste de ruta OSRM ni guarda distancia calculada.

**Android:** requiere una compilación de desarrollo con `expo-location`, `expo-task-manager`, AsyncStorage y WebView. Al iniciar el paseo se comprueba que la ubicación esté activa y se pide ubicación precisa mientras se usa la app, solo si todavía no está concedida. No necesita el permiso «Permitir siempre»: el servicio se inicia con Mascotas visible y muestra una notificación mientras comparte ubicación. Continúa al usar otras aplicaciones y se detiene al finalizar, cerrar sesión o terminar la aplicación desde Android. Si se pierde el seguimiento, **Compartir ubicación** permite reactivarlo con Mascotas abierta en el paseo en curso.

**Web:** consultar el mapa no necesita ubicación local. Para publicar como paseador se requiere HTTPS o localhost, permiso del navegador y mantener la pestaña abierta. El navegador puede suspender el GPS al pasar a segundo plano. El mapa necesita conexión para cargar su estilo y cartografía. Las reglas de Firestore siguen siendo las mismas de la app nativa.

Las reglas deben limitar la aceptación al paseador destinatario y validar conjuntamente la actualización de la solicitud y la creación del paseo. El inicio y la finalización se permiten solo al paseador asignado, con transiciones `SCHEDULED → IN_PROGRESS → COMPLETED`; dueño y paseador consultan sus propios paseos. Estas operaciones requieren conexión y no publican cambios en las reglas del proyecto.

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
| `PetRepository` — `pet-repository.ts` | `PetRepositoryImpl` — `pet-repository-impl.ts` |
| `WalkBookingRepository` — `walk-booking-repository.ts` | `WalkBookingRepositoryImpl` — `walk-booking-repository-impl.ts` |

Los contratos declaran **qué operaciones existen**. Las clases con sufijo `Impl` definen **cómo se ejecutan**, implementando la interfaz y delegando en las fuentes de datos. Los contratos de los módulos pendientes se conservan en el dominio; sus implementaciones se agregarán cuando se desarrollen esas funcionalidades.

El dominio no importa Firebase, React ni la capa de datos. Las pantallas consumen los casos de uso mediante inyección y no acceden directamente a los SDKs ni a las implementaciones de repositorios.

## Pruebas y validación

```bash
npm run check
```

Ejecuta la comprobación de tipos y las pruebas automatizadas.
