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
import { contactText } from "../components/users/contactText.js";

// Actual component with deterministic state/effects, no native transport.
function harness(requestId = "request") {
  const slots = [], cleanups = [];
  let index = 0, unmounted = false;
  const h = { buttons: [], calls: [], lateWrites: 0, transport: async () => {}, html: "" };
  const element = React.createElement;
  const primitive = tag => ({ children }) => element(tag, null, children);
  const mocks = {
    react: { ...React,
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useState(initial) {
        const i = index++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], value => { if (unmounted) h.lateWrites++; slots[i] = value; }];
      },
      useEffect(fn) { const i = index++; if (!(i in slots)) { slots[i] = true; cleanups.push(fn()); } },
    },
    "react-native": { View: primitive("div"), Text: primitive("span"), ActivityIndicator: primitive("progress"),
      TouchableOpacity(props) { h.buttons.push(props); return element("button", { disabled: props.disabled }, props.children); } },
    "convex/react": { useMutation: reference => async args => {
      h.calls.push({ name: getFunctionName(reference), args }); return h.transport();
    } },
    "../../convex/_generated/api": { api },
  };
  const path = fileURLToPath(new URL("../components/users/FriendRequestActions.jsx", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports);
  h.render = () => {
    index = 0; h.buttons = [];
    h.html = renderToStaticMarkup(element(module.exports.default, { requestId, text: contactText.en }));
    return h.html;
  };
  h.unmount = () => { cleanups.forEach(fn => fn?.()); unmounted = true; };
  h.render();
  return h;
}

test("decision controls lock both actions and suppress duplicate/opposite taps until the subscription replaces them", async () => {
  const h = harness(); let resolve;
  h.transport = () => new Promise(done => { resolve = done; });
  const [accept, decline] = h.buttons;
  const pending = accept.onPress();
  await decline.onPress(); await accept.onPress();
  h.render();
  assert.ok(h.buttons.every(button => button.disabled));
  assert.equal(h.buttons[0].accessibilityState.busy, true);
  assert.deepEqual(h.calls, [{ name: "friendRequests:acceptFriendRequest", args: { requestId: "request" } }]);
  resolve(); await pending; h.render();
  assert.ok(h.buttons.every(button => button.disabled));
  await accept.onPress(); assert.equal(h.calls.length, 1);
});

test("a rejected decision displays a safe error and allows an explicit retry", async () => {
  const h = harness(); h.transport = async () => { throw new Error("private backend details"); };
  await h.buttons[1].onPress();
  assert.match(h.render(), /Your choice could not be saved/);
  assert.doesNotMatch(h.html, /private backend details/);
  assert.ok(h.buttons.every(button => !button.disabled));
  h.transport = async () => {};
  await h.buttons[1].onPress();
  assert.doesNotMatch(h.render(), /Your choice could not be saved/);
  assert.equal(h.calls.length, 2);
});

test("unmount during a pending decision suppresses late state updates", async () => {
  for (const failure of [false, true]) {
    const h = harness(); let finish;
    h.transport = () => new Promise((resolve, reject) => { finish = () => failure ? reject(Error("failed")) : resolve(); });
    const pending = h.buttons[0].onPress();
    h.unmount(); finish(); await pending;
    assert.equal(h.lateWrites, 0);
  }
});

test("missing request IDs never reach a mutation", async () => {
  const h = harness(null);
  assert.ok(h.buttons.every(button => button.disabled));
  await h.buttons[0].onPress(); await h.buttons[1].onPress();
  assert.deepEqual(h.calls, []);
});

test("legacy Decline posts to rejection rather than using the unfriend endpoint", async () => {
  const calls = [], invalidations = [];
  const path = fileURLToPath(new URL("../store/transtack/query.js", import.meta.url));
  const mocks = {
    "@tanstack/react-query": { useMutation: config => config, useQueryClient: () => ({ invalidateQueries: args => invalidations.push(args) }) },
    "../../lib/axios": { __esModule: true, default: { post: async url => { calls.push(url); return { data: { success: true } }; } } },
    "@react-native-async-storage/async-storage": { __esModule: true, default: { getItem: async () => null } },
    "../../store/Store": {},
  };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports);
  const hook = module.exports.useRejectFriendRequest();
  const result = await hook.mutationFn("received_request"); await hook.onSuccess(result);
  assert.deepEqual(calls, ["/friend/reject-request/received_request"]);
  assert.deepEqual(invalidations, [["notification"]]);
});
