// @ts-check
/** @param {import("../_generated/dataModel.js").Doc<"messages">} message */
export function messageContent(message) {
  // Older clients also receive a safe text bubble for deleted voice messages.
  if ("deletedAt" in message) return { type: /** @type {const} */ ("text"), text: "Message deleted.", deletedAt: message.deletedAt };
  return message.type !== "audio"
    ? { type: /** @type {const} */ ("text"), text: message.text }
    : { type: message.type, audioDuration: message.audioDuration };
}
