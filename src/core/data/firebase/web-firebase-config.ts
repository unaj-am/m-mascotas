import { FirebaseConfigurationError } from '../../errors/firebase-configuration-error';
export function readWebFirebaseConfig(input: {
  apiKey?: string | undefined; authDomain?: string | undefined; projectId?: string | undefined; appId?: string | undefined;
}) {
  if (!input.apiKey?.trim() || !input.authDomain?.trim() || !input.projectId?.trim() || !input.appId?.trim()) {
    throw new FirebaseConfigurationError('Falta configurar el acceso web. Completá los valores públicos de Firebase en .env.local y reiniciá el servidor.');
  }
  if (input.projectId !== 'mascotas-5d228') throw new FirebaseConfigurationError('La aplicación web debe usar el mismo proyecto Firebase de Mascotas.');
  if (!/^1:\d+:web:/.test(input.appId)) throw new FirebaseConfigurationError('Usá el appId de una aplicación web de Firebase. El identificador Android no sirve para esta configuración.');
  return { apiKey: input.apiKey, authDomain: input.authDomain, projectId: input.projectId, appId: input.appId };
}
