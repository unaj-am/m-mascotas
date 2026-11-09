const {
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const stagingMarker = '// Mascotas: Windows native build staging';
const stagingEndMarker = '// End Mascotas: Windows native build staging';
const stagingGradle = `${stagingMarker}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
    // Keep CMake's Prefab files and object files below Windows' path limit.
    // Each checkout and module gets its own directory to avoid cache collisions.
    def checkoutId = Integer.toHexString(rootDir.canonicalPath.hashCode())
    subprojects { nativeProject ->
        nativeProject.plugins.withId('com.android.base') {
            def moduleId = nativeProject.path.replace(':', '_')
            nativeProject.extensions.getByName('android').externalNativeBuild.cmake {
                buildStagingDirectory new File(System.getProperty('java.io.tmpdir'), "mm-cxx/$checkoutId/$moduleId")
            }
        }
    }
}
${stagingEndMarker}
`;

module.exports = function withWindowsCmake(config) {
  if (process.platform !== 'win32') return config;
  config = withGradleProperties(config, (result) => {
    const properties = {
      'expo.android.cmakeObjectPathMax': '240',
      'android.cmakeVersion': '3.31.6',
    };
    result.modResults = result.modResults.filter(
      (entry) => entry.type !== 'property' || !(entry.key in properties),
    );
    for (const [key, value] of Object.entries(properties)) {
      result.modResults.push({ type: 'property', key, value });
    }
    return result;
  });
  config = withAppBuildGradle(config, (result) => {
    // Remove the previous app-only workaround; native libraries need it too.
    const marker = '// Mascotas: Windows CMake object paths';
    const legacyBlock = `${marker}\nandroid {\n    defaultConfig {\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_OBJECT_PATH_MAX=250"\n            }\n        }\n    }\n    externalNativeBuild {\n        cmake {\n            buildStagingDirectory new File(System.getenv('TEMP'), 'mm-cxx')\n        }\n    }\n}\n`;
    result.modResults.contents = result.modResults.contents
      .replace(/\r\n/g, '\n')
      .replace(legacyBlock, '');
    return result;
  });
  return withProjectBuildGradle(config, (result) => {
    let contents = result.modResults.contents.replace(/\r\n/g, '\n');
    const start = contents.indexOf(stagingMarker);
    if (start !== -1) {
      const end = contents.indexOf(stagingEndMarker, start);
      if (end === -1) throw new Error('Incomplete Windows native build staging block.');
      contents = contents.slice(0, start) + contents.slice(end + stagingEndMarker.length);
    }
    // React's root plugin can evaluate :app immediately, so register this first.
    const anchor = 'apply plugin: "expo-root-project"';
    if (!contents.includes(anchor)) throw new Error('Expo root plugin not found in build.gradle.');
    result.modResults.contents = contents.replace(anchor, `${stagingGradle}\n${anchor}`).trimEnd() + '\n';
    return result;
  });
};
