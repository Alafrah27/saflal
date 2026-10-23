import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { getFunctionName } from "convex/server";
import { chatText } from "../components/chat/chatText.js";

// Render the actual routes/components with native primitives and transport
// replaced. These checks do not run native navigation, layout, or subscriptions.
let model;
const element = React.createElement;
const primitive = tag => ({ children, accessibilityLabel }) => element(tag, { "aria-label": accessibilityLabel }, children);
const unsupported = () => { throw new Error("Legacy transport must not run for Convex routes"); };
const mocks = {
  react: { ...React, useEffect: fn => { model.effects.push(fn); }, useState(initial) {
    const [value, setValue] = React.useState(initial);
    return [value, next => { model.stateWrites.push(next); setValue(next); }];
  } },
  "react-native": {
    View: primitive("div"), Text: primitive("span"), Image: primitive("img"), ActivityIndicator: primitive("progress"),
    StatusBar: () => null, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) }, Platform: { OS: "android" }, TouchableWithoutFeedback: primitive("div"),
    Alert: { alert: unsupported },
    TouchableOpacity(props) { model.buttons.push(props); return element("button", { "aria-label": props.accessibilityLabel, disabled: props.disabled }, props.children); },
    TextInput(props) { model.inputs.push(props); return element("input", { placeholder: props.placeholder, readOnly: props.editable === false }); },
    RefreshControl(props) { model.refresh = props; return null; },
    FlatList(props) {
      model.list = props;
      return element(React.Fragment, null,
        props.data.map(item => element(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item }))),
        props.data.length ? null : props.ListEmptyComponent, props.ListFooterComponent, props.refreshControl);
    },
  },
  "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
  "lucide-react-native": {
    Phone: ({ size, color }) => element("svg", { "data-icon": "Phone", width: size, height: size, fill: color }),
    PhoneCall: ({ size, color }) => element("svg", { "data-icon": "PhoneCall", width: size, height: size, fill: color }),
  },
  "expo-crypto": { randomUUID: () => "generated-message-key" },
  "expo-router": {
    useFocusEffect: () => {},
    useRouter: () => ({ push: route => model.routes.push(route), replace: route => model.replacements.push(route), back: () => model.backs++ }),
    useLocalSearchParams: () => model.params, useNavigation: unsupported,
    Stack: { Screen: ({ options }) => { model.options.push(options); return null; } },
  },
  "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
  "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  "react-native-keyboard-controller": { useReanimatedKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }) },
  "react-native-reanimated": { __esModule: true, default: { View: primitive("div") }, useAnimatedStyle: fn => fn(), useSharedValue: value => ({ value }) },
  "@react-native-async-storage/async-storage": {},
  "convex/react": {
    usePaginatedQuery(reference, args, options) {
      model.queries.push({ name: getFunctionName(reference), args, options });
      if (getFunctionName(reference) === "messages:listMessages") return { ...model.messagePagination, loadMore: size => model.pages.push(size) };
      return { ...model.pagination, loadMore: size => model.pages.push(size) };
    },
    useQuery(reference, args) {
      if (args === "skip") return undefined;
      const name = getFunctionName(reference);
      model.queries.push({ name, args });
      if (name === "contacts:getUser") return model.contact;
      if (name === "friendRequests:getFriendshipStatus") return model.relationship;
      if (name === "messages:getSendPermission") return model.permission;
      return model.chat;
    },
    useMutation(reference) {
      return async args => {
        model.mutations.push({ name: getFunctionName(reference), args });
        if (model.mutationError) throw model.mutationError;
        return { chatId: "accepted_chat" };
      };
    },
  },
};
const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const require = createRequire(path);
  const localRequire = name => {
    if (mocks[name]) return mocks[name];
    if (name === "./VoiceSession") return { __esModule: true, default: ({ children }) => children };
    if (name === "./VoiceRecorder") return { __esModule: true, default: ({ text }) => element("button", { "aria-label": text.voiceStart }, "Mic") };
    if (name === "./VoiceMessage") return { __esModule: true, default: ({ text }) => element("span", null, text.voicePlay) };
    if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => model.session };
    if (name.endsWith("/calls/CallProvider")) return {
      useAudioCalls: () => ({ starting: false, startCall: chatId => { model.initiatedCall = chatId; } }),
    };
    if (name.endsWith("/store/transtack/query")) return { useGetAllUsers: unsupported, useGetMyChats: unsupported, useDeleteChats: unsupported, useGetChatMessages: unsupported, useDeleteMessages: unsupported };
    if (name.endsWith("/store/socketioStore")) return { SocketIoStore: unsupported };
    if (name.endsWith("/store/Store")) return { useAuthStore: unsupported };
    if (name.endsWith("/store/callStore")) return {
      useCallStore: Object.assign(() => ({}), {
        getState: () => ({
          setCurrentUser: user => { model.callUser = user; },
          initiateCall: target => { model.initiatedCall = target; },
        }),
      }),
    };
    if (["/SendInput", "/ui/messages", "/UserProfileSheet", "/ActionModel", "/users/FetchUsers"].some(suffix => name.endsWith(suffix))) return { default: unsupported, MessageBubble: unsupported };
    if (!name.startsWith(".")) return require(name);
    let resolved;
    try { resolved = require.resolve(name); } catch { resolved = require.resolve(`${name}.jsx`); }
    return loadModule(resolved);
  };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
  return module.exports;
}
const ChatTab = loadModule(fileURLToPath(new URL("../app/(tabs)/chat.jsx", import.meta.url))).default;
const MessageScreen = loadModule(fileURLToPath(new URL("../app/chat/[id].jsx", import.meta.url))).default;
const Boundary = loadModule(fileURLToPath(new URL("../components/chat/ChatQueryBoundary.jsx", import.meta.url))).default;
function reset(overrides = {}) {
  model = { session: { ready: true, profile: { _id: "viewer" } }, language: "en", params: { id: "conversation", source: "convex" },
    pagination: { status: "Exhausted", results: [] }, chat: { chatId: "conversation", peer: { _id: "peer", fullName: "Verified Peer", imageUrl: "https://example.com/photo" } },
    contact: { _id: "peer", fullName: "Verified Contact", imageUrl: "https://example.com/photo" }, relationship: { status: "friends" },
    permission: true, messagePagination: { status: "Exhausted", results: [] },
    queries: [], routes: [], replacements: [], effects: [], mutations: [], pages: [], buttons: [], inputs: [], options: [], stateWrites: [], backs: 0, ...overrides };
}
function render(component, overrides = {}) { reset(overrides); return renderToStaticMarkup(element(component)); }

