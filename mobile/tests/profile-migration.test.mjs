import test from "node:test";
import assert from "node:assert/strict";
import { remove } from "../convex/migrations/removeUsernames.js";

function fixture() {
  const rows = [
    { _id: "a", _creationTime: 1, clerkId: "clerk_a", fullName: "Existing Name", username: "old_handle", bio: "Keep bio", createdAt: 1, updatedAt: 2 },
    { _id: "b", _creationTime: 3, clerkId: "clerk_b", fullName: "Existing Name", createdAt: 3, updatedAt: 3 },
  ];
  const writes = [];
  const ctx = { db: {
    query(table) {
      assert.equal(table, "users");
      return { async paginate(options) {
        assert.deepEqual(options, { numItems: 100, cursor: null, maximumRowsRead: 100 });
        return { page: rows, isDone: true, continueCursor: "end" };
      } };
    },
    async patch(table, id, fields) {
      assert.equal(table, "users");
      assert.deepEqual(fields, { username: undefined });
      delete rows.find(user => user._id === id).username;
      writes.push(id);
    },
  } };
  return { ctx, rows, writes };
}

test("name migration removes only the old handle and preserves account identity/profile metadata", async () => {
  const { ctx, rows, writes } = fixture();
  const expected = structuredClone(rows);
  delete expected[0].username;
  const result = await remove._handler(ctx, { cursor: null });
  assert.deepEqual(rows, expected);
  assert.deepEqual(writes, ["a"]);
  assert.deepEqual(result, { removedCount: 1, scannedCount: 2, continueCursor: "end", isDone: true });
  const repeated = await remove._handler(ctx, { cursor: null });
  assert.equal(repeated.removedCount, 0);
  assert.deepEqual(writes, ["a"]);
});

test("name migration refuses a profile without its full name", async () => {
  const { ctx, rows, writes } = fixture();
  delete rows[0].fullName;
  await assert.rejects(remove._handler(ctx, { cursor: null }), /FULL_NAME_REQUIRED_BEFORE_MIGRATION/);
  assert.deepEqual(writes, []);
  assert.equal(rows[0].username, "old_handle");
});

test("name migration is internal-only and accepts only a pagination cursor", () => {
  assert.equal(remove.isInternal, true);
  assert.notEqual(remove.isPublic, true);
  assert.deepEqual(Object.keys(JSON.parse(remove.exportArgs()).value), ["cursor"]);
});
