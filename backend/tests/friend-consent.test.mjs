import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";
import mongoose from "mongoose";

const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24);
const R = "1".repeat(24), ROOM = "2".repeat(24), MISSING = "f".repeat(24);
const clone = value => value == null ? value : structuredClone(value);
const plain = value => JSON.parse(JSON.stringify(value));

// Run the actual ESM handlers/helpers with in-memory model and transport
// boundaries. No server, MongoDB connection, push, or deployed state is touched.
async function fixture() {
  const h = { users: [A, B, C].map(_id => ({ _id, FullName: _id[0], friends: [], block: [] })),
    requests: [], chats: [], messages: [], writes: [], events: [], pushes: [], cacheFailure: false, readFailure: false };
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(part => matches(row, part));
    if (key === "participants") return (!value.$all || value.$all.every(id => row.participants.includes(String(id)))) &&
      (!value.$size || row.participants.length === value.$size);
    if (key === "block") return row.block?.includes(String(value));
    return String(row[key]) === String(value);
  });
  const user = id => h.users.find(row => row._id === String(id));
  const User = {
    async findById(id) { return clone(user(id) ?? null); },
    async exists(filter) { return clone(h.users.find(row => matches(row, filter)) ?? null); },
    async findByIdAndUpdate(id, update) {
      if (h.cacheFailure) { h.cacheFailure = false; throw Error("cache unavailable"); }
      const row = user(id); if (!row) return null;
      const peer = update.$addToSet?.friends;
      if (peer && !row.friends.includes(String(peer))) row.friends.push(String(peer));
      h.writes.push({ table: "users", id: String(id) }); return clone(row);
    },
  };
  const Friendship = {
    async findOne(filter) { return clone(h.requests.find(row => matches(row, filter)) ?? null); },
    async exists(filter) { return this.findOne(filter); },
    async findOneAndUpdate(filter, update) {
      const row = h.requests.find(row => matches(row, filter));
      if (!row) return null;
      Object.assign(row, update.$set); h.writes.push({ table: "requests", id: row._id, status: row.status });
      return clone(row);
    },
    async create(fields) {
      if (h.requests.some(row => String(row.sender) === String(fields.sender) && String(row.receiver) === String(fields.receiver))) {
        throw Object.assign(Error("duplicate"), { code: 11000 });
      }
      const row = { _id: R, status: "pending", ...fields }; h.requests.push(clone(row)); h.writes.push({ table: "requests" });
      return { ...row, populate: async () => ({ ...row, sender: { FullName: user(row.sender).FullName } }) };
    },
  };
  class Chat {
    constructor(fields) { Object.assign(this, { _id: ROOM, ...fields }); }
    async save() { h.chats.push(clone({ ...this })); h.writes.push({ table: "chats" }); }
    static findById(id) {
      const read = async () => { if (h.readFailure) throw Error("database unavailable"); return clone(h.chats.find(row => row._id === String(id)) ?? null); };
      return { then: (resolve, reject) => read().then(resolve, reject), select: read };
    }
    static async findOne(filter) { return clone(h.chats.find(row => matches(row, filter)) ?? null); }
    static findOneAndUpdate(filter) {
      return { populate: async () => {
        const chat = h.chats.find(row => matches(row, filter));
        h.writes.push({ table: "chatMetadata" });
        return { ...clone(chat), participants: chat.participants.map(id => clone(user(id))) };
      } };
    }
  }
  class Message {
    constructor(fields) { Object.assign(this, { _id: "3".repeat(24), createdAt: new Date(), ...fields }); }
    async save() { h.messages.push(clone({ ...this })); h.writes.push({ table: "messages" }); }
    async populate() { return { ...this, sender: clone(user(this.sender)) }; }
  }
  const io = { to: room => ({ emit: (event, data) => h.events.push({ room, event, data }) }) };
  class Expo {
    static isExpoPushToken(token) { return typeof token === "string" && token.startsWith("ExponentPushToken["); }
    async sendPushNotificationsAsync(payload) { h.pushes.push(...payload); }
  }
  const routes = [];
  const verifyJWT = () => {};
  const router = { get: (...args) => routes.push(["get", ...args]), post: (...args) => routes.push(["post", ...args]), delete: (...args) => routes.push(["delete", ...args]) };
  h.routes = routes; h.verifyJWT = verifyJWT;
  const context = createContext({ console, Date });
  const mocks = new Map([
    [new URL("../model/user.js", import.meta.url).href, { User, default: User }],
    [new URL("../model/friendregust.model.js", import.meta.url).href, { default: Friendship }],
    [new URL("../model/Chat.js", import.meta.url).href, { Chat }],
    [new URL("../model/Message.js", import.meta.url).href, { Message }],
    [new URL("../lib/SocketIo.js", import.meta.url).href, { io }],
    [new URL("../middleWare/jwtAuth.js", import.meta.url).href, { verifyJWT }],
    ["mongoose", { default: mongoose }], ["expo-server-sdk", { Expo }],
    ["express", { default: { Router: () => router } }],
  ]);
  const modules = new Map();
  async function load(identifier) {
    if (modules.has(identifier)) return modules.get(identifier);
    const mock = mocks.get(identifier);
    const module = mock ? new SyntheticModule(Object.keys(mock), function () {
      for (const [key, value] of Object.entries(mock)) this.setExport(key, value);
    }, { context, identifier }) : new SourceTextModule(readFileSync(new URL(identifier), "utf8"), { context, identifier });
    modules.set(identifier, module);
    await module.link((name, referring) => load(name.startsWith(".") ? new URL(name, referring.identifier).href : name));
    return module;
  }
  h.load = async relative => {
    const module = await load(new URL(relative, import.meta.url).href);
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  };
  h.api = await h.load("../controller/friendreguest.controller.js");
  h.messageApi = await h.load("../controller/message.controller.js");
  h.request = (status = "pending") => { h.requests.push({ _id: R, sender: A, receiver: B, status }); };
  h.chat = (participants = [A, B]) => { h.chats.push({ _id: ROOM, participants, unreadCounts: participants.map(id => ({ user: id, count: 0 })) }); };
  h.call = async (handler, actor = B, id = R, body = {}) => {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handler({ user: clone(user(actor)), params: { id, chatId: id }, body, io, onlineUsers: new Map(), activeChatRooms: new Map() }, res);
    return res;
  };
  h.socket = async (actor = A) => {
    const { registerChatEvents } = await h.load("../lib/chatEvents.js");
    const listeners = {}, joined = [], active = new Map();
    const socket = { id: "socket", userId: actor, connected: true,
      on: (name, handler) => { listeners[name] = handler; },
      join: async room => { joined.push(room); }, leave: () => {},
      to: room => ({ emit: (event, data) => h.events.push({ room, event, data }) }),
    };
    registerChatEvents(socket, io, new Map([[B, "peer_socket"]]), active);
    return { listeners, joined, active, socket };
  };
  return h;
}

