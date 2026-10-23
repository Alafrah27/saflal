import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import { contactSegments } from "../shared/contactOrder.js";

const launchSeed = "12345678-1234-4321-8123-123456789abc";
let seedCreations = 0;
import ts from "typescript";

// Render the real JSX with native primitives/transport replaced. This verifies
// screen wiring and callbacks, not native layout or live subscription behavior.
let model;
const element = React.createElement;
const primitive = tag => ({ children, accessibilityLabel }) => element(tag, { "aria-label": accessibilityLabel }, children);
const mocks = {
  react: { ...React, useState(initial) {
    const pair = React.useState(initial);
    return initial === "users" ? [model.view ?? "users", value => { model.view = value; }] : pair;
  } },
  "react-native": {
    View: primitive("div"), Text: primitive("span"),
    ActivityIndicator: primitive("progress"), Image: primitive("img"),
    Alert: { alert: (...args) => model.alerts.push(args) },
    TouchableOpacity(props) {
      model.buttons.push(props);
      return element("button", { "aria-label": props.accessibilityLabel }, props.children);
    },
    RefreshControl(props) { model.refresh = props; return null; },
    FlatList(props) {
      model.list = props;
      return element(React.Fragment, null,
        props.data.map(item => element(React.Fragment, { key: item._id }, props.renderItem({ item }))),
        props.data.length ? null : props.ListEmptyComponent,
        props.ListFooterComponent, props.refreshControl);
    },
  },
  "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
  "expo-crypto": { randomUUID: () => { seedCreations++; return launchSeed; } },
  "expo-router": { useRouter: () => ({ push: args => model.routes.push(args) }) },
  "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
  "convex/react": {
    usePaginatedQuery(reference, args, options) {
      if (args === "skip") return { results: [], status: "LoadingFirstPage", loadMore() {} };
      model.queries.push({ name: getFunctionName(reference), args, options });
      const index = args.source ? contactSegments(launchSeed, model.session.profile._id).findIndex(part => part.source === args.source && part.wrap === args.wrap) : -1;
      const data = index < 0 ? model.pagination : model.orderedStreams?.[index] ?? (index === 0 ? model.pagination : { results: [], status: "Exhausted" });
      return { ...data, loadMore: size => { model.pages.push(size); (model.pageSegments ??= []).push(index); } };
    },
    useQuery(reference, args) {
      model.queries.push({ name: getFunctionName(reference), args });
      return model.relationships[args.userId];
    },
    useMutation(reference) {
      return async args => {
        const name = getFunctionName(reference);
        model.mutations.push({ name, args });
        if (model.mutationError) throw model.mutationError;
        if (name === "chats:getOrCreateDirectChat") return model.chatResult ?? { chatId: "conversation" };
        return { requestId: "request", status: "pending" };
      };
    },
  },
};
const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const require = createRequire(path);
  const localRequire = name => {
    if (mocks[name]) return mocks[name];
    if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => model.session };
    if (!name.startsWith(".")) return require(name);
    let resolved;
    try { resolved = require.resolve(name); }
    catch { resolved = require.resolve(`${name}.jsx`); }
    return loadModule(resolved);
  };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
  return module.exports;
}
const Contacts = loadModule(fileURLToPath(new URL("../app/(tabs)/contact.jsx", import.meta.url))).default;
function render(overrides = {}) {
  model = {
    session: { ready: true, profile: { _id: "viewer" } }, language: "en",
    pagination: { status: "Exhausted", results: [] }, relationships: {},
    queries: [], mutations: [], buttons: [], pages: [], alerts: [], routes: [],
    ...overrides,
  };
  return renderToStaticMarkup(element(Contacts));
}

test("Contacts shows nickname instead of full name without changing the target identity", () => {
  const html = render({ pagination: { status: "Exhausted", results: [{ _id: "peer", fullName: "Canonical Name", nickName: "Contact Nick" }] } });
  assert.match(html, /Contact Nick/); assert.doesNotMatch(html, /Canonical Name/);
  assert.ok(model.buttons.some(button => button.accessibilityLabel?.includes("Contact Nick")));
});

test("contacts waits for a ready Clerk/Convex profile before subscribing", () => {
  const html = render({ session: { ready: false, profile: null } });
  assert.match(html, /Loading users/);
  assert.deepEqual(model.queries, []);
});

