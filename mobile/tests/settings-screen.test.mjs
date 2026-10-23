import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import ts from "typescript";
import { settingsText } from "../components/profile/settingsText.js";

let model;
const element = React.createElement;
const primitive = tag => props => { model.views.push(props); return element(tag, null, props.children); };
const mocks = {
  react: { ...React, useState(initial) {
    let value = initial;
    if (initial === false) value = ++model.booleanState === 1 ? model.languageOpen : model.busy;
    if (initial === null) value = model.permission;
    return [value, next => model.writes.push(next)];
  }, useRef: current => ({ current }), useEffect: fn => model.effects.push(fn) },
  "react-native": {
    View: primitive("div"), Text: primitive("span"), ActivityIndicator: primitive("progress"), Modal: primitive("aside"),
    TouchableOpacity(props) { model.buttons.push(props); return element("button", { "aria-label": props.accessibilityLabel, disabled: props.disabled }, props.children); },
    Switch(props) { model.switches.push(props); return element("input", { type: "checkbox", checked: props.value, readOnly: true, disabled: props.disabled, "aria-label": props.accessibilityLabel }); },
    AppState: { addEventListener: () => ({ remove() {} }) },
    Linking: { openSettings: async () => { model.openedDeviceSettings++; } },
    Alert: { alert: (...args) => model.alerts.push(args) },
  },
  "@expo/vector-icons": { Ionicons: ({ name }) => element("i", { "data-icon": name }) },
  "expo-router": { useRouter: () => ({ push: route => (model.routes ??= []).push(route) }) },
  "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
  "convex/react": { useMutation: reference => async args => {
    model.mutations.push({ name: getFunctionName(reference), args });
    if (model.mutationError) throw model.mutationError;
    return model.mutationPromise;
  }, useAction: reference => async args => {
    model.actions.push({ name: getFunctionName(reference), args });
    if (model.deletionError) throw model.deletionError;
    return model.deletionPromise ?? { accepted: true };
  } },
  "expo-notifications": {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    getPermissionsAsync: async () => model.permissionPromise ?? model.systemPermission,
    requestPermissionsAsync: async () => { model.permissionRequests++; return model.requestedPermission; },
  },
};
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const require = createRequire(path), module = { exports: {} }; cache.set(path, module);
  const localRequire = name => {
    if (mocks[name]) return mocks[name];
    if (name.endsWith("/context/AuthSessionContext")) return { useAuthSession: () => model.session };
    if (name.endsWith("/context/LngContext")) return { useContextProvider: () => ({ loading: model.changingLanguage, changeLanguage: async language => {
      model.languages.push(language);
      if (model.languageError) throw model.languageError;
      return model.languagePromise;
    } }) };
    if (name.endsWith("/store/callStore")) return { useCallStore: selector => selector({ callState: model.activeCall ? "active" : "idle" }) };
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
const Preferences = load(fileURLToPath(new URL("../components/profile/SettingsPreferences.jsx", import.meta.url))).default;
const Card = load(fileURLToPath(new URL("../components/profile/SettingsCard.jsx", import.meta.url))).default;
const AccountActions = load(fileURLToPath(new URL("../components/profile/SettingsAccountActions.jsx", import.meta.url))).default;
function setup(overrides = {}) {
  model = { language: "en", languageOpen: false, busy: false, changingLanguage: false, activeCall: false, permission: null,
    session: { ready: true, profile: { _id: "viewer", clerkId: "clerk_viewer" },
      clerkUser: { id: "clerk_viewer", primaryEmailAddress: { emailAddress: "signed-in@example.com" } } },
    systemPermission: { granted: true, status: "granted", canAskAgain: true }, requestedPermission: { granted: true, status: "granted" },
    permissionRequests: 0, booleanState: 0, openedDeviceSettings: 0,
    mutations: [], actions: [], logouts: 0, writes: [], effects: [], buttons: [], switches: [], views: [], alerts: [], languages: [], ...overrides };
  model.session.logout ??= async () => { model.logouts++; if (model.logoutError) throw model.logoutError; };
}
function render(overrides = {}) { setup(overrides); return renderToStaticMarkup(element(Preferences)); }

test("settings displays the current Clerk primary email and defaults existing notification preference to on", () => {
  const html = render();
  assert.match(html, /signed-in@example.com/); assert.match(html, /Email address/); assert.match(html, /Language/);
  assert.equal(model.switches.length, 1); assert.equal(model.switches[0].value, true);
  assert.deepEqual(model.mutations, []);
});
test("email never falls back to a previous account or an unrelated email resource", () => {
  const html = render({ session: { ready: true, profile: { clerkId: "current" },
    clerkUser: { id: "previous", primaryEmailAddress: { emailAddress: "private-old@example.com" } } } });
  assert.doesNotMatch(html, /private-old/); assert.match(html, /No email address available/);
});
test("one reusable SettingsCard handles navigation, read-only details and native trailing controls", () => {
  setup(); let presses = 0;
  renderToStaticMarkup(element(Card, { icon: "language-outline", title: "Language", onPress: () => presses++ }));
  model.buttons[0].onPress(); assert.equal(presses, 1);
  setup();
  renderToStaticMarkup(element(Card, { icon: "mail-outline", title: "Email", subtitle: "a@example.com", selectable: true }));
  assert.equal(model.buttons.length, 0); assert.ok(model.views.some(p => p.selectable));
  setup();
  renderToStaticMarkup(element(Card, { icon: "notifications-outline", title: "Notifications", children: element(mocks["react-native"].Switch, { value: true }) }));
  assert.equal(model.switches.length, 1);
});
test("native notification switch persists the explicit value once even after rapid taps", async () => {
  let resolve;
  render({ mutationPromise: new Promise(done => { resolve = done; }) });
  const first = model.switches[0].onValueChange(false), second = model.switches[0].onValueChange(false);
  assert.deepEqual(model.mutations, [{ name: "users:setNotifications", args: { enabled: false } }]);
  resolve(); await Promise.all([first, second]);
  assert.equal(model.permissionRequests, 0);
});
test("pending provider sync disables the switch and failed sync offers an explicit retry", async () => {
  const session = { ready: true, profile: { notificationsEnabled: false, notificationSyncStatus: "pending" } };
  assert.match(render({ session }), /Saving notification settings/);
  assert.equal(model.switches[0].disabled, true);
  await model.switches[0].onValueChange(true); assert.deepEqual(model.mutations, []);
  session.profile.notificationSyncStatus = "failed";
  assert.match(render({ session }), /could not sync/);
  await model.buttons.find(b => b.accessibilityLabel === "Retry").onPress();
  assert.deepEqual(model.mutations[0].args, { enabled: false });
});
test("enabling requests device permission; denied permission keeps notifications off", async () => {
  const session = { ready: true, profile: { notificationsEnabled: false } };
  render({ session, systemPermission: { granted: false, status: "undetermined", canAskAgain: true } });
  await model.switches[0].onValueChange(true);
  assert.equal(model.permissionRequests, 1); assert.deepEqual(model.mutations[0].args, { enabled: true });
  render({ session, systemPermission: { granted: false, status: "denied", canAskAgain: false } });
  await model.switches[0].onValueChange(true);
  assert.deepEqual(model.mutations, []); assert.equal(model.permissionRequests, 0);
  await model.alerts[0][2][1].onPress(); assert.equal(model.openedDeviceSettings, 1);
});
test("provisional iOS permission is accepted; save errors do not claim success", async () => {
  render({ session: { ready: true, profile: { notificationsEnabled: false } }, systemPermission: { granted: false, ios: { status: 3 } } });
  await model.switches[0].onValueChange(true); assert.equal(model.mutations.length, 1);
  render({ mutationError: Error("PRIVATE_FAILURE_DATA") });
  await model.switches[0].onValueChange(false);
  assert.deepEqual(model.alerts, [["Settings", settingsText.en.saveError]]);
});
test("language card opens a picker and a selection uses the existing saved-language flow", async () => {
  render(); model.buttons.find(b => b.accessibilityLabel === "Language: English").onPress();
  assert.equal(model.writes.at(-1), true);
  const html = render({ languageOpen: true }); assert.match(html, /Choose your language/);
  const choose = model.buttons.find(b => b.accessibilityLabel === "العربية").onPress;
  await Promise.all([choose(), choose()]);
  assert.deepEqual(model.languages, ["ar"]); assert.equal(model.writes.at(-1), false);
});
test("language changes preserve active calls and report safe failures", async () => {
  render({ activeCall: true });
  assert.equal(model.buttons.find(b => b.accessibilityLabel?.startsWith("Language:")).disabled, true);
  render({ languageOpen: true, languageError: Error("PRIVATE_LANGUAGE_ERROR") });
  await model.buttons.find(b => b.accessibilityLabel === "العربية").onPress();
  assert.deepEqual(model.alerts, [["Language", settingsText.en.languageError]]);
});

test("language switching shows a translated busy panel and prevents closing the picker", () => {
  for (const language of ["en", "ar"]) {
    const html = render({ language, languageOpen: true, changingLanguage: true });
    assert.ok(html.includes(settingsText[language].changingLanguage));
    const progress = model.views.find(view => view.accessibilityRole === "progressbar");
    assert.equal(progress.accessibilityState.busy, true);
    assert.equal(progress.accessibilityLabel, settingsText[language].changingLanguage);
    assert.ok(!model.buttons.some(button => button.accessibilityLabel === "English"));
    model.views.find(view => view.onRequestClose).onRequestClose();
    assert.deepEqual(model.writes, []);
  }
});
test("Arabic labels and reusable card alignment follow the current application language", () => {
  const html = render({ language: "ar" }); assert.match(html, /البريد الإلكتروني/); assert.match(html, /الإشعارات/);
  assert.ok(model.views.some(p => p.style?.direction === "rtl"));
  assert.ok(model.buttons.some(p => p.style?.direction === "rtl" && p.style.flexDirection === "row"));
  assert.ok(model.views.some(p => p.style?.alignItems === "flex-start" && p.style.flex === 1));
});
test("account teardown cancels a permission result before it can change a different account", async () => {
  let resolve;
  render({ session: { ready: true, profile: { notificationsEnabled: false } }, permissionPromise: new Promise(done => { resolve = done; }) });
  const cleanup = model.effects[0]();
  const pending = model.switches[0].onValueChange(true);
  cleanup(); resolve({ granted: true, status: "granted" }); await pending;
  assert.deepEqual(model.mutations, []); assert.deepEqual(model.alerts, []);
});

function renderAccountActions(overrides = {}) { setup(overrides); return renderToStaticMarkup(element(AccountActions)); }
const confirmDestructive = () => model.alerts.at(-1)[2].find(button => button.style === "destructive").onPress();

test("logout and delete account share the grouped card style and translated destructive controls", () => {
  assert.match(renderAccountActions(), /Log Out/); assert.equal(model.buttons.length, 2);
  assert.ok(model.views.some(v => Array.isArray(v.style) && v.style[0]?.borderRadius === 18));
  assert.match(renderAccountActions({ language: "ar" }), /حذف الحساب/);
  assert.ok(model.buttons.some(v => v.style?.direction === "rtl" && v.style.flexDirection === "row"));
});

test("logout/delete confirmations support cancellation and suppress repeated alert taps", () => {
  renderAccountActions();
  const button = model.buttons.find(b => b.accessibilityLabel === "Delete Account");
  button.onPress(); button.onPress(); assert.equal(model.alerts.length, 1);
  assert.match(model.alerts[0][1], /Messages and call history/);
  model.alerts[0][2].find(b => b.style === "cancel").onPress();
  assert.deepEqual(model.actions, []); assert.equal(model.logouts, 0);
  button.onPress(); assert.equal(model.alerts.length, 2);
});

test("confirmed logout invokes the existing shared session logout", async () => {
  renderAccountActions(); model.buttons.find(b => b.accessibilityLabel === "Log Out").onPress();
  await confirmDestructive(); assert.equal(model.logouts, 1); assert.deepEqual(model.actions, []);
});

test("confirmed deletion sends explicit intent once and signs out after acceptance", async () => {
  let resolve;
  renderAccountActions({ deletionPromise: new Promise(done => { resolve = done; }) });
  model.buttons.find(b => b.accessibilityLabel === "Delete Account").onPress();
  const confirm = model.alerts[0][2].find(b => b.style === "destructive").onPress;
  const first = confirm(), second = confirm();
  assert.deepEqual(model.actions, [{ name: "accountDeletionActions:request", args: { confirmation: "DELETE" } }]);
  assert.equal(model.logouts, 0); resolve({ accepted: true }); await Promise.all([first, second]);
  assert.equal(model.logouts, 1);
});

test("active calls block the UI and server-rejected calls/configuration failures never sign out", async () => {
  renderAccountActions({ activeCall: true }); model.buttons.find(b => b.accessibilityLabel === "Delete Account").onPress();
  assert.deepEqual(model.alerts, [[settingsText.en.deleteAccount, settingsText.en.deleteActiveCall]]);
  assert.deepEqual(model.actions, []);
  for (const [data, expected] of [["ACCOUNT_DELETE_ACTIVE_CALL", settingsText.en.deleteActiveCall], ["ACCOUNT_DELETE_UNAVAILABLE", settingsText.en.deleteUnavailable]]) {
    renderAccountActions({ deletionError: { data } });
    model.buttons.find(b => b.accessibilityLabel === "Delete Account").onPress(); await confirmDestructive();
    assert.deepEqual(model.alerts.at(-1), [settingsText.en.error, expected]); assert.equal(model.logouts, 0);
  }
});

test("accepted deletion reports a sign-out error accurately; stale account callbacks do not sign out another account", async () => {
  renderAccountActions({ logoutError: Error("PRIVATE") }); model.buttons.find(b => b.accessibilityLabel === "Delete Account").onPress();
  await confirmDestructive(); assert.deepEqual(model.alerts.at(-1), [settingsText.en.error, settingsText.en.logoutError]);
  let resolve;
  renderAccountActions({ deletionPromise: new Promise(done => { resolve = done; }) });
  const cleanup = model.effects[0](); model.buttons.find(b => b.accessibilityLabel === "Delete Account").onPress();
  const pending = confirmDestructive(); cleanup(); resolve({ accepted: true }); await pending;
  assert.equal(model.logouts, 0);
});
