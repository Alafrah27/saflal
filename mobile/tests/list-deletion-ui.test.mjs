import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import ts from "typescript";

function harness(kind = "chat", language = "en") {
  const slots = [], effects = [], cleanups = [], cache = new Map(); let index = 0, current;
  const model = { buttons: [], pressables: [], views: [], mutations: [], language, routes: [], mutationError: null, mutationPromise: null };
  const native = tag => function NativeStub(props) { model.views.push(props); return React.createElement(tag, null, props.children); };
  const mocks = {
    react: { ...React,
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffect(fn) { const i = index++; if (!(i in slots)) { slots[i] = true; effects.push(fn); } },
      useCallback: fn => fn, useMemo: fn => fn(),
    },
    "expo-router": { useFocusEffect: fn => { const i = index++; if (!(i in slots)) { slots[i] = true; model.blur = fn(); } },
      useRouter: () => ({ push: route => model.routes.push(route) }) },
    "react-i18next": { useTranslation: () => ({ i18n: { language: model.language } }) },
    "convex/react": { useMutation: reference => async args => { model.mutations.push({ name: getFunctionName(reference), args });
      if (model.mutationError) throw model.mutationError; return model.mutationPromise; } },
    "react-native": { View: native("div"), Text: native("span"), Image: native("span"), ActivityIndicator: native("progress"),
      TouchableOpacity(props) { model.buttons.push(props); return React.createElement("button", { disabled: props.disabled, "aria-label": props.accessibilityLabel }, props.children); },
      Pressable(props) { model.pressables.push(props); return React.createElement("div", null, props.children); },
      Modal(props) { model.modal = props; return React.createElement("aside", null, props.children); } },
    "@expo/vector-icons": { Ionicons: () => null },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const require = createRequire(path), module = { exports: {} }; cache.set(path, module);
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), { fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
    const localRequire = name => {
      if (mocks[name]) return mocks[name];
      if (name === "./CallAvatar") return function CallAvatarStub(props) { return React.createElement("span", null, props.name); };
      if (!name.startsWith(".")) return require(name);
      let resolved; try { resolved = require.resolve(name); } catch { resolved = require.resolve(name + ".jsx"); }
      return load(resolved);
    };
    new Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
    return module.exports;
  }
  const resolve = relative => fileURLToPath(new URL(relative, import.meta.url));
  const invokeDeletion = load(resolve("../hooks/useListDeletion.js")).default;
  const Controls = load(resolve("../components/CustomHookUi/ListDeletionControls.jsx")).default;
  const Modal = load(resolve("../components/CustomHookUi/ActionModel.jsx")).default;
  const ChatRow = load(resolve("../components/FetchChats.jsx")).default;
  const CallRow = load(resolve("../components/calls/CallHistory.jsx")).CallHistoryRow;
  const render = () => {
    index = 0; current = invokeDeletion(kind);
    while (effects.length) cleanups.push(effects.shift()());
    return current;
  };
  const renderElement = (Component, props) => {
    model.buttons = []; model.pressables = []; model.views = []; model.modal = null;
    return renderToStaticMarkup(React.createElement(Component, props));
  };
  return { model, render, controls: () => renderElement(Controls, { deletion: render() }),
    renderElement, Modal, ChatRow, CallRow, unmount: () => { for (const cleanup of cleanups) cleanup?.(); } };
}

test("long-press selection toggles rows, caps selection at 50 and can cancel without mutations", () => {
  const h = harness(); h.render().toggle("first"); assert.equal(h.render().active, true);
  h.render().toggle("first"); assert.equal(h.render().active, false);
  for (let i = 0; i < 51; i++) h.render().toggle(String(i));
  assert.equal(h.render().selected.size, 50); assert.match(h.controls(), /up to 50/);
  h.render().cancel(); assert.equal(h.render().selected.size, 0); assert.deepEqual(h.model.mutations, []);
});

test("the shared native Modal freezes selected IDs and blocks duplicate submits, backdrop/back/cancel while pending", async () => {
  const h = harness(); let resolve;
  h.model.mutationPromise = new Promise(done => { resolve = done; });
  h.render().toggle("first"); h.render().open(); h.render().toggle("second");
  const first = h.render().confirm(), second = h.render().confirm();
  assert.equal(h.model.mutations.length, 1); assert.deepEqual(h.model.mutations[0].args, { chatIds: ["first"] });
  assert.match(h.controls(), /Deleting/); assert.equal(h.model.buttons.at(-1).disabled, true);
  h.model.modal.onRequestClose(); h.model.pressables[0].onPress(); h.render().close(); h.render().cancel();
  assert.ok(h.render().dialog); assert.equal(h.render().selected.size, 1);
  let stopped = false; h.model.pressables[1].onPress({ stopPropagation: () => { stopped = true; } }); assert.equal(stopped, true);
  resolve(); await Promise.all([first, second]); assert.equal(h.render().active, false); assert.equal(h.render().dialog, null);
});

