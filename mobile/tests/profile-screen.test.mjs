import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import ts from "typescript";
import { getFunctionName } from "convex/server";
import { profileText } from "../components/profile/profileText.js";

// Run the actual JSX handlers with persistent hook state. Native layout,
// navigation, Convex subscriptions and transport are replaced, not device tested.
function harness(overrides = {}) {
  const h = { language: "en", status: { isBlockedByMe: false },
    profile: { _id: "peer", fullName: "Profile Peer", bio: "Hello", email: "friend@example.com", createdAt: 1, imageUrl: "https://example.com/photo" },
    target: { userId: "peer", chatId: "chat" }, queries: [], mutations: [], routes: [], closes: 0,
    pagination: { results: [], status: "Exhausted" }, pages: [], ...overrides };
  const slots = [], deps = [], cleanups = [], focusCleanups = [];
  let index = 0, effects = [];
  const mocks = {
    react: { ...React,
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useCallback(fn) { return fn; },
      useEffect(fn, dependencies) { const i = index++;
        if (!deps[i] || dependencies.some((value, j) => value !== deps[i][j])) {
          deps[i] = dependencies; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); });
        }
      },
    },
    "react-native": { View: "View", Text: "Text", TouchableOpacity: "Button", Image: "Image", ScrollView: "ScrollView",
      ActivityIndicator: "Spinner", FlatList: "FlatList", RefreshControl: "RefreshControl", useWindowDimensions: () => ({ height: 800 }) },
    "expo-router": { useRouter: () => ({ push: route => h.routes.push(route), back() {} }),
      useFocusEffect(fn) { if (!h.focused) { h.focused = true; focusCleanups.push(fn()); } } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    "react-i18next": { useTranslation: () => ({ i18n: { language: h.language } }) },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "convex/react": {
      useQuery(reference, args) { const name = getFunctionName(reference); h.queries.push({ name, args });
        return args === "skip" ? undefined : name === "profiles:get" ? h.profile : h.status; },
      useMutation(reference) { return async args => { h.mutations.push({ name: getFunctionName(reference), args });
        if (h.fail) throw Error("private provider details"); return h.transport?.(); }; },
      usePaginatedQuery(reference, args, options) { h.queries.push({ name: getFunctionName(reference), args, options });
        return { ...h.pagination, loadMore: count => h.pages.push(count) }; },
    },
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const require = createRequire(path), module = { exports: {} }; cache.set(path, module);
    const localRequire = name => {
      if (mocks[name]) return mocks[name];
      if (name.endsWith("/ActionModel")) return { __esModule: true, default: "ActionModal" };
      if (name.endsWith("/ChatQueryBoundary")) return { __esModule: true, default: "Boundary" };
      if (name === "./ProfileAvatar") return { __esModule: true, default: "ProfileAvatar" };
      if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => ({ ready: true, profile: { _id: "viewer" } }) };
      if (!name.startsWith(".")) return require(name);
      let resolved;
      try { resolved = require.resolve(name); } catch { resolved = require.resolve(`${name}.jsx`); }
      return load(resolved);
    };
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
    new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
    return module.exports;
  }
  h.modules = load(fileURLToPath(new URL("../components/profile/UserProfileModal.jsx", import.meta.url)));
  h.avatar = load(fileURLToPath(new URL("../components/profile/ProfileAvatar.jsx", import.meta.url))).default;
  h.blocked = load(fileURLToPath(new URL("../components/profile/BlockedUsersScreen.jsx", import.meta.url)));
  h.render = (component = h.modules.ProfileDialog, props = {}) => {
    index = 0; effects = [];
    h.tree = component({ target: h.target, language: h.language, onClose: () => h.closes++, ...props });
    effects.forEach(fn => fn()); return h.tree;
  };
  h.find = predicate => {
    const visit = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(visit)
      : [...(predicate(node) ? [node] : []), ...visit(node.props?.children)];
    return visit(h.tree);
  };
  h.text = () => h.find(node => node.type === "Text").map(node => node.props.children).join(" ");
  h.blur = () => focusCleanups.forEach(fn => fn?.());
  h.unmount = () => { h.blur(); cleanups.forEach(fn => fn?.()); };
  return h;
}

