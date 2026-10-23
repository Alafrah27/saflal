# Saflal task tracker

Updated: October 21, 2026.

## Welcome screen button and legal text — October 21, 2026

- [x] Reuse transparent outlined Get Started button and preserve login navigation.
- [x] Add blue underlined Privacy Policy/Terms of Service links with localized failure handling; use the user-reconfirmed temporary http://localhost:5173 destination.
- [x] Correct English/Arabic welcome grammar and English app name; preserve Arabic سفلال and existing translation keys.
- [x] Verify actual JSX/real translations with mocked native handlers, 42 related tests, focused lint and project TypeScript; update all four migration documents and preserve rollback.
- [x] Additional JS check introduces no baseline errors; existing image declaration error is recorded in migration progress.
- [x] Android JavaScript/Hermes export/artifact inspection pass: 5,315 modules, 49 assets, 12,462,422 bytes.
- [ ] Native layout/link/browser and temporary page acceptance.

## Login screen provider buttons — October 21, 2026

- [x] Add Google/Apple provider icons; position sign-in actions in a bottom footer with transparent backgrounds and borders; remove the message icon.
- [x] Preserve existing Clerk SSO/session/redirect behavior, pending/error feedback and CAPTCHA; repair Arabic login labels.
- [x] Pass mocked English/Arabic layout/provider-handler checks, 42 related tests, focused lint, project TypeScript and actual-JSX type checking.
- [x] Maintain all four migration documents and a selective rollback checkpoint.
- [x] Android JavaScript/Hermes export and artifact inspection pass: 5,315 modules, 49 assets, 12,461,091 bytes.
- [ ] Native signed-out layout, large-text/small-screen and real provider sign-in acceptance.

## Arabic app name — October 21, 2026

- [x] Replace previous Arabic branding with سفلال throughout Arabic translations and the active sign-in heading; update About initial to س.
- [x] Preserve translation keys, English text and native identifiers; remove the stale welcome-screen comment.
- [x] Verify runtime Arabic lookups, preserved unrelated text, 42 auth/session/Settings tests and focused lint.
- [x] Update all four migration documents and save a selective rollback checkpoint.
- [ ] Visual confirmation after reloading the app; no native build or backend publication is required.

## Nickname and editable bio — October 21, 2026

- [x] Add optional users.nickName; preserve canonical fullName, account IDs and existing records.
- [x] Add localized Settings editor for nickname and bio, with clear/save/cancel, limits, pending guards and retryable errors.
- [x] Prefer nickname in Contacts, Calls, Chat and related profile/search/notification labels; fall back to full name.
- [x] Enforce authenticated self-only updates, one-line 50-character nickname and 500-character bio; preserve Clerk sync and deletion/privacy rules.
- [x] Pass all 415 tests, focused lint and project TypeScript; broader JS comparison adds no errors against baseline.
- [x] Publish to the existing development Convex target and verify anonymous rejection without modifying a real profile.
- [x] Android JavaScript/Hermes export and artifact inspection pass (5,315 modules, 49 assets, 12,461,677 bytes).
- [x] Update all four migration documents and preserve a selective rollback checkpoint.
- [ ] Native editor/save/cancel, real two-account realtime names/bio and incoming-call notification name acceptance; phone inspection could not reach Saflal.

## Call UI and black-screen correction — October 21, 2026

- [x] Full-screen contact photo, top back arrow and bottom controls for outgoing, incoming and connected calls; preserve existing audio-only actions.
- [x] Diagnose ringing with invisible UI on the attached Android phone: removed StyleSheet.absoluteFillObject left background layers in normal flow.
- [x] Fix all three layers with supported StyleSheet.absoluteFill; preserve call transport, authorization and data.
- [x] Replace the inaccurate mock and add a regression using actual installed React Native declarations.
- [x] Pass all 403 tests, eight rendered call/language scenarios, focused layout/test lint, project TypeScript and targeted actual-JSX type-check.
- [x] Verify the shared native frame on the attached Android phone without creating a call; user retries and confirms the call UI is visible.
- [x] Record cause, evidence and selective rollback in all four migration documents.
- [ ] Complete broader two-phone control/background/terminated-app and production acceptance checks; the reported black-screen issue is resolved.