test("chat list and conversation header prefer nickname while retaining the real peer/chat IDs", () => {
  const peer = { _id: "peer", fullName: "Canonical Name", nickName: "Chat Nick" };
  assert.match(render(ChatTab, { pagination: { status: "Exhausted", results: [{ chatId: "conversation", peer }] } }), /Chat Nick/);
  const html = render(MessageScreen, { chat: { chatId: "conversation", peer } });
  assert.match(html, /Chat Nick/); assert.doesNotMatch(html, /Canonical Name/);
  model.buttons[1].onPress(); assert.deepEqual(model.stateWrites, [{ userId: "peer", chatId: "conversation" }]);
});

test("Chats uses the authenticated Convex paginated list and opens the conversation route", () => {
  const html = render(ChatTab, { pagination: { status: "Exhausted", results: [{ chatId: "conversation", peer: { _id: "peer", fullName: "Friend" } }] } });
  assert.match(html, /Friend/);
  assert.deepEqual(model.queries, [{ name: "chats:getMyChats", args: {}, options: { initialNumItems: 20 } }]);
  model.buttons[0].onPress();
  assert.deepEqual(model.routes, [{ pathname: "/chat/[id]", params: { id: "conversation", source: "convex" } }]);
});

test("Chats waits for the current authenticated profile before querying", () => {
  assert.match(render(ChatTab, { session: { ready: false } }), /Loading chats/);
  assert.deepEqual(model.queries, []);
});

test("Chats loading does not render stale rows and exhausted empty lists show the empty state", () => {
  const html = render(ChatTab, { pagination: { status: "LoadingFirstPage", results: [{ chatId: "old", peer: { fullName: "Old Account" } }] } });
  assert.doesNotMatch(html, /Old Account/);
  assert.match(render(ChatTab), /No chats found/);
});

test("sparse chat pages retain a continuation control and do not claim the list is exhausted", () => {
  const html = render(ChatTab, { pagination: { status: "CanLoadMore", results: [] } });
  assert.doesNotMatch(html, /No chats found/);
  model.buttons.find(button => button.children?.props?.children === "Load more chats").onPress();
  assert.deepEqual(model.pages, [20]);
});