test("first-page loading never displays previous user results", () => {
  const html = render({ pagination: { status: "LoadingFirstPage", results: [{ _id: "old", fullName: "Old account data" }] } });
  assert.match(html, /Loading users/);
  assert.doesNotMatch(html, /Old account data/);
  assert.deepEqual(model.queries, contactSegments(launchSeed, "viewer").map(segment => ({ name: "contacts:listOrderedSegment", args: { seed: launchSeed, ...segment }, options: { initialNumItems: 20 } })));
});

test("an exhausted empty list displays the empty state", () => {
  assert.match(render(), /No users found/);
});

test("a filtered empty page offers continuation instead of falsely reporting no users", () => {
  const html = render({ pagination: { status: "CanLoadMore", results: [] } });
  assert.match(html, /Load more users/);
  assert.doesNotMatch(html, /No users found/);
  model.list.onEndReached();
  assert.deepEqual(model.pages, []);
  model.buttons.find(button => button.children?.props?.children === "Load more users").onPress();
  assert.deepEqual(model.pages, [20]);
});

test("discovery renders Convex profile fields and sends a request using the Convex ID", async () => {
  const html = render({
    pagination: { status: "Exhausted", results: [{ _id: "convex_user", fullName: "Visible User" }] },
    relationships: { convex_user: { status: "none" } },
  });
  assert.match(html, /Visible User/);
  assert.match(html, /Send friend request/);
  await model.buttons.find(button => button.accessibilityLabel === "Send friend request").onPress();
  assert.deepEqual(model.mutations, [{ name: "friendRequests:sendFriendRequest", args: { receiverId: "convex_user" } }]);
  assert.deepEqual(model.routes, []);
});

test("friends and pending requests render reactive states without legacy messaging actions", () => {
  const html = render({
    pagination: { status: "Exhausted", results: ["friend", "outgoing", "incoming"].map(_id => ({ _id, fullName: _id })) },
    relationships: { friend: { status: "friends" }, outgoing: { status: "outgoing_pending" }, incoming: { status: "incoming_pending" } },
  });
  assert.match(html, /Friends/);
  assert.match(html, /Request sent/);
  assert.match(html, /Request received/);
  assert.doesNotMatch(html, /Send friend request/);
  assert.deepEqual(model.mutations, []);
  assert.deepEqual(model.routes, []);
});

test("scroll pagination runs only when more data is available", () => {
  for (const status of ["Exhausted", "LoadingMore", "CanLoadMore"]) {
    render({ pagination: { status, results: [{ _id: "user", fullName: "User" }] }, relationships: { user: { status: "friends" } } });
    model.list.onEndReached();
    assert.deepEqual(model.pages, status === "CanLoadMore" ? [20] : []);
  }
});

test("a raced incoming request shows a safe message instead of claiming success", async () => {
  render({
    pagination: { status: "Exhausted", results: [{ _id: "user", fullName: "User" }] },
    relationships: { user: { status: "none" } }, mutationError: { data: "INCOMING_REQUEST_PENDING" },
  });
  await model.buttons.find(button => button.accessibilityLabel === "Send friend request").onPress();
  assert.deepEqual(model.alerts, [["Request unavailable", "You already have a request from this user."]]);
});

test("accepted contact taps create or reuse a chat and route with its conversation ID", async () => {
  render({
    pagination: { status: "Exhausted", results: [{ _id: "contact_user", fullName: "Friend" }] },
    relationships: { contact_user: { status: "friends" } },
  });
  await model.buttons.find(button => button.accessibilityLabel === "Open conversation: Friend").onPress();
  assert.deepEqual(model.mutations, [{ name: "chats:getOrCreateDirectChat", args: { userId: "contact_user" } }]);
  assert.deepEqual(model.routes, [{ pathname: "/chat/[id]", params: { id: "conversation", source: "convex" } }]);
});

test("rapid accepted-contact taps share the in-flight creation and navigate once", async () => {
  render({
    pagination: { status: "Exhausted", results: [{ _id: "contact_user", fullName: "Friend" }] },
    relationships: { contact_user: { status: "friends" } },
  });
  const open = model.buttons.find(button => button.accessibilityLabel === "Open conversation").onPress;
  await Promise.all([open(), open()]);
  assert.equal(model.mutations.length, 1);
  assert.equal(model.routes.length, 1);
});

