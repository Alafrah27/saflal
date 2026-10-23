import { TopTabs as MaterialTopTabs } from "expo-router/js-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthSession } from "../../context/AuthSessionContext";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, clerkUser } = useAuthSession();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const userImage = profile?.imageUrl || clerkUser?.imageUrl;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", paddingTop: insets.top }}>
      {/* Top Header Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: "#ffffff",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#b88144",
            letterSpacing: -0.5,
          }}
        >
          {isArabic ? "سفلال" : "Saflal"}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#f9fafb",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={20} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: "#b88144",
              backgroundColor: "#f3f4f6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={
                userImage
                  ? { uri: userImage }
                  : require("../../assets/images/person.png")
              }
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Tabs Navigator */}
      <MaterialTopTabs
        initialRouteName="chat"
        screenOptions={{
          tabBarShowLabel: false,
          tabBarShowIcon: true,
          tabBarActiveTintColor: "#b88144",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarIndicatorStyle: {
            backgroundColor: "#b88144",
            height: 3,
            borderRadius: 2,
          },
          tabBarStyle: {
            backgroundColor: "#ffffff",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
            paddingHorizontal: 8,
            height: 42,
          },
          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
            height: 42,
            padding: 0,
          },
          tabBarContentContainerStyle: {
            alignItems: "center",
          },
        }}
      >
        <MaterialTopTabs.Screen
          name="chat"
          options={{
            title: "Chats",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="call"
          options={{
            title: "Calls",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "call" : "call-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <MaterialTopTabs.Screen
          name="contact"
          options={{
            title: "Contacts",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </MaterialTopTabs>
    </View>
  );
}
