// App.jsx
import React from "react";
import { Platform, StatusBar } from "react-native";
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";

import HomeScreen from "./src/screens/HomeScreen";
import ChatFortuneScreen from "./src/screens/ChatFortuneScreen";
import { Colors } from "./src/theme/colors";


import { API_BASE } from "./src/lib/api";
console.log("App loaded, API_BASE:", API_BASE);


const Stack = createNativeStackNavigator();

const paperTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: Colors.primary },
  fonts: {
    regular: { fontFamily: "BMJUA", fontWeight: "normal" },
    medium: { fontFamily: "BMJUA", fontWeight: "500" },
    light: { fontFamily: "BMJUA", fontWeight: "300" },
    thin: { fontFamily: "BMJUA", fontWeight: "100" },
  },
};

const navTheme = {
  ...NavDefaultTheme,
  dark: false,
  colors: {
    ...NavDefaultTheme.colors,
    background: "#ffffff",
    primary: Colors.primary,
    card: "#ffffff",
    text: "#111111",
    border: "#e9e9ee",
    notification: Colors.primary,
  },
};

export default function App() {
  const [loaded] = useFonts({ BMJUA: require("./assets/BMJUA_ttf.ttf") });
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={
              Platform.OS === "android" ? Colors.primary : undefined
            }
          />
          <NavigationContainer theme={navTheme}>
            <Stack.Navigator
              screenOptions={{
                headerTintColor: "#fff",
                headerStyle: { backgroundColor: Colors.primary },
                headerTitleStyle: { fontFamily: "BMJUA" },
                headerTitleAlign: "center",
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "LuckyBikiniCity" }}
              />
              <Stack.Screen
                name="Fortune"
                component={ChatFortuneScreen}
                options={{ title: "LuckyBikiniCity" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
