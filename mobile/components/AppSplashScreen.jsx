import React from "react";
import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="small"
          color="#b88144"
          style={styles.spinner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
  spinner: {
    marginTop: 24,
  },
});