## Blocked Contacts Settings entry — October 21, 2026

- [x] Place Blocked Contacts immediately after Notifications; reuse the caller-owned paginated list and confirmed Unblock action per member.
- [x] Update English/Arabic labels; pass all 50 relevant tests and focused lint.
- [ ] Complete native blocked-list pagination/unblock and two-account privacy checks from docs/TESTING_CHECKLIST.md.

## Resumed chat-header profile — October 21, 2026

- [x] Recover the saved chat-header profile and Blocked Users implementation after shutdown.
- [x] Fix unblock status/loading/stale-row guards; preserve the existing UI and legacy route.
- [x] Pass 402 tests, focused lint and project TypeScript, including new profile interactions and privacy/authorization regressions.
- [x] Publish development profile functions and verify availability/anonymous rejection without selecting real account data.
- [x] Update all four migration documents and preserve selective rollback snapshots.
- [x] Android JavaScript/Hermes export and artifact inspection pass; profile UI is present and configured private credentials are absent.
- [ ] Native two-account checks; see docs/TESTING_CHECKLIST.md.

Latest status: welcome button/legal-link styling and English/Arabic grammar updates are implemented. Both legal links use the user-confirmed temporary localhost URL. All 42 related tests, real-translation JSX/handler checks, focused lint, project TypeScript and Android JavaScript/Hermes export pass; the extra JS check adds no baseline errors. Native layout/browser/page acceptance remains pending. Prior login, nickname/bio and user-confirmed call fixes are preserved with their recorded acceptance boundaries.

ROLE Tasks 

You are a Senior Software Architect, React Native Engineer, Convex Backend Engineer, and AI Coding Agent ,

PHASE 1# 
AUTHENTICATION WITH CLERK USING GOOGLE AND APPLY BUTTONs
## Phase 1 progress — October 15, 2026

Scope: Clerk + Convex authentication only. Messaging migration, legacy account linking, and calling changes are deferred.

### Implemented

- [x] Installed Clerk Expo 4.11.0 and Expo-compatible authentication dependencies.
- [x] Replaced the active email/password login and registration forms with Google and Apple sign-in buttons.
- [x] Added ClerkProvider, secure tokenCache session storage, and ConvexProviderWithClerk.
- [x] Added guarded authentication routes, loading/error states, profile onboarding, an account screen, and sign-out.
- [x] Added fullName-only onboarding with server-side validation; usernames were removed in the later approved profile update.
- [x] Aligned the Convex users schema and authentication with by_clerk_id and by_fullName indexes.
- [x] Implemented authenticated current-user, profile creation/update, and internal profile synchronization functions.
- [x] Enforced server-verified identity, caller-only updates, inactive-account checks, and idempotent profile creation.
- [x] Added account-cache cleanup and session isolation when accounts change.
- [x] Configured the Clerk issuer and deployed authentication functions/indexes to the empty Convex development deployment.
- [x] Configured the public Clerk key and Convex URL in EAS development.
- [x] Updated docs/MIGRATION_PLAN.md, docs/ARCHITECTURE.md, docs/MIGRATION_PROGRESS.md, and docs/TESTING_CHECKLIST.md.

### Verification

- [x] Eleven targeted authentication tests passed.
- [x] Targeted lint and TypeScript checks passed.
- [x] Development deployment rejected anonymous profile creation and public access to the internal synchronization function.
- [x] Android prebuild and JavaScript bundle export passed.
- [ ] Native APK compilation was stopped before verification completed.
- [ ] Real Google/Apple sign-in, cancellation, app-restart session restoration, account switching, and sign-out still require device testing.
- [ ] Register or confirm mobile://sso-callback in Clerk's redirect URLs before device testing.
- [ ] Expo dependency check reported existing patch-version drift in eight packages; existing SDK versions were preserved.

### Data and scope

- Existing MongoDB users, messages, and relationships were not modified or deleted.
- No temporary legacy authentication bridge remains; backend source/manifests were restored after scope was narrowed.
- Stream/calling source was not changed. The new authentication root does not initialize a calling SDK.
- No production deployment or data cutover was performed.
- Authentication implementation is in place; Phase 1 is not fully verified until the pending device/build checks pass.

