import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

// Key by requestId at every call site so a new request gets fresh action state.
export default function FriendRequestActions({ requestId, text }) {
  const accept = useMutation(api.friendRequests.acceptFriendRequest);
  const decline = useMutation(api.friendRequests.rejectFriendRequest);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [pending, setPending] = useState(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const decide = async (decision, event) => {
    event?.stopPropagation?.();
    if (!requestId || inFlight.current) return;
    inFlight.current = true;
    setPending(decision);
    setError(false);
    try {
      await (decision === "accept" ? accept : decline)({ requestId });
      // The subscription, not a local optimistic flag, grants friendship.
      // Keep controls locked until that subscription removes/replaces them.
      if (mounted.current) setFinished(true);
    } catch {
      inFlight.current = false;
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setPending(null);
    }
  };
  const disabled = !requestId || !!pending || finished;
  return <View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {["accept", "decline"].map(decision => <TouchableOpacity key={decision}
        accessibilityRole="button" accessibilityLabel={text[decision]}
        accessibilityState={{ disabled, busy: pending === decision }} disabled={disabled}
        onPress={event => decide(decision, event)}
        style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
          backgroundColor: decision === "accept" ? "#b88144" : "#e5e7eb", opacity: disabled ? 0.6 : 1 }}>
        {pending === decision ? <ActivityIndicator size="small" color={decision === "accept" ? "white" : "#374151"} />
          : <Text style={{ fontWeight: "600", color: decision === "accept" ? "white" : "#374151" }}>{text[decision]}</Text>}
      </TouchableOpacity>)}
    </View>
    {error && <Text accessibilityRole="alert" style={{ color: "#b91c1c", marginTop: 8 }}>{text.decisionError}</Text>}
  </View>;
}
