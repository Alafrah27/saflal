import { create } from "zustand";
const idle = { callState: "idle", callId: null, remoteUser: null, roomId: null, callStartTime: null };
// UI/audio arbitration only. Convex and Stream own durable and media state.
export const useCallStore = create(set => ({
  ...idle,
  setCall: call => set(call ? {
    callId: call._id, roomId: call.streamCallId, remoteUser: call.peer,
    callState: call.status === "accepted" ? "active" : call.direction === "outgoing" ? "outgoing" : "incoming",
    callStartTime: call.startedAt ?? null,
  } : idle),
  reset: () => set(idle),
  // Retired legacy routes cannot initiate unauthenticated Socket.IO calls.
  setSocket: () => {}, setCurrentUser: () => {}, initiateCall: () => {},
  handleIncomingCall: () => {}, handleCallAccepted: () => {}, handleCallRejected: () => {},
  handleCallEnded: () => {}, handleCallError: () => {},
}));
export default useCallStore;
