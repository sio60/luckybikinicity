import React from "react";
import { Pressable, Text } from "react-native";
import { Colors } from "../theme/colors";

export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: disabled
          ? "#cfcaf8"
          : pressed
          ? Colors.primaryDark
          : Colors.primary,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
      })}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
        {title}
      </Text>
    </Pressable>
  );
}
