import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import ts from "typescript";
import { callError, callText } from "../components/calls/callText.js";

// Execute the real screens/handlers with only native widgets and transport mocked.
// These tests do not assert native layout, real media, or live subscriptions.
let model;
const element = React.createElement;
const primitive = tag => props => {
  model.views.push(props);
  return element(tag, { "aria-label": props.accessibilityLabel }, props.children);
};
const stateStore = selector => selector({ callId: model.activeCallId });
stateStore.getState = () => ({ callId: model.activeCallId });
const sheetMethods = { present: () => model.presents++, dismiss: () => model.dismisses++ };
const mocks = {
  react: { ...React,
    useState(initial) {
      let value = typeof initial === "function" ? initial() : initial;
      if (initial === false) {
        const index = ++model.booleanState;
        if (index === 2) value = model.pickerOpen;
        if (index === 3) value = model.refreshing;
      }
      if (initial === null) value = model.failedUrl;
      return [value, next => model.writes.push(next)];
    },
    useRef(current) { const ref = { current }; model.refs.push(ref); return ref; },
    useEffect: fn => model.effects.push(fn), useCallback: fn => fn,
  },
  "react-native": {
    View: primitive("div"), Text: primitive("span"), ActivityIndicator: primitive("progress"),
    Image(props) { model.images.push(props); return element("img", { src: props.source.uri, alt: props.accessibilityLabel }); },
    RefreshControl(props) { model.refreshControl = props; return null; },
    TouchableOpacity(props) { model.buttons.push(props); return element("button", { disabled: props.disabled, "aria-label": props.accessibilityLabel }, props.children); },
    FlatList(props) {
      model.historyList = props;
      return element(React.Fragment, null, props.data.map((item, index) => element(React.Fragment, { key: props.keyExtractor(item) },
        props.renderItem({ item, index }))), props.data.length ? null : props.ListEmptyComponent, props.ListFooterComponent, props.refreshControl);
    },
    Alert: { alert: (...args) => model.alerts.push(args) },
    AppState: { addEventListener(name, fn) { model.appState = fn; return { remove: () => model.removed++ }; } },
    BackHandler: { addEventListener(name, fn) { model.back = fn; return { remove: () => model.removed++ }; } },
  },
  "@gorhom/bottom-sheet": {
    BottomSheetModal(props) { props.ref.current = sheetMethods; model.sheet = props; return element("aside", null, props.children); },
    BottomSheetBackdrop: () => null,
    BottomSheetFlatList(props) {
      model.contactList = props;
      return element("div", null, props.data.map(item => element(React.Fragment, { key: item._id }, props.renderItem({ item }))),
        props.data.length ? null : props.ListEmptyComponent, props.ListFooterComponent);
    },
  },
  "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
  "expo-router": { useRouter: () => ({ push: route => model.routes.push(route) }), useFocusEffect: fn => model.focusEffects.push(fn) },
  "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 34 }) },
  "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
  "convex/react": {
    usePaginatedQuery(reference, args, options) {
      const name = getFunctionName(reference);
      model.queries.push({ name, args, options });
      const data = name === "calls:history" ? model[args.direction] : model.contacts;
      return { ...data, loadMore: size => model.pages.push({ direction: args.direction ?? "contacts", size }) };
    },
    useMutation(reference) { return async args => {
      model.mutations.push({ name: getFunctionName(reference), args });
      if (model.mutationError) throw model.mutationError;
      return model.chatPromise ?? { chatId: "chat" };
    }; },
  },
};
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }, require = createRequire(path);
  cache.set(path, module);
  const localRequire = name => {
    if (mocks[name]) return mocks[name];
    if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => model.session };
    if (name.endsWith("/store/callStore")) return { useCallStore: stateStore };
    if (name === "./CallProvider") return {
      callRoute: callId => ({ pathname: "/call/voice", params: { callId } }),
      useAudioCalls: () => ({ starting: model.starting, startCall: async chatId => {
        model.starts.push(chatId);
        if (model.callError) throw model.callError;
        return model.startPromise;
      } }),
    };
    if (!name.startsWith(".")) return require(name);
    let resolved;
    try { resolved = require.resolve(name); } catch { resolved = require.resolve(`${name}.jsx`); }
    return load(resolved);
  };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  new Function("require", "module", "exports", "setTimeout", "clearTimeout", compiled.outputText)(localRequire, module, module.exports,
    (fn, delay) => { model.timers.push({ fn, delay }); return model.timers.length; }, id => model.cleared.push(id));
  return module.exports;
}
const screen = load(fileURLToPath(new URL("../components/calls/CallsScreen.jsx", import.meta.url)));
const Avatar = load(fileURLToPath(new URL("../components/calls/CallAvatar.jsx", import.meta.url))).default;
const History = load(fileURLToPath(new URL("../components/calls/CallHistory.jsx", import.meta.url))).default;
const Boundary = load(fileURLToPath(new URL("../components/chat/ChatQueryBoundary.jsx", import.meta.url))).default;
function setup(overrides = {}) {
  model = { session: { ready: true, profile: { _id: "viewer" } }, language: "en", pickerOpen: false, refreshing: false,
    incoming: { results: [], status: "Exhausted" }, outgoing: { results: [], status: "Exhausted" }, contacts: { results: [], status: "Exhausted" },
    activeCallId: null, starting: false, failedUrl: null, booleanState: 0, presents: 0, dismisses: 0, removed: 0,
    queries: [], pages: [], buttons: [], images: [], views: [], refs: [], effects: [], focusEffects: [], writes: [], timers: [], cleared: [],
    alerts: [], routes: [], mutations: [], starts: [], ...overrides };
}
function render(overrides = {}) { setup(overrides); return renderToStaticMarkup(element(screen.default)); }
const call = (extra = {}) => ({ _id: "call", createdAt: Date.now(), _creationTime: 1, direction: "incoming", status: "missed", chatId: "chat",
  peer: { _id: "peer", fullName: "Full Contact Name", imageUrl: "https://example.com/avatar.png" }, ...extra });

