/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as accountDeletionActions from "../accountDeletionActions.js";
import type * as auth from "../auth.js";
import type * as blockedUsers from "../blockedUsers.js";
import type * as calls from "../calls.js";
import type * as chats from "../chats.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as devices from "../devices.js";
import type * as friendRequests from "../friendRequests.js";
import type * as http from "../http.js";
import type * as lib_blocking from "../lib/blocking.js";
import type * as lib_callPolicy from "../lib/callPolicy.js";
import type * as lib_clerkProfile from "../lib/clerkProfile.js";
import type * as lib_historyVisibility from "../lib/historyVisibility.js";
import type * as lib_messageContent from "../lib/messageContent.js";
import type * as lib_push from "../lib/push.js";
import type * as lib_searchPolicy from "../lib/searchPolicy.js";
import type * as lib_streamPolicy from "../lib/streamPolicy.js";
import type * as lib_voicePolicy from "../lib/voicePolicy.js";
import type * as lib_voiceStorage from "../lib/voiceStorage.js";
import type * as messages from "../messages.js";
import type * as migrations_contactOrder from "../migrations/contactOrder.js";
import type * as migrations_historyVisibility from "../migrations/historyVisibility.js";
import type * as migrations_removeUsernames from "../migrations/removeUsernames.js";
import type * as profileValidation from "../profileValidation.js";
import type * as profiles from "../profiles.js";
import type * as push from "../push.js";
import type * as search from "../search.js";
import type * as streamCalls from "../streamCalls.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";
import type * as voiceValidation from "../voiceValidation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  accountDeletionActions: typeof accountDeletionActions;
  auth: typeof auth;
  blockedUsers: typeof blockedUsers;
  calls: typeof calls;
  chats: typeof chats;
  contacts: typeof contacts;
  crons: typeof crons;
  devices: typeof devices;
  friendRequests: typeof friendRequests;
  http: typeof http;
  "lib/blocking": typeof lib_blocking;
  "lib/callPolicy": typeof lib_callPolicy;
  "lib/clerkProfile": typeof lib_clerkProfile;
  "lib/historyVisibility": typeof lib_historyVisibility;
  "lib/messageContent": typeof lib_messageContent;
  "lib/push": typeof lib_push;
  "lib/searchPolicy": typeof lib_searchPolicy;
  "lib/streamPolicy": typeof lib_streamPolicy;
  "lib/voicePolicy": typeof lib_voicePolicy;
  "lib/voiceStorage": typeof lib_voiceStorage;
  messages: typeof messages;
  "migrations/contactOrder": typeof migrations_contactOrder;
  "migrations/historyVisibility": typeof migrations_historyVisibility;
  "migrations/removeUsernames": typeof migrations_removeUsernames;
  profileValidation: typeof profileValidation;
  profiles: typeof profiles;
  push: typeof push;
  search: typeof search;
  streamCalls: typeof streamCalls;
  users: typeof users;
  voice: typeof voice;
  voiceValidation: typeof voiceValidation;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