test("failed chat creation shows a safe error and never navigates", async () => {
  render({
    pagination: { status: "Exhausted", results: [{ _id: "contact_user", fullName: "Friend" }] },
    relationships: { contact_user: { status: "friends" } }, mutationError: { data: "USER_UNAVAILABLE" },
  });
  await model.buttons.find(button => button.accessibilityLabel === "Open conversation").onPress();
  assert.deepEqual(model.routes, []);
  assert.deepEqual(model.alerts, [["Conversation unavailable", "This conversation could not be opened. Please try again."]]);
});

test("pending and nonfriend full-row taps open a read-only message preview without creating chats", async () => {
  for (const status of ["none", "incoming_pending", "outgoing_pending"]) {
    render({
      pagination: { status: "Exhausted", results: [{ _id: "contact_user", fullName: "User" }] },
      relationships: { contact_user: { status } },
    });
    const row = model.buttons.find(button => button.accessibilityLabel === "Open conversation: User");
    assert.equal(row.disabled, false);
    await row.onPress();
    assert.deepEqual(model.mutations, []);
    assert.deepEqual(model.routes, [{ pathname: "/chat/[id]", params: { id: "new", source: "convex", mode: "contact", userId: "contact_user" } }]);
    assert.deepEqual(model.alerts, []);
  }
});

test("a contact tap can open the preview while its relationship subscription is still loading", async () => {
  render({ pagination: { status: "Exhausted", results: [{ _id: "user", fullName: "User" }] }, relationships: {} });
  await model.buttons.find(button => button.accessibilityLabel === "Open conversation: User").onPress();
  assert.equal(model.routes[0].params.mode, "contact");
  assert.equal(model.routes[0].params.userId, "user");
  assert.deepEqual(model.mutations, []);
});

test("the entire accepted-contact row, including its padding, is the chat tap target", async () => {
  render({ pagination: { status: "Exhausted", results: [{ _id: "friend", fullName: "Friend" }] }, relationships: { friend: { status: "friends" } } });
  const row = model.buttons.find(button => button.accessibilityLabel === "Open conversation: Friend");
  assert.match(row.className, /py-4 px-3/);
  assert.equal(row.disabled, false);
  await row.onPress();
  assert.equal(model.routes[0].params.id, "conversation");
});

test("request and photo buttons stop the outer row press", async () => {
  render({ pagination: { status: "Exhausted", results: [{ _id: "user", fullName: "User", imageUrl: "https://example.com/photo" }] }, relationships: { user: { status: "none" } } });
  let stopped = 0;
  const event = { stopPropagation() { stopped++; } };
  await model.buttons.find(button => button.accessibilityLabel === "Send friend request").onPress(event);
  model.buttons.find(button => button.accessibilityLabel === "View profile photo").onPress(event);
  assert.equal(stopped, 2);
  assert.deepEqual(model.alerts, []);
  assert.deepEqual(model.mutations.map(call => call.name), ["friendRequests:sendFriendRequest"]);
  assert.deepEqual(model.routes, [{ pathname: "/imageView", params: { url: "https://example.com/photo" } }]);
});

test("Arabic labels and profile-photo navigation use the new data shape", () => {
  const html = render({ language: "ar", pagination: { status: "Exhausted", results: [{ _id: "user", fullName: "اسم", imageUrl: "https://example.com/photo" }] }, relationships: { user: { status: "none" } } });
  assert.match(html, /إرسال طلب صداقة/);
  model.buttons.find(button => button.accessibilityLabel === "عرض صورة الملف الشخصي").onPress();
  assert.deepEqual(model.routes, [{ pathname: "/imageView", params: { url: "https://example.com/photo" } }]);
});

test("Contacts defaults to Users and Requests switches to the private paginated inbox", () => {
  render();
  assert.equal(model.buttons.find(button => button.accessibilityLabel === "Users").accessibilityState.selected, true);
  model.buttons.find(button => button.accessibilityLabel === "Requests").onPress();
  model.queries = []; model.buttons = [];
  const html = renderToStaticMarkup(element(Contacts));
  assert.match(html, /No pending friend requests/);
  assert.deepEqual(model.queries, [{ name: "friendRequests:getPendingFriendRequests", args: {}, options: { initialNumItems: 20 } }]);
  assert.equal(model.buttons.find(button => button.accessibilityLabel === "Requests").accessibilityState.selected, true);
});

