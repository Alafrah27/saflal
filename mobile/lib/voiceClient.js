// The .site origin serves authenticated HTTP actions; it is public configuration.
export function voiceOrigin() {
  const configured = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  const cloud = process.env.EXPO_PUBLIC_CONVEX_URL;
  const url = new URL(configured || cloud || "https://missing.invalid");
  if (!configured && url.hostname.endsWith(".convex.cloud")) url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
  else if (!configured) throw Error("VOICE_CONFIGURATION_UNAVAILABLE");
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw Error("VOICE_CONFIGURATION_UNAVAILABLE");
  return url.origin;
}

export async function authenticatedVoiceFetch(fetcher, getToken, path, options = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken({ skipCache: attempt === 1 });
    if (!token) throw Error("VOICE_UNAVAILABLE");
    const response = await fetcher(`${voiceOrigin()}${path}`, { ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` } });
    if (response.status === 401 && attempt === 0) continue;
    if (!response.ok) throw Error("VOICE_UNAVAILABLE");
    return response;
  }
  throw Error("VOICE_UNAVAILABLE");
}

// Expo fetch reads the recorder URI as bytes. Its Response.blob() bridge depends
// on the native Blob store and can fail before an upload ever reaches Convex.
// Keep the same bytes for the POST; no Blob conversion or filesystem API.
export async function readVoiceRecording(fetcher, uri, signal) {
  try {
    if (typeof uri !== "string" || !uri.startsWith("file://") || signal?.aborted) throw Error("VOICE_UNAVAILABLE");
    const response = await fetcher(uri, { signal });
    if (!response.ok && response.status !== 0) throw Error("VOICE_UNAVAILABLE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 32 || bytes.byteLength > 10 * 1024 * 1024 || signal?.aborted) throw Error("VOICE_UNAVAILABLE");
    return bytes;
  } catch {
    throw Object.assign(Error("VOICE_UNAVAILABLE"), { code: "VOICE_READ_FAILED" });
  }
}

export function voiceTime(seconds = 0) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

