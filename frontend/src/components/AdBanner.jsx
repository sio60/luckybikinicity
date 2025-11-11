// src/components/AdBanner.jsx
import React from "react";
import { View } from "react-native";
import Constants from "expo-constants";

// 지금 앱이 Expo Go에서 돌고 있는지 여부
const isExpoGo = Constants.appOwnership === "expo";

// Expo Go에서는 네이티브 모듈이 없으니까 절대 require 하지 말자
let BannerAd, BannerAdSize, TestIds;

if (!isExpoGo) {
  // ✅ dev client / 실제 빌드에서만 네이티브 모듈 로드
  const googleAds = require("react-native-google-mobile-ads");
  BannerAd = googleAds.BannerAd;
  BannerAdSize = googleAds.BannerAdSize;
  TestIds = googleAds.TestIds;
}

// 실서비스용 배너 ID (나중에 AdMob 콘솔에서 진짜 걸어주면 됨)
const PROD_UNIT_ID = "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx";

export default function AdBanner() {
  // ✅ Expo Go에서는 그냥 아무것도 렌더링하지 않음 (에러도 안 남)
  if (isExpoGo) return null;

  const unitId = __DEV__ ? TestIds.BANNER : PROD_UNIT_ID;

  return (
    <View style={{ width: "100%", alignItems: "center", marginTop: 8 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}
