import test from "node:test";
import assert from "node:assert/strict";
import { restrictedGrants, validStreamPolicy } from "../convex/lib/streamPolicy.js";
import { callError, callText } from "../components/calls/callText.js";

function configured() {
  return {
    default: { grants: restrictedGrants("default", { admin: ["create-call", "send-video"] }) },
    saflal_audio: { grants: restrictedGrants("saflal_audio"), settings: {
      video: { enabled: false }, screensharing: { enabled: false }, backstage: { enabled: false },
      limits: { max_participants: 2, max_participants_exclude_owner: false, max_participants_exclude_roles: [] },
    } },
  };
}

test("server-assigned call_member can read/join/send audio while admin grants do not disable calls", () => {
  assert.equal(validStreamPolicy(configured()), true);
  assert.deepEqual(restrictedGrants("default", { admin: ["create-call"] }).admin, ["create-call"]);
});
test("every client-accessible role on every call type is checked, including owner variants", () => {
  for (const type of ["default", "saflal_audio"]) {
    for (const role of ["user", "call_member", "guest", "anonymous"]) {
      for (const grant of ["create-call", "create-call-owner", "update-call-members", "update-call-permissions", "send-video", "join-call-any-team"]) {
        const types = configured(); types[type].grants[role].push(grant);
        assert.equal(validStreamPolicy(types), false, `${type}/${role}/${grant}`);
      }
    }
  }
});
test("missing call type, incorrect member role, and incomplete audio grants fail closed", () => {
  assert.equal(validStreamPolicy({}), false);
  const types = configured();
  types.saflal_audio.grants["call-member"] = types.saflal_audio.grants.call_member;
  delete types.saflal_audio.grants.call_member;
  assert.equal(validStreamPolicy(types), false);
  for (const grant of ["read-call", "join-call", "send-audio"]) {
    const types = configured(); types.saflal_audio.grants.call_member = types.saflal_audio.grants.call_member.filter(g => g !== grant);
    assert.equal(validStreamPolicy(types), false);
  }
});
test("video, screensharing, backstage, and participant-limit bypasses fail closed", () => {
  for (const field of ["video", "screensharing", "backstage"]) {
    const types = configured(); types.saflal_audio.settings[field].enabled = true;
    assert.equal(validStreamPolicy(types), false);
  }
  for (const patch of [{ max_participants: 3 }, { max_participants_exclude_owner: true }, { max_participants_exclude_roles: ["user"] }]) {
    const types = configured(); Object.assign(types.saflal_audio.settings.limits, patch);
    assert.equal(validStreamPolicy(types), false);
  }
});
test("server configuration failures do not tell users to rebuild Android", () => {
  for (const text of Object.values(callText)) {
    assert.equal(callError({ data: "CALLS_CREDENTIALS_NOT_CONFIGURED" }, text), text.setup);
    assert.equal(callError({ data: "CALLS_PERMISSIONS_NOT_CONFIGURED" }, text), text.setup);
    assert.equal(callError({ message: "CALL_NATIVE_BUILD_REQUIRED" }, text), text.nativeBuild);
    assert.equal(callError({ data: "CALL_SERVICE_UNAVAILABLE" }, text), text.failed);
    assert.notEqual(text.setup, text.nativeBuild);
  }
});
