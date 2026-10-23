import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Execute the actual bootstrap/runtime. The native registry and SDK transport
// are boundaries; these tests cannot establish whether an installed APK links them.
function harness({ platform = "android", nativePresent = true, sdkFails = false, setupFails = false } = {}) {
  const calls = { sdkImports: 0, setup: 0, hooks: 0, auth: 0, router: 0, firebase: 0, order: [] };
  const sdk = { StreamVideoRN: {
    setPushConfig(config) {
      calls.setup++; calls.order.push("push"); calls.config = config;
      if (setupFails) throw Error("react-native-callingx library is not installed");
    },
    setRingingCallLifecycleHooks(hooks) { calls.hooks++; calls.order.push("authorization"); calls.lifecycle = hooks; },
    onPushLogout: async () => {},
  } };
  const mocks = {
    "react-native": { Platform: { OS: platform }, TurboModuleRegistry: { get: name => {
      assert.equal(name, "Callingx"); return nativePresent ? {} : null;
    } } },
    "@clerk/expo": { getClerkInstance() { calls.auth++; throw Error("Authentication must not run without native calling"); } },
    "@clerk/expo/token-cache": { tokenCache: {} },
    "convex/browser": {},
    "../convex/_generated/api": { api: {} },
  };
  function execute(file, customRequire) {
    const path = fileURLToPath(new URL(file, import.meta.url));
    const require = createRequire(path), module = { exports: {} };
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
      fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    new Function("require", "module", "exports", compiled.outputText)(name => customRequire(name, require), module, module.exports);
    return module.exports;
  }
  const runtime = execute("../lib/streamRuntime.js", (name, require) => {
    if (name === "@stream-io/video-react-native-sdk") {
      calls.sdkImports++;
      if (sdkFails) throw Error("Native media module unavailable");
      return sdk;
    }
    return mocks[name] ?? require(name);
  });
  const boot = () => execute("../index.js", (name, require) => {
    if (name === "./lib/streamRuntime") return runtime;
    if (name === "./lib/streamNotifications") return { initializeFirebaseCalls() { calls.firebase++; } };
    if (name === "expo-router/entry") { calls.router++; return {}; }
    return require(name);
  });
  return { runtime, calls, sdk, boot };
}

test("an older APK without Callingx still registers Router and does not request Stream tokens", async () => {
  const h = harness({ nativePresent: false });
  assert.doesNotThrow(h.boot);
  assert.equal(h.calls.router, 1);
  assert.equal(h.calls.sdkImports, 0);
  assert.equal(h.calls.setup, 0);
  await assert.rejects(h.runtime.createStreamClient(), /CALL_NATIVE_BUILD_REQUIRED/);
  assert.equal(h.calls.auth, 0);
  await assert.doesNotReject(h.runtime.disconnectStream());
});

test("a native setup exception cannot crash startup or reuse partially configured calling", async () => {
  const h = harness({ setupFails: true });
  assert.doesNotThrow(h.boot);
  assert.equal(h.calls.router, 1);
  assert.equal(h.runtime.streamSDK(), null);
  assert.equal(h.runtime.initializeStreamPush(), false);
  await assert.rejects(h.runtime.createStreamClient(), /CALL_NATIVE_BUILD_REQUIRED/);
  assert.equal(h.calls.setup, 1);
  assert.equal(h.calls.auth, 0);
});

test("a rebuilt binary registers authorization before native push and initializes once", async () => {
  const h = harness();
  h.boot();
  assert.equal(h.runtime.initializeStreamPush(), true);
  assert.equal(h.runtime.streamSDK(), h.sdk);
  assert.equal(h.calls.router, 1);
  assert.equal(h.calls.firebase, 1);
  assert.equal(h.calls.setup, 1);
  assert.deepEqual(h.calls.order, ["authorization", "push"]);
  assert.equal(typeof h.calls.config.createStreamVideoClient, "function");
  assert.equal(h.calls.config.shouldRejectCallWhenBusy, true);
  await assert.rejects(h.calls.lifecycle.onBeforeCallJoin({ type: "other" }), /CALL_UNAVAILABLE/);
  assert.equal(h.calls.auth, 0);
});

test("a missing media SDK cannot prevent Router registration", async () => {
  const h = harness({ sdkFails: true });
  assert.doesNotThrow(h.boot);
  assert.equal(h.calls.router, 1);
  await assert.rejects(h.runtime.createStreamClient(), /CALL_NATIVE_BUILD_REQUIRED/);
  assert.equal(h.calls.setup, 0);
  assert.equal(h.calls.auth, 0);
});

test("unsupported platforms leave native calling disabled and still load the app", () => {
  for (const platform of ["ios", "web"]) {
    const h = harness({ platform });
    h.boot();
    assert.equal(h.calls.router, 1);
    assert.equal(h.calls.sdkImports, 0);
    assert.equal(h.runtime.initializeStreamPush(), false);
  }
});
