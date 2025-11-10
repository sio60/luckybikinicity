import React from "react";
import { View, Text } from "react-native";
import { Colors } from "../theme/colors";

/**
 * 실제 광고 SDK 연결 전, 자리 표시자.
 * remote-config 의 adUnitId 가 있으면 얌전히 표시.
 */
export default function AdBanner({ adUnitId }) {
  if (!adUnitId) return null;
  return (
    <View
      style={{
        height: 52,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ color: Colors.subText, fontSize: 12 }}>
        Ad banner — {adUnitId}
      </Text>
    </View>
  );
}
