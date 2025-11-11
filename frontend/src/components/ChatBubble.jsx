// src/components/ChatBubble.jsx
import React from "react";
import { View, Text } from "react-native";
import { Colors } from "../theme/colors";
import Logo from "./Logo";

export default function ChatBubble({ side = "left", children }) {
  const left = side === "left";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        marginVertical: 6,
      }}
    >
      {left && <Logo size={28} />}
      <View
        style={{
          flexShrink: 1,
          marginLeft: left ? 8 : 0,
          marginRight: left ? 0 : 8,
          maxWidth: "85%",
          alignItems: left ? "flex-start" : "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: left ? "#efe9ff" : Colors.primary,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 16,
            borderBottomLeftRadius: left ? 4 : 16,
            borderBottomRightRadius: left ? 16 : 4,
          }}
        >
          {typeof children === "string" ? (
            <Text
              style={{ color: left ? Colors.text : "#fff", lineHeight: 20 }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      </View>
    </View>
  );
}
