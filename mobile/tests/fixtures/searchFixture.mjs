import assert from "node:assert/strict";
import schema from "../../convex/schema.js";
import { historyFixture } from "./historyFixture.mjs";

// Deterministic candidate fixture, not an implementation of Convex's ranker or
// transaction/cursor engine. Live-index checks are reported separately.
export function searchFixture(subject = "clerk_a") {
  const f = historyFixture(subject), query = f.ctx.db.query;
  f.searches = []; f.rankedIds = null;
  f.ctx.db.query = table => {
    const original = query(table);
    original.withSearchIndex = (name, build) => {
      const index = JSON.parse(schema.export()).tables.find(t => t.tableName === table).searchIndexes.find(i => i.indexDescriptor === name);
      assert.ok(index); let text; const filters = [];
      const builder = {
        search(field, value) { assert.equal(field, index.searchField); text = value; return builder; },
        eq(field, value) { assert.ok(index.filterFields.includes(field)); filters.push([field, value]); return builder; },
      };
      build(builder); f.searches.push({ table, name, text, filters });
      return { async paginate(options) {
        assert.ok(options.maximumRowsRead <= 50);
        const terms = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
        const ranked = f.rankedIds ? f.rankedIds.map(id => f.rows.users.find(u => u._id === id)) : [...f.rows.users].reverse();
        const matches = ranked.filter(user => filters.every(([field, value]) => user[field] === value) &&
          terms.every((term, i) => ((user[index.searchField] ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).some(word => i === terms.length - 1 ? word.startsWith(term) : word === term)));
        const offset = Number(options.cursor ?? 0), count = Math.min(options.numItems, options.maximumRowsRead);
        const page = matches.slice(offset, offset + count); f.reads.push({ table, limit: count, search: true });
        return { page, isDone: offset + page.length >= matches.length, continueCursor: String(offset + page.length), splitCursor: "search-split", pageStatus: "SplitRecommended" };
      } };
    };
    return original;
  };
  return f;
}