test("legacy sender and third parties cannot accept or decline a recipient's request", async () => {
  const h = await fixture(); h.request();
  for (const actor of [A, C]) for (const operation of [h.api.acceptFriendRequest, h.api.rejectFriendRequest]) {
    assert.equal((await h.call(operation, actor)).code, 404);
  }
  for (const id of [MISSING, "invalid"]) {
    assert.equal((await h.call(h.api.acceptFriendRequest, B, id)).code, 404);
    assert.equal((await h.call(h.api.rejectFriendRequest, B, id)).code, 404);
  }
  assert.equal(h.requests[0].status, "pending"); assert.deepEqual(h.writes, []); assert.deepEqual(h.events, []);
});

test("legacy recipient acceptance is idempotent under concurrent retries", async () => {
  const h = await fixture(); h.request(); h.users[0].Expopushtoken = "ExponentPushToken[test]";
  const results = await Promise.all([h.call(h.api.acceptFriendRequest), h.call(h.api.acceptFriendRequest)]);
  assert.ok(results.every(result => result.code === 200));
  await h.call(h.api.acceptFriendRequest);
  assert.equal(h.requests[0].status, "accepted");
  assert.deepEqual(h.users[0].friends, [B]); assert.deepEqual(h.users[1].friends, [A]);
  assert.equal(h.events.filter(event => event.event === "friendRequestAccepted").length, 1);
  assert.equal(h.pushes.length, 1);
  assert.equal((await h.call(h.api.rejectFriendRequest)).code, 409);
});

test("legacy rejection is receiver-only, idempotent, preserves history, and cannot later be accepted", async () => {
  const h = await fixture(); h.request(); h.chat();
  assert.equal((await h.call(h.api.rejectFriendRequest)).code, 200);
  const writes = h.writes.length;
  assert.equal((await h.call(h.api.rejectFriendRequest)).code, 200);
  assert.equal(h.writes.length, writes);
  assert.equal((await h.call(h.api.acceptFriendRequest)).code, 409);
  assert.equal(h.requests[0].status, "rejected"); assert.equal(h.chats.length, 1);
  assert.deepEqual(h.users.map(row => row.friends), [[], [], []]);
  assert.deepEqual(h.events, []); assert.deepEqual(h.pushes, []);
});

