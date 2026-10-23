import test from "node:test";
import assert from "node:assert/strict";
import { current, completeProfile, updateProfile, applyClerkProfile, syncFromClerk } from "../convex/users.js";
import schema from "../convex/schema.js";
import { directoryOrderKey } from "../shared/contactOrder.js";

function fixture(subject = "clerk_a") {
  const rows = [];
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    db: {
      query: table => {
        assert.equal(table, "users");
        let field, value;
        return {
          withIndex(name, build) {
            assert.equal(name, "by_clerk_id");
            build({ eq(key, input) { field = key; value = input; } });
            return this;
          },
          unique: async () => {
            const found = rows.filter(row => row[field] === value);
            assert.ok(found.length <= 1);
            return found[0] ?? null;
          },
        };
      },
      insert: async (_table, fields) => {
        const _id = String(rows.length + 1);
        rows.push({ _id, ...fields }); return _id;
      },
      patch: async (id, fields) => Object.assign(rows.find(row => row._id === id), fields),
    },
  };
  return { ctx, rows };
}
const make = (ctx, args = { fullName: "  Saflal User  " }) =>
  completeProfile._handler(ctx, args);

test("schema contains exactly the requested user fields and indexes", () => {
  const table = JSON.parse(schema.export()).tables.find(table => table.tableName === "users");
  assert.deepEqual(table.indexes.map(index => index.indexDescriptor).sort(), ["by_active_directory_order", "by_clerk_id", "by_fullName"]);
  assert.deepEqual(Object.keys(table.documentType.value).sort(), [
    "clerkId","fullName","nickName","directoryOrderKey","imageUrl","bio","verifiedEmail","isOnline","lastSeenAt",
    "showOnlineStatus","showLastSeen","notificationsEnabled","notificationSettingsVersion","notificationSyncStatus","isActive","deletedAt","createdAt","updatedAt",
  ].sort());
});

test("signed-out current is null; protected writes reject anonymous users", async () => {
  const { ctx } = fixture(null);
  assert.equal(await current._handler(ctx, {}), null);
  await assert.rejects(make(ctx), /UNAUTHENTICATED/);
  await assert.rejects(updateProfile._handler(ctx, { fullName: "Other Name" }), /UNAUTHENTICATED/);
});

test("onboarding uses verified identity, normalizes values, and has safe defaults", async () => {
  const { ctx, rows } = fixture();
  await make(ctx);
  assert.equal(rows[0].clerkId, "clerk_a");
  assert.equal(rows[0].fullName, "Saflal User");
  assert.equal(rows[0].username, undefined);
  assert.equal(rows[0].userId, undefined);
  assert.equal(rows[0].isOnline, false);
  assert.equal(rows[0].showOnlineStatus, true);
  assert.equal(rows[0].showLastSeen, true);
  assert.equal(rows[0].isActive, true);
  assert.equal(rows[0].createdAt, rows[0].updatedAt);
  assert.equal(rows[0].lastSeenAt, undefined);
  assert.equal(rows[0].directoryOrderKey, directoryOrderKey(rows[0]._id));
});

test("retrying onboarding is idempotent and does not overwrite an existing profile", async () => {
  const { ctx, rows } = fixture();
  const first = await make(ctx);
  const second = await make(ctx, { fullName: "Changed" });
  assert.equal(first, second);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].fullName, "Saflal User");
});

test("different Clerk identities may share a full name without sharing an account", async () => {
  const { ctx, rows } = fixture();
  await make(ctx);
  ctx.auth.getUserIdentity = async () => ({ subject: "clerk_b" });
  await make(ctx, { fullName: "Saflal User" });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].fullName, rows[1].fullName);
  assert.notEqual(rows[0]._id, rows[1]._id);
  assert.notEqual(rows[0].clerkId, rows[1].clerkId);
});

test("invalid full names are rejected while Unicode full names are accepted", async () => {
  for (const fullName of [" ", "x", "x".repeat(81)]) {
    await assert.rejects(make(fixture().ctx, { fullName }));
  }
  const { ctx, rows } = fixture();
  await make(ctx, { fullName: "اسم عربي" });
  assert.equal(rows[0].fullName, "اسم عربي");
});

