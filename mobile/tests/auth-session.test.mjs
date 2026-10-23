import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import React from "react";
import ts from "typescript";
import { api } from "../convex/_generated/api.js";

// Execute the actual provider's callbacks/effects with mocked Clerk/native
// transport and deterministic hooks. This is not a native or real Clerk test.
function harness() {
  const model = {
    user: { id: "clerk_a", imageUrl: "https://img.clerk.com/photo", fullName: "Test User" },
    profile: { _id: "convex_a", clerkId: "clerk_a", isActive: true },
    authenticated: true, calls: [], appState: null, signOuts: 0, disconnects: 0, cacheClears: 0, timer: null,
  };
  const states = [], dependencies = [], cleanups = [];
  let hookIndex = 0, effects = [];
  const sync = async args => { model.calls.push(args); };
  const mutations = async () => {};
  const signOut = async () => { model.signOuts++; if (model.signOutError) throw model.signOutError; return model.signOutPromise; };
  const mocks = {
    react: {
      ...React,
      useRef(initial) {
        const index = hookIndex++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useState(initial) {
        const index = hookIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      },
      useCallback(fn, deps) {
        const index = hookIndex++;
        if (!dependencies[index] || deps.some((value, i) => !Object.is(value, dependencies[index][i]))) {
          dependencies[index] = deps; states[index] = fn;
        }
        return states[index];
      },
      useEffect(fn, deps) {
        const index = hookIndex++;
        if (!dependencies[index] || deps.some((value, i) => !Object.is(value, dependencies[index][i]))) {
          dependencies[index] = deps;
          effects.push(() => { cleanups[index]?.(); cleanups[index] = fn(); });
        }
      },
    },
    "react-native": { AppState: { addEventListener: (_name, fn) => { model.appState = fn; return { remove() {} }; } } },
    "@clerk/expo": {
      useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "clerk_a", sessionId: "session_a", signOut }),
      useUser: () => ({ user: model.user }),
    },
    "convex/react": {
      useConvexAuth: () => ({ isLoading: false, isAuthenticated: model.authenticated }),
      useQuery: () => model.profile, useMutation: () => mutations, useAction: () => sync,
    },
    "@react-native-async-storage/async-storage": { getAllKeys: async () => [], multiRemove: async () => {} },
    "../convex/_generated/api": { api },
    "../lib/queryClient": { queryClient: { cancelQueries: async () => {}, clear() { model.cacheClears++; } } },
    "../lib/streamRuntime": { disconnectStream: async () => { model.disconnects++; if (model.disconnectError) throw model.disconnectError; } },
  };
  const path = fileURLToPath(new URL("../context/AuthSessionContext.jsx", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", "setInterval", "clearInterval", compiled.outputText)(
    name => mocks[name] ?? require(name), module, module.exports,
    fn => { model.timer = fn; return 1; }, () => { model.timer = null; });
  async function render() {
    hookIndex = 0; effects = [];
    const wrapper = module.exports.AuthSessionProvider({ children: null });
    const provider = wrapper.type(wrapper.props);
    for (const effect of effects) effect();
    // Flush the cache-reset and sync promise callbacks before inspecting state.
    await new Promise(resolve => setImmediate(resolve));
    return provider.props.value;
  }
  return { model, render };
}

test("auth session sends the matching Clerk image to the Convex synchronization action", async () => {
  const h = harness(); await h.render();
  assert.deepEqual(h.model.calls, [{ fallbackImageUrl: "https://img.clerk.com/photo" }]);
});

test("primary-email changes trigger a server refresh without sending client email as profile data", async () => {
  const h = harness(); await h.render(); const before = h.model.calls.length;
  h.model.user.primaryEmailAddress = { id: "email_one", emailAddress: "first@example.com", verification: { status: "verified" } };
  await h.render(); assert.equal(h.model.calls.length, before + 1);
  h.model.user.primaryEmailAddress.emailAddress = "second@example.com";
  await h.render(); assert.equal(h.model.calls.length, before + 2);
  h.model.user.primaryEmailAddress.verification.status = "unverified";
  await h.render(); assert.equal(h.model.calls.length, before + 3);
  assert.ok(h.model.calls.every(args => Object.keys(args).every(key => key === "fallbackImageUrl")));
});

test("a late or changed Clerk image triggers synchronization without an image-save loop", async () => {
  const h = harness(); h.model.user = null;
  await h.render();
  h.model.user = { id: "clerk_a", imageUrl: "https://img.clerk.com/loaded" };
  await h.render();
  assert.deepEqual(h.model.calls.at(-1), { fallbackImageUrl: "https://img.clerk.com/loaded" });
  const count = h.model.calls.length;
  h.model.profile = { ...h.model.profile, imageUrl: "https://img.clerk.com/loaded" };
  await h.render();
  assert.equal(h.model.calls.length, count);
  h.model.user.imageUrl = "https://img.clerk.com/changed";
  await h.render();
  assert.deepEqual(h.model.calls.at(-1), { fallbackImageUrl: "https://img.clerk.com/changed" });
});

test("an old account's Clerk resource is never sent as the current account's image", async () => {
  const h = harness(); h.model.user.id = "clerk_b";
  await h.render();
  assert.deepEqual(h.model.calls, [{}]);
});

test("unauthenticated or inactive profiles do not automatically synchronize images", async () => {
  for (const change of [model => { model.authenticated = false; }, model => { model.profile.isActive = false; }, model => { model.profile = null; }]) {
    const h = harness(); change(h.model); await h.render();
    assert.deepEqual(h.model.calls, []);
  }
});

test("manual refresh and returning to the foreground include the Clerk image fallback", async () => {
  const h = harness(); await h.render();
  const session = await h.render(); h.model.calls.length = 0;
  await session.refreshImage();
  h.model.appState("active");
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.model.calls, [
    { fallbackImageUrl: "https://img.clerk.com/photo" }, { fallbackImageUrl: "https://img.clerk.com/photo" },
  ]);
});

test("logout deduplicates concurrent callers and still signs out after a native disconnect failure", async () => {
  const h = harness(); await h.render(); const session = await h.render();
  let resolve; h.model.signOutPromise = new Promise(done => { resolve = done; });
  h.model.disconnectError = Error("NATIVE_FAILURE");
  const first = session.logout(), second = session.logout(); assert.equal(first, second);
  resolve(); await Promise.all([first, second]);
  assert.equal(h.model.signOuts, 1); assert.equal(h.model.disconnects, 1);
  assert.ok(h.model.cacheClears >= 2);
});

test("a deletion tombstone triggers session sign-out and retries transient sign-out failures", async () => {
  const h = harness(); await h.render();
  h.model.profile = { ...h.model.profile, isActive: false, deletedAt: 123 };
  h.model.signOutError = Error("TEMPORARY");
  await h.render(); assert.equal(h.model.signOuts, 1); assert.equal(typeof h.model.timer, "function");
  h.model.signOutError = null; h.model.timer();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.model.signOuts, 2);
});
