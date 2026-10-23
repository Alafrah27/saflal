import test from "node:test";
import assert from "node:assert/strict";
import { getFunctionName } from "convex/server";
import * as push from "../convex/push.js";
import { enqueueFriendPush, enqueueMessagePush, deliveryPayload } from "../convex/lib/push.js";
import { sendFriendRequest, acceptFriendRequest } from "../convex/friendRequests.js";
import { pushFixture } from "./fixtures/pushFixture.mjs";

async function queued() {
  const f = pushFixture();
  await f.device();
  const friendRequestId = await f.request();
  await enqueueFriendPush(f.ctx, { friendRequestId });
  return f;
}
async function claimed() {
  const f = await queued();
  await push.tick._handler(f.ctx, {});
  f.job = { deliveryId: f.rows.pushDeliveries[0]._id, attempt: 1 };
  return f;
}
function actionContext(f) {
  const handlers = { prepare: push.prepare, receiptTicket: push.receiptTicket, finish: push.finish };
  const call = async (ref, args) => {
    const name = getFunctionName(ref).split(":")[1];
    return await handlers[name]._handler(f.ctx, args);
  };
  return { runQuery: call, runMutation: call };
}
async function fakeExpo(response, run) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    if (response instanceof Error) throw response;
    return { ok: response.status === undefined || response.status < 400, status: response.status ?? 200,
      json: async () => response.body };
  };
  try { await run(requests); } finally { globalThis.fetch = original; }
}

test("friend send/accept enqueue once per recipient device, with no resend on mutation retries", async () => {
  const f = pushFixture();
  await f.device("a"); await f.device("b"); await f.device("b");
  const request = await sendFriendRequest._handler(f.ctx, { receiverId: "b" });
  await sendFriendRequest._handler(f.ctx, { receiverId: "b" });
  assert.equal(f.rows.pushDeliveries.length, 2);
  assert.ok(f.rows.pushDeliveries.every(row => row.kind === "friend_request" && row.recipientId === "b"));
  f.as("b");
  await acceptFriendRequest._handler(f.ctx, { requestId: request.requestId });
  await acceptFriendRequest._handler(f.ctx, { requestId: request.requestId });
  assert.equal(f.rows.pushDeliveries.length, 3);
  assert.equal(f.rows.pushDeliveries[2].recipientId, "a");
  assert.equal(f.rows.pushDeliveries[2].kind, "friend_accepted");
  assert.equal(await deliveryPayload(f.ctx, f.rows.pushDeliveries[0]), null);
});

test("enqueue is deduplicated, bounded to active recipient devices, and scheduled transactionally", async () => {
  const f = await queued();
  await f.device("c"); await f.device("b", { isActive: false });
  await enqueueFriendPush(f.ctx, { friendRequestId: f.rows.friendRequests[0]._id });
  assert.equal(f.rows.pushDeliveries.length, 1);
  assert.equal(f.scheduled.length, 1);
  assert.equal(getFunctionName(f.scheduled[0].fn), "push:tick");
  assert.equal(f.scheduled[0].delay, 0);
});

test("blocks in either direction and inactive profiles suppress enqueue and delayed delivery", async () => {
  for (const change of [
    f => f.rows.blockedUsers.push({ blockerId: "a", blockedId: "b" }),
    f => f.rows.blockedUsers.push({ blockerId: "b", blockedId: "a" }),
    f => { f.rows.users[0].isActive = false; },
    f => { f.rows.users[1].isActive = false; },
  ]) {
    const f = await queued(); change(f);
    assert.equal(await deliveryPayload(f.ctx, f.rows.pushDeliveries[0]), null);
    f.rows.pushDeliveries = [];
    await enqueueFriendPush(f.ctx, { friendRequestId: f.rows.friendRequests[0]._id });
    assert.equal(f.rows.pushDeliveries.length, 0);
  }
});

test("payload uses current locale, minimal routing metadata, and no device token beyond transport", async () => {
  const f = await queued(); f.rows.devices[0].language = "ar";
  const result = await deliveryPayload(f.ctx, f.rows.pushDeliveries[0]);
  assert.equal(result.title, "طلب صداقة");
  assert.equal(result.channelId, "default");
  assert.equal(result.data.recipientId, "b");
  assert.deepEqual(Object.keys(result.data).sort(), ["eventId", "recipientId", "requestId", "type"]);
  assert.ok(result.ttl >= 86399 && result.ttl <= 86400);
});

test("account transfer, registration changes, and sign-out invalidate queued payloads", async () => {
  for (const change of [row => { row.userId = "c"; }, row => { row.registrationVersion++; }, row => { row.isActive = false; }]) {
    const f = await queued(); change(f.rows.devices[0]);
    assert.equal(await deliveryPayload(f.ctx, f.rows.pushDeliveries[0]), null);
  }
});

