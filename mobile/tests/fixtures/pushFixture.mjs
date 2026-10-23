import assert from "node:assert/strict";
import schema from "../../convex/schema.js";

const tables = JSON.parse(schema.export()).tables;

// In-memory handler fixture with schema-checked index prefixes and read bounds.
// It does not emulate Convex validators, transactions, cursors, or concurrency.
export function pushFixture(subject = "clerk_a") {
  let sequence = 0;
  const rows = Object.fromEntries(tables.map(table => [table.tableName, []]));
  const writes = [], scheduled = [];
  for (const id of ["a", "b", "c"]) rows.users.push({
    _id: id, _creationTime: 1, clerkId: `clerk_${id}`, fullName: `User ${id}`,
    isActive: true, isOnline: false, showOnlineStatus: false, showLastSeen: false,
    createdAt: 1, updatedAt: 1,
  });
  const ctx = {
    auth: { getUserIdentity: async () => subject ? { subject } : null },
    scheduler: { runAfter: async (delay, fn, args) => { scheduled.push({ delay, fn, args }); return "scheduled"; } },
    db: {
      query(table) {
        assert.ok(rows[table]);
        const checks = [];
        let direction = 1;
        const matches = () => rows[table].filter(row => checks.every(check => check(row)))
          .sort((a, b) => direction * (a._creationTime - b._creationTime));
        return {
          withIndex(name, build) {
            const index = tables.find(item => item.tableName === table).indexes.find(item => item.indexDescriptor === name);
            assert.ok(index, `Missing index ${table}.${name}`);
            let position = 0;
            const builder = {
              eq(field, value) {
                assert.equal(field, index.fields[position++]);
                checks.push(row => row[field] === value); return builder;
              },
              lte(field, value) {
                assert.equal(field, index.fields[position]);
                checks.push(row => row[field] <= value); return builder;
              },
              lt(field, value) {
                assert.equal(field, index.fields[position]);
                checks.push(row => row[field] < value); return builder;
              },
            };
            build(builder); return this;
          },
          async first() { return matches()[0] ?? null; },
          order(value) { direction = value === "desc" ? -1 : 1; return this; },
          async unique() { const found = matches(); assert.ok(found.length <= 1); return found[0] ?? null; },
          async take(limit) { assert.ok(Number.isInteger(limit) && limit > 0 && limit <= 100); return matches().slice(0, limit); },
        };
      },
      async get(table, id) { return rows[table].find(row => row._id === id) ?? null; },
      async insert(table, fields) {
        const _id = `${table}_${++sequence}`;
        rows[table].push({ _id, _creationTime: sequence, ...structuredClone(fields) });
        writes.push({ type: "insert", table, id: _id }); return _id;
      },
      async patch(table, id, fields) {
        const row = rows[table].find(row => row._id === id); assert.ok(row);
        for (const [key, value] of Object.entries(fields)) {
          if (value === undefined) delete row[key]; else row[key] = structuredClone(value);
        }
        writes.push({ type: "patch", table, id });
      },
      async replace(table, id, fields) {
        const index = rows[table].findIndex(row => row._id === id); assert.ok(index >= 0);
        const { _id, _creationTime } = rows[table][index];
        rows[table][index] = { _id, _creationTime, ...structuredClone(fields) };
        writes.push({ type: "replace", table, id });
      },
      async delete(table, id) {
        const index = rows[table].findIndex(row => row._id === id); assert.ok(index >= 0);
        rows[table].splice(index, 1); writes.push({ type: "delete", table, id });
      },
    },
  };
  const device = (userId = "b", fields = {}) => ctx.db.insert("devices", {
    userId, expoPushToken: `ExpoPushToken[token_${sequence}]`, installationId: `installation_${sequence}_0000`,
    platform: "android", language: "en", registrationVersion: 1, isActive: true, updatedAt: 1, ...fields,
  });
  const request = (fields = {}) => ctx.db.insert("friendRequests", {
    senderId: "a", receiverId: "b", status: "pending", createdAt: 1, updatedAt: 1, ...fields,
  });
  const message = async (fields = {}) => {
    const chatId = await ctx.db.insert("chats", {
      type: "direct", directPairKey: JSON.stringify(["a", "b"]), disappearingMessages: false, createdAt: 1, updatedAt: 1,
    });
    for (const userId of ["a", "b"]) await ctx.db.insert("chatMembers", {
      chatId, userId, joinedAt: 1, isMuted: false, isArchived: false,
    });
    return await ctx.db.insert("messages", { chatId, senderId: "a", type: "text", text: "hello", status: "sent", createdAt: 10, updatedAt: 10, ...fields });
  };
  return { ctx, rows, writes, scheduled, device, request, message, as: id => { subject = id === null ? null : `clerk_${id}`; } };
}
