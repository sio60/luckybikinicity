// app.config.js
import "dotenv/config";

export default ({ config }) => ({
  ...config,

  name: "JujuPick",
  slug: "frontend",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: false,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },

  ios: { supportsTablet: true },

  android: {
    ...config.android,
    package: "com.yunokio.frontend",
    softwareKeyboardLayoutMode: "resize",
    windowSoftInputMode: "adjustResize",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },

  web: { favicon: "./assets/favicon.png" },

  // ✅ EAS Update 필수 설정
  runtimeVersion: { policy: "appVersion" },
  updates: {
    // 👉 방금 CLI가 알려준 URL 그대로 넣기
    url: "https://u.expo.dev/337197d0-d1e0-42b5-a27e-a97b681b5edc",
  },
  // (권장) EAS projectId도 동일하게 맞춰두기
  extra: {
    ...(config.extra || {}),
    eas: {
      projectId: "337197d0-d1e0-42b5-a27e-a97b681b5edc",
    },
  },

  plugins: [
    ...(config.plugins || []),
    [
      "react-native-google-mobile-ads",
      {
        android_app_id:
          process.env.ANDROID_ADMOB_APP_ID ||
          "ca-app-pub-9291094321982391~1881530672", // 테스트 App ID
      },
    ],
  ],
});