test("text/audio share event handling, with expiry, read, mute, and membership suppression", async () => {
  for (const fields of [{}, { type: "audio", text: undefined, audioStorageId: "storage", audioDuration: 4 }]) {
    const f = pushFixture(); await f.device();
    const messageId = await f.message(fields);
    await enqueueMessagePush(f.ctx, { messageId });
    const delivery = f.rows.pushDeliveries[0];
    const result = await deliveryPayload(f.ctx, delivery);
    assert.equal(result.body, fields.type === "audio" ? "Voice message" : "hello");
    assert.equal(result.data.chatId, f.rows.chats[0]._id);
    const baseline = structuredClone(f.rows);
    for (const change of [
      () => { f.rows.messages[0].expiresAt = Date.now() - 1; },
      () => { f.rows.messages[0].status = "read"; },
      () => { f.rows.chatMembers[1].lastReadAt = 10; },
      () => { f.rows.chatMembers[1].isMuted = true; },
      () => { f.rows.chatMembers.pop(); },
      () => { f.rows.chatMembers[1].userId = "a"; },
      () => { f.rows.chats[0].directPairKey = "wrong"; },
      () => { f.rows.messages = []; },
    ]) {
      Object.assign(f.rows, structuredClone(baseline)); change();
      assert.equal(await deliveryPayload(f.ctx, delivery), null);
    }
  }
});

test("invalid message content, missing events, and accepted events without friendship are suppressed", async () => {
  for (const fields of [{ text: " " }, { type: "audio", audioDuration: 2 },
    { type: "audio", audioStorageId: "storage", audioDuration: -1 }]) {
    const f = pushFixture(); await f.device();
    await enqueueMessagePush(f.ctx, { messageId: await f.message(fields) });
    assert.equal(f.rows.pushDeliveries.length, 0);
  }
  const f = pushFixture(); await f.device();
  await enqueueFriendPush(f.ctx, { friendRequestId: "missing" });
  await enqueueFriendPush(f.ctx, { friendRequestId: await f.request({ status: "accepted" }), accepted: true });
  assert.equal(f.rows.pushDeliveries.length, 0);
});

test("worker claims due jobs once, recovers abandoned work, and fences stale completions", async () => {
  const f = await claimed(), row = f.rows.pushDeliveries[0];
  assert.equal(row.status, "sending"); assert.equal(row.attempts, 1);
  const scheduled = f.scheduled.length;
  await push.tick._handler(f.ctx, {});
  assert.equal(f.scheduled.length, scheduled);
  row.dueAt = 0;
  await push.tick._handler(f.ctx, {});
  assert.equal(row.attempts, 2);
  await push.finish._handler(f.ctx, { ...f.job, receipt: false, outcome: "submitted", ticketId: "stale" });
  assert.equal(row.status, "sending"); assert.equal(row.ticketId, undefined);
  assert.equal(await push.payload._handler(f.ctx, f.job), null);
});

test("worker caps send and receipt batches and fails exhausted attempts", async () => {
  const f = await queued(), template = f.rows.pushDeliveries[0];
  f.rows.pushDeliveries = Array.from({ length: 102 }, (_, n) => ({ ...template, _id: `delivery_${n}` }));
  await push.tick._handler(f.ctx, {});
  assert.equal(f.rows.pushDeliveries.filter(row => row.status === "sending").length, 100);
  const dispatch = f.scheduled.find(job => getFunctionName(job.fn) === "push:dispatch");
  assert.equal(dispatch.args.jobs.length, 100);
  for (const row of f.rows.pushDeliveries) { row.attempts = 5; row.dueAt = 0; }
  await push.tick._handler(f.ctx, {});
  assert.equal(f.rows.pushDeliveries.filter(row => row.status === "failed").length, 100);
  for (const row of f.rows.pushDeliveries) { row.status = "submitted"; row.dueAt = 0; row.receiptAttempts = 5; }
  await push.tick._handler(f.ctx, {});
  assert.equal(f.rows.pushDeliveries.filter(row => row.status === "failed").length, 100);
});

test("successful send records ticket, checks receipt, and marks provider completion", async () => {
  const f = await claimed(), row = f.rows.pushDeliveries[0];
  await fakeExpo({ body: { data: [{ status: "ok", id: "ticket" }] } }, async requests => {
    await push.dispatch._handler(actionContext(f), { jobs: [f.job] });
    assert.equal(requests[0].url, "https://exp.host/--/api/v2/push/send");
    assert.equal(requests[0].body[0].to, f.rows.devices[0].expoPushToken);
  });
  assert.equal(row.status, "submitted"); assert.equal(row.ticketId, "ticket");
  assert.ok(row.dueAt >= Date.now() + 14 * 60000);
  row.dueAt = 0; await push.tick._handler(f.ctx, {});
  await fakeExpo({ body: { data: { ticket: { status: "ok" } } } }, async requests => {
    await push.checkReceipts._handler(actionContext(f), { jobs: [{ ...f.job, sendAttempt: 1 }] });
    assert.deepEqual(requests[0].body, { ids: ["ticket"] });
  });
  assert.equal(row.status, "complete");
});