test("call history and the call picker prefer current nicknames", () => {
  const peer = { _id: "peer", fullName: "Canonical Name", nickName: "Call Nick" };
  assert.match(render({ incoming: { results: [call({ peer })], status: "Exhausted" } }), /Call Nick/);
  const html = render({ pickerOpen: true, contacts: { results: [peer], status: "Exhausted" } });
  assert.match(html, /Call Nick/); assert.doesNotMatch(html, /Canonical Name/);
});

test("Calls waits for auth, keys its subscriptions by account, and loads both bounded directions", () => {
  assert.match(render({ session: { ready: false, profile: null } }), /Loading calls/);
  assert.deepEqual(model.queries, []);
  render();
  assert.deepEqual(model.queries.map(q => [q.name, q.args, q.options.initialNumItems]), [
    ["calls:history", { direction: "incoming" }, 20], ["calls:history", { direction: "outgoing" }, 20],
  ]);
  assert.equal(screen.default().key, "viewer");
  model.session.profile._id = "next";
  assert.equal(screen.default().key, "next");
});

test("rows show fullName, image, day, missed label, local time and authenticated call-back", async () => {
  const html = render({ incoming: { results: [call()], status: "Exhausted" } });
  assert.match(html, /Full Contact Name/); assert.match(html, /Today/); assert.match(html, /Missed call/);
  assert.equal(model.images[0].source.uri, "https://example.com/avatar.png");
  assert.ok(model.views.some(p => p.style?.color === "#dc2626"));
  assert.equal(model.historyList.contentContainerStyle.paddingBottom, 134);
  await model.buttons.find(b => b.accessibilityLabel === "Call back: Full Contact Name").onPress();
  assert.deepEqual(model.starts, ["chat"]); assert.deepEqual(model.mutations, []);
});

test("loading hides stale rows; exhausted empty history shows useful guidance", () => {
  const html = render({ incoming: { results: [call()], status: "LoadingFirstPage" } });
  assert.doesNotMatch(html, /Full Contact Name/); assert.match(html, /Loading calls/);
  assert.match(render(), /No recent calls/); assert.match(render(), /New Call/);
});

