import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthSession } from "../context/AuthSessionContext";
import { contactsLaunchSeed } from "../lib/contactOrderSeed";
import { contactSegments, orderedContactStreams } from "../shared/contactOrder";

const page = { initialNumItems: 20 };

export default function useOrderedContacts() {
  const { profile } = useAuthSession();
  const segments = contactSegments(contactsLaunchSeed, profile._id);
  const args = index => ({ seed: contactsLaunchSeed, ...segments[index] });
  // Buffer one bounded page per segment. Only the completed prefix is displayed;
  // keeping the subscriptions alive preserves cursors during friendship changes.
  const first = usePaginatedQuery(api.contacts.listOrderedSegment, args(0), page);
  const second = usePaginatedQuery(api.contacts.listOrderedSegment, args(1), page);
  const third = usePaginatedQuery(api.contacts.listOrderedSegment, args(2), page);
  const fourth = usePaginatedQuery(api.contacts.listOrderedSegment, args(3), page);
  const fifth = usePaginatedQuery(api.contacts.listOrderedSegment, args(4), page);
  const sixth = usePaginatedQuery(api.contacts.listOrderedSegment, args(5), page);
  const streams = [first, second, third, fourth, fifth, sixth];
  const combined = orderedContactStreams(streams);
  return { ...combined, loadMore: count => {
    if (combined.status === "CanLoadMore") streams[combined.current].loadMore(count);
  } };
}
