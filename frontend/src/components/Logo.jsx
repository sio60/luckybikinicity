import React from "react";
import { Image, View } from "react-native";

export default function Logo({ size = 120 }) {
  return (
    <View style={{ alignItems: "center" }}>
      {/* 프로젝트에 맞는 이미지로 교체하세요 (assets/icon.png 가 있다면 사용) */}
      <Image
        source={require("../../assets/icon.png")}
        style={{ width: size, height: size, borderRadius: 24 }}
        resizeMode="contain"
      />
    </View>
  );
}
