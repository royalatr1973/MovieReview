const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro can find shared packages
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both the project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Explicitly map workspace packages so Metro finds them
config.resolver.extraNodeModules = {
  '@moviereview/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

// Fix for monorepo Android builds: Gradle passes entry file as a relative path
// from android/app/ (e.g., ../../node_modules/expo-router/entry.js) but Metro
// resolves it from the project root, causing it to go too far up. This custom
// resolver intercepts failed resolutions and tries the monorepo root's node_modules.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the module name looks like a broken relative path to node_modules
  if (moduleName.includes('node_modules/expo-router/entry')) {
    const absolutePath = path.resolve(monorepoRoot, 'node_modules', 'expo-router', 'entry.js');
    return {
      filePath: absolutePath,
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