test("mutation errors keep the Modal and selection, exposing retry for the same snapshot", async () => {
  const h = harness("call"); h.render().toggle("call"); h.render().open();
  h.model.mutationError = { data: "CALL_HISTORY_ACTIVE" }; await h.render().confirm();
  assert.match(h.controls(), /End the active call/); assert.match(h.controls(), /Retry deletion/);
  assert.equal(h.render().selected.size, 1);
  h.model.mutationError = null; await h.render().confirm();
  assert.deepEqual(h.model.mutations.map(m => m.args), [{ callIds: ["call"] }, { callIds: ["call"] }]);
  assert.equal(h.render().dialog, null);
});

test("generic failures are safe; tab blur and account teardown discard late errors and selection", async () => {
  for (const teardown of ["blur", "unmount"]) {
    const h = harness(); let reject;
    h.model.mutationPromise = new Promise((_, fail) => { reject = fail; });
    h.render().toggle("chat"); h.render().open(); const pending = h.render().confirm();
    if (teardown === "blur") { h.model.blur(); assert.equal(h.render().active, false); } else h.unmount();
    reject(Error("PRIVATE_BACKEND_DATA")); await pending;
    assert.equal(h.render().error, "");
  }
  const h = harness(); h.render().toggle("chat"); h.render().open(); h.model.mutationError = Error("PRIVATE_BACKEND_DATA");
  await h.render().confirm(); assert.match(h.controls(), /Check your connection/); assert.doesNotMatch(h.controls(), /PRIVATE_BACKEND_DATA/);
});

test("Arabic selection counts, dialog labels and action ordering use the shared localized UI", () => {
  const h = harness("chat", "ar"); h.render().toggle("chat"); h.render().open();
  assert.match(h.controls(), /حذف المحادثات/); assert.match(h.controls(), /لن يتغير سجل الطرف الآخر/);
  assert.ok(h.model.views.some(v => v.style?.flexDirection === "row-reverse"));
});

test("the legacy Modal still invokes and closes immediately unless controlled completion is requested", () => {
  const h = harness(); let calls = 0, closes = 0;
  h.renderElement(h.Modal, { visible: true, title: "Legacy", cancelLabel: "Cancel", actionLabel: "Delete", onHandleFn: () => calls++, onClose: () => closes++ });
  h.model.buttons.at(-1).onPress(); assert.equal(calls, 1); assert.equal(closes, 1);
  h.renderElement(h.Modal, { visible: false }); assert.equal(h.model.modal, null);
});

test("chat row press toggles selection instead of opening the conversation", () => {
  const h = harness(); let toggles = 0, opened = 0;
  h.renderElement(h.ChatRow, { item: { _id: "chat", participants: { _id: "peer", FullName: "Contact" } }, selectionMode: true,
    isSelected: true, onSelect: () => toggles++, onLongPress: () => toggles++, onOpen: () => opened++ });
  h.model.buttons[0].onPress(); h.model.buttons[0].onLongPress();
  assert.equal(toggles, 2); assert.equal(opened, 0); assert.equal(h.model.buttons[0].accessibilityState.selected, true);
});

test("call rows prevent callback during selection and live rows cannot be selected", () => {
  const h = harness("call"); let called = 0;
  h.render().toggle("historic");
  const props = { call: { _id: "historic", status: "ended", direction: "outgoing", createdAt: 1, peer: { fullName: "Contact" }, chatId: "chat" },
    text: { unavailableUser: "Unavailable", callBack: "Call back", outgoingLabel: "Outgoing" }, language: "en", onCall: () => called++, deletion: h.render() };
  h.renderElement(h.CallRow, props);
  assert.equal(h.model.buttons.at(-1).disabled, true); h.model.buttons.at(-1).onPress(); assert.equal(called, 0);
  h.renderElement(h.CallRow, { ...props, call: { ...props.call, status: "accepted" } });
  assert.equal(h.model.buttons[0].onLongPress, undefined); assert.equal(h.model.buttons[0].disabled, true);
});