test("chat scroll pagination only runs when another page is available", () => {
  for (const status of ["CanLoadMore", "LoadingMore", "Exhausted"]) {
    render(ChatTab, { pagination: { status, results: [{ chatId: "conversation", peer: null }] } });
    model.list.onEndReached(); assert.deepEqual(model.pages, status === "CanLoadMore" ? [20] : []);
  }
});

test("existing chats with a missing peer remain navigable without fabricated presence", () => {
  const html = render(ChatTab, { pagination: { status: "Exhausted", results: [{ chatId: "conversation", peer: null }] } });
  assert.match(html, /User unavailable/);
  model.buttons[0].onPress(); assert.equal(model.routes[0].params.id, "conversation");
});

test("Chats displays last message preview and unread count", () => {
  const html = render(ChatTab, {
    pagination: {
      status: "Exhausted",
      results: [{
        chatId: "conversation",
        peer: { _id: "peer", fullName: "Friend" },
        lastMessage: { _id: "m1", text: "Latest greeting from friend", type: "text", createdAt: Date.now() },
        unreadCount: 4,
      }],
    },
  });
  assert.match(html, /Friend/);
  assert.match(html, /Latest greeting from friend/);
  assert.match(html, /4/);
});

test("chat previews show text or localized voice duration and receipts only for our messages", () => {
  for (const language of ["en", "ar"]) {
    for (const type of ["text", "audio"]) {
      const lastMessage = { _id: "m1", senderId: "viewer", type, text: "Latest text", audioDuration: 65, status: "sent" };
      const results = [{ chatId: "conversation", peer: { _id: "peer", fullName: "Friend" }, lastMessage, unreadCount: 3 }];
      let html = render(ChatTab, { language, pagination: { status: "Exhausted", results } });
      assert.ok(html.includes(type === "text" ? "Latest text" : `${chatText[language].voicePreview} · 1:05`));
      assert.match(html, /data-icon="checkmark"/);
      lastMessage.status = "read";
      html = render(ChatTab, { language, pagination: { status: "Exhausted", results } });
      assert.match(html, /data-icon="checkmark-done"/);
      lastMessage.senderId = "peer";
      html = render(ChatTab, { language, pagination: { status: "Exhausted", results } });
      assert.doesNotMatch(html, /data-icon="checkmark(?:-done)?"/);
    }
  }
});