test("missing users have a fallback and disabled callback; failed images use initials", () => {
  assert.match(render({ incoming: { results: [call({ peer: null })], status: "Exhausted" } }), /Unavailable user/);
  assert.equal(model.buttons.find(b => b.accessibilityLabel === "Call back: Unavailable user").disabled, true);
  setup();
  renderToStaticMarkup(element(Avatar, { peer: call().peer, name: "Full Contact Name" }));
  model.images[0].onError();
  model.failedUrl = model.writes.at(-1);
  assert.equal(model.failedUrl, call().peer.imageUrl);
  assert.match(renderToStaticMarkup(element(Avatar, { peer: call().peer, name: "Full Contact Name" })), />F</);
});

test("New Call presents the sheet and its paginated friends use full names/images and direct-chat lookup", async () => {
  render(); model.buttons.find(b => b.accessibilityLabel === "New Call").onPress(); assert.equal(model.presents, 1);
  const html = render({ pickerOpen: true, contacts: { results: [call().peer], status: "Exhausted" } });
  assert.match(html, /Choose a contact/);
  assert.deepEqual(model.queries.at(-1), { name: "contacts:listUsers", args: { friendsOnly: true }, options: { initialNumItems: 20 } });
  await model.buttons.find(b => b.accessibilityLabel === "Call: Full Contact Name").onPress();
  assert.deepEqual(model.mutations, [{ name: "chats:getOrCreateDirectChat", args: { userId: "peer" } }]);
  assert.deepEqual(model.starts, ["chat"]); assert.equal(model.dismisses, 1);
});

test("sparse picker pages offer load-more and only exhausted pages show no-friends guidance", () => {
  let html = render({ pickerOpen: true, contacts: { results: [], status: "CanLoadMore" } });
  assert.doesNotMatch(html, /No friends available/);
  model.contactList.ListFooterComponent.props.onPress();
  assert.deepEqual(model.pages, [{ direction: "contacts", size: 20 }]);
  html = render({ pickerOpen: true }); assert.match(html, /No friends available/);
  model.buttons.find(b => b.children?.props?.children === "Contacts").onPress();
  assert.deepEqual(model.routes, ["/(tabs)/contact"]);
});

test("history scroll requests only the newest unfinished boundary and does not overlap loading", () => {
  render({ incoming: { results: [call({ createdAt: 90 })], status: "CanLoadMore" },
    outgoing: { results: [call({ _id: "older", createdAt: 10 })], status: "CanLoadMore" } });
  model.historyList.onEndReached(); model.historyList.onEndReached();
  assert.deepEqual(model.pages, [{ direction: "incoming", size: 20 }]);
  render({ incoming: { results: [call()], status: "LoadingMore" } });
  model.historyList.onEndReached(); assert.deepEqual(model.pages, []);
});

test("FlatList uses call IDs and renders a day header only at the first call of each day", () => {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  render({ incoming: { status: "Exhausted", results: [
    call({ _id: "first", createdAt: today.getTime() }),
    call({ _id: "second", createdAt: today.getTime() - 1000 }),
    call({ _id: "third", createdAt: yesterday.getTime() }),
  ] } });
  assert.deepEqual(model.historyList.data.map(item => model.historyList.keyExtractor(item)), ["first", "second", "third"]);
  assert.equal(model.historyList.initialNumToRender, 20);
  assert.equal(model.historyList.onEndReachedThreshold, 0.4);
  const headers = model.views.filter(view => view.accessibilityRole === "header").map(view => view.children);
  assert.equal(headers.filter(title => title === "Today").length, 1);
  assert.equal(headers.filter(title => title === "Yesterday").length, 1);
});

test("pull-to-refresh is available on populated and empty history and resets both page subscriptions", () => {
  for (const results of [[], [call()]]) {
    render({ incoming: { results, status: "Exhausted" } });
    assert.equal(model.historyList.alwaysBounceVertical, true);
    assert.equal(model.refreshControl.refreshing, false);
    const refresh = model.refreshControl.onRefresh;
    refresh(); refresh();
    assert.equal(model.writes.filter(value => value === true).length, 1);
    const revisionUpdates = model.writes.filter(value => typeof value === "function");
    assert.equal(revisionUpdates.length, 1);
    assert.equal(revisionUpdates[0](0), 1);
  }
});