test("incoming Requests use request IDs for decisions, including a deleted sender", async () => {
  for (const sender of [{ fullName: "Sender" }, null]) {
    const html = render({ view: "requests", pagination: { status: "Exhausted", results: [
      { _id: "received_request", senderId: "peer_user", sender },
    ] } });
    assert.match(html, sender ? /Sender/ : /User unavailable/);
    await model.buttons.find(button => button.accessibilityLabel === "Decline").onPress();
    assert.deepEqual(model.mutations, [{ name: "friendRequests:rejectFriendRequest", args: { requestId: "received_request" } }]);
    assert.deepEqual(model.routes, []);
  }
});

test("Requests handles loading and sparse continuation without stale profiles", () => {
  let html = render({ view: "requests", pagination: { status: "LoadingFirstPage", results: [{ _id: "old", sender: { fullName: "Old account" } }] } });
  assert.match(html, /Loading friend requests/); assert.doesNotMatch(html, /Old account/);
  html = render({ view: "requests", pagination: { status: "CanLoadMore", results: [] } });
  assert.doesNotMatch(html, /No pending friend requests/);
  model.buttons.find(button => button.children?.props?.children === "Load more requests").onPress();
  assert.deepEqual(model.pages, [20]);
});

test("incoming discovery controls accept only the server-provided request and stop row navigation", async () => {
  render({ pagination: { status: "Exhausted", results: [{ _id: "peer", fullName: "Peer" }] },
    relationships: { peer: { status: "incoming_pending", requestId: "incoming_request" } } });
  let stopped = false;
  await model.buttons.find(button => button.accessibilityLabel === "Accept").onPress({ stopPropagation() { stopped = true; } });
  assert.equal(stopped, true);
  assert.deepEqual(model.mutations, [{ name: "friendRequests:acceptFriendRequest", args: { requestId: "incoming_request" } }]);
  assert.deepEqual(model.routes, []);
});

test("outgoing pending requests have no decision controls and Arabic requests expose both actions", () => {
  render({ pagination: { status: "Exhausted", results: [{ _id: "peer", fullName: "Peer" }] },
    relationships: { peer: { status: "outgoing_pending", requestId: "outgoing_request" } } });
  assert.equal(model.buttons.some(button => ["Accept", "Decline"].includes(button.accessibilityLabel)), false);
  const html = render({ language: "ar", view: "requests", pagination: { status: "Exhausted", results: [
    { _id: "request", sender: { fullName: "Sender" } },
  ] } });
  assert.match(html, /قبول/); assert.match(html, /رفض/);
});

test("Contacts keys its local view and subscriptions by the authenticated profile", () => {
  render();
  assert.equal(Contacts().key, `viewer:${launchSeed}`);
  model.session.profile._id = "another_account";
  assert.equal(Contacts().key, `another_account:${launchSeed}`);
});

test("friends across segments precede discovery and unfinished friends prevent discovery from rendering", () => {
  const ready = results => ({ status: "Exhausted", results });
  const segments = [ready([{ _id: "first", fullName: "First Friend" }]), ready([]),
    ready([{ _id: "second", fullName: "Second Friend" }, { _id: "first", fullName: "Duplicate Friend" }]), ready([]),
    { status: "CanLoadMore", results: [{ _id: "other", fullName: "Other User" }] }, ready([])];
  render({ orderedStreams: segments });
  assert.deepEqual(model.list.data.map(row => row._id), ["first", "second", "other"]);
  model.list.onEndReached(); assert.deepEqual(model.pageSegments, [4]);
  segments[0].status = "CanLoadMore";
  const html = render({ orderedStreams: segments });
  assert.deepEqual(model.list.data.map(row => row._id), ["first"]); assert.doesNotMatch(html, /Other User/);
  assert.equal(model.queries.filter(q => q.name === "contacts:listOrderedSegment").length, 6);
  model.list.onEndReached(); assert.deepEqual(model.pageSegments, [0]);
});

test("launch seed survives refresh, tab visits and component remounts while Requests keeps its original endpoint", () => {
  render(); const before = model.queries.map(query => query.args);
  model.refresh.onRefresh();
  render(); assert.deepEqual(model.queries.map(query => query.args), before);
  render({ view: "requests" }); assert.equal(model.queries[0].name, "friendRequests:getPendingFriendRequests");
  assert.ok(!model.queries.some(query => query.name === "contacts:listOrderedSegment"));
  render(); assert.deepEqual(model.queries.map(query => query.args), before);
  assert.equal(seedCreations, 1);
});