test("profile renders authorized details in English/Arabic and opens only the server-returned photo", () => {
  for (const language of ["en", "ar"]) {
    const h = harness({ language }); h.render();
    assert.match(h.text(), /Profile Peer/); assert.match(h.text(), /friend@example.com/); assert.match(h.text(), /Hello/);
    assert.ok(h.text().includes(profileText[language].joined));
    assert.equal(h.tree.props.isArabic, language === "ar");
    assert.deepEqual(h.queries, [{ name: "blockedUsers:getBlockingStatus", args: { blockedId: "peer" } },
      { name: "profiles:get", args: { userId: "peer", chatId: "chat" } }]);
    h.find(node => node.type === "Button")[0].props.onPress();
    assert.equal(h.closes, 1); assert.deepEqual(h.routes, [{ pathname: "/imageView", params: { url: "https://example.com/photo" } }]);
    h.unmount();
  }
});

test("loading/unavailable profiles cannot block; absent optional details show honest fallbacks", async () => {
  for (const profile of [undefined, null]) {
    const h = harness({ profile }); h.render();
    assert.equal(h.tree.props.actionDisabled, true);
    await h.tree.props.onHandleFn(); assert.deepEqual(h.mutations, []);
    if (profile === undefined) assert.equal(h.find(node => node.type === "Spinner").length, 1);
    else assert.ok(h.text().includes(profileText.en.unavailable));
    h.unmount();
  }
  const h = harness({ profile: { _id: "peer", fullName: "Minimal" } }); h.render();
  for (const key of ["noEmail", "noBio", "noDate"]) assert.ok(h.text().includes(profileText.en[key]));
  const photo = h.find(node => node.type === "Button")[0]; assert.equal(photo.props.disabled, true);
  photo.props.onPress(); assert.deepEqual(h.routes, []); h.unmount();
});

test("blocking requires confirmation; cancel preserves the profile and rapid confirm taps submit once", async () => {
  let finish;
  const h = harness({ transport: () => new Promise(resolve => { finish = resolve; }) }); h.render();
  await h.tree.props.onHandleFn(); h.render(); assert.equal(h.tree.props.title, profileText.en.blockTitle);
  assert.deepEqual(h.mutations, []); h.tree.props.onClose(); h.render();
  assert.equal(h.tree.props.title, profileText.en.profile); assert.equal(h.closes, 0);
  await h.tree.props.onHandleFn(); h.render();
  const action = h.tree.props.onHandleFn, pending = action(); await action(); h.render();
  assert.equal(h.tree.props.isLoading, true); h.tree.props.onClose(); assert.equal(h.closes, 0);
  assert.deepEqual(h.mutations, [{ name: "blockedUsers:blockUser", args: { blockedId: "peer" } }]);
  h.status = { isBlockedByMe: true }; finish(); await pending; h.render();
  assert.equal(h.tree.props.actionLabel, profileText.en.unblock); assert.equal(h.tree.props.title, profileText.en.profile); h.unmount();
});

test("mutation failure keeps confirmation retryable and hides private error details", async () => {
  const h = harness({ fail: true }); h.render(); await h.tree.props.onHandleFn(); h.render();
  await h.tree.props.onHandleFn(); h.render(); assert.equal(h.tree.props.error, profileText.en.saveError);
  assert.equal(h.tree.props.isLoading, false); assert.equal(h.tree.props.title, profileText.en.blockTitle);
  h.fail = false; await h.tree.props.onHandleFn(); h.render(); assert.equal(h.mutations.length, 2);
  assert.equal(h.tree.props.error, ""); assert.equal(h.tree.props.title, profileText.en.profile); h.unmount();
});

