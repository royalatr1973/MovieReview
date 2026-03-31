// EAS_BUILD is set to "true" on Expo's cloud build servers.
// Locally (no node_modules), we skip plugins so EAS CLI can read the config.
// On the cloud, plugins resolve normally because dependencies are installed.
const isEasBuild = process.env.EAS_BUILD === "true";

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
    plugins: isEasBuild
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
