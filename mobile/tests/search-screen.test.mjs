import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import ts from "typescript";

function harness() {
  const slots = [], effects = [], cleanups = new Map(), timers = new Map(), cache = new Map();
  let index = 0, timerId = 0;
  const model = { input: null, buttons: [], images: [], queries: [], pages: [], routes: [], alerts: [], mutations: [],
    language: "en", session: { ready: true, profile: { _id: "viewer" } }, relationships: {},
    streams: { chats: { status: "Exhausted", results: [] }, people: { status: "Exhausted", results: [] },
      nicknameChats: { status: "Exhausted", results: [] }, nicknamePeople: { status: "Exhausted", results: [] } }, blurs: [] };
  const effect = (fn, deps = []) => {
    const i = index++;
    if (!slots[i] || deps.some((value, k) => value !== slots[i][k])) {
      cleanups.get(i)?.(); slots[i] = deps; effects.push(() => cleanups.set(i, fn()));
    }
  };
  const native = tag => function NativeStub(props) { model.views.push(props); return React.createElement(tag, null, props.children); };
  const mocks = {
    react: { ...React,
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffect: effect, useCallback: fn => fn, useMemo: fn => fn(),
    },
    "expo-router": {
      useRouter: () => ({ push: value => model.routes.push(value), back: () => model.routes.push("back") }),
      useFocusEffect: fn => effect(() => { const cleanup = fn(); if (cleanup) model.blurs.push(cleanup); return cleanup; }, []),
    },
    "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 12, bottom: 18 }) },
    "@expo/vector-icons": { Ionicons: () => null },
    "react-native": {
      View: native("div"), Text: native("span"), ActivityIndicator: native("progress"),
      Keyboard: { dismiss: () => {} }, Alert: { alert: (...args) => model.alerts.push(args) },
      TextInput(props) { model.input = props; return React.createElement("input", { placeholder: props.placeholder, value: props.value, readOnly: true }); },
      Image(props) { model.images.push(props); return React.createElement("img", { src: props.source.uri, alt: "" }); },
      TouchableOpacity(props) { model.buttons.push(props); return React.createElement("button", { "aria-label": props.accessibilityLabel }, props.children); },
      RefreshControl(props) { model.refresh = props; return null; },
      FlatList(props) { model.list = props; return React.createElement(React.Fragment, null,
        props.data.map(item => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item }))), props.refreshControl); },
    },
    "convex/react": {
      usePaginatedQuery(reference, args, options) {
        const name = getFunctionName(reference), kind = name.split(":")[1];
        const streamKey = args.field === "nickName" ? `nickname${kind[0].toUpperCase()}${kind.slice(1)}` : kind;
        model.queries.push({ name, args, options });
        if (args !== "skip" && model.queryFailure) throw Error("private server error");
        return { ...(args === "skip" ? { status: "LoadingFirstPage", results: [] } : model.streams[streamKey]), loadMore: count => model.pages.push({ kind: streamKey, count }) };
      },
      useQuery: (_, args) => model.relationships[args.userId],
      useMutation: reference => async args => {
        model.mutations.push({ name: getFunctionName(reference), args });
        if (model.mutationPromise) return model.mutationPromise;
        return { chatId: "opened_chat" };
      },
    },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const require = createRequire(path), module = { exports: {} }; cache.set(path, module);
    const localRequire = name => {
      if (mocks[name]) return mocks[name];
      if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => model.session };
      if (name.includes("store/") || name.includes("socketio")) throw Error("Legacy transport imported");
      if (!name.startsWith(".")) return require(name);
      let resolved; try { resolved = require.resolve(name); } catch { resolved = require.resolve(name + ".jsx"); }
      return load(resolved);
    };
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
    new Function("require", "module", "exports", "setTimeout", "clearTimeout", compiled.outputText)(localRequire, module, module.exports,
      (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id));
    return module.exports;
  }
  const resolve = path => fileURLToPath(new URL(path, import.meta.url));
  const screen = load(resolve("../components/search/SearchScreen.jsx"));
  const text = load(resolve("../components/search/searchText.js")).searchText;
  const userText = load(resolve("../components/users/contactText.js")).contactText;
  const User = load(resolve("../components/users/ConvexUserItem.jsx")).default;
  const Chat = load(resolve("../components/FetchChats.jsx")).default;
  function render(Component, props = {}) {
    index = 0; model.buttons = []; model.images = []; model.queries = []; model.views = []; model.input = null;
    const result = renderToStaticMarkup(React.createElement(Component, props));
    while (effects.length) effects.shift()();
    return result;
  }
  const props = () => ({ text: text[model.language], userText: userText[model.language], isArabic: model.language === "ar" });
  return { model, slots, screen, text, userText, User, Chat, render,
    home: () => render(screen.SearchHome, props()),
    homeTree: () => { index = 0; return screen.SearchHome(props()); },
    results: overrides => render(screen.SearchResults, { ...props(), query: "Name", tab: "all", onRefresh: () => model.refreshed = true, navigationActiveRef: { current: true }, ...overrides }),
    tick: () => { for (const [id, timer] of timers) { assert.equal(timer.delay, 300); timers.delete(id); timer.fn(); } },
    unmount: () => { for (const cleanup of cleanups.values()) cleanup?.(); }, timers,
  };
}

