// app.config.js
import "dotenv/config";

export default ({ config }) => ({
  // 기존 config(expo 설정)를 먼저 펼치고
  ...config,

  // 여기서부터는 네가 app.json에 넣어둔 값들 다시 명시
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

  ios: {
    supportsTablet: true,
  },

  android: {
    softwareKeyboardLayoutMode: "resize",
    package: "com.yunokio.frontend",
    windowSoftInputMode: "adjustResize",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },

  web: {
    favicon: "./assets/favicon.png",
  },

  runtimeVersion: {
    policy: "appVersion",
  },

  updates: {
    url: "https://u.expo.dev/5aa4a8fd-07f6-4b64-9129-82797b9243d7",
  },

  extra: {
    eas: {
      projectId: "5aa4a8fd-07f6-4b64-9129-82797b9243d7",
    },
  },

  plugins: [
    ...(config.plugins || []),

    // ✅ AdMob 플러그인 + 앱 ID
    [
      "react-native-google-mobile-ads",
      {
        android_app_id:
          process.env.ANDROID_ADMOB_APP_ID ||
          "ca-app-pub-3940256099942544~3347511713", // 테스트 App ID
      },
    ],
  ],
});