## Navigation fix — October 15, 2026

- Fixed the top-tab navigator registration error in mobile/app/(tabs)/_layout.jsx.
- Replaced the external material-top-tabs navigator/withLayoutContext wrapper with TopTabs from expo-router/js-top-tabs so it shares Expo Router 57's navigation context.
- Preserved the Chats, Calls, and Contacts routes, icons, safe-area spacing, and tab styling.
- No dependency installation, authentication changes, or calling changes were required.
- Device reload verification remains pending; restart Metro with npx expo start --dev-client --clear.
- Static import/syntax checks passed. The broader lint/type-check command was stopped before completion; no device render verification is claimed.

## Completed feature work — October 16, 2026

- [x] Implemented Convex block/unblock, caller-owned blocked-user pagination/status, and the server-only both-direction blocking helper.
- [x] Implemented friend-request send/accept/reject, incoming pending-request pagination, and friendship status. Acceptance is receiver-only and creates one friendship; resend history is preserved.
- [x] Migrated Contacts to all other active Saflal users through Convex, with pagination, private profiles, block filtering, request controls, and loading/retry states.
- [x] Removed legacy username fields from two backed-up development profiles while preserving IDs, fullName, timestamps, and other metadata.
- [x] Implemented getOrCreateDirectChat, getChat, and getMyChats for accepted friends using the existing chats/chatMembers tables.
- [x] Added only the approved optional directPairKey field/index; chat creation inserts one chat and exactly two memberships atomically.
- [x] Enforced active authenticated callers, membership authorization, both-direction block checks for creation/reuse, and minimal peer profiles. Existing chat access survives blocking.
- [x] Added bounded caller-owned chat pagination with preserved Convex cursor metadata; chat list ordering is newest-created, not message activity.
- [x] Regenerated API declarations and published the chat backend to development.
- [x] Passed all 88 tests, targeted lint, strict backend JavaScript checks, and project TypeScript.
- [x] Verified live concurrent creation from both participants produced one chat/two memberships; retries made no writes. Live authorization, validators, cursors, blocking, and inactive-account checks passed.
- [x] Removed disposable fixtures and temporary internal verification functions; exact comparison confirmed all nine pre-existing tables unchanged.
- [x] Updated the four migration documents and task.md with results and selective rollback instructions.

Live backend checks used administrator-issued test identities. Production and MongoDB data remain unchanged. Earlier build/device verification limitations above still apply.

## Remaining tasks

- [ ] Verify Google/Apple authentication, session restoration, account switching, sign-out, and Contacts behavior on real Android/iOS devices.
- [x] Connect incoming friend-request Accept/Decline controls in Contacts and contact previews (local implementation and tests complete).
- [ ] Plan cancellation/unfriending separately.
- [x] Implement local Convex text sending, idempotent retries, and paginated history (October 17 composer correction).
- [ ] Implement read receipts/unread counts and verify on devices.
- [x] Connect local text history/composer and realtime message data to Convex; publication/device checks remain pending.
- [ ] Add activity-based chat ordering and caller-owned settings mutations in their approved phases.
- [x] Implement recorded voice messages in the shared messages table; user confirms sending works.
- [x] Configure/fix Stream audio calling; user confirms the reported call flow now works on Android.
- [x] Resolve EAS dependency/native-manifest failures; user confirms the Android development build succeeds.
- [ ] Verify receiving audio-message playback and the complete recording lifecycle with two accounts.
- [ ] Finish optional 30-day expiration and remaining notification implementation/verification.
- [ ] Verify every call control, missed calls/history, blocked callers and background/terminated incoming notifications on real devices.
- [ ] Complete verified account/data migration, legacy backend removal, iOS/release builds and security/production acceptance before cutover.

See [task.md](task.md) for the completion summary and [migration progress](docs/MIGRATION_PROGRESS.md) for verification details.

## Resumed devices / push backend — October 16, 2026

Scope: continue the interrupted Convex device-registration and ordinary Expo push backend. Preserve existing UI, installed dependencies, accounts, and legacy services. No deployment or production cutover in this delivery.