test("search waits 300ms, skips empty input and immediately removes old results while typing", () => {
  const h = harness(); assert.match(h.home(), /Search people and chats/); assert.deepEqual(h.model.queries, []);
  h.model.input.onChangeText("Sara"); h.home(); assert.deepEqual(h.model.queries, []); assert.equal(h.timers.size, 1);
  h.tick(); h.model.streams.people.results = [{ _id: "sara", fullName: "Sara Name" }];
  assert.match(h.home(), /Sara Name/); assert.equal(h.model.queries.length, 4);
  h.model.input.onChangeText("Moh"); assert.doesNotMatch(h.home(), /Sara Name/); assert.deepEqual(h.model.queries, []);
  h.model.input.onChangeText(""); assert.match(h.home(), /Type a full name/); assert.deepEqual(h.model.queries, []);
});

test("rapid query changes cancel earlier debounce timers and invalid input never queries", () => {
  const h = harness(); h.home(); h.model.input.onChangeText("Sa"); h.home(); h.model.input.onChangeText("Sarah"); h.home();
  assert.equal(h.timers.size, 1); h.tick(); h.home(); assert.ok(h.model.queries.every(q => q.args.query === "Sarah"));
  h.model.input.onChangeText("!?!"); assert.match(h.home(), /Use up to 80/); assert.deepEqual(h.model.queries, []);
  h.unmount(); assert.equal(h.timers.size, 0);
});

test("All, Chats and People subscribe independently with 20 candidates and native FlatList pagination", () => {
  const h = harness();
  h.model.streams.chats.status = "CanLoadMore"; h.model.streams.people.status = "LoadingMore";
  h.results(); assert.ok(h.model.queries.every(q => q.options.initialNumItems === 20)); assert.equal(h.model.queries.length, 4);
  h.model.list.onEndReached(); assert.deepEqual(h.model.pages, [{ kind: "chats", count: 20 }]);
  assert.equal(h.model.list.keyboardShouldPersistTaps, "handled"); assert.equal(h.model.list.contentContainerStyle.paddingBottom, 38);
  h.model.pages = []; h.results({ tab: "people" });
  assert.equal(h.model.queries[0].args, "skip"); assert.deepEqual(h.model.queries[1].args, { query: "Name" });
  h.results({ tab: "chats" }); assert.equal(h.model.queries[1].args, "skip");
});

test("sparse pages show explicit continuation instead of premature empty results; refresh and loading remain usable", () => {
  const h = harness(); h.model.streams.chats.status = "CanLoadMore";
  const html = h.results({ tab: "chats" }); assert.doesNotMatch(html, /No results/);
  h.model.buttons.find(b => b.accessibilityLabel === "Load more: Chats").onPress();
  assert.deepEqual(h.model.pages, [{ kind: "chats", count: 20 }]);
  h.model.refresh.onRefresh(); assert.equal(h.model.refreshed, true);
  h.model.streams.chats.status = "LoadingFirstPage"; assert.doesNotMatch(h.results({ tab: "chats" }), /No results/);
  h.model.streams.chats.status = "Exhausted"; assert.match(h.results({ tab: "chats" }), /No results/);
});

test("nickname-only matches appear in People and Chats and shared matches are rendered once", () => {
  const h = harness();
  const person = { _id: "friend", fullName: "Canonical Person", nickName: "Star Friend" };
  const chat = { chatId: "friend-chat", peer: person };
  h.model.streams.nicknamePeople.results = [person];
  h.model.streams.nicknameChats.results = [chat];
  h.results();
  assert.equal(h.model.list.data.filter(row => row.kind === "people").length, 1);
  assert.equal(h.model.list.data.filter(row => row.kind === "chats").length, 1);
  h.model.streams.people.results = [person]; h.model.streams.chats.results = [chat];
  h.results();
  assert.equal(h.model.list.data.filter(row => row.kind === "people").length, 1);
  assert.equal(h.model.list.data.filter(row => row.kind === "chats").length, 1);
  assert.equal(new Set(h.model.list.data.map(row => row.key)).size, h.model.list.data.length);
});

test("nickname streams retain their own continuation and do not show empty while either name search loads", () => {
  const h = harness();
  h.model.streams.nicknamePeople.status = "LoadingFirstPage";
  assert.doesNotMatch(h.results({ tab: "people" }), /No results/);
  h.model.streams.nicknamePeople.status = "CanLoadMore";
  h.results({ tab: "people" }); h.model.list.onEndReached();
  assert.deepEqual(h.model.pages, [{ kind: "nicknamePeople", count: 20 }]);
  h.model.pages = []; h.model.streams.people.status = "CanLoadMore";
  h.results({ tab: "people" }); h.model.buttons.find(button => button.accessibilityLabel === "Load more: People").onPress();
  assert.deepEqual(h.model.pages, [{ kind: "people", count: 20 }, { kind: "nicknamePeople", count: 20 }]);
  h.model.streams.nicknamePeople.status = "LoadingMore";
  h.model.pages = []; h.results({ tab: "people" }); h.model.list.onEndReached(); assert.deepEqual(h.model.pages, []);
});

