const fs = require('fs');
const path = require('path');

const kotlinSnippet = `  ext.getKotlinVersion = {
    if (ext.has("kotlinVersion")) {
      ext.kotlinVersion()
    } else {
      ext.safeExtGet("kotlinVersion", "1.8.10")
    }
  }`;

const kotlinReplacement = `  ext.getKotlinVersion = {
    if (ext.has("kotlinVersion")) {
      def kotlinVer = ext.kotlinVersion
      return kotlinVer instanceof Closure ? kotlinVer() : kotlinVer
    } else {
      ext.safeExtGet("kotlinVersion", "1.8.10")
    }
  }`;

const releaseSnippet = `        release(MavenPublication) {
          from components.release
        }`;

const releaseReplacement = `        release(MavenPublication) {
          def releaseComponent = components.findByName("release")
          if (releaseComponent != null) {
            from releaseComponent
          }
        }`;

const expoPackages = [
  'expo-constants',
  'expo-file-system',
  'expo-font',
  'expo-keep-awake',
];

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    console.warn('Skipping ' + filePath + ' (missing)');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { snippet, replacement } of patches) {
    if (content.includes(snippet)) {
      content = content.replace(snippet, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Patched ' + filePath);
  } else {
    console.log('No changes for ' + filePath);
  }
}

for (const pkg of expoPackages) {
  const gradlePath = path.join(__dirname, '..', 'node_modules', pkg, 'android', 'build.gradle');
  patchFile(gradlePath, [
    { snippet: kotlinSnippet, replacement: kotlinReplacement },
    { snippet: releaseSnippet, replacement: releaseReplacement },
  ]);
}

const pluginGradle = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'ExpoModulesCorePlugin.gradle'
);

const defaultConfigSnippet = `    project.rootProject.ext.expoProvidesDefaultConfig = {
      true
    }`;

const defaultConfigReplacement = `    project.rootProject.ext.expoProvidesDefaultConfig = false`;

patchFile(pluginGradle, [
  { snippet: releaseSnippet, replacement: releaseReplacement },
  { snippet: defaultConfigSnippet, replacement: defaultConfigReplacement },
]);