test("network, 429, and server failures retry with backoff; permanent HTTP/payload errors fail", async () => {
  for (const [response, expected] of [[new Error("offline"), "pending"], [{ status: 429 }, "pending"],
    [{ status: 503 }, "pending"], [{ status: 400 }, "failed"], [{ body: {} }, "failed"],
    [{ body: { data: [{ status: "error", details: { error: "MessageRateExceeded" } }] } }, "pending"]]) {
    const f = await claimed();
    await fakeExpo(response, async () => push.dispatch._handler(actionContext(f), { jobs: [f.job] }));
    assert.equal(f.rows.pushDeliveries[0].status, expected);
    if (expected === "pending") assert.ok(f.rows.pushDeliveries[0].dueAt > Date.now());
  }
});

test("dispatch rechecks privacy and never calls Expo for blocked or stale jobs", async () => {
  const f = await claimed(); f.rows.blockedUsers.push({ blockerId: "b", blockedId: "a" });
  await fakeExpo(new Error("must not send"), async requests => {
    await push.dispatch._handler(actionContext(f), { jobs: [f.job] });
    assert.deepEqual(requests, []);
  });
  assert.equal(f.rows.pushDeliveries[0].status, "suppressed");
});

test("DeviceNotRegistered deactivates only the matching owner and registration version", async () => {
  for (const stale of [false, true]) {
    const f = await claimed();
    if (stale) f.rows.devices[0].registrationVersion++;
    await push.finish._handler(f.ctx, { ...f.job, receipt: false, outcome: "failed", errorCode: "DeviceNotRegistered" });
    assert.equal(f.rows.devices[0].isActive, stale);
  }
});

test("receipt rate limiting resends; missing receipts retry polling; stale receipts cannot overwrite a new attempt", async () => {
  for (const [data, expected] of [[{ ticket: { status: "error", details: { error: "MessageRateExceeded" } } }, "pending"], [{}, "submitted"]]) {
    const f = await claimed(), row = f.rows.pushDeliveries[0];
    Object.assign(row, { status: "submitted", ticketId: "ticket", receiptAttempts: 1 });
    await fakeExpo({ body: { data } }, async () => push.checkReceipts._handler(actionContext(f), { jobs: [{ ...f.job, sendAttempt: 1 }] }));
    assert.equal(row.status, expected);
    if (expected === "pending") { assert.equal(row.ticketId, undefined); assert.equal(row.receiptAttempts, 0); }
  }
  const f = await claimed(), row = f.rows.pushDeliveries[0];
  Object.assign(row, { status: "submitted", ticketId: "ticket", receiptAttempts: 2 });
  await push.finish._handler(f.ctx, { ...f.job, sendAttempt: 1, receipt: true, outcome: "complete" });
  assert.equal(row.status, "submitted");
  row.attempts = 5;
  await push.finish._handler(f.ctx, { ...f.job, attempt: 2, sendAttempt: 5, receipt: true, outcome: "resend" });
  assert.equal(row.status, "failed");
});

test("receipt results from an older send cannot complete a replacement ticket", async () => {
  const f = await claimed(), row = f.rows.pushDeliveries[0];
  Object.assign(row, { status: "submitted", attempts: 2, receiptAttempts: 1, ticketId: "new_ticket" });
  const stale = { ...f.job, sendAttempt: 1 };
  assert.equal(await push.receiptTicket._handler(f.ctx, stale), null);
  await push.finish._handler(f.ctx, { ...stale, receipt: true, outcome: "complete" });
  assert.equal(row.status, "submitted");
  assert.equal(row.ticketId, "new_ticket");
});

test("terminal cleanup is bounded and preserves recent or unfinished records", async () => {
  const f = await queued(), template = f.rows.pushDeliveries[0];
  for (let n = 0; n < 102; n++) f.rows.pushDeliveries.push({ ...template, _id: `old_${n}`, status: "complete", updatedAt: 0 });
  f.rows.pushDeliveries.push({ ...template, _id: "recent", status: "complete", updatedAt: Date.now() });
  await push.cleanup._handler(f.ctx, {});
  assert.equal(f.rows.pushDeliveries.length, 4);
  assert.ok(f.rows.pushDeliveries.some(row => row.status === "pending"));
  assert.ok(f.rows.pushDeliveries.some(row => row._id === "recent"));
});

test("transport operations are internal and enforce a maximum batch size", async () => {
  for (const fn of Object.values(push)) assert.equal(fn.isInternal, true);
  for (const fn of [push.prepare, push.dispatch, push.checkReceipts]) {
    await assert.rejects(fn._handler({}, { jobs: Array.from({ length: 101 }, () => ({ deliveryId: "x", attempt: 1 })) }), /PUSH_BATCH_TOO_LARGE/);
  }
});