test("chat search rows open the Convex conversation once and guard background taps", () => {
  const h = harness(), navigationActiveRef = { current: true };
  h.model.streams.chats.results = [{ chatId: "chat", peer: { _id: "peer", fullName: "Peer Name" }, unreadCount: 1 }];
  h.results({ navigationActiveRef }); const row = h.model.buttons.find(b => b.accessibilityLabel === "Peer Name");
  row.onPress(); row.onPress(); assert.equal(h.model.routes.length, 1);
  assert.deepEqual(h.model.routes[0], { pathname: "/chat/[id]", params: { id: "chat", source: "convex" } });
  assert.equal(navigationActiveRef.current, false);
});

test("People reuse friend chat creation with duplicate locks and suppress late navigation after blur", async () => {
  for (const teardown of ["blur", "unmount", "none"]) {
    const h = harness(), active = { current: true }; let resolve;
    h.model.relationships.friend = { status: "friends" };
    h.model.mutationPromise = new Promise(done => { resolve = done; });
    h.render(h.User, { item: { _id: "friend", fullName: "Friend" }, text: h.userText.en, navigationActiveRef: active });
    const row = h.model.buttons.find(b => b.accessibilityLabel === "Open conversation: Friend");
    const first = row.onPress(); await row.onPress(); assert.equal(h.model.mutations.length, 1);
    if (teardown === "blur") active.current = false; else if (teardown === "unmount") h.unmount();
    resolve({ chatId: "friend_chat" }); await first;
    assert.equal(h.model.routes.length, teardown === "none" ? 1 : 0);
  }
});

test("nonfriends open contact previews once and friend requests retain server-side mutation routing", async () => {
  const h = harness(), active = { current: true };
  h.model.relationships.person = { status: "none" };
  h.render(h.User, { item: { _id: "person", fullName: "Person" }, text: h.userText.en, navigationActiveRef: active });
  const send = h.model.buttons.find(b => b.accessibilityLabel === "Send friend request"); await Promise.all([send.onPress(), send.onPress()]);
  assert.equal(h.model.mutations.length, 1); assert.equal(h.model.mutations[0].name, "friendRequests:sendFriendRequest");
  const row = h.model.buttons.find(b => b.accessibilityLabel === "Open conversation: Person"); row.onPress(); row.onPress();
  assert.equal(h.model.routes.length, 1); assert.equal(h.model.routes[0].params.mode, "contact");
  assert.equal(h.model.routes[0].params.userId, "person");
});

test("failed profile images fall back to initials for People and Chats", () => {
  for (const kind of ["people", "chats"]) {
    const h = harness();
    const Component = kind === "people" ? h.User : h.Chat;
    const props = kind === "people" ? { item: { _id: "person", fullName: "Sarah", imageUrl: "https://example.com/fail" }, text: h.userText.en }
      : { item: { _id: "chat", participants: { _id: "person", FullName: "Sarah", avatar: "https://example.com/fail" } } };
    h.render(Component, props); assert.equal(h.model.images.length, 1); h.model.images[0].onError();
    assert.match(h.render(Component, props), />S</); assert.equal(h.model.images.length, 0);
  }
});

test("Arabic controls use RTL layout and clear/back actions; search state is keyed by authenticated account", () => {
  const h = harness(); h.model.language = "ar";
  assert.match(h.home(), /الأشخاص/); assert.equal(h.model.input.style.textAlign, "right");
  assert.ok(h.model.views.some(v => Array.isArray(v.style) && v.style.some(s => s.flexDirection === "row-reverse")));
  h.model.input.onChangeText("محمد"); h.home(); h.model.buttons.find(b => b.accessibilityLabel === h.text.ar.clear).onPress();
  h.home(); assert.equal(h.model.input.value, "");
  h.model.buttons.find(b => b.accessibilityLabel === h.text.ar.back).onPress(); assert.deepEqual(h.model.routes, ["back"]);
  assert.equal(h.screen.default().key, "viewer"); h.model.session.profile._id = "new_account"; assert.equal(h.screen.default().key, "new_account");
});

test("retry refreshes the query boundary without exposing server details", () => {
  const h = harness(); h.home(); h.model.input.onChangeText("Name"); h.home(); h.tick();
  // Inspect the actual boundary and exercise its fallback; server-side React
  // rendering cannot catch render errors through client Error Boundaries.
  const element = h.homeTree();
  const boundary = element.props.children.at(-1);
  h.render(() => boundary.props.fallback);
  assert.ok(h.model.buttons.some(b => b.accessibilityLabel === "Retry"));
  const before = h.slots[3]; h.model.buttons.find(b => b.accessibilityLabel === "Retry").onPress(); assert.equal(h.slots[3], before + 1);
});
