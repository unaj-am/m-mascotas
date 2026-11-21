import Constants, { ExecutionEnvironment } from 'expo-constants';

export const unsupported = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const startupErrorMessage = 'No encontramos la conexión Firebase en esta instalación. Instalá la nueva versión de desarrollo y volvé a abrir la app.';
