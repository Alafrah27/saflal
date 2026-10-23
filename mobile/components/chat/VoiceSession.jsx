import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/expo";
import { useNavigation } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { useCallStore } from "../../store/callStore";
import { voiceOrigin } from "../../lib/voiceClient";
import { voiceRecorderActive } from "../../lib/voiceActivity";

const VoiceContext = createContext(null);
export const useVoiceSession = () => useContext(VoiceContext);

export default function VoiceSession({ accountId, chatId, children }) {
  const { getToken: getClerkToken, sessionClaims } = useAuth();
  // Match ConvexProviderWithClerk: the current Clerk integration uses the
  // session token; older projects use the "convex" JWT template.
  const audience = sessionClaims?.aud;
  const getToken = useCallback(({ skipCache = false } = {}) => getClerkToken(
    audience === "convex" ? { skipCache } : { template: "convex", skipCache }
  ), [getClerkToken, audience]);
  const navigation = useNavigation();
  // Stream through the native player without creating custom download files.
  const player = useAudioPlayer(null, { updateInterval: 200, downloadFirst: false });
  const status = useAudioPlayerStatus(player);
  const callState = useCallStore(state => state.callState);
  const [activeId, setActiveId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [errorId, setErrorId] = useState(null);
  const state = useRef({ active: true, generation: 0, id: null, source: null, recording: false });

  const stop = useCallback(() => {
    const current = state.current;
    current.generation++;
    try { player.pause(); player.replace(null); } catch { /* Native player may be releasing. */ }
    current.source = null; current.id = null;
    if (current.active) { setActiveId(null); setLoadingId(null); }
  }, [player]);
  const removeMessage = useCallback(id => { if (state.current.id === id) stop(); }, [stop]);
  useEffect(() => navigation.addListener("blur", stop), [navigation, stop]);
  useEffect(() => {
    const current = state.current;
    current.active = true;
    const subscription = AppState.addEventListener("change", value => { if (value !== "active") stop(); });
    return () => { current.active = false; stop(); subscription.remove(); };
    // Each account/chat boundary owns a player and fences pending token requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, chatId, player]);
  useEffect(() => { if (callState !== "idle") stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState]);
  useEffect(() => {
    if (status.error) {
      const id = state.current.id;
      stop(); if (id) setErrorId(id);
    }
  }, [status.error, stop]);

  const toggle = async (id, localUri, expiresAt) => {
    const current = state.current;
    if (!navigation.isFocused() || voiceRecorderActive() || current.recording || useCallStore.getState().callState !== "idle" || AppState.currentState !== "active") return;
    if (expiresAt !== undefined && expiresAt <= Date.now()) { stop(); setErrorId(id); return; }
    if (current.id === id && current.source) {
      try {
        if (status.playing) player.pause();
        else { if (status.didJustFinish || status.currentTime >= status.duration) await player.seekTo(0); player.play(); }
      } catch { stop(); if (current.active) setErrorId(id); }
      return;
    }
    stop(); setErrorId(null); setLoadingId(id); current.id = id;
    const generation = current.generation;
    const valid = () => current.active && current.generation === generation &&
      (expiresAt === undefined || expiresAt > Date.now()) && !current.recording &&
      navigation.isFocused() && AppState.currentState === "active" && useCallStore.getState().callState === "idle";
    try {
      let source;
      if (localUri) source = { uri: localUri };
      else {
        const token = await getToken({ skipCache: true });
        if (!token) throw Error("VOICE_UNAVAILABLE");
        source = { uri: `${voiceOrigin()}/voice/${encodeURIComponent(id)}`, headers: { Authorization: `Bearer ${token}` } };
      }
      if (!valid()) return;
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false,
        shouldRecordInBackground: false, interruptionMode: "doNotMix" });
      if (!valid()) return;
      current.source = source; player.replace(source); player.play(); setActiveId(id);
    } catch {
      if (current.active && current.generation === generation) { stop(); setErrorId(id); }
    } finally {
      if (current.active && current.generation === generation) setLoadingId(null);
    }
  };
  return <VoiceContext.Provider value={{ activeId, loadingId, errorId, status, callState,
    getToken, toggle, stopPlayback: stop, removeMessage,
    setRecording: value => { if (value) stop(); state.current.recording = value; },
  }}>{children}</VoiceContext.Provider>;
}