- [x] Review both task files, migration documents, schema, and interrupted device/push implementation.
- [x] Preserve a selective rollback snapshot before edits.
- [x] Verify authenticated device registration/unregistration, token/installation validation, owner reassignment, registration-version fencing, idempotency, and the 20-active-device limit.
- [x] Verify friend-request send/accept push hooks and internal-only message push helper.
- [x] Verify per-event/device deduplication, current ownership, both-direction blocks, active profiles, and message membership/mute/read/expiry suppression.
- [x] Correct provider rate-limit receipt handling to retry sending; fence receipt results by send attempt as well as receipt attempt.
- [x] Verify bounded worker claims, send/receipt retries, invalid-token deactivation, recovery, and terminal cleanup.
- [x] Pass 115 local tests (88 existing + 27 device/push tests), using mocked Expo responses; targeted ESLint, strict checking of annotated backend JavaScript, project TypeScript, and local Convex code generation pass.
- [ ] Connect mobile registration, permissions, Android channel, token refresh, locale changes, and sign-out/account-switch cleanup.
- [ ] Publish/verify only development after reviewing configuration; test real Convex validators, simultaneous registrations, scheduler/cron behavior, and migration compatibility.
- [ ] Configure/verify FCM/APNs and optional server-only EXPO_ACCESS_TOKEN; verify real Android/iOS notification delivery and taps in all app states.
- [ ] Connect message enqueue from the future authenticated message mutation. The helper alone does not provide message notifications.
- [ ] Implement Stream-supported incoming/missed-call notifications in the separate audio-calling phase.

Phase 8 remains incomplete. This recovery does not establish that the interrupted backend had already been deployed. Do not run older verification scripts that deploy the whole Convex directory until these new push/crons/schema additions have been reviewed.

## Users image persistence — October 16, 2026

- [x] Trace the missing field to syncFromClerk's no-secret/no-picture no-op, despite the UI showing Clerk's image directly.
- [x] Pass the matching Clerk user's imageUrl to the existing authenticated sync action as a validated display fallback; never accept a caller-supplied target user ID or status.
- [x] Retry synchronization when the Clerk image becomes available/changes and include it in foreground/manual refresh.
- [x] Preserve an existing photo when a snapshot omits its image; retain caller ownership, application fields, inactive-account restrictions, and idempotent writes.
- [x] Pass 126 local tests, including 11 new image/backend/session regressions.
- [x] Pass targeted ESLint, project TypeScript, and local Convex code generation.
- [ ] Publish the reviewed backend to development and reload the updated app; confirm the actual signed-in user's existing users.imageUrl fills in Convex.
- [ ] Verify real-device sign-in, restart, image changes, foreground refresh, and account switching with the deployed functions.

This correction is local and does not deploy the pending push/crons work or modify live user records. See the migration plan for selective rollback.

## Message schema and message.md — October 16, 2026

Approved scope: strict message schema, documentation, and local verification only. No sending/toggle/cleanup/UI implementation or deployment.

- [x] Preserve the existing messages table and common fields; require text for text messages and storage ID/duration for audio; exclude mixed payloads.
- [x] Preserve optional expiresAt, all existing message indexes, the required chat setting, and new direct chats defaulting to disabled.
- [x] Case-rename and populate message.md with the schema contract, duration units, pending implementation/test checklist, external-copy limits, and deployment/rollback requirements.
- [x] Add seven SDK-exported schema/default contract tests; all 133 tests pass, including the 126 earlier regressions. Targeted ESLint, scoped strict schema/chat/push JavaScript checks, project TypeScript, and local Convex code generation pass.
- [x] Update both trackers and all four migration documents; preserve a selective checkpoint before edits.
- [ ] Audit actual deployed messages for strict-union compatibility before any later publication; report incompatible rows without changing data.
- [ ] Implement authenticated/idempotent sending and semantic/attachment validation.
- [ ] Implement either-member setting changes, both-participant realtime status, and server-owned system notices.
- [ ] Implement new-message-only 30-day deadlines, disabling without clearing deadlines, expired-row read filtering, bounded pagination, and timely hiding in open/reconnected screens.
- [ ] Implement indexed bounded expiration cron, safe retryable audio deletion, and consistent chat metadata.
- [ ] Test expiration/toggling/authorization/pagination/realtime/audio cleanup and real-device UI once the runtime exists.

