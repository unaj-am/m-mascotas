const fs = require('node:fs');
const path = require('node:path');
const { withMainApplication, withDangerousMod } = require('expo/config-plugins');

module.exports = function withFirebaseTurboPackages(config) {
  config = withMainApplication(config, (result) => {
    const original = 'PackageList(this).packages';
    const replacement = `${original}.map { FirebaseTurboPackage.wrap(it) }`;
    if (!result.modResults.contents.includes(replacement)) {
      if (!result.modResults.contents.includes(original)) {
        throw new Error('No se encontró PackageList en MainApplication para registrar Firebase.');
      }
      result.modResults.contents = result.modResults.contents.replace(original, replacement);
    }
    return result;
  });
  return withDangerousMod(config, ['android', async (result) => {
    const packageName = result.android.package;
    const directory = path.join(result.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'));
    fs.mkdirSync(directory, { recursive: true });
    const source = fs.readFileSync(path.join(__dirname, 'android/FirebaseTurboPackage.kt'), 'utf8')
      .replace('package com.app.mascotas', `package ${packageName}`);
    fs.writeFileSync(path.join(directory, 'FirebaseTurboPackage.kt'), source);
    return result;
  }]);
};
