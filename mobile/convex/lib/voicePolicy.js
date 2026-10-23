// @ts-check
export const MAX_VOICE_BYTES = 10 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 300;
export const UPLOAD_TTL = 24 * 60 * 60 * 1000;
export const VOICE_STORAGE_TYPE = "application/vnd.saflal.voice.v1";
/** @param {string} key */
export const validMessageKey = key => /^[a-zA-Z0-9_-]{16,100}$/.test(key);

// Read incrementally: Content-Length is advisory and cannot enforce a limit.
/** @param {Request} request */
export async function readVoiceBody(request) {
  if (!request.body) throw Error("INVALID_AUDIO");
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_VOICE_BYTES) throw Error("AUDIO_TOO_LARGE");
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  if (size < 32) throw Error("INVALID_AUDIO");
  return new Blob(chunks, { type: VOICE_STORAGE_TYPE });
}
