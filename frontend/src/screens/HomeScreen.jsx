import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../components/Logo";
import PrimaryButton from "../components/PrimaryButton";
import { Colors } from "../theme/colors";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      edges={["top"]}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Logo size={140} />
        <Text
          style={{
            fontFamily: "BMJUA",
            fontSize: 28,
            color: Colors.primary,
            textAlign: "center",
          }}
        >
          JujuPick
        </Text>

        <View style={{ width: "100%", marginTop: 8 }}>
          <PrimaryButton
            title="운세 보러 가기"
            onPress={() => navigation.navigate("Fortune")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
