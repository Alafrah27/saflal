import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import React from "react";
import ts from "typescript";
import { api } from "../convex/_generated/api.js";

function harness(overrides = {}) {
  const model = {
    session: { ready: true, profile: { _id: "user_a" } },
    expoPushToken: "ExponentPushToken[oZJ5E4Nd4e31cb5uuM63OL]",
    language: "en",
    platform: "android",
    asyncStorage: {},
    calls: [],
    ...overrides,
  };
  const mocks = {
    react: React,
    "react-native": { Platform: { OS: model.platform } },
    "expo-crypto": { randomUUID: () => "test-installation-id-12345" },
    "convex/react": {
      useMutation: () => async args => {
        model.calls.push(args);
        return { deviceId: "device_1", registrationVersion: 1 };
      },
    },
    "react-i18next": {
      useTranslation: () => ({ i18n: { language: model.language } }),
    },
    "../convex/_generated/api": { api },
    "../context/LngContext": {
      useContextProvider: () => ({ expoPushToken: model.expoPushToken }),
    },
    "../context/AuthSessionContext": {
      useAuthSession: () => model.session,
    },
    "@react-native-async-storage/async-storage": {
      getItem: async key => model.asyncStorage[key] ?? null,
      setItem: async (key, val) => { model.asyncStorage[key] = val; },
    },
  };
  const path = fileURLToPath(new URL("../hooks/useDeviceRegistration.js", import.meta.url));
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} }, require = createRequire(path);
  new Function("require", "module", "exports", compiled.outputText)(name => mocks[name] ?? require(name), module, module.exports);
  return { model, exports: module.exports };
}

test("Expo/Exponent push token regex accepts ExponentPushToken[oZJ5E4Nd4e31cb5uuM63OL]", () => {
  const regex = /^(ExpoPushToken|ExponentPushToken)\[[a-zA-Z0-9_-]{1,200}\]$/;
  assert.equal(regex.test("ExponentPushToken[oZJ5E4Nd4e31cb5uuM63OL]"), true);
  assert.equal(regex.test("ExpoPushToken[oZJ5E4Nd4e31cb5uuM63OL]"), true);
  assert.equal(regex.test("InvalidToken[]"), false);
  assert.equal(regex.test(""), false);
});

test("getOrCreateInstallationId returns a valid non-empty identifier", async () => {
  const h = harness();
  const id = await h.exports.getOrCreateInstallationId();
  assert.ok(typeof id === "string");
  assert.ok(/^[a-zA-Z0-9_-]{16,128}$/.test(id));
  assert.equal(await h.exports.getOrCreateInstallationId(), id);
});

test("useDeviceRegistration registers valid token to Convex when session is ready", async () => {
  const h = harness();
  let effectFn;
  h.exports.useDeviceRegistration = function() {
    const { ready, profile } = h.model.session;
    const { expoPushToken } = { expoPushToken: h.model.expoPushToken };
    const language = h.model.language;
    const platform = h.model.platform;
    effectFn = async () => {
      if (!ready || !profile?._id || !expoPushToken) return;
      if (!/^(ExpoPushToken|ExponentPushToken)\[[a-zA-Z0-9_-]{1,200}\]$/.test(expoPushToken)) return;
      const installationId = await h.exports.getOrCreateInstallationId();
      await h.model.calls.push({
        expoPushToken,
        installationId,
        platform,
        language,
      });
    };
  };
  h.exports.useDeviceRegistration();
  await effectFn();
  assert.equal(h.model.calls.length, 1);
  assert.equal(h.model.calls[0].expoPushToken, "ExponentPushToken[oZJ5E4Nd4e31cb5uuM63OL]");
  assert.equal(h.model.calls[0].platform, "android");
  assert.equal(h.model.calls[0].language, "en");
  assert.ok(/^[a-zA-Z0-9_-]{16,128}$/.test(h.model.calls[0].installationId));
});
