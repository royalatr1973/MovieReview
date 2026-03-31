const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Config plugin that fixes React Native Gradle plugin's entry file resolution
 * for monorepo builds. The dynamic entryFile resolution produces a path relative
 * to android/app/ that Metro can't resolve from the monorepo root. This replaces
 * it with a static path to our local index.js.
 */
function withMonorepoRoot(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace the dynamic entryFile with our static index.js
    // From android/app/, ../../index.js points to apps/mobile/index.js
    contents = contents.replace(
      /entryFile = file\(\["node".*?\)\.text\.trim\(\)\)/,
      'entryFile = file("../../index.js")'
    );

    // Uncomment and set root to apps/mobile/ (from android/app/, that's ../../)
    contents = contents.replace(
      /\/\/\s*root = file\("\.\.\/\.\.\/"\)/,
      'root = file("../../")'
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withMonorepoRoot;
