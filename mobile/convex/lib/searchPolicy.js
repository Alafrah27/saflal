// @ts-check
// Shared input policy only; safe for the mobile bundle. No database or secrets.
/** @param {string} value */
export function searchInput(value) {
  const query = value.trim().replace(/\s+/gu, " ");
  const terms = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  const valid = !query || ([...query].length <= 80 && terms.length > 0 && terms.length <= 16 &&
    terms.every(term => [...term].length <= 32));
  return { query, valid };
}
