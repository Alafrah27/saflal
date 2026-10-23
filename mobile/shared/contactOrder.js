// Pure ordering policy shared by Convex and the Contacts screen.
export const contactSources = ["friends1", "friends2", "others"];
export const MAX_DIRECTORY_KEY = 0xffffffff;

/** @param {string} value */
export function directoryOrderKey(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** @param {string} seed @param {string} userId @param {string} source */
export function contactTraversal(seed, userId, source) {
  const base = `${seed}:${userId}:${source}`;
  return {
    pivot: directoryOrderKey(`${base}:pivot`),
    direction: /** @type {"asc" | "desc"} */ (directoryOrderKey(`${base}:direction`) % 2 ? "desc" : "asc"),
  };
}

/** @param {string} seed @param {string} userId */
export function contactSegments(seed, userId) {
  const friends = directoryOrderKey(`${seed}:${userId}:friends`) % 2 ? ["friends2", "friends1"] : ["friends1", "friends2"];
  return [...friends, "others"].flatMap(source => [false, true].map(wrap => ({ source, wrap })));
}

/** Combine only the loaded prefix; later segments never outrank unfinished friends. */
export function orderedContactStreams(streams) {
  const unique = new Map();
  let status = "Exhausted", current = -1;
  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    if (stream.status !== "LoadingFirstPage") {
      for (const item of stream.results) if (!unique.has(item._id)) unique.set(item._id, item);
    }
    if (stream.status !== "Exhausted") { status = stream.status; current = i; break; }
  }
  const results = [...unique.values()];
  return { results, status: status === "LoadingFirstPage" && results.length ? "LoadingMore" : status, current };
}
