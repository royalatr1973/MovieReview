// Check if node_modules exist (plugins need dependencies installed).
// During EAS CLI config reads (before install), we skip plugins.
// During local builds (expo run:android) and EAS cloud builds, plugins load normally.
const fs = require("fs");
const path = require("path");
const hasNodeModules = fs.existsSync(path.join(__dirname, "node_modules")) ||
  fs.existsSync(path.join(__dirname, "..", "..", "node_modules", "expo-router"));

module.exports = {
  expo: {
    name: "CineReview",
    slug: "cinereview",
    version: "0.1.0",
    sdkVersion: "52.0.0",
    owner: "royalatr",
    orientation: "portrait",
    scheme: "cinereview",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cinereview.app",
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "CineReview uses your location to detect cinema visits and suggest movies for review.",
        NSLocationWhenInUseUsageDescription:
          "CineReview uses your location to find nearby cinemas.",
        NSLocationAlwaysUsageDescription:
          "CineReview monitors cinema visits in the background to prompt you for reviews.",
        UIBackgroundModes: ["location", "fetch"],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#1a1a2e",
      },
      package: "com.cinereview.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
      ],
    },
    extra: {
      eas: {
        projectId: "8302c0a4-eb30-4e39-ad46-992a6893b1f8",
      },
    },
    updates: {
      enabled: false,
    },
    plugins: hasNodeModules
      ? [
          "expo-router",
          [
            "expo-build-properties",
            {
              android: {
                kotlinVersion: "1.9.25",
              },
            },
          ],
          [
            "expo-location",
            {
              locationAlwaysAndWhenInUsePermission:
                "CineReview uses your location to detect cinema visits and prompt reviews.",
              isAndroidBackgroundLocationEnabled: true,
            },
          ],
          [
            "expo-notifications",
            {
              color: "#e94560",
            },
          ],
        ]
      : [],
  },
};
