import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getColorFromId } from "../../utils/getColorfromId";
import { contactMessageRoute, messageRoute } from "../../lib/messageNavigation";
import FriendRequestActions from "./FriendRequestActions";
import { displayName } from "../../shared/displayName";

export default function ConvexUserItem({ item, text, navigationActiveRef }) {
  const name = displayName(item);
  const router = useRouter();
  const relationship = useQuery(api.friendRequests.getFriendshipStatus, { userId: item._id });
  const sendRequest = useMutation(api.friendRequests.sendFriendRequest);
  const getOrCreateChat = useMutation(api.chats.getOrCreateDirectChat);
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const sendingRef = useRef(false);
  const [failedImage, setFailedImage] = useState(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleOpen = async event => {
    event?.stopPropagation?.();
    if (openingRef.current || !mounted.current || navigationActiveRef?.current === false) return;
    if (relationship?.status !== "friends") {
      if (navigationActiveRef) navigationActiveRef.current = false;
      router.push(contactMessageRoute(item._id));
      return;
    }
    openingRef.current = true;
    setOpening(true);
    try {
      const { chatId } = await getOrCreateChat({ userId: item._id });
      if (mounted.current && navigationActiveRef?.current !== false) {
        if (navigationActiveRef) navigationActiveRef.current = false;
        router.push(messageRoute(chatId));
      }
    } catch {
      if (mounted.current && navigationActiveRef?.current !== false) Alert.alert(text.chatErrorTitle, text.chatError);
    } finally {
      openingRef.current = false;
      if (mounted.current) setOpening(false);
    }
  };

  const handleSend = async event => {
    event?.stopPropagation?.();
    if (sendingRef.current || !mounted.current || navigationActiveRef?.current === false || relationship?.status !== "none") return;
    sendingRef.current = true;
    setSending(true);
    try {
      await sendRequest({ receiverId: item._id });
    } catch (error) {
      if (mounted.current && navigationActiveRef?.current !== false) Alert.alert(text.requestErrorTitle,
        error?.data === "INCOMING_REQUEST_PENDING" ? text.incomingNotice : text.requestError);
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const label = relationship?.status === "friends" ? text.friends
    : relationship?.status === "incoming_pending" ? text.incoming : text.outgoing;

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={`${text.openChat}: ${name}`}
      accessibilityState={{ disabled: opening, busy: opening }}
      disabled={opening} onPress={handleOpen} activeOpacity={0.7}
      className="flex-row items-center justify-between py-4 px-3 bg-white border-b border-gray-100">
      <View className="flex-row items-center flex-1">
        {item.imageUrl && failedImage !== item.imageUrl ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={text.viewImage}
            onPress={event => {
              event?.stopPropagation?.();
              if (!mounted.current || navigationActiveRef?.current === false) return;
              router.push({ pathname: "/imageView", params: { url: item.imageUrl } });
            }}
          >
            <Image source={{ uri: item.imageUrl }} onError={() => setFailedImage(item.imageUrl)} style={{ width: 50, height: 50, borderRadius: 25 }} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: getColorFromId(item._id), alignItems: "center", justifyContent: "center" }}>
            <Text className="text-white font-bold text-xl">{name.charAt(0).toUpperCase() || "?"}</Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="font-bold text-base text-gray-800" numberOfLines={1}>{name}</Text>
          {relationship?.status === "incoming_pending" && <FriendRequestActions
            key={relationship.requestId} requestId={relationship.requestId} text={text} />}
        </View>
      </View>
      <View className="ml-2">
        {!relationship || sending || opening ? (
          <ActivityIndicator size="small" color="#b88144" accessibilityLabel={text.loading} />
        ) : relationship.status === "none" ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={text.sendRequest}
            onPress={handleSend}
            className="bg-blue-50 border border-blue-100 w-10 h-10 items-center justify-center rounded-full"
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={18} color="#3b82f6" />
          </TouchableOpacity>
        ) : relationship.status === "friends" ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={text.openChat} onPress={handleOpen}
            className="flex-row items-center gap-1 bg-gray-100 px-2 py-2 rounded-full">
            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            <Text className="text-xs text-gray-600">{label}</Text>
          </TouchableOpacity>
        ) : (
          <View accessibilityLabel={label} className="flex-row items-center gap-1 bg-gray-100 px-2 py-2 rounded-full">
            <Ionicons name={relationship.status === "friends" ? "checkmark-circle" : "time"} size={18} color={relationship.status === "friends" ? "#22c55e" : "#6b7280"} />
            <Text className="text-xs text-gray-600">{label}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