Only schema/documentation readiness is delivered. Message expiry, cleanup, and broader messaging phases remain incomplete; no remote records were inspected or modified.

## Contacts and Chats → message screen — October 16, 2026

- [x] Record the completed schema/documentation work explicitly in task.md.
- [x] Open accepted contacts through getOrCreateDirectChat and navigate with its chatId, not the contact's user ID. Guard repeated in-flight taps and avoid navigation after row unmount.
- [x] Preserve friendship requirements, request controls, photo navigation, and generic opening errors. Blocking/changed friendships remain enforced by the existing server mutation.
- [x] Default Chats to authenticated reactive Convex pagination, preserved row styling, empty/loading/continuation/retry/refresh states, and navigation into the same `[id]` screen.
- [x] Resolve Convex conversation header data from member-only getChat; ignore route-supplied names/photos. Provide auth/loading/unavailable/retry/back/photo states and a visibly disabled composer while message transport remains pending.
- [x] Keep legacy components/links available during migration; do not mount legacy message/socket/delete/call hooks on source=convex routes. Do not display fabricated presence/read/unread/preview data.
- [x] Pass 150 local tests and project TypeScript; new-component/helper/test lint passes. The same two lint errors in untouched legacy screen bodies exist in the checkpoint and remain documented.
- [x] Export the Android JavaScript bundle successfully (4,698 modules, single worker, no Hermes bytecode). Native builds/device behavior remain unverified.
- [ ] Verify Android/iOS native navigation/rendering, actual Clerk identity and development chat subscriptions, account switching, back/photo behavior, and offline/retry states.
- [ ] Implement actual text/audio sending/history/read receipts and remaining expiration/cleanup behavior separately. This navigation delivery does not imply messaging is complete.

No backend functions/schema, dependencies, live records, or deployment changed. Rollback checkpoint and bundle-check results are recorded in the migration documents.

## Contact row tap correction — October 16, 2026

- [x] Make the entire contact row respond to conversation taps rather than only its name text area.
- [x] Replace silent nonfriend/pending disabled rows with an explicit friendship-required message while preserving server authorization.
- [x] Isolate nested photo/request/Friends presses so they do not also trigger the row action.
- [x] Pass all 152 tests, targeted contact-component/test lint, and project TypeScript.
- [ ] Verify the reported tap path on a device. Keep the existing accepted-friend policy unless the user chooses chats before acceptance; no backend policy change has been made.

Contact-only source and test changes are backed up at C:/Users/user/AppData/Local/Temp/saflal-contact-tap-317934992dcb4c279382830b53acc687. Messaging transport remains pending.

## Friend-request consent and privacy correction - October 17, 2026

- [x] Keep requests from A to B pending until B explicitly accepts or declines; only the authenticated receiver can decide.
- [x] Add Users / Requests within Contacts, defaulting to Users, with reactive 20-item incoming-request pages and loading/empty/retry/continuation states.
- [x] Reuse Accept/Decline controls in incoming contact rows, the Requests inbox, and contact/existing-chat previews, with English/Arabic accessibility labels.
- [x] Submit server request IDs, guard duplicate/opposite taps, lock both actions while submitting, allow safe retries, and isolate state by account/request; no optimistic messaging permission.
- [x] Fix legacy recipient ownership and pending-only atomic decisions, idempotent friend-cache updates, normalized self/target validation, and both-direction block checks.
- [x] Add authenticated POST /api/v1/friend/reject-request/:id and update the legacy Decline hook; preserve DELETE unfriend and request/chat history; send no decline notification.
- [x] Check accepted friendship/blocking/direct membership before legacy message/chat writes; guard socket joins/read receipts and typing. Existing call handlers are unchanged.
- [x] Pass all 179 mobile tests and 16 legacy handler/socket tests (195 total), targeted lint, and project TypeScript. Tests use mocked database/transport/native boundaries, not live services.
- [x] Update all four migration documents and both task trackers. Selective rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-friend-consent-OycJoR; delivery-files.json lists only this correction's changed/added files. Protected Convex schema/functions, providers, and package files retain their hashes.
- [x] Android JavaScript export passed: 4,701 modules, 154 assets, single worker, Hermes bytecode disabled. The sandbox attempt stopped at spawn EPERM; the same local export succeeded with process permissions (exit 0). This verifies JavaScript bundling, not a native APK or device.
- [ ] Verify two real authenticated accounts/devices: send, accept, decline, realtime state changes, offline/retry, Arabic layout, and account switching.
- [ ] Review/deploy the legacy endpoint changes and updated app to development before claiming hosted behavior is fixed; production rollout remains outside this task.