test("concurrent accept and decline produce exactly one terminal decision", async () => {
  for (const declineFirst of [false, true]) {
    const h = await fixture(); h.request();
    const operations = declineFirst ? [h.api.rejectFriendRequest, h.api.acceptFriendRequest] : [h.api.acceptFriendRequest, h.api.rejectFriendRequest];
    const results = await Promise.all(operations.map(operation => h.call(operation)));
    assert.deepEqual(results.map(result => result.code).sort(), [200, 409]);
    assert.equal(h.writes.filter(write => write.table === "requests").length, 1);
    assert.equal(h.users[0].friends.length, h.requests[0].status === "accepted" ? 1 : 0);
  }
});

test("either block direction prevents legacy acceptance but permits silent decline", async () => {
  for (const blocker of [A, B]) {
    const h = await fixture(); h.request(); h.users.find(row => row._id === blocker).block.push(blocker === A ? B : A);
    assert.equal((await h.call(h.api.acceptFriendRequest)).code, 404);
    assert.equal(h.requests[0].status, "pending"); assert.deepEqual(h.writes, []);
    assert.equal((await h.call(h.api.rejectFriendRequest)).code, 200);
    assert.deepEqual(h.events, []);
  }
});

test("a missing sender prevents acceptance but does not prevent decline", async () => {
  const h = await fixture(); h.request(); h.users = h.users.filter(row => row._id !== A);
  assert.equal((await h.call(h.api.acceptFriendRequest)).code, 404);
  assert.equal((await h.call(h.api.rejectFriendRequest)).code, 200);
});

test("an acceptance retry repairs partial legacy friend caches without duplicating friendship", async () => {
  const h = await fixture(); h.request(); h.cacheFailure = true;
  assert.equal((await h.call(h.api.acceptFriendRequest)).code, 500);
  assert.equal(h.requests[0].status, "accepted");
  assert.equal((await h.call(h.api.acceptFriendRequest)).code, 200);
  assert.deepEqual(h.users[0].friends, [B]); assert.deepEqual(h.users[1].friends, [A]);
  assert.equal(h.writes.filter(write => write.table === "requests").length, 1);
});

test("legacy send validates normalized self IDs, targets, blocks, duplicates, and crossed requests", async () => {
  for (const target of [A, A.toUpperCase(), "invalid", MISSING]) {
    const h = await fixture();
    const result = await h.call(h.api.sendFriendRequest, A, target);
    assert.ok([400, 404].includes(result.code)); assert.deepEqual(h.writes, []);
  }
  for (const blocker of [A, B]) {
    const h = await fixture(); h.users.find(row => row._id === blocker).block.push(blocker === A ? B : A);
    assert.equal((await h.call(h.api.sendFriendRequest, A, B)).code, 404); assert.deepEqual(h.writes, []);
  }
  const h = await fixture();
  assert.equal((await h.call(h.api.sendFriendRequest, A, B)).code, 200);
  assert.equal((await h.call(h.api.sendFriendRequest, A, B)).code, 409);
  assert.equal((await h.call(h.api.sendFriendRequest, B, A)).code, 409);
  assert.equal(h.requests[0].status, "pending"); assert.equal(h.requests.length, 1);
  assert.deepEqual(h.users.map(row => row.friends), [[], [], []]);
});

test("pending/declined/nonfriend messages fail before creating chats or other side effects", async () => {
  for (const status of [null, "pending", "rejected"]) for (const existing of [false, true]) {
    const h = await fixture(); if (status) h.request(status); if (existing) h.chat();
    assert.equal((await h.call(h.messageApi.sendMessage, A, existing ? ROOM : B, { text: "private" })).code, 403);
    assert.deepEqual(h.writes, []); assert.deepEqual(h.events, []); assert.deepEqual(h.pushes, []);
  }
});

