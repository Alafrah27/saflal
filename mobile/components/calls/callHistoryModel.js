// Both history indexes order by createdAt, then Convex's creation time.
// The ID is a deterministic final tie-breaker for the merged UI.
export function compareCalls(a, b) {
  return b.createdAt - a.createdAt || b._creationTime - a._creationTime ||
    (a._id < b._id ? 1 : a._id > b._id ? -1 : 0);
}

export function mergeCallHistory(incoming, outgoing) {
  const streams = { incoming, outgoing };
  const entries = Object.entries(streams);
  const initial = entries.some(([, stream]) => stream.status === "LoadingFirstPage");
  const loading = entries.some(([, stream]) => ["LoadingFirstPage", "LoadingMore"].includes(stream.status));
  if (initial) return { calls: [], loading, next: [], exhausted: false };

  const open = entries.filter(([, stream]) => stream.status !== "Exhausted");
  const empty = open.filter(([, stream]) => !stream.results.length);
  const boundaries = open.filter(([, stream]) => stream.results.length)
    .map(([direction, stream]) => ({ direction, call: stream.results.at(-1) }))
    .sort((a, b) => compareCalls(a.call, b.call));
  const boundary = boundaries[0]?.call;
  // An unfinished empty stream has not established any chronological boundary.
  const calls = empty.length ? [] : [...new Map(
    [...incoming.results, ...outgoing.results].map(call => [call._id, call])
  ).values()].filter(call => !boundary || compareCalls(call, boundary) <= 0).sort(compareCalls);
  const candidates = empty.length ? empty.map(([direction]) => direction)
    : boundaries.filter(item => compareCalls(item.call, boundary) === 0).map(item => item.direction);
  const next = candidates.filter(direction => streams[direction].status === "CanLoadMore");
  return { calls, loading, next, exhausted: open.length === 0 };
}

export function callDayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupCallsByDay(calls, now, language, text) {
  const today = callDayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = callDayKey(yesterdayDate);
  const groups = new Map();
  for (const call of calls) {
    const key = callDayKey(call.createdAt);
    if (!groups.has(key)) groups.set(key, {
      key,
      title: key === today ? text.today : key === yesterday ? text.yesterday
        : new Date(call.createdAt).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" }),
      data: [],
    });
    groups.get(key).data.push(call);
  }
  return [...groups.values()];
}

export function callDescription(call, text) {
  const direction = call.direction === "incoming" ? text.incomingLabel : text.outgoingLabel;
  const missed = call.direction === "incoming" && call.status === "missed";
  let outcome = "";
  if (call.status === "missed") outcome = missed ? text.missed : text.noAnswer;
  else if (call.status === "rejected") outcome = call.outcome === "busy" ? text.busy : text.rejected;
  else if (call.status === "failed") outcome = text.failed;
  else if (call.status === "ringing") outcome = text.calling;
  else if (call.status === "accepted") outcome = text.connecting;
  else if (call.outcome === "cancelled") outcome = text.cancelled;
  else if (call.outcome === "unavailable") outcome = text.unavailable;
  else if (call.status === "ended") outcome = text.completed;

  let duration = "";
  if (call.status === "ended" && call.outcome === "completed" &&
    Number.isFinite(call.startedAt) && Number.isFinite(call.endedAt) && call.endedAt >= call.startedAt) {
    const seconds = Math.floor((call.endedAt - call.startedAt) / 1000);
    duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return { missed, label: [direction, outcome, duration].filter(Boolean).join(" · ") };
}
