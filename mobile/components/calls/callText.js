export const callText = {
  en: {
    calling: "Calling…", incoming: "Incoming audio call", connecting: "Connecting…", reconnecting: "Reconnecting…",
    ended: "Call ended", missed: "Missed call", rejected: "Call declined", cancelled: "Call cancelled", busy: "Contact is busy",
    failed: "Call could not connect", unavailable: "Calling is unavailable. Only friends can call each other.",
    setup: "The calling service is not configured. Please contact support.",
    nativeBuild: "Install the latest Saflal Android development build to use calls.",
    accept: "Accept", decline: "Decline", cancel: "Cancel", end: "End call", mute: "Mute", unmute: "Unmute",
    output: "Audio output", back: "Back", retry: "Retry", history: "Calls", empty: "No recent calls",
    incomingLabel: "Incoming", outgoingLabel: "Outgoing", more: "Load more", callBack: "Call back", open: "Return to call",
    today: "Today", yesterday: "Yesterday", newCall: "New Call", chooseContact: "Choose a contact",
    loadingHistory: "Loading calls…", loadingContacts: "Loading contacts…", close: "Close",
    historyError: "Could not load your calls. Please try again.", contactsError: "Could not load contacts. Please try again.",
    emptyHint: "Audio calls with your contacts will appear here.", noContacts: "No friends available to call",
    noContactsHint: "Add friends from Contacts to start an audio call.", unavailableUser: "Unavailable user",
    noAnswer: "No answer", completed: "Completed", callContact: "Call", contacts: "Contacts",
    permission: "Allow microphone access in Settings to make audio calls.", rate: "Too many call attempts. Try again shortly.",
  },
  ar: {
    calling: "جارٍ الاتصال…", incoming: "مكالمة صوتية واردة", connecting: "جارٍ الاتصال…", reconnecting: "جارٍ إعادة الاتصال…",
    ended: "انتهت المكالمة", missed: "مكالمة فائتة", rejected: "تم رفض المكالمة", cancelled: "تم إلغاء المكالمة", busy: "جهة الاتصال مشغولة",
    failed: "تعذر إجراء المكالمة", unavailable: "الاتصال غير متاح. يمكن للأصدقاء فقط الاتصال ببعضهم.",
    setup: "خدمة الاتصال غير مهيأة. يرجى التواصل مع الدعم.",
    nativeBuild: "ثبّت أحدث إصدار أندرويد من سفلال لاستخدام المكالمات.",
    accept: "قبول", decline: "رفض", cancel: "إلغاء", end: "إنهاء", mute: "كتم الصوت", unmute: "تشغيل الميكروفون",
    output: "مخرج الصوت", back: "رجوع", retry: "إعادة المحاولة", history: "المكالمات", empty: "لا توجد مكالمات حديثة",
    incomingLabel: "واردة", outgoingLabel: "صادرة", more: "عرض المزيد", callBack: "معاودة الاتصال", open: "العودة للمكالمة",
    today: "اليوم", yesterday: "أمس", newCall: "مكالمة جديدة", chooseContact: "اختر جهة اتصال",
    loadingHistory: "جارٍ تحميل المكالمات…", loadingContacts: "جارٍ تحميل جهات الاتصال…", close: "إغلاق",
    historyError: "تعذر تحميل المكالمات. حاول مرة أخرى.", contactsError: "تعذر تحميل جهات الاتصال. حاول مرة أخرى.",
    emptyHint: "ستظهر هنا المكالمات الصوتية مع جهات اتصالك.", noContacts: "لا يوجد أصدقاء متاحون للاتصال",
    noContactsHint: "أضف أصدقاء من جهات الاتصال لبدء مكالمة صوتية.", unavailableUser: "مستخدم غير متاح",
    noAnswer: "لم يتم الرد", completed: "مكتملة", callContact: "اتصال", contacts: "جهات الاتصال",
    permission: "اسمح بالوصول إلى الميكروفون من الإعدادات لإجراء المكالمات.", rate: "محاولات اتصال كثيرة. حاول لاحقًا.",
  },
};
export function callError(error, text) {
  const code = typeof error?.data === "string" ? error.data : error?.message || "";
  if (code.includes("BUSY")) return text.busy;
  if (code.includes("NATIVE_BUILD")) return text.nativeBuild;
  if (code.includes("CONFIGURED")) return text.setup;
  if (code.includes("SERVICE_UNAVAILABLE") || code.includes("CONNECTION_FAILED")) return text.failed;
  if (code.includes("RATE_LIMITED")) return text.rate;
  if (/permission|microphone|NotAllowed/i.test(code)) return text.permission;
  return text.unavailable;
}
