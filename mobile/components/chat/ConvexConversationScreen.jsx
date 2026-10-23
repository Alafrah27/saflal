import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from "react-native";
import KeyboardSpacer from "./KeyboardSpacer";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthSession } from "../../context/AuthSessionContext";
import ChatHeader from "./ChatHeader";
import ChatQueryBoundary from "./ChatQueryBoundary";
import { chatText } from "./chatText";
import { messageRoute } from "../../lib/messageNavigation";
import ConvexMessageComposer from "./ConvexMessageComposer";
import ConvexMessageHistory from "./ConvexMessageHistory";
import FriendRequestActions from "../users/FriendRequestActions";
import { contactText } from "../users/contactText";
import { Phone } from "lucide-react-native";
import { useAudioCalls } from "../calls/CallProvider";
import VoiceSession from "./VoiceSession";
import UserProfileModal from "../profile/UserProfileModal";
import { displayName } from "../../shared/displayName";

const MAIN_COLOR = "#b88144";
const BACKGROUND = "#EFEAE2";

function ConversationFrame({ chat, canCall = false, text, language, children }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const calls = useAudioCalls();
  const imageUrl = chat?.peer?.imageUrl;
  const [profileTarget, setProfileTarget] = useState(null);
  useFocusEffect(useCallback(() => () => setProfileTarget(null), []));

  const handleCall = () => {
    if (canCall && chat?.chatId) void calls?.startCall(chat.chatId);
  };

  const callButton = (
    <TouchableOpacity
      onPress={handleCall}
      disabled={!canCall || calls?.starting}
      style={{ padding: 6, marginRight: 4, opacity: canCall && !calls?.starting ? 1 : 0.4 }}
      accessibilityRole="button"
      accessibilityLabel="Call"
    >
      <Phone size={24} color="white" />
    </TouchableOpacity>
  );

  return <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar backgroundColor={MAIN_COLOR} barStyle="light-content" />
    <View style={{ backgroundColor: MAIN_COLOR, paddingTop: insets.top, paddingBottom: 12, paddingHorizontal: 8 }}>
      <View style={{ paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <ChatHeader name={chat ? displayName(chat.peer, text.user) : text.title}
            avatar={imageUrl} userId={chat?.peer?._id} language={language} showStatus={false}
            onBack={() => router.back()}
            onProfilePress={chat?.peer?._id ? () => setProfileTarget({ userId: chat.peer._id, ...(chat.chatId ? { chatId: chat.chatId } : {}) }) : undefined}
          />
        </View>
        {callButton}
      </View>
    </View>
    {children}
    {profileTarget && <UserProfileModal key={profileTarget.userId} target={profileTarget} language={language} onClose={() => setProfileTarget(null)} />}
  </View>;
}

function ConversationContent({ chatId, text, language }) {
  const { profile } = useAuthSession();
  const chat = useQuery(api.chats.getChat, { chatId });
  const relationship = useQuery(api.friendRequests.getFriendshipStatus,
    chat?.peer?._id ? { userId: chat.peer._id } : "skip");
  const permission = useQuery(api.messages.getSendPermission, chat ? { chatId } : "skip");
  const readyToSend = relationship?.status === "friends" && permission === true;
  return <ConversationFrame chat={chat} canCall={readyToSend} text={text} language={language}>
    {chat === undefined ? <View style={{ flex: 1, justifyContent: "center" }}>
      <ActivityIndicator size="large" color={MAIN_COLOR} accessibilityLabel={text.loading} />
    </View> : <VoiceSession key={`${profile._id}:${chatId}`} accountId={profile._id} chatId={chatId}><View style={{ flex: 1 }}>
      <ConvexMessageHistory chatId={chatId} userId={profile._id} text={text} />
      {!readyToSend && <View style={{ padding: 16, alignItems: "center" }}>
        {permission === undefined || (chat.peer && relationship === undefined)
          ? <ActivityIndicator accessibilityLabel={text.loading} color={MAIN_COLOR} />
          : <Text style={{ textAlign: "center", color: "#64748b" }}>{relationship?.status === "friends"
            ? text.communicationUnavailable : relationshipMessage(relationship?.status, text)}</Text>}
        {chat.peer && relationship?.status === "incoming_pending" && <FriendRequestActions
          key={relationship.requestId} requestId={relationship.requestId} text={contactText[language]} />}
      </View>}
      {readyToSend && <ConvexMessageComposer key={chatId} chatId={chatId} text={text} />}
      <KeyboardSpacer includeBottomInset />
    </View></VoiceSession>}
  </ConversationFrame>;
}

function relationshipMessage(status, text) {
  if (status === "friends") return text.loading;
  if (status === "outgoing_pending") return text.outgoingPending;
  if (status === "incoming_pending") return text.incomingPending;
  return text.notFriends;
}

function ContactConversationContent({ userId, text, language }) {
  const contact = useQuery(api.contacts.getUser, { userId });
  const relationship = useQuery(api.friendRequests.getFriendshipStatus, contact ? { userId } : "skip");
  const openChat = useMutation(api.chats.getOrCreateDirectChat);
  const router = useRouter();
  const [openingError, setOpeningError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const contactId = contact?._id;
  // A newly accepted request can transition this read-only preview into the
  // existing authorized conversation. Nonfriends never create a chat here.
  useEffect(() => {
    if (!contactId || relationship?.status !== "friends") return;
    let active = true;
    openChat({ userId: contactId }).then(({ chatId }) => {
      if (active) router.replace(messageRoute(chatId));
    }).catch(() => { if (active) setOpeningError(true); });
    return () => { active = false; };
  }, [contactId, relationship?.status, openChat, router, attempt]);

  const loading = contact === undefined || (contact && relationship === undefined) ||
    (contact && relationship?.status === "friends" && !openingError);
  return <ConversationFrame chat={contact ? { peer: contact } : undefined} text={text} language={language}>
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      {loading ? <ActivityIndicator size="large" color={MAIN_COLOR} accessibilityLabel={text.loading} /> : <>
        <Ionicons name="chatbubble-ellipses-outline" size={56} color="#CBD5E1" />
        <Text style={{ color: "#64748B", fontSize: 15, marginTop: 12, textAlign: "center" }}>
          {!contact || openingError ? text.unavailable : relationshipMessage(relationship?.status, text)}
        </Text>
        {contact && relationship?.status === "incoming_pending" && <FriendRequestActions
          key={relationship.requestId} requestId={relationship.requestId} text={contactText[language]} />}
        {openingError && <TouchableOpacity onPress={() => { setOpeningError(false); setAttempt(value => value + 1); }} accessibilityRole="button">
          <Text style={{ color: MAIN_COLOR, marginTop: 16 }}>{text.retry}</Text>
        </TouchableOpacity>}
      </>}
    </View>
  </ConversationFrame>;
}

export default function ConvexConversationScreen() {
  const { id, mode, userId } = useLocalSearchParams();
  const { ready, profile } = useAuthSession();
  const { i18n } = useTranslation();
  const language = i18n.language === "ar" ? "ar" : "en";
  const text = chatText[language];
  const [revision, setRevision] = useState(0);
  const preview = mode === "contact";
  const validId = preview ? id === "new" && typeof userId === "string" && userId.length > 0
    : typeof id === "string" && id.length > 0;
  const unavailable = <ConversationFrame text={text} language={language}>
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <Text style={{ textAlign: "center", color: "#64748B", marginBottom: 16 }}>{text.unavailable}</Text>
      {validId && <TouchableOpacity accessibilityRole="button" onPress={() => setRevision(value => value + 1)}>
        <Text style={{ color: MAIN_COLOR, fontWeight: "600" }}>{text.retry}</Text>
      </TouchableOpacity>}
    </View>
  </ConversationFrame>;
  if (!ready) return <ConversationFrame text={text} language={language}>
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={MAIN_COLOR} accessibilityLabel={text.loading} />
    </View>
  </ConversationFrame>;
  if (!validId) return unavailable;
  return <ChatQueryBoundary key={`${profile._id}:${preview ? userId : id}:${revision}`} fallback={unavailable}>
    {preview ? <ContactConversationContent userId={userId} text={text} language={language} />
      : <ConversationContent chatId={id} text={text} language={language} />}
  </ChatQueryBoundary>;
}
