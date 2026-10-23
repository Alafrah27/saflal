export async function changeAppLanguage({ language, i18n, storage, layout, reload, native = true, hasActiveCall = false }) {
  if (!["en", "ar"].includes(language)) throw Error("UNSUPPORTED_LANGUAGE");
  if (hasActiveCall) throw Error("LANGUAGE_CHANGE_ACTIVE_CALL");
  const previous = i18n.language === "ar" ? "ar" : "en";
  if (language === previous) return;
  const saved = await storage.getItem("lng");
  const wasRTL = layout.isRTL;
  try {
    await storage.setItem("lng", language);
    await i18n.changeLanguage(language);
    layout.allowRTL(language === "ar");
    layout.forceRTL(language === "ar");
    if (native && wasRTL !== (language === "ar")) await reload("Saflal language changed");
  } catch (error) {
    // Leave the prior language usable after storage, translation or reload failure.
    try {
      if (saved === null) await storage.removeItem("lng");
      else await storage.setItem("lng", saved);
      await i18n.changeLanguage(previous);
      layout.allowRTL(wasRTL); layout.forceRTL(wasRTL);
    } catch { /* The caller still receives a safe retryable error. */ }
    throw error;
  }
}