test("refresh stays visible while either first page loads and blocks scroll pagination", () => {
  render({ refreshing: true, incoming: { results: [call()], status: "LoadingFirstPage" },
    outgoing: { results: [], status: "Exhausted" } });
  assert.equal(model.refreshControl.refreshing, true);
  assert.deepEqual(model.historyList.data, []);
  assert.equal(model.historyList.ListEmptyComponent, null);
  model.historyList.onEndReached(); assert.deepEqual(model.pages, []);
  render({ refreshing: true, incoming: { results: [call()], status: "CanLoadMore" } });
  model.historyList.onEndReached(); assert.deepEqual(model.pages, []);
});

test("refresh completion clears its indicator and allows a later pull", () => {
  setup();
  const pages = History({});
  pages.props.onRefresh(); pages.props.onRefresh();
  assert.equal(model.writes.length, 2);
  pages.props.onRefreshComplete();
  assert.equal(model.writes.at(-1), false);
  pages.props.onRefresh();
  assert.equal(model.writes.filter(value => typeof value === "function").length, 2);
});

test("rapid contact taps share one chat lookup and one call start", async () => {
  let resolve;
  const chatPromise = new Promise(done => { resolve = done; });
  render({ pickerOpen: true, chatPromise, contacts: { results: [call().peer], status: "Exhausted" } });
  const press = model.buttons.find(b => b.accessibilityLabel === "Call: Full Contact Name").onPress;
  const first = press(), second = press();
  assert.equal(model.mutations.length, 1); assert.deepEqual(model.starts, []);
  resolve({ chatId: "chat" }); await Promise.all([first, second]);
  assert.deepEqual(model.starts, ["chat"]);
});

test("raced blocking/unfriending and microphone errors produce safe messages", async () => {
  render({ pickerOpen: true, mutationError: { data: "USER_UNAVAILABLE" }, contacts: { results: [call().peer], status: "Exhausted" } });
  await model.buttons.find(b => b.accessibilityLabel === "Call: Full Contact Name").onPress();
  assert.deepEqual(model.starts, []); assert.deepEqual(model.alerts, [["Calls", callText.en.unavailable]]);
  render({ callError: Error("microphone permission denied"), incoming: { results: [call()], status: "Exhausted" } });
  await model.buttons.find(b => b.accessibilityLabel === "Call back: Full Contact Name").onPress();
  assert.deepEqual(model.alerts, [["Calls", callText.en.permission]]);
});

test("an active call returns to its route; call setup disables new actions", async () => {
  render({ activeCallId: "active", incoming: { results: [call()], status: "Exhausted" } });
  await model.buttons.find(b => b.accessibilityLabel === "Call back: Full Contact Name").onPress();
  assert.deepEqual(model.starts, []); assert.deepEqual(model.routes, [{ pathname: "/call/voice", params: { callId: "active" } }]);
  render({ starting: true, incoming: { results: [call()], status: "Exhausted" } });
  assert.equal(model.buttons.find(b => b.accessibilityLabel === "New Call").disabled, true);
  assert.equal(model.buttons.find(b => b.accessibilityLabel === "Call back: Full Contact Name").disabled, true);
});

test("account teardown and tab blur cancel late contact lookup results", async () => {
  for (const blur of [false, true]) {
    let resolve;
    render({ pickerOpen: true, chatPromise: new Promise(done => { resolve = done; }), contacts: { results: [call().peer], status: "Exhausted" } });
    const cleanup = blur ? model.focusEffects[0]() : model.effects[0]();
    const pending = model.buttons.find(b => b.accessibilityLabel === "Call: Full Contact Name").onPress();
    cleanup(); const writes = model.writes.length;
    resolve({ chatId: "old-account-chat" }); await pending;
    assert.deepEqual(model.starts, []);
    if (!blur) assert.equal(model.writes.length, writes);
  }
});