test("a missing profile can still be unblocked; unblock-only waits for status and handles stale rows", async () => {
  for (const status of [undefined, { isBlockedByMe: false }, { isBlockedByMe: true }]) {
    const h = harness({ profile: null, status }), render = () => h.render(h.modules.ProfileDialog, { unblockOnly: true }); render();
    assert.equal(h.tree.props.actionDisabled, status?.isBlockedByMe !== true);
    assert.equal(h.queries.find(query => query.name === "profiles:get").args, "skip");
    await h.tree.props.onHandleFn();
    assert.equal(h.mutations.length, status?.isBlockedByMe === true ? 1 : 0);
    assert.equal(h.closes, status?.isBlockedByMe === true ? 1 : 0);
    if (status?.isBlockedByMe === false) assert.equal(h.tree.props.description, profileText.en.notBlocked);
    h.unmount();
  }
  const h = harness({ profile: null, status: { isBlockedByMe: true } }); h.render();
  assert.equal(h.tree.props.actionDisabled, false); await h.tree.props.onHandleFn(); h.render();
  await h.tree.props.onHandleFn(); assert.equal(h.mutations[0].name, "blockedUsers:unblockUser"); h.unmount();
});

test("blur/unmount disables stale actions and completion does not close another screen", async () => {
  const h = harness(); h.render(); const photo = h.find(node => node.type === "Button")[0];
  const act = h.tree.props.onHandleFn; h.blur(); await act(); photo.props.onPress();
  assert.deepEqual(h.mutations, []); assert.deepEqual(h.routes, []); h.unmount();
  let finish;
  const pending = harness({ status: { isBlockedByMe: true }, transport: () => new Promise(resolve => { finish = resolve; }) });
  pending.render(pending.modules.ProfileDialog, { unblockOnly: true }); const action = pending.tree.props.onHandleFn();
  pending.unmount(); finish(); await action; assert.equal(pending.closes, 0);
});

test("profile query boundary offers a close action and remounts the query on retry", () => {
  const h = harness(); h.render(h.modules.default);
  assert.equal(h.tree.type, "Boundary"); assert.equal(h.tree.props.fallback.props.description, profileText.en.error);
  const key = h.tree.key; h.tree.props.fallback.props.onHandleFn(); h.render(h.modules.default);
  assert.notEqual(h.tree.key, key); h.tree.props.fallback.props.onClose(); assert.equal(h.closes, 1); h.unmount();
});

test("failed profile images use initials and a new photo URL can load again", () => {
  const h = harness(); const render = user => h.render(h.avatar, { user, size: 96 });
  render(h.profile); assert.equal(h.tree.type, "Image"); h.tree.props.onError(); render(h.profile);
  assert.equal(h.tree.type, "View"); assert.match(h.text(), /P/);
  render({ ...h.profile, imageUrl: "https://example.com/new" }); assert.equal(h.tree.type, "Image");
  render(null); assert.match(h.text(), /\?/); h.unmount();
});

test("blocked list paginates in bounded pages and opens unblock for the row's real ID", () => {
  const rows = [{ _id: "block", blockedId: "peer", user: { fullName: "Blocked Peer" } }];
  const h = harness({ pagination: { results: rows, status: "CanLoadMore" } }), targets = [];
  h.render(h.blocked.BlockedUsersList, { text: profileText.en, onUnblock: target => targets.push(target) });
  assert.equal(h.queries[0].options.initialNumItems, 20); assert.equal(h.tree.type, "FlatList");
  h.tree.props.onEndReached(); assert.deepEqual(h.pages, [20]);
  const list = h.tree; h.tree = list.props.renderItem({ item: rows[0] });
  h.find(node => node.type === "Button")[0].props.onPress(); assert.deepEqual(targets, [{ userId: "peer" }]);
  h.pagination.status = "Exhausted";
  h.render(h.blocked.BlockedUsersList, { text: profileText.en }); h.tree.props.onEndReached(); assert.deepEqual(h.pages, [20]); h.unmount();
});
