export const listDeleteText = {
  en: {
    cancel: "Cancel", remove: "Delete", deleting: "Deleting…", retry: "Retry deletion",
    selected: count => `${count} selected`, limit: "Select up to 50 items at a time.",
    chatTitle: "Delete chats?", callTitle: "Delete call history?",
    chatBody: count => `Delete ${count} chat${count === 1 ? "" : "s"} and their existing messages for you? The other person's history stays unchanged. New messages bring the chat back.`,
    callBody: count => `Delete ${count} call record${count === 1 ? "" : "s"} from your history? The other person's history stays unchanged.`,
    error: "Could not confirm deletion. Check your connection and retry.",
    activeCall: "End the active call before deleting its history.",
    select: "Select", selectHint: "Long press to select for deletion",
  },
  ar: {
    cancel: "إلغاء", remove: "حذف", deleting: "جارٍ الحذف…", retry: "إعادة محاولة الحذف",
    selected: count => `تم تحديد ${count}`, limit: "يمكنك تحديد 50 عنصرًا كحد أقصى في كل مرة.",
    chatTitle: "حذف المحادثات؟", callTitle: "حذف سجل المكالمات؟",
    chatBody: count => `هل تريد حذف ${count} محادثة ورسائلها الحالية من حسابك فقط؟ لن يتغير سجل الطرف الآخر. ستظهر المحادثة مجددًا عند وصول رسائل جديدة.`,
    callBody: count => `هل تريد حذف ${count} سجل مكالمة من حسابك فقط؟ لن يتغير سجل الطرف الآخر.`,
    error: "تعذر تأكيد الحذف. تحقق من اتصالك وحاول مرة أخرى.",
    activeCall: "أنهِ المكالمة الجارية قبل حذف سجلها.",
    select: "تحديد", selectHint: "اضغط مطولًا للتحديد والحذف",
  },
};
