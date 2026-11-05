const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
module.exports = function withWindowsCmake(config) {
  if (process.platform !== 'win32') return config;
  config = withGradleProperties(config, (result) => {
    const key = 'expo.android.cmakeObjectPathMax';
    result.modResults = result.modResults.filter((entry) => entry.type !== 'property' || entry.key !== key);
    result.modResults.push({ type: 'property', key, value: '240' });
    return result;
  });
  return withAppBuildGradle(config, (result) => {
    const marker = '// Mascotas: Windows CMake object paths';
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += `\n${marker}\nandroid {\n    defaultConfig {\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_OBJECT_PATH_MAX=250"\n            }\n        }\n    }\n    externalNativeBuild {\n        cmake {\n            buildStagingDirectory new File(System.getenv('TEMP'), 'mm-cxx')\n        }\n    }\n}\n`;
    }
    return result;
  });
};
