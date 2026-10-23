// Stateful native workflow kept independent of React so async gesture races can
// be verified without pretending that a Node test is a device microphone test.
export function createVoiceRecorder(deps) {
  const state = { phase: "idle", clip: null, error: null, held: false, active: true, generation: 0, duration: 0 };
  let limitTimer, abort, autoSend = false;
  const publish = patch => {
    Object.assign(state, patch);
    if (state.active) deps.change({ phase: state.phase, clip: state.clip, error: state.error });
  };
  const releaseAudio = async () => {
    // Calls own their audio session once they start; do not reconfigure it.
    if (deps.canReleaseAudio ? deps.canReleaseAudio() : deps.canUseAudio()) await deps.mode(false).catch(() => {});
    deps.recording(false);
    deps.release?.();
  };
  const discardNative = async () => {
    await deps.recorder.stop().catch(() => {});
    deps.remove?.(deps.recorder.uri);
  };
  const controller = {
    state,
    async start(accessible = false) {
      if (state.phase !== "idle" || !state.active || !deps.canUseAudio()) return;
      if (deps.acquire && !deps.acquire()) { publish({ error: "voiceRecordError" }); return; }
      const generation = ++state.generation;
      state.held = true;
      publish({ phase: "preparing", error: null }); deps.recording(true);
      const valid = () => state.active && generation === state.generation && (state.held || accessible) && deps.canUseAudio();
      try {
        const permission = await deps.permission(false);
        if (!permission.granted) {
          const granted = await deps.permission(true);
          if (state.active && state.phase === "preparing") publish({ error: granted.granted ? "voiceReady" : "voicePermission" });
          return; // A permission dialog never starts a recording on its own.
        }
        if (!valid()) return;
        await deps.mode(true);
        if (!valid()) return;
        await deps.recorder.prepareToRecordAsync();
        if (!valid()) { await discardNative(); return; }
        state.duration = 0;
        // Allow for AAC packet padding while retaining the server's 300s cap.
        deps.recorder.record({ forDuration: 299.8 });
        publish({ phase: accessible ? "locked" : "recording" });
        limitTimer = setTimeout(() => controller.finish("preview"), 300000);
      } catch {
        await discardNative();
        if (state.active && generation === state.generation) publish({ error: "voiceRecordError" });
      } finally {
        if (!["recording", "locked", "stopping", "preview", "sending"].includes(state.phase)) {
          publish({ phase: "idle" }); await releaseAudio();
        }
      }
    },
    release() {
      state.held = false;
      if (state.phase === "preparing") state.generation++;
      if (state.phase === "recording") return controller.finish("send");
    },
    async finish(decision = "preview", completed) {
      state.held = false;
      if (state.phase === "preparing") { state.generation++; return; }
      if (!["recording", "locked"].includes(state.phase)) return;
      const generation = state.generation;
      autoSend = decision === "send";
      const duration = Math.max(state.duration, deps.recorder.currentTime || 0);
      clearTimeout(limitTimer); publish({ phase: "stopping" });
      try {
        if (!completed) {
          try { await deps.recorder.stop(); }
          catch (error) {
            // The OS may finish first during background/audio interruption.
            // A confirmed stopped native recorder can still supply its clip.
            const nativeStatus = deps.recorder.getStatus?.();
            if (!nativeStatus || nativeStatus.isRecording) throw error;
          }
        }
        const uri = completed?.uri || deps.recorder.uri;
        const size = uri && deps.size ? deps.size(uri) : undefined;
        if (!state.active || generation !== state.generation || decision === "discard") { deps.remove?.(uri); return; }
        // Recorded byte size is checked by the upload adapter and again server-side.
        if (!uri || duration < 1 || (size !== undefined && (size < 32 || size > 10 * 1024 * 1024))) {
          deps.remove?.(uri); publish({ error: "voiceInvalid" }); return;
        }
        publish({ clip: { uri, duration: Math.min(duration, 300), clientMessageId: deps.uuid() },
          phase: autoSend ? "stopping" : "preview", error: null });
      } catch { deps.remove?.(deps.recorder.uri); if (state.active) publish({ error: "voiceRecordError" }); }
      finally {
        await releaseAudio();
        if (state.phase === "stopping" && !state.clip) publish({ phase: "idle" });
      }
      if (state.active && state.clip && state.phase === "stopping") {
        if (autoSend && deps.canUseAudio()) await controller.send();
        else publish({ phase: "preview" });
      }
    },
    async send() {
      if (!["preview", "stopping"].includes(state.phase) || !state.clip || !state.active || !deps.canUseAudio()) return;
      const clip = state.clip, generation = ++state.generation;
      abort = new AbortController();
      publish({ phase: "sending", error: null }); deps.stopPlayback();
      const valid = () => state.active && generation === state.generation && !abort.signal.aborted;
      let step = "prepare";
      try {
        if (!clip.uploadId) clip.uploadId = (await deps.begin(clip.clientMessageId)).uploadId;
        if (!valid()) { await deps.cancel(clip.uploadId).catch(() => {}); return; }
        step = "upload";
        await deps.upload(clip, abort.signal);
        if (!valid()) return;
        step = "send";
        await deps.send(clip);
        deps.remove?.(clip.uri);
        if (valid()) publish({ phase: "idle", clip: null });
      } catch (error) {
        const message = error?.code === "VOICE_READ_FAILED" ? "voiceReadError"
          : step === "prepare" ? "voicePrepareSendError" : step === "upload" ? "voiceUploadError" : "voiceSendError";
        if (valid()) publish({ phase: "preview", error: message });
      }
    },
    discard() {
      ++state.generation; abort?.abort(); clearTimeout(limitTimer); state.held = false;
      deps.stopPlayback();
      if (state.clip) {
        deps.remove?.(state.clip.uri);
        if (state.clip.uploadId) void deps.cancel(state.clip.uploadId).catch(() => {});
      }
      publish({ phase: "idle", clip: null, error: null });
    },
    interrupt() {
      autoSend = false;
      if (["recording", "locked", "preparing"].includes(state.phase)) return controller.finish("preview");
    },
    complete(status) {
      if (["recording", "locked"].includes(state.phase)) return controller.finish("preview", { uri: status.url });
    },
    dispose() {
      state.active = false;
      const wasRecording = ["recording", "locked"].includes(state.phase);
      controller.discard();
      // Preparing/stopping workflows already own their async cleanup. Releasing
      // early could let another route start while the old native work finishes.
      if (wasRecording) void discardNative().finally(releaseAudio);
    },
  };
  return controller;
}