test("text and audio bubbles show live sent/read receipts only on our own messages", () => {
  for (const type of ["text", "audio"]) {
    const results = [
      { _id: "ours", senderId: "viewer", type, text: "Our latest message", status: "sent", createdAt: 100 },
      { _id: "theirs", senderId: "peer", type, text: "Their message", status: "read", createdAt: 99 },
    ];
    let html = render(MessageScreen, { messagePagination: { status: "Exhausted", results } });
    assert.equal((html.match(/data-icon="checkmark"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /data-icon="checkmark-done"/);
    results[0].status = "read";
    html = render(MessageScreen, { messagePagination: { status: "Exhausted", results } });
    assert.equal((html.match(/data-icon="checkmark-done"/g) ?? []).length, 1);
  }
});

test("the Convex message screen fetches authorized chat details instead of trusting route profile data", () => {
  const html = render(MessageScreen, { params: { id: "conversation", source: "convex", name: "Spoofed Name", avatar: "https://bad.example/photo" } });
  assert.match(html, /Verified Peer/); assert.doesNotMatch(html, /Spoofed Name/);
  assert.deepEqual(model.queries, [{ name: "chats:getChat", args: { chatId: "conversation" } },
    { name: "friendRequests:getFriendshipStatus", args: { userId: "peer" } },
    { name: "messages:getSendPermission", args: { chatId: "conversation" } },
    { name: "messages:listMessages", args: { chatId: "conversation" }, options: { initialNumItems: 20 } }]);
  assert.match(html, /Send the first message/);
  assert.equal(model.inputs[0].editable, true);
  assert.match(html, /Record voice message/);
  assert.doesNotMatch(html, /Offline|Online|typing/);
});

test("the message screen waits for auth/chat data without showing route-supplied names", () => {
  const html = render(MessageScreen, { chat: undefined, params: { id: "conversation", source: "convex", name: "Spoofed" } });
  assert.match(html, /Loading conversation/); assert.doesNotMatch(html, /Spoofed/);
  assert.deepEqual(model.inputs, []);
  render(MessageScreen, { session: { ready: false } }); assert.deepEqual(model.queries, []);
});

test("missing or array conversation IDs are rejected locally without issuing a query", () => {
  for (const id of [undefined, "", ["one", "two"]]) {
    assert.match(render(MessageScreen, { params: { source: "convex", id } }), /This conversation is unavailable/);
    assert.deepEqual(model.queries, []);
  }
});

test("back navigation and the profile-modal entry work from the Convex conversation screen", () => {
  render(MessageScreen);
  model.buttons[0].onPress(); assert.equal(model.backs, 1);
  model.buttons[1].onPress();
  assert.deepEqual(model.stateWrites, [{ userId: "peer", chatId: "conversation" }]);
  assert.deepEqual(model.routes, []);
});

test("contact preview profile entry uses the queried peer and loading headers have no profile action", () => {
  render(MessageScreen, { params: { source: "convex", id: "new", mode: "contact", userId: "peer" }, relationship: { status: "none" } });
  model.buttons[1].onPress(); assert.deepEqual(model.stateWrites, [{ userId: "peer" }]);
  for (const overrides of [{ chat: undefined }, { chat: { chatId: "conversation", peer: null } }]) {
    render(MessageScreen, overrides); assert.equal(model.buttons[1].disabled, true);
  }
});

test("Arabic conversation renders an editable composer with an initially empty draft", () => {
  const html = render(MessageScreen, { language: "ar" });
  assert.match(html, /أرسل الرسالة الأولى/);
  assert.equal(model.inputs[0].editable, true);
  assert.match(html, /تسجيل رسالة صوتية/);
});

test("legacy links still select the original components; Convex routes do not mount their transport", () => {
  reset({ params: { id: "old_chat" } }); assert.equal(MessageScreen().type.name, "LegacyChatId");
  reset({ params: { source: "legacy" } }); assert.equal(ChatTab().type.name, "LegacyChatList");
  assert.doesNotThrow(() => render(MessageScreen));
});

test("chat screen headerRight renders the Lucide Phone call button", () => {
  const fileContent = readFileSync(fileURLToPath(new URL("../app/chat/[id].jsx", import.meta.url)), "utf8");
  assert.match(fileContent, /import\s*\{[^}]*\bPhone\b[^}]*\}\s*from\s*["']lucide-react-native["']/);
  assert.match(fileContent, /<Phone\s+size=\{24\}\s+color="white"\s*\/>/);
});

test("Convex conversation header renders the Lucide Phone call button and initiates a voice call", () => {
  render(MessageScreen);
  const callBtn = model.buttons.find(b => b.accessibilityLabel === "Call");
  assert.ok(callBtn, "Call button should be rendered in header");
  callBtn.onPress();
  assert.equal(model.initiatedCall, "conversation");
});

test("the call button cannot start a call without confirmed friendship and communication permission", () => {
  for (const overrides of [{ relationship: { status: "none" } }, { permission: false }, { permission: undefined }]) {
    render(MessageScreen, overrides);
    const callBtn = model.buttons.find(button => button.accessibilityLabel === "Call");
    assert.equal(callBtn.disabled, true);
    callBtn.onPress();
    assert.equal(model.initiatedCall, undefined);
  }
});

test("query error boundaries render the supplied safe fallback", () => {
  const fallback = element("div", null, "Conversation unavailable");
  const boundary = new Boundary({ fallback, children: element("div", null, "private details") });
  boundary.state = Boundary.getDerivedStateFromError(new Error("access denied"));
  assert.equal(boundary.render(), fallback);
});

const previewParams = { id: "new", source: "convex", mode: "contact", userId: "peer", name: "Spoofed Preview" };
test("nonfriends and pending requests open a verified contact view with no input or Send button", () => {
  for (const [status, notice] of [["none", /You are not friends yet/], ["outgoing_pending", /Your friend request has not been accepted yet/], ["incoming_pending", /This user sent you a friend request/]]) {
    const html = render(MessageScreen, { params: previewParams, relationship: { status } });
    assert.match(html, /Verified Contact/); assert.doesNotMatch(html, /Spoofed Preview/); assert.match(html, notice);
    assert.deepEqual(model.inputs, []);
    assert.equal(model.buttons.some(button => button.accessibilityLabel === "Send message"), false);
    assert.deepEqual(model.queries, [{ name: "contacts:getUser", args: { userId: "peer" } },
      { name: "friendRequests:getFriendshipStatus", args: { userId: "peer" } }]);
    model.effects.forEach(effect => effect());
    assert.deepEqual(model.mutations, []);
  }
});

test("existing conversations also hide their composer when friendship is absent or pending", () => {
  for (const status of ["none", "outgoing_pending", "incoming_pending"]) {
    render(MessageScreen, { relationship: { status } });
    assert.deepEqual(model.inputs, []);
    assert.equal(model.buttons.some(button => button.accessibilityLabel === "Send message"), false);
  }
});

test("preview loading or unavailable profiles expose no composer or relationship request", () => {
  for (const contact of [undefined, null]) {
    const html = render(MessageScreen, { params: previewParams, contact });
    assert.match(html, contact === null ? /This conversation is unavailable/ : /Loading conversation/);
    assert.deepEqual(model.queries, [{ name: "contacts:getUser", args: { userId: "peer" } }]);
    assert.deepEqual(model.inputs, []);
  }
});

test("invalid preview routing cannot send a user ID or preview sentinel into chat APIs", () => {
  for (const params of [{ ...previewParams, id: "conversation" }, { ...previewParams, userId: undefined }, { ...previewParams, userId: ["a", "b"] }]) {
    assert.match(render(MessageScreen, { params }), /This conversation is unavailable/);
    assert.deepEqual(model.queries, []);
  }
});

test("an accepted preview opens an authorized real chat and replaces the preview route", async () => {
  render(MessageScreen, { params: previewParams });
  model.effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(model.mutations, [{ name: "chats:getOrCreateDirectChat", args: { userId: "peer" } }]);
  assert.deepEqual(model.replacements, [{ pathname: "/chat/[id]", params: { id: "accepted_chat", source: "convex" } }]);
});

test("preview cleanup suppresses a late accepted-chat navigation after unmount", async () => {
  render(MessageScreen, { params: previewParams });
  model.effects.map(effect => effect()).forEach(cleanup => cleanup?.());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(model.replacements, []);
});

test("Arabic pending preview explains the request and has no message composer", () => {
  const html = render(MessageScreen, { params: previewParams, language: "ar", relationship: { status: "outgoing_pending" } });
  assert.match(html, /لم يتم قبول طلب صداقتك بعد/);
  assert.deepEqual(model.inputs, []);
  assert.equal(model.buttons.some(button => button.accessibilityLabel === "إرسال رسالة"), false);
});

test("incoming contact preview accepts the request ID without granting optimistic messaging access", async () => {
  render(MessageScreen, { params: previewParams, relationship: { status: "incoming_pending", requestId: "received_request" } });
  const accept = model.buttons.find(button => button.accessibilityLabel === "Accept");
  assert.ok(accept);
  await accept.onPress();
  assert.deepEqual(model.mutations, [{ name: "friendRequests:acceptFriendRequest", args: { requestId: "received_request" } }]);
  assert.deepEqual(model.inputs, []); assert.deepEqual(model.replacements, []);
});

test("incoming existing-chat preview can decline while outgoing previews have no decision controls", async () => {
  render(MessageScreen, { relationship: { status: "incoming_pending", requestId: "received_request" } });
  await model.buttons.find(button => button.accessibilityLabel === "Decline").onPress();
  assert.deepEqual(model.mutations, [{ name: "friendRequests:rejectFriendRequest", args: { requestId: "received_request" } }]);
  for (const status of ["none", "outgoing_pending", "friends"]) {
    render(MessageScreen, { params: previewParams, relationship: { status } });
    assert.equal(model.buttons.some(button => ["Accept", "Decline"].includes(button.accessibilityLabel)), false);
  }
});

test("accepted friendship does not expose a composer while server permission is false or still loading", () => {
  for (const permission of [false, undefined]) {
    render(MessageScreen, { permission });
    assert.deepEqual(model.inputs, []);
    assert.equal(model.buttons.some(button => button.accessibilityLabel === "Send message"), false);
  }
});

test("conversation renders paginated realtime text, hides expired rows, and loads older pages", () => {
  const html = render(MessageScreen, { messagePagination: { status: "CanLoadMore", results: [
    { _id: "message", type: "text", text: "Live message", senderId: "peer", createdAt: Date.now() },
    { _id: "expired", type: "text", text: "Expired private message", senderId: "peer", createdAt: 1, expiresAt: 2 },
  ] } });
  assert.match(html, /Live message/); assert.doesNotMatch(html, /Expired private message/);
  model.buttons.find(button => button.accessibilityLabel === "Load older messages").onPress();
  assert.deepEqual(model.pages, [20]); assert.equal(model.list.inverted, true);
});
