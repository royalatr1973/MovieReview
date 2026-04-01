// Monorepo entry point for Android native builds.
// Expo/Metro uses the monorepo root as project root when workspaces are detected.
// This file redirects to the actual mobile app entry point.
require('./apps/mobile/index.js');
