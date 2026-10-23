import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { chatText } from "../components/chat/chatText.js";

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function load(url, mocks) {
  const module = { exports: {} }, path = fileURLToPath(url), require = createRequire(url);
  const code = ts.transpileModule(readFileSync(url, "utf8"), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", code)(name => mocks[name] ?? require(name), module, module.exports);
  return module.exports.default;
}

function deletionHarness(language = "en") {
  const h = { alerts: [], calls: [], writes: [], mutate: async () => null };
  let focus, state, ref;
  const runDeletionHook = load(new URL("../hooks/useMessageDeletion.js", import.meta.url), {
    react: { useCallback: fn => fn, useRef: initial => ref ??= { current: initial },
      useState: initial => [state ?? initial, value => { state = value; h.writes.push(value); }] },
    "react-native": { Alert: { alert: (...args) => h.alerts.push(args) } },
    "expo-router": { useFocusEffect: fn => { focus = fn; } },
    "convex/react": { useMutation: () => async args => { h.calls.push(args); return h.mutate(args); } },
    "../convex/_generated/api": { api: { messages: { deleteForEveryone: "delete" } } },
  });
  h.render = (account = "a") => h.hook = runDeletionHook("chat", account, chatText[language]);
  h.focus = () => { h.blur = focus(); };
  h.message = { _id: "mine", senderId: "a", type: "text" };
  h.confirm = () => h.alerts.at(-1)[2][1].onPress();
  h.cancel = () => h.alerts.at(-1)[2][0].onPress();
  h.render(); h.focus(); return h;
}

test("long press requires confirmation; Cancel and dismiss never send a mutation", () => {
  const h = deletionHarness(); h.hook.requestDelete(h.message);
  const [title, body, buttons, options] = h.alerts[0];
  assert.equal(title, chatText.en.deleteMessageTitle); assert.match(body, /everyone/);
  assert.equal(buttons[1].style, "destructive"); assert.deepEqual(h.calls, []);
  h.cancel(); h.hook.requestDelete(h.message); options.onDismiss();
  h.hook.requestDelete(h.message); assert.equal(h.alerts.length, 3); assert.deepEqual(h.calls, []);
});

test("only own unexpired active text/audio messages offer deletion", () => {
  const h = deletionHarness();
  for (const message of [{ ...h.message, senderId: "b" }, { ...h.message, deletedAt: 1 }, { ...h.message, expiresAt: 1 }]) h.hook.requestDelete(message);
  assert.equal(h.alerts.length, 0);
  h.hook.requestDelete({ ...h.message, type: "audio" }); assert.equal(h.alerts.length, 1);
  h.hook.requestDelete(h.message); assert.equal(h.alerts.length, 1);
});

test("confirmation submits only an ID, fences duplicates and shows pending state until completion", async () => {
  const h = deletionHarness(); let complete; h.mutate = () => new Promise(resolve => { complete = resolve; });
  h.hook.requestDelete(h.message); h.confirm(); h.confirm(); h.hook.requestDelete(h.message);
  assert.deepEqual(h.calls, [{ messageId: "mine" }]); assert.equal(h.writes.at(-1), "mine");
  complete(); await flush(); assert.equal(h.writes.at(-1), null);
});

test("failure retains the message and offers Retry; retry uses the same ID", async () => {
  const h = deletionHarness(); h.mutate = async () => { throw Error("offline"); };
  h.hook.requestDelete(h.message); h.confirm(); await flush();
  assert.equal(h.alerts[1][0], chatText.en.deleteMessageErrorTitle); assert.equal(h.writes.at(-1), null);
  h.mutate = async () => null; h.confirm(); await flush();
  assert.deepEqual(h.calls, [{ messageId: "mine" }, { messageId: "mine" }]);
});

test("stale confirmation and retry callbacks do nothing after blur, account switch or refocus", async () => {
  for (const phase of ["confirmation", "retry", "pending"]) {
    const h = deletionHarness(); let reject;
    if (phase === "retry") h.mutate = async () => { throw Error("offline"); };
    if (phase === "pending") h.mutate = () => new Promise((_resolve, fail) => { reject = fail; });
    h.hook.requestDelete(h.message);
    if (phase !== "confirmation") { h.confirm(); await flush(); }
    const callback = h.alerts.at(-1)[2][1].onPress;
    h.blur(); h.render("b"); h.focus();
    const writes = h.writes.length, calls = h.calls.length, alerts = h.alerts.length;
    callback(); if (reject) reject(Error("late failure")); await flush();
    assert.equal(h.calls.length, calls); assert.equal(h.writes.length, writes); assert.equal(h.alerts.length, alerts);
    h.hook.requestDelete(h.message); assert.equal(h.alerts.length, alerts);
  }
});

test("Arabic confirmation, cancel, retry and placeholders are translated", async () => {
  const h = deletionHarness("ar"); h.hook.requestDelete(h.message);
  assert.equal(h.alerts[0][0], "حذف الرسالة؟");
  assert.deepEqual(h.alerts[0][2].map(button => button.text), ["إلغاء", "حذف"]);
  assert.equal(chatText.ar.rtl, true);
  assert.equal(chatText.ar.messageDeleted, "تم حذف الرسالة.");
  assert.equal(chatText.ar.youDeletedMessage, "لقد حذفت هذه الرسالة.");
});

function historyHarness(messages, language = "en") {
  const h = { buttons: [], deletes: [], removed: [], effects: [], toggles: [] }, text = chatText[language];
  const element = React.createElement;
  const primitive = tag => ({ children, accessibilityLabel }) => element(tag, { "aria-label": accessibilityLabel }, children);
  const native = { View: primitive("div"), Text: primitive("span"), ActivityIndicator: primitive("progress"),
    TouchableOpacity: props => { h.buttons.push(props); return element("button", null, props.children); },
    FlatList: props => { h.list = props; return element(React.Fragment, null, props.data.map(item => element(React.Fragment, { key: item._id }, props.renderItem({ item })))); } };
  const mocks = { react: { ...React, useEffect: fn => h.effects.push(fn) }, "react-native": native,
    "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
    "./VoiceSession": { useVoiceSession: () => ({ removeMessage: id => h.removed.push(id),
      toggle: (...args) => h.toggles.push(args), activeId: null, status: {}, callState: "idle" }) },
    "../../lib/voiceClient": { voiceTime: value => String(value) },
    "convex/react": { usePaginatedQuery: () => ({ status: "Exhausted", results: messages }) },
    "../../convex/_generated/api": { api: { messages: { listMessages: "list" } } },
    "../../hooks/useChatRead": { __esModule: true, default: () => {} },
    "../../hooks/useMessageDeletion": { __esModule: true, default: () => ({ pendingId: null, requestDelete: message => h.deletes.push(message._id) }) },
    "./MessageReceipt": { __esModule: true, default: () => element("i", { "data-receipt": true }) },
  };
  mocks["./VoiceMessage"] = { __esModule: true, default: load(new URL("../components/chat/VoiceMessage.jsx", import.meta.url), mocks) };
  const History = load(new URL("../components/chat/ConvexMessageHistory.jsx", import.meta.url), mocks);
  h.html = renderToStaticMarkup(element(History, { chatId: "chat", userId: "a", text }));
  return h;
}

test("actual history renders localized tombstones without original body, voice controls, receipts or delete actions", () => {
  for (const language of ["en", "ar"]) {
    const text = chatText[language], h = historyHarness([
      { _id: "mine", senderId: "a", type: "text", text: "Private body", deletedAt: 2, createdAt: 1 },
      { _id: "theirs", senderId: "b", type: "audio", audioDuration: 30, deletedAt: 2, createdAt: 1 },
    ], language);
    assert.ok(h.html.includes(text.youDeletedMessage)); assert.ok(h.html.includes(text.messageDeleted));
    assert.doesNotMatch(h.html, /Private body|data-receipt|data-icon/);
    assert.ok(h.buttons.every(button => !button.onLongPress && !button.accessibilityActions));
  }
});

test("own bubble and nested audio button forward long press and accessibility delete; short audio press still plays", () => {
  const h = historyHarness([{ _id: "mine", senderId: "a", type: "audio", audioDuration: 30, createdAt: 1 }]);
  const buttons = h.buttons.filter(button => button.onLongPress);
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    button.onLongPress(); button.onAccessibilityAction({ nativeEvent: { actionName: "delete" } });
  }
  assert.deepEqual(h.deletes, ["mine", "mine", "mine", "mine"]); assert.deepEqual(h.toggles, []);
  buttons.find(button => button.onPress).onPress(); assert.equal(h.toggles.length, 1);
  const cleanup = h.effects.map(effect => effect()).find(value => typeof value === "function");
  cleanup(); assert.deepEqual(h.removed, ["mine"]);
});

