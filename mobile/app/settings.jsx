import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAuthSession } from "../context/AuthSessionContext";
import SettingsPreferences from "../components/profile/SettingsPreferences";
import SettingsAccountActions from "../components/profile/SettingsAccountActions";
import { settingsText } from "../components/profile/settingsText";
import appConfig from "../app.json";
import SettingsProfileEditor from "../components/profile/SettingsProfileEditor";
import { displayName } from "../shared/displayName";

const HEADER_HEIGHT = 220;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, clerkUser } = useAuthSession();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const text = settingsText[isArabic ? "ar" : "en"];
  const BackIcon = isArabic ? ChevronRight : ChevronLeft;
  const appVersion = Constants.expoConfig?.version || appConfig.expo.version;

  const userImage = profile?.imageUrl || clerkUser?.imageUrl;

  const [scrollY] = useState(() => new Animated.Value(0));

  // Parallax stretch/zoom on pull-down (overscroll)
  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolate: "clamp",
  });

  // Parallax translation when scrolling up or down
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
    outputRange: [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.45],
    extrapolate: "clamp",
  });

  // Nav bar background opacity transition on scroll
  const navBarOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - (insets.top + 54)],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", direction: isArabic ? "rtl" : "ltr" }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Sticky Parallax Background Image ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT + insets.top,
          overflow: "hidden",
          backgroundColor: "#cfd8dc",
          transform: [
            { translateY: imageTranslateY },
            { scale: imageScale },
          ],
        }}
      >
        <Image
          source={
            userImage
              ? { uri: userImage }
              : require("../assets/images/person.png")
          }
          style={{
            width: "100%",
            height: "100%",
          }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* ── Top Header Navigation Bar (Sticky with back button only) ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top,
          backgroundColor: navBarOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.96)"],
          }),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <BackIcon size={28} color="#111827" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Parallax ScrollView ── */}
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top - 36,
          paddingBottom: insets.bottom + 32,
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Main Content Sheet Overlapping the Header (No Shadow) */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            paddingHorizontal: 20,
            paddingTop: 0,
            minHeight: 700,
          }}
        >
          {/* Circular Profile Avatar Overlapping the Header (No Shadow) */}
          <View
            style={{
              alignSelf: "center",
              marginTop: -70,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "#e5e7eb",
              borderWidth: 5,
              borderColor: "#ffffff",
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={
                userImage
                  ? { uri: userImage }
                  : require("../assets/images/person.png")
              }
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>

          <Text style={{ marginTop: 20, textAlign: "center", fontSize: 23, fontWeight: "700", color: "#1f2937" }}>
            {displayName(profile, clerkUser?.fullName || "Saflal")}
          </Text>
          <SettingsProfileEditor key={profile?._id || "loading"} />
          <SettingsPreferences key={profile?._id || "loading"} />

          <SettingsAccountActions key={profile?._id || "loading"} />
          <Text style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
            Saflal · {text.version} {appVersion}
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
