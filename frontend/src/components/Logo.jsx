// src/components/Logo.jsx
import React from "react";
import { Image, View } from "react-native";

export default function Logo({ size = 120, rounded = false }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Image
        source={require("../../assets/icon.png")}
        style={{
          width: size,
          height: size,
          // 기본은 원(둥근) 제거. 필요 시 rounded={true}로 원형 표시 가능.
          borderRadius: rounded ? Math.round(size / 2) : 0,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
