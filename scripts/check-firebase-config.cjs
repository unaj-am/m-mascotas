const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
const platform = process.argv[2];
const projectId = 'mascotas-5d228';
function check(condition, message) { if (!condition) throw new Error(message); }
try {
  if (platform === 'android') {
    const file = config.android.googleServicesFile;
    check(fs.existsSync(file), 'Falta google-services.json del proyecto Firebase existente.');
    const google = JSON.parse(fs.readFileSync(file, 'utf8'));
    check(google.project_info?.project_id === projectId, 'El archivo Android pertenece a otro proyecto Firebase.');
    check(google.client?.some((client) => client.client_info?.android_client_info?.package_name === config.android.package),
      'El identificador Android no coincide con google-services.json.');
  } else if (platform === 'web') {
    if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
    for (const name of ['API_KEY','AUTH_DOMAIN','PROJECT_ID','APP_ID']) {
      check(process.env['EXPO_PUBLIC_FIREBASE_WEB_' + name]?.trim(), 'Falta EXPO_PUBLIC_FIREBASE_WEB_' + name + ' en .env.local.');
    }
    check(process.env.EXPO_PUBLIC_FIREBASE_WEB_PROJECT_ID === projectId, 'La web debe usar el proyecto Firebase existente.');
    check(/^1:[0-9]+:web:/.test(process.env.EXPO_PUBLIC_FIREBASE_WEB_APP_ID), 'Falta el appId de una aplicación web registrada en Firebase.');
  } else throw new Error('Indicá android o web.');
  console.log('Configuración Firebase de ' + platform + ' válida para ' + projectId + '.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