test("profile updates apply only to the caller", async () => {
  const { ctx, rows } = fixture();
  await make(ctx);
  rows.push({ _id: "other", clerkId: "clerk_b", fullName: "Other User", isActive: true });
  await updateProfile._handler(ctx, { fullName: " New Name ", bio: " Bio ", showLastSeen: false });
  assert.equal(rows[0].fullName, "New Name");
  assert.equal(rows[0].bio, "Bio");
  assert.equal(rows[0].showLastSeen, false);
  assert.equal(rows[1].fullName, "Other User");
  await assert.rejects(updateProfile._handler(ctx, { bio: "x".repeat(501) }), /500/);
});

test("inactive accounts cannot modify or recreate their profile", async () => {
  const { ctx, rows } = fixture();
  await make(ctx); rows[0].isActive = false;
  await assert.rejects(make(ctx), /ACCOUNT_INACTIVE/);
  await assert.rejects(updateProfile._handler(ctx, { fullName: "Changed" }), /ACCOUNT_INACTIVE/);
});

test("Clerk synchronization preserves app fields and never reactivates accounts", async () => {
  const { ctx, rows } = fixture();
  await make(ctx);
  rows[0].bio = "My bio";
  rows[0].showLastSeen = false;
  await applyClerkProfile._handler(ctx, { clerkId: "clerk_a", imageUrl: "https://img.clerk.com/a", disabled: false });
  assert.equal(rows[0].imageUrl, "https://img.clerk.com/a");
  assert.equal(rows[0].fullName, "Saflal User");
  assert.equal(rows[0].bio, "My bio");
  assert.equal(rows[0].showLastSeen, false);
  await applyClerkProfile._handler(ctx, { clerkId: "clerk_a", disabled: true });
  assert.equal(rows[0].isActive, false);
  await applyClerkProfile._handler(ctx, { clerkId: "clerk_a", imageUrl: "https://img.clerk.com/b", disabled: false });
  assert.equal(rows[0].isActive, false);
  assert.equal(rows[0].imageUrl, "https://img.clerk.com/a");
});

test("public mutation validators do not accept client identity/status fields", () => {
  const args = JSON.parse(completeProfile.exportArgs());
  assert.deepEqual(Object.keys(args.value), ["fullName"]);
  const updateArgs = JSON.parse(updateProfile.exportArgs());
  for (const field of ["clerkId", "isActive", "isOnline", "createdAt", "updatedAt", "imageUrl"]) {
    assert.equal(updateArgs.value[field], undefined);
  }
});

test("profile synchronization without a server key uses only verified identity claims", async () => {
  const previous = process.env.CLERK_SECRET_KEY;
  delete process.env.CLERK_SECRET_KEY;
  const calls = [];
  try {
    await syncFromClerk._handler({
      auth: { getUserIdentity: async () => ({ subject: "verified_user", pictureUrl: "https://img.clerk.com/verified" }) },
      runMutation: async (_reference, args) => calls.push(args),
    }, {});
    assert.deepEqual(calls, [{ clerkId: "verified_user", imageUrl: "https://img.clerk.com/verified", disabled: false }]);
    await assert.rejects(syncFromClerk._handler({ auth: { getUserIdentity: async () => null } }, {}), /UNAUTHENTICATED/);
  } finally {
    if (previous === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous;
  }
});

async function withClerkKey(value, run) {
  const previous = process.env.CLERK_SECRET_KEY;
  if (value === undefined) delete process.env.CLERK_SECRET_KEY;
  else process.env.CLERK_SECRET_KEY = value;
  try { await run(); } finally {
    if (previous === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous;
  }
}

function connectSync(ctx) {
  return { auth: ctx.auth, runMutation: async (_reference, args) => applyClerkProfile._handler(ctx, args) };
}

test("default session without a picture claim saves the Clerk client image into the existing users row", async () => {
  await withClerkKey(undefined, async () => {
    const { ctx, rows } = fixture(); await make(ctx);
    rows[0].bio = "Keep my bio";
    rows.push({ _id: "other", clerkId: "clerk_b", imageUrl: "https://img.clerk.com/other", isActive: true });
    const before = structuredClone(rows);
    const imageUrl = "https://img.clerk.com/google-photo";
    await syncFromClerk._handler(connectSync(ctx), { fallbackImageUrl: imageUrl });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].imageUrl, imageUrl);
    assert.equal(rows[0]._id, before[0]._id);
    assert.equal(rows[0].clerkId, before[0].clerkId);
    assert.equal(rows[0].fullName, before[0].fullName);
    assert.equal(rows[0].bio, before[0].bio);
    assert.deepEqual(rows[1], before[1]);
    const saved = structuredClone(rows[0]);
    await syncFromClerk._handler(connectSync(ctx), { fallbackImageUrl: imageUrl });
    assert.deepEqual(rows[0], saved);
  });
});