test("day labels refresh on foreground/midnight and event listeners/timers clean up", () => {
  render(); const cleanup = model.effects[1]();
  assert.equal(model.timers.length, 1); assert.ok(model.timers[0].delay > 0 && model.timers[0].delay <= 86400000);
  model.appState("active"); assert.equal(model.timers.length, 2);
  model.timers[1].fn(); assert.equal(model.timers.length, 3);
  cleanup(); assert.equal(model.removed, 1); assert.ok(model.cleared.length >= 3);
});

test("Arabic rows, dates and picker use RTL direction without reversing rows twice", () => {
  const html = render({ language: "ar", pickerOpen: true, incoming: { results: [call()], status: "Exhausted" } });
  assert.match(html, /اليوم/); assert.match(html, /مكالمة فائتة/); assert.match(html, /مكالمة جديدة/);
  assert.ok(model.views.some(p => p.style?.direction === "rtl" && p.style.flexDirection === "row"));
  assert.ok(model.buttons.some(p => p.style?.direction === "rtl" && p.style.flexDirection === "row"));
  assert.ok(model.views.some(p => p.style?.alignItems === "flex-start" && p.style.flex === 1));
  assert.equal(model.buttons.find(p => p.accessibilityLabel === callText.ar.newCall).style.end, 20);
});

test("query-error fallbacks expose a retry action without replacing the other tab UI", () => {
  setup(); let retried = 0;
  const boundary = new Boundary({ fallback: element(screen.CallListError, { message: callText.en.historyError, text: callText.en, onRetry: () => retried++ }), children: element("span", null, "loaded") });
  boundary.state = Boundary.getDerivedStateFromError(Error("query failure"));
  assert.match(renderToStaticMarkup(boundary.render()), /Could not load your calls/);
  model.buttons[0].onPress(); assert.equal(retried, 1);
});

test("the actual shared provider denies microphone access before creating or navigating to a call", async () => {
  const path = fileURLToPath(new URL("../components/calls/CallProvider.jsx", import.meta.url));
  const require = createRequire(path), module = { exports: {} };
  const effects = { requests: 0, alerts: [], routes: [], permissions: 0 };
  const providerMocks = {
    react: { ...React, useCallback: fn => fn, useEffect: () => {}, useRef: current => ({ current }), useState: initial => [initial, () => {}] },
    "react-native": { Platform: { OS: "android" }, Alert: { alert: (...args) => effects.alerts.push(args) },
      PermissionsAndroid: { PERMISSIONS: { RECORD_AUDIO: "microphone" }, RESULTS: { GRANTED: "granted" },
        request: async () => { effects.permissions++; return "denied"; } } },
    "convex/react": { useAction: () => async () => { effects.requests++; } },
    "expo-crypto": { randomUUID: () => "request-key" },
    "expo-notifications": { requestPermissionsAsync: async () => {} },
    "expo-router": { useRouter: () => ({ push: route => effects.routes.push(route) }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({}) },
    "react-i18next": { useTranslation: () => ({ i18n: { language: "en" } }) },
    "../../convex/_generated/api": { api: { streamCalls: { startCall: "start" } } },
    "../../context/AuthSessionContext": { useAuthSession: () => ({ ready: true, profile: { _id: "user" } }) },
    "../../store/callStore": { useCallStore: { setState() {}, getState: () => ({ reset() {} }) } },
    "../../lib/streamRuntime": { createStreamClient: async () => ({}), streamSDK: () => null },
    "../chat/ChatQueryBoundary": {}, "./callText": { callText, callError },
  };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  new Function("require", "module", "exports", compiled.outputText)(name => providerMocks[name] ?? require(name), module, module.exports);
  const outer = module.exports.default({ children: null });
  const provider = outer.type(outer.props);
  await provider.props.value.startCall("chat");
  assert.equal(effects.permissions, 1); assert.equal(effects.requests, 0);
  assert.deepEqual(effects.routes, []); assert.deepEqual(effects.alerts, [["Calls", callText.en.permission]]);
});
