import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../convex/_generated/api";
import { listDeleteText } from "../components/CustomHookUi/listDeleteText";

export default function useListDeletion(kind) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar", text = listDeleteText[isArabic ? "ar" : "en"];
  const remove = useMutation(kind === "chat" ? api.chats.deleteForMe : api.calls.deleteHistory);
  const [selected, setSelected] = useState(() => new Set());
  const [dialog, setDialog] = useState(null), [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const selection = useRef(new Set()), submitting = useRef(false), alive = useRef(true), focused = useRef(true), generation = useRef(0), target = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reset = useCallback(() => {
    generation.current++; selection.current = new Set(); target.current = null;
    setSelected(new Set()); setDialog(null); setError("");
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; reset(); };
  }, [reset]));
  const toggle = id => {
    if (submitting.current || target.current || !focused.current) return;
    const next = new Set(selection.current);
    if (next.has(id)) next.delete(id);
    else if (next.size < 50) next.add(id);
    else { setError(text.limit); return; }
    selection.current = next; setSelected(next); setError("");
  };
  const open = () => {
    if (submitting.current || !selection.current.size || target.current) return;
    target.current = [...selection.current]; setError(""); setDialog(target.current);
  };
  const close = () => { if (!submitting.current) { target.current = null; setDialog(null); setError(""); } };
  const confirm = async () => {
    if (submitting.current || !target.current || !focused.current) return;
    submitting.current = true; setPending("deleting"); setError("");
    const version = generation.current, ids = [...target.current];
    try {
      await remove(kind === "chat" ? { chatIds: ids } : { callIds: ids });
      if (alive.current && focused.current && generation.current === version) reset();
    } catch (failure) {
      if (alive.current && focused.current && generation.current === version)
        setError(failure?.data === "CALL_HISTORY_ACTIVE" ? text.activeCall : text.error);
    } finally {
      submitting.current = false;
      if (alive.current) setPending("");
    }
  };
  return { selected, active: selected.size > 0, dialog, pending: !!pending, error, text, isArabic,
    kind, toggle, open, close, confirm, cancel: () => { if (!submitting.current) reset(); } };
}