Implemented locally, not deployed. Convex text messaging still has its existing disabled placeholder composer and remains a separate approved task. No live records or production data were changed. Historical legacy acceptances were preserved; any consent audit is separate. Legacy request transitions are atomic, while profile caches/block reads remain separate Mongo operations; real Mongo concurrency and durable legacy notifications are not established by the local fixture tests.

## Editable text composer after acceptance - October 17, 2026

This follow-up supersedes earlier statements that Convex text sending/history are deliberately deferred placeholders. It does not mark the entire messaging migration complete.

- [x] Trace the cause to hardcoded editable=false / disabled placeholder controls, with no Convex message transport connected.
- [x] Replace the placeholder with an editable composer; typing valid nonempty text enables Send, while blank or submitting drafts keep it disabled.
- [x] Add messages.getSendPermission, sendText, and listMessages, with authenticated active-user identity, valid direct membership, accepted friendship, active peer, and both-direction blocking enforced server-side for sending.
- [x] Add optional clientMessageId plus an indexed chat/sender/key lookup for retry deduplication; reject changed payloads under the same key. Preserve existing text/audio rows and one shared messages table.
- [x] Save text, server timestamps, chat last-message metadata, and eligible existing push jobs in one mutation. Respect existing enabled expiration flags for new messages.
- [x] Render reactive 20-item message pages with older-page continuation, membership-only history access, expired-row filtering, and deadline-based local hiding. Audio playback remains a placeholder.
- [x] Preserve failed drafts/keys for retry, guard rapid duplicate sends, and suppress late unmounted/account-switched state updates.
- [x] Pass all 198 mobile tests, including 19 new backend/composer/navigation regressions. Regenerate local API bindings with the official read-only CLI.
- [x] Pass targeted ESLint, project TypeScript, strict annotated message-backend checking, and the final Android JavaScript export (4,703 modules, single worker, no Hermes bytecode, exit 0). Native devices remain unverified.
- [x] Update message.md and all four migration documents. Snapshot: C:/Users/user/AppData/Local/Temp/saflal-text-composer-XD8RRq; delivery-files.json lists selective rollback files.
- [ ] Publish reviewed Convex functions/schema to development, reload the updated app, and verify two actual authenticated accounts sending/receiving. Code generation does not deploy the new endpoints.
- [ ] Verify keyboard/native layout, reconnect/retry, block changes during a conversation, pagination, and account switching on devices.
- [ ] Complete receipts/unread counts, audio messages, expiration controls/notices/cleanup, and full device notifications in separate scopes.

Local implementation only: no runtime deployment or live message writes were performed. Preserve prior consent fixes during rollback. If new messages have been stored after a later deployment, keep the additive optional field/index when rolling back application code rather than restoring an incompatible strict schema.

## Keyboard visibility correction - October 17, 2026

- [x] Trace the hidden input to disabled Android keyboard avoidance and a nested custom-header offset in the active Convex chat.
- [x] Replace React Native KeyboardAvoidingView with the installed react-native-keyboard-controller component, using behavior=padding and automaticOffset for both platforms. Reuse the existing root KeyboardProvider and keep the header outside the resized message/composer area.
- [x] Adapt the navigation test boundary to the installed component and pass all 198 mobile regressions. No new implementation-mirroring test was added for this small layout correction; native animation is not simulated.
- [x] Pass targeted ESLint, project TypeScript, and Android JavaScript export (4,703 modules, single worker, no Hermes bytecode, exit 0).
- [x] Preserve the existing composer, consent/authorization, navigation, dependencies, app/native configuration, legacy chat, and backend code.
- [x] Update both trackers and the four migration documents; selective snapshot: C:/Users/user/AppData/Local/Temp/saflal-keyboard-IwvLcT.
- [ ] Verify keyboard opening/closing, multiline text, Send taps, and navigation-bar/safe-area behavior on Android and iOS devices.

