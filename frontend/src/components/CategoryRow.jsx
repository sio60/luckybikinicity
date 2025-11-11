import React from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { Colors } from "../theme/colors";

const CATS = [
  { key: "today", label: "오늘의 운세" },
  { key: "name", label: "이름으로 보는 나는?" },
  { key: "compat", label: "커플 궁합" },
  { key: "saju", label: "사주" },
];

export default function CategoryRow({ value, onChange, cats = CATS }) {
  return (
    <View style={{ marginTop: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
      >
        {cats.map((c) => {
          const selected = value === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange?.(c.key)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: selected ? Colors.primary : "#EEE9FF",
              }}
            >
              <Text
                style={{
                  color: selected ? "#fff" : Colors.text,
                  fontWeight: "700",
                }}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
