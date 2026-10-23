// Native stacks can retain blurred conversations. Keep microphone ownership
// until async stop/preparation cleanup completes, even after route unmount.
let recorderOwner = null;
export function claimVoiceRecorder(owner) {
  if (recorderOwner !== null) return false;
  recorderOwner = owner; return true;
}
export function releaseVoiceRecorder(owner) { if (recorderOwner === owner) recorderOwner = null; }
export function voiceRecorderActive() { return recorderOwner !== null; }