test("verified picture claims take precedence over the display fallback", async () => {
  await withClerkKey(undefined, async () => {
    const { ctx, rows } = fixture(); await make(ctx);
    ctx.auth.getUserIdentity = async () => ({ subject: "clerk_a", pictureUrl: "https://img.clerk.com/verified" });
    await syncFromClerk._handler(connectSync(ctx), { fallbackImageUrl: "https://img.clerk.com/client" });
    assert.equal(rows[0].imageUrl, "https://img.clerk.com/verified");
  });
});

test("missing image snapshots preserve a saved photo rather than clearing it", async () => {
  const { ctx, rows } = fixture(); await make(ctx);
  rows[0].imageUrl = "https://img.clerk.com/saved";
  const before = structuredClone(rows[0]);
  await applyClerkProfile._handler(ctx, { clerkId: "clerk_a", disabled: false });
  assert.deepEqual(rows[0], before);
  await withClerkKey(undefined, async () => {
    await syncFromClerk._handler(connectSync(ctx), {});
    assert.deepEqual(rows[0], before);
  });
});

test("invalid fallback image URLs reject without modifying users", async () => {
  await withClerkKey(undefined, async () => {
    const { ctx, rows } = fixture(); await make(ctx);
    const before = structuredClone(rows);
    for (const fallbackImageUrl of ["file:///photo.jpg", "javascript:alert(1)", "data:image/png;base64,abc", "http://insecure/photo", "https://user:password@img.clerk.com/photo", "not-a-url", "https://img.clerk.com/has space", `https://img.clerk.com/${"a".repeat(2048)}`]) {
      await assert.rejects(syncFromClerk._handler(connectSync(ctx), { fallbackImageUrl }), /INVALID_PROFILE_IMAGE/);
    }
    assert.deepEqual(rows, before);
  });
});

test("fallback images cannot create profiles, reactivate users, or bypass authentication", async () => {
  await withClerkKey(undefined, async () => {
    const { ctx, rows } = fixture();
    const args = { fallbackImageUrl: "https://img.clerk.com/photo" };
    await syncFromClerk._handler(connectSync(ctx), args);
    assert.equal(rows.length, 0);
    await make(ctx); rows[0].isActive = false;
    const before = structuredClone(rows);
    await syncFromClerk._handler(connectSync(ctx), args);
    assert.deepEqual(rows, before);
    await assert.rejects(syncFromClerk._handler(connectSync(fixture(null).ctx), args), /UNAUTHENTICATED/);
    assert.deepEqual(Object.keys(JSON.parse(syncFromClerk.exportArgs()).value), ["fallbackImageUrl"]);
  });
});

test("server-key synchronization uses Clerk Backend API data and preserves photos on a partial snapshot", async () => {
  const previousFetch = globalThis.fetch;
  try {
    await withClerkKey("test-only-placeholder", async () => {
      const { ctx, rows } = fixture(); await make(ctx);
      let data = { image_url: "https://img.clerk.com/backend" };
      globalThis.fetch = async url => {
        assert.equal(url, "https://api.clerk.com/v1/users/clerk_a");
        return { ok: true, status: 200, json: async () => data };
      };
      await syncFromClerk._handler(connectSync(ctx), { fallbackImageUrl: "https://img.clerk.com/client" });
      assert.equal(rows[0].imageUrl, "https://img.clerk.com/backend");
      data = {};
      await syncFromClerk._handler(connectSync(ctx), {});
      assert.equal(rows[0].imageUrl, "https://img.clerk.com/backend");
      globalThis.fetch = async () => ({ ok: false, status: 503 });
      await assert.rejects(syncFromClerk._handler(connectSync(ctx), {}), /synchronization failed/);
      assert.equal(rows[0].imageUrl, "https://img.clerk.com/backend");
    });
  } finally { globalThis.fetch = previousFetch; }
});
