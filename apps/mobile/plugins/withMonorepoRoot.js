const { withAppBuildGradle } = require("expo/config-plugins");
const path = require("path");

/**
 * Config plugin that fixes React Native Gradle plugin's root directory
 * for monorepo builds. Without this, the entry file path resolves incorrectly
 * because Gradle assumes node_modules is in apps/mobile/ but it's hoisted
 * to the monorepo root.
 */
function withMonorepoRoot(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Find the react { block and add/replace root and entryFile
    // The root should point from android/app/ to the monorepo root
    // entryFile should point to our local index.js
    if (contents.includes("react {")) {
      config.modResults.contents = contents.replace(
        /react \{/,
        'react {\n    root = file("../../../..")\n    entryFile = file("../../index.js")'
      );
    }

    return config;
  });
}

module.exports = withMonorepoRoot;