test("received audio has playback without deletion handlers", () => {
  const h = historyHarness([{ _id: "theirs", senderId: "b", type: "audio", audioDuration: 30, createdAt: 1 }]);
  assert.equal(h.buttons.length, 1); assert.equal(h.buttons[0].onLongPress, undefined);
  h.buttons[0].onPress(); assert.equal(h.toggles.length, 1); assert.deepEqual(h.deletes, []);
});

test("chat and search row previews localize deletion instead of exposing text, voice duration or receipts", () => {
  for (const language of ["en", "ar"]) for (const own of [true, false]) {
    const element = React.createElement;
    const primitive = tag => ({ children }) => element(tag, null, children);
    const Row = load(new URL("../components/FetchChats.jsx", import.meta.url), {
      "react-native": { View: primitive("div"), Text: primitive("span"), Image: primitive("img"), TouchableOpacity: primitive("button") },
      "expo-router": { useRouter: () => ({}) },
      "react-i18next": { useTranslation: () => ({ i18n: { language } }) },
      "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
      "../utils/getColorfromId": { getColorFromId: () => "brown" },
      "./chat/chatText": { chatText },
      "./chat/MessageReceipt": { __esModule: true, default: () => element("i", { "data-receipt": true }) },
    });
    const html = renderToStaticMarkup(element(Row, { currentUserId: "a", item: { _id: "chat", participants: { _id: "b", FullName: "Peer" },
      lastMessageAt: 1, lastMessage: { senderId: own ? "a" : "b", deletedAt: 2, type: "audio", text: "Private text", audioDuration: 999 } } }));
    assert.ok(html.includes(own ? chatText[language].youDeletedMessage : chatText[language].messageDeleted));
    assert.doesNotMatch(html, /Private text|mic-outline|data-receipt|999/);
  }
});
