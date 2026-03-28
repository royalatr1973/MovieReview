// EAS_BUILD is set to "true" on Expo's cloud build servers.
// Locally (no node_modules), we skip plugins so EAS CLI can read the config.
// On the cloud, plugins resolve normally because dependencies are installed.
const isEasBuild = process.env.EAS_BUILD === "true";

module.exports = {
  expo: {
    name: "CineReview",
    slug: "cinereview",
    version: "0.1.0",
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
    plugins: isEasBuild
      ? [
          "expo-router",
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
