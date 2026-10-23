import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import ts from "typescript";
import { getFunctionName } from "convex/server";
import { settingsText } from "../components/profile/settingsText.js";

function harness(language = "en") {
  const h = { profile: { _id: "viewer", nickName: "Saved nick", bio: "Saved bio" }, ready: true, calls: [] };
  const slots = [], cleanups = []; let index = 0, focus;
  const mocks = {
    react: { ...React, useCallback: fn => fn, useState(initial) {
      const i = index++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }];
    }, useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
    useEffect(fn) { const i = index++; if (!(i in cleanups)) cleanups[i] = fn(); } },
    "react-native": { View: "View", Text: "Text", TextInput: "Input", TouchableOpacity: "Button", Modal: "Modal", ScrollView: "ScrollView", KeyboardAvoidingView: "KeyboardAvoidingView", ActivityIndicator: "Spinner", Platform: { OS: "android" } },
    "expo-router": { useFocusEffect(fn) { if (!focus) focus = fn(); } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 34 }) },
    "react-i18next": { useTranslation: () => ({ i18n: { language } }) },
    "convex/react": { useMutation: reference => async args => { h.calls.push({ name: getFunctionName(reference), args }); if (h.fail) throw Error("private provider error"); return h.transport?.(); } },
    "../../context/AuthSessionContext": { useAuthSession: () => ({ ready: h.ready, profile: h.profile }) },
    "./SettingsCard": { __esModule: true, default: "Card", settingsGroupStyle: {} },
  };
  const path = fileURLToPath(new URL("../components/profile/SettingsProfileEditor.jsx", import.meta.url));
  const module = { exports: {} }, require = createRequire(path);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", compiled)(name => mocks[name] ?? require(name), module, module.exports);
  h.render = () => { index = 0; h.tree = module.exports.default(); return h.tree; };
  h.find = predicate => {
    const visit = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(visit)
      : [...(predicate(node) ? [node] : []), ...visit(node.props?.children)];
    return visit(h.tree);
  };
  h.open = () => { h.find(node => node.type === "Card")[0].props.onPress(); h.render(); };
  h.input = (label, value) => { h.find(node => node.type === "Input" && node.props.accessibilityLabel === label)[0].props.onChangeText(value); h.render(); };
  h.save = () => h.find(node => node.type === "Button" && node.props.accessibilityLabel === settingsText[language].saveProfile)[0];
  h.blur = () => focus?.(); h.unmount = () => { h.blur(); cleanups.forEach(fn => fn?.()); };
  h.render(); return h;
}

test("Settings editor opens current nickname/bio in both languages, cancels without writes and uses latest profile on reopen", () => {
  for (const language of ["en", "ar"]) {
    const h = harness(language), text = settingsText[language]; h.open();
    assert.deepEqual(h.find(node => node.type === "Input").map(node => node.props.value), ["Saved nick", "Saved bio"]);
    assert.equal(h.save().props.disabled, true);
    h.input(text.nickName, "Changed"); assert.equal(h.save().props.disabled, false);
    h.find(node => node.type === "Modal")[0].props.onRequestClose(); h.render();
    assert.equal(h.find(node => node.type === "Modal").length, 0); assert.deepEqual(h.calls, []);
    h.profile = { ...h.profile, nickName: "Updated elsewhere" }; h.render(); h.open();
    assert.equal(h.find(node => node.type === "Input")[0].props.value, "Updated elsewhere"); h.unmount();
  }
});

test("save submits nickname/bio without identity, suppresses duplicate taps and protects pending close", async () => {
  let finish; const h = harness(); h.transport = () => new Promise(resolve => { finish = resolve; }); h.open();
  h.input(settingsText.en.nickName, "My nick"); h.input(settingsText.en.bio, "A new bio");
  const action = h.save().props.onPress, pending = action(); await action(); h.render();
  assert.equal(h.save().props.disabled, true); h.find(node => node.type === "Modal")[0].props.onRequestClose(); h.render();
  assert.equal(h.find(node => node.type === "Modal").length, 1);
  assert.deepEqual(h.calls, [{ name: "users:updateProfile", args: { nickName: "My nick", bio: "A new bio" } }]);
  finish(); await pending; h.render(); assert.equal(h.find(node => node.type === "Modal").length, 0); h.unmount();
});

test("nickname/bio limits prevent writes; save failure preserves draft and permits clearing/retry", async () => {
  const h = harness(); h.open(); h.input(settingsText.en.nickName, "x".repeat(51));
  assert.equal(h.save().props.disabled, true); await h.save().props.onPress(); assert.deepEqual(h.calls, []);
  h.input(settingsText.en.nickName, "Valid"); h.input(settingsText.en.bio, "x".repeat(501)); assert.equal(h.save().props.disabled, true);
  h.input(settingsText.en.nickName, ""); h.input(settingsText.en.bio, ""); h.fail = true;
  await h.save().props.onPress(); h.render();
  assert.ok(h.find(node => node.props?.accessibilityRole === "alert").some(node => node.props.children === settingsText.en.profileSaveError));
  assert.deepEqual(h.find(node => node.type === "Input").map(node => node.props.value), ["", ""]);
  h.fail = false; await h.save().props.onPress(); h.render(); assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[1].args, { nickName: "", bio: "" }); h.unmount();
});

test("blur and unmount invalidate old save handlers; signed-out Settings cannot open the editor", async () => {
  const h = harness(); h.open(); h.input(settingsText.en.nickName, "A draft");
  const action = h.save().props.onPress; h.blur(); await action(); assert.deepEqual(h.calls, []); h.unmount();
  const signedOut = harness(); signedOut.ready = false; signedOut.render(); signedOut.open();
  assert.equal(signedOut.find(node => node.type === "Modal").length, 0); signedOut.unmount();
});
