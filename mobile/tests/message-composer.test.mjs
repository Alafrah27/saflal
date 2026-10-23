import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getFunctionName } from "convex/server";
import ts from "typescript";
import { api } from "../convex/_generated/api.js";
import { chatText } from "../components/chat/chatText.js";

function harness() {
  const slots = [], cleanups = []; let index = 0, unmounted = false, uuid = 0;
  const h = { calls: [], buttons: [], inputs: [], views: [], lateWrites: 0, transport: async () => ({ messageId: "saved" }) };
  const element = React.createElement, primitive = tag => ({ children }) => element(tag, null, children);
  const mocks = {
    react: { ...React,
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { if (unmounted) h.lateWrites++; slots[i] = value; }]; },
      useEffect(fn) { const i = index++; if (!(i in slots)) { slots[i] = true; cleanups.push(fn()); } },
    },
    "react-native": { View: props => { h.views.push(props); return element("div", null, props.children); }, Text: primitive("span"), ActivityIndicator: primitive("progress"),
      TextInput(props) { h.inputs.push(props); return element("input", { value: props.value, onChange() {}, readOnly: !props.editable }); },
      TouchableOpacity(props) { h.buttons.push(props); return element("button", { disabled: props.disabled }, props.children); } },
    "@expo/vector-icons": { Ionicons: () => null },
    "expo-crypto": { randomUUID: () => `message-operation-${++uuid}` },
    "convex/react": { useMutation: ref => async args => { h.calls.push({ name: getFunctionName(ref), args }); return h.transport(); } },
    "../../convex/_generated/api": { api },
    "./VoiceRecorder": { __esModule: true, default: props => {
      h.voice = props;
      h.buttons.push({ accessibilityLabel: props.text.voiceStart, disabled: false, onPress() {} });
      return element("button", { "aria-label": props.text.voiceStart }, "Mic");
    } },
  };
  const path = fileURLToPath(new URL("../components/chat/ConvexMessageComposer.jsx", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports);
  h.render = () => { index = 0; h.buttons = []; h.inputs = []; h.views = [];
    return renderToStaticMarkup(element(module.exports.default, { chatId: "authorized_chat", text: chatText.en })); };
  h.type = body => { h.inputs[0].onChangeText(body); h.render(); };
  h.unmount = () => { cleanups.forEach(fn => fn?.()); unmounted = true; };
  h.render(); return h;
}

test("accepted composer input is editable and typing valid text enables Send", async () => {
  const h = harness(); assert.equal(h.inputs[0].editable, true); assert.equal(h.buttons[0].disabled, false);
  assert.equal(h.buttons[0].accessibilityLabel, chatText.en.voiceStart);
  h.type("  hello  "); assert.equal(h.buttons[0].disabled, false);
  await h.buttons[0].onPress(); h.render();
  assert.deepEqual(h.calls, [{ name: "messages:sendText", args: { chatId: "authorized_chat", text: "hello", clientMessageId: "message-operation-1" } }]);
  assert.equal(h.inputs[0].value, ""); assert.equal(h.buttons[0].accessibilityLabel, chatText.en.voiceStart);
});

test("recording keeps the text field's layout space so the mic stays in place", () => {
  const h = harness();
  h.voice.onPhaseChange("recording"); h.render();
  let field = h.views.find(props => props.style?.borderRadius === 24);
  assert.equal(field.style.display, "flex"); assert.equal(field.style.opacity, 0);
  assert.equal(h.inputs[0].editable, false); assert.equal(field.pointerEvents, "none");
  h.voice.onPhaseChange("preview"); h.render();
  field = h.views.find(props => props.style?.borderRadius === 24);
  assert.equal(field.style.display, "none");
  h.voice.onPhaseChange("idle"); h.render();
  field = h.views.find(props => props.style?.borderRadius === 24);
  assert.equal(field.style.opacity, 1); assert.equal(h.inputs[0].editable, true);
});

test("blank or oversized drafts stay unsendable", async () => {
  const h = harness();
  h.type("  \n\t"); assert.equal(h.buttons[0].accessibilityLabel, chatText.en.voiceStart); await h.buttons[0].onPress();
  h.type("x".repeat(4001)); assert.equal(h.buttons[0].disabled, true); await h.buttons[0].onPress();
  assert.deepEqual(h.calls, []); assert.equal(h.inputs[0].maxLength, 4000);
});

test("pending sends lock input and Send and suppress rapid double taps", async () => {
  const h = harness(); h.type("hello"); let resolve;
  h.transport = () => new Promise(done => { resolve = done; });
  const submit = h.buttons[0].onPress, pending = submit(); await submit(); h.render();
  assert.equal(h.inputs[0].editable, false); assert.equal(h.buttons[0].disabled, true);
  h.type("changed during submission"); assert.equal(h.inputs[0].value, "hello");
  resolve(); await pending; assert.equal(h.calls.length, 1);
});

test("failed sends preserve drafts and retry with the same idempotency key", async () => {
  const h = harness(); h.type("keep this"); h.transport = async () => { throw Error("private server detail"); };
  await h.buttons[0].onPress(); const html = h.render();
  assert.match(html, /Message could not be sent/); assert.doesNotMatch(html, /private server detail/);
  assert.equal(h.inputs[0].value, "keep this"); assert.equal(h.buttons[0].disabled, false);
  h.transport = async () => ({}); await h.buttons[0].onPress(); h.render();
  assert.equal(h.calls[0].args.clientMessageId, h.calls[1].args.clientMessageId); assert.equal(h.inputs[0].value, "");
});

test("editing a failed draft or sending a new successful message creates a new operation key", async () => {
  const h = harness(); h.type("first"); h.transport = async () => { throw Error("offline"); };
  await h.buttons[0].onPress(); h.render(); h.type("edited"); h.transport = async () => ({});
  await h.buttons[0].onPress(); h.render(); h.type("edited"); await h.buttons[0].onPress();
  assert.equal(new Set(h.calls.map(call => call.args.clientMessageId)).size, 3);
});

test("leaving or switching accounts during a send causes no late state updates", async () => {
  for (const failure of [false, true]) {
    const h = harness(); h.type("hello"); let finish;
    h.transport = () => new Promise((resolve, reject) => { finish = () => failure ? reject(Error("offline")) : resolve({}); });
    const pending = h.buttons[0].onPress(); h.unmount(); finish(); await pending; assert.equal(h.lateWrites, 0);
  }
});