test("accepted friends can exchange messages while blocked or foreign chats cannot send", async () => {
  const h = await fixture(); h.request("accepted");
  assert.equal((await h.call(h.messageApi.sendMessage, A, B, { text: "hello" })).code, 201);
  assert.equal((await h.call(h.messageApi.sendMessage, B, ROOM, { text: "reply" })).code, 201);
  assert.equal(h.messages.length, 2); assert.equal(h.chats.length, 1);
  const count = h.writes.length;
  assert.equal((await h.call(h.messageApi.sendMessage, C, ROOM, { text: "intrusion" })).code, 403);
  h.users[1].block.push(A);
  assert.equal((await h.call(h.messageApi.sendMessage, A, ROOM, { text: "blocked" })).code, 403);
  assert.equal(h.writes.length, count);
});

test("invalid text, malformed chats, self chats, and invalid IDs fail without writes", async () => {
  for (const text of [null, {}, "", "   "]) {
    const h = await fixture(); assert.equal((await h.call(h.messageApi.sendMessage, A, B, { text })).code, 400); assert.deepEqual(h.writes, []);
  }
  for (const participants of [[A, B, C], [A, A], [B, C]]) {
    const h = await fixture(); h.request("accepted"); h.chat(participants);
    assert.equal((await h.call(h.messageApi.sendMessage, A, ROOM, { text: "hello" })).code, 403); assert.deepEqual(h.writes, []);
  }
  const h = await fixture();
  assert.equal((await h.call(h.messageApi.sendMessage, A, "invalid", { text: "hello" })).code, 400);
});

test("foreign, malformed, invalid, and missing socket rooms never join or emit read receipts", async () => {
  for (const participants of [[B, C], [A, A], [A, B, C], null]) {
    const h = await fixture(); if (participants) h.chat(participants);
    const socket = await h.socket(); await socket.listeners["join-chat"](ROOM); await socket.listeners["join-chat"]("invalid");
    assert.deepEqual(socket.joined, []); assert.equal(socket.active.size, 0); assert.deepEqual(h.events, []);
  }
});

test("authorized socket members can join preserved history and emit a receipt", async () => {
  const h = await fixture(); h.chat(); const socket = await h.socket();
  await socket.listeners["join-chat"](ROOM);
  assert.deepEqual(socket.joined, ["chat:" + ROOM]); assert.equal(socket.active.get("socket"), ROOM);
  assert.deepEqual(plain(h.events), [{ room: "peer_socket", event: "messages-read", data: { chatId: ROOM, readBy: A } }]);
});

test("socket typing requires direct membership, accepted friendship, and no block in either direction", async () => {
  for (const scenario of ["foreign", "pending", "rejected", "blocked_a", "blocked_b", "valid"]) {
    const h = await fixture(); h.chat(scenario === "foreign" ? [B, C] : [A, B]);
    h.request(["pending", "rejected"].includes(scenario) ? scenario : "accepted");
    if (scenario === "blocked_a") h.users[0].block.push(B);
    if (scenario === "blocked_b") h.users[1].block.push(A);
    const socket = await h.socket(); await socket.listeners.typing({ chatId: ROOM, isTyping: true });
    assert.equal(h.events.length, scenario === "valid" ? 2 : 0);
    if (scenario === "valid") assert.ok(h.events.every(event => event.room === B));
  }
});

test("malformed socket payloads, disconnects, and database errors never fall back to broadcasting", async () => {
  const h = await fixture(); h.chat(); h.request("accepted"); const socket = await h.socket();
  for (const data of [null, {}, { chatId: "invalid", isTyping: true }, { chatId: ROOM, isTyping: "yes" }]) await socket.listeners.typing(data);
  socket.socket.connected = false; await socket.listeners["join-chat"](ROOM); await socket.listeners.typing({ chatId: ROOM, isTyping: true });
  socket.socket.connected = true; h.readFailure = true;
  await socket.listeners["join-chat"](ROOM); await socket.listeners.typing({ chatId: ROOM, isTyping: true });
  assert.deepEqual(socket.joined, []); assert.deepEqual(h.events, []);
});

test("the explicit reject route is authenticated and the existing unfriend route is retained", async () => {
  const h = await fixture(); const { default: router } = await h.load("../router/friendregust.route.js");
  assert.ok(router);
  const rejectRoute = h.routes.find(route => route[1] === "/reject-request/:id");
  assert.equal(rejectRoute[0], "post"); assert.equal(rejectRoute[2], h.verifyJWT); assert.equal(rejectRoute[3], h.api.rejectFriendRequest);
  const unfriendRoute = h.routes.find(route => route[1] === "/delete-request/:id");
  assert.equal(unfriendRoute[0], "delete"); assert.equal(unfriendRoute[2], h.verifyJWT); assert.equal(unfriendRoute[3], h.api.unfollowFriend);
});
