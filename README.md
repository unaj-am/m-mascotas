
## Ejecución

### Ícono de Mascotas

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

Si necesitás limpiar la caché de Metro, ejecutá `npm run start:tunnel -- --clear`. Mantené la terminal abierta mientras usás la versión de desarrollo.

Para abrir una versión ya instalada con el celular conectado por USB y la depuración USB activada:

```bash
npm run android:usb
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
