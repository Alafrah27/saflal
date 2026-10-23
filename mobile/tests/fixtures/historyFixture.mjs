import assert from "node:assert/strict";
import schema from "../../convex/schema.js";
import { pushFixture } from "./pushFixture.mjs";

const tables = JSON.parse(schema.export()).tables;
export function historyFixture(subject = "clerk_a") {
  const f = pushFixture(subject);
  f.reads = [];
  f.ctx.db.query = table => {
    const checks = []; let fields = ["_creationTime"], direction = 1;
    const values = () => f.rows[table].filter(row => checks.every(check => check(row))).sort((a, b) => {
      for (const field of fields) {
        if (a[field] === b[field]) continue;
        return direction * (a[field] === undefined ? -1 : b[field] === undefined ? 1 : a[field] < b[field] ? -1 : 1);
      }
      return direction * a._id.localeCompare(b._id);
    });
    const query = {
      withIndex(name, build) {
        const index = tables.find(t => t.tableName === table).indexes.find(i => i.indexDescriptor === name);
        assert.ok(index, `Missing index ${table}/${name}`); fields = index.fields; let position = 0;
        const builder = { eq(field, value) { assert.equal(field, fields[position++]); checks.push(row => row[field] === value); return builder; } };
        for (const [method, compare] of Object.entries({ gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b }))
          builder[method] = (field, value) => { assert.equal(field, fields[position]); checks.push(row => compare(row[field], value)); return builder; };
        build(builder); return query;
      },
      order(value) { direction = value === "desc" ? -1 : 1; return query; },
      async first() { f.reads.push({ table, limit: 1 }); return values()[0] ?? null; },
      async unique() { const rows = values(); assert.ok(rows.length <= 1); return rows[0] ?? null; },
      async take(limit) { assert.ok(limit > 0 && limit <= 100); f.reads.push({ table, limit }); return values().slice(0, limit); },
      async paginate(options) {
        const rows = values(), offset = Number(options.cursor ?? 0), limit = Math.min(options.numItems, options.maximumRowsRead ?? 100);
        assert.ok(limit <= 100); f.reads.push({ table, limit });
        const page = rows.slice(offset, offset + limit);
        return { page, isDone: offset + page.length >= rows.length, continueCursor: String(offset + page.length), splitCursor: "split", pageStatus: "SplitRecommended" };
      },
    };
    return query;
  };
  return f;
}