This is a JavaScript layout correction. Reload the updated app to apply it. No backend deployment or native configuration change is part of this correction; previous text-endpoint publication remains a separate pending step. Native device enumeration did not provide usable test-device information, so physical keyboard behavior is not claimed as verified.


## Recorded voice messages - October 17, 2026

- [x] Implement Mic by default and Send for typed text; hold/release, cancel/lock, locked preview/delete/send, English/Arabic and accessibility.
- [x] Add private Convex audio upload ownership/leases, metadata validation, idempotent shared-message send, authenticated playback and bounded cleanup.
- [x] Preserve keyboard layout, consent checks, text retry behavior, history and unrelated edits; add selective snapshots and documentation.
- [x] Resolve development dependency/build blockers and complete automated checks; latest full suite is 268 passing tests.
- [x] User confirms recorded voice sending on October 19; Android development build succeeds and the authorized development backend is published.
- [ ] Verify receiving playback and the complete recording/playback lifecycle with two accounts on Android/iOS. No production deployment or production data change.

## Stream audio calling - October 19, 2026

- [x] Keep live calling audio-only with GetStream; remove active Zegocloud packages/references.
- [x] Supply the missing ringtone and guard stale native binaries without crashing startup.
- [x] Fix reproducible EAS npm installation and Firebase/Expo notification manifest conflicts; user confirms the native development build succeeds.
- [x] Store Stream credentials privately in development Convex and exclude local server configuration from EAS archives.
- [x] Configure the dedicated member-only audio type, restrict client access to other types, disable video/screensharing and enforce two participants.
- [x] Configure signed call-status webhooks and the matching Firebase provider after explicit credential-transfer approval.
- [x] Fix failed-call retries and replace oversized 76-character Stream IDs with unique 39-character record-derived IDs; deploy to development.
- [x] Complete 268 automated tests and focused lint; preserve identity, friendship/block checks, existing UI and history.
- [x] User confirms the repaired call flow is working: "its working good". Close the reported build/configuration/connection repair task.
- [ ] Verify accept/reject/end, mute/speaker, bidirectional audio, duration, missed calls/history and blocked-caller behavior individually on real devices.
- [ ] Verify incoming calls in foreground, background and supported terminated-app states; provider configuration alone does not prove delivery.
- [ ] Complete iOS/release/security checks before marking the entire calling phase production-ready.

Evidence and rollback remain in [migration progress](docs/MIGRATION_PROGRESS.md) and [testing checklist](docs/TESTING_CHECKLIST.md). The call-ID fix requires a development app reload, not another EAS build. No production cutover is recorded.

## Reopened sustained-call verification - October 19, 2026

- [x] Trace brief connection/false missed calls to the backend remaining ringing while Stream reports acceptance; real callbacks returned 401 and the ringing deadline ended media.
- [x] Repair raw-byte/gzip webhook transport with bounded inflation and unchanged HMAC verification; deploy to development.
- [x] Verify all 272 tests, project TypeScript, focused lint and live plain/gzip callback 204 responses.
- [ ] Two-phone call stays connected beyond 45 seconds, both users hear audio, and normal hangup records completion rather than missed.
- [ ] Broader call controls, blocked callers, background/terminated delivery and release acceptance remain open.

Initial call setup was user-confirmed, but the later two-phone report reopens sustained calling. This correction is server-only and requires no EAS rebuild.

- [x] Verify the user's actual accepted call survives the old ringing deadline: over 45 seconds connected / 56 seconds from creation, no endedAt.
- [ ] Receive user confirmation of audio both directions and normal completed history after hangup.

- [x] One-minute two-phone connection stability confirmed by the user after the webhook fix.
- [ ] Isolated audio test: move phones to separate rooms or use headphones, select earpiece and moderate volume. User confirmed nearby phones during the repetition report; live voice/earpiece settings are correct. Treat acoustic feedback as a working diagnosis until retested.
