# Saflal migration verification

## Welcome button and legal links (2026-10-21)

- [x] Real i18next/Trans and actual welcome/AuthButton JSX render corrected English/Arabic copy, transparent border and blue underlined link labels; rich/plain legal sentences match.
- [x] Mocked handlers open the user-confirmed http://localhost:5173 for both links, retain Get Started login navigation and handle link failures with localized alerts.
- [x] All 42 auth/session/Settings tests, focused welcome lint and project TypeScript pass.
- [x] Additional JS check adds no errors against checkpoint (one prior/current image-module declaration diagnostic); project TypeScript passes independently.
- [x] Android JavaScript/Hermes export/artifact inspection: 5,315 modules, 49 assets, 12,462,422 bytes; corrected copy/legal links/destination included. Both trackers updated.
- [ ] Native welcome/large-text/RTL link taps, system browser and temporary page availability; mock rendering does not establish these.

Evidence: mobile/.expo/welcome-ui-{render,tests,lint,types,js-types,types-baseline,export,artifact}.log. Rollback: MIGRATION_PROGRESS.md. No legal-document text or production website is created by this change.

## Login provider buttons (2026-10-21)

- [x] Actual JSX with mocked native dependencies verifies English/Arabic provider logos, transparent borders, footer layout and removal of message icon.
- [x] Both buttons retain correct Clerk strategies/redirects, pending spinner/disabled state, session activation and cancellation/error behavior; CAPTCHA mount remains.
- [x] Installed Google/Apple glyphs exist; all 42 auth/session/Settings regressions, focused lint, project TypeScript and targeted actual-JSX types pass.
- [x] Android JavaScript/Hermes export and artifact inspection: 5,315 modules, 49 assets, 12,461,091 bytes; provider icons and corrected Arabic labels included. Both trackers updated.
- [ ] Native signed-out visual check, small screens/large text and real Google/Apple round trips; no account sign-out or provider interaction was performed by the agent.

Evidence: mobile/.expo/login-ui-{render,tests,lint,types,js-types,export,artifact}.log. Selective rollback: MIGRATION_PROGRESS.md. No real account/session/provider was changed for verification.

## Arabic name (2026-10-21)

- [x] Arabic app name, welcome, sharing, About, policy, support, copyright and language-selection values use سفلال; About initial uses س.
- [x] Actual i18next lookups and auth-hook execution return the requested name; translation keys/unrelated text and English heading remain unchanged.
- [x] Source scan including local/ar.json finds no previous Arabic-name variants; all 42 auth/session/Settings tests and focused ESLint pass.
- [x] Update both task trackers and preserve selective rollback. Evidence: mobile/.expo/ar-brand-{check,tests,lint}.log; rollback: MIGRATION_PROGRESS.md.
- [ ] Native visual confirmation after app reload; no new native build or backend publication needed for this text-only change.

## Nickname and bio (2026-10-21)

- [x] All 415 tests pass; focused changed-file ESLint and project TypeScript pass.
- [x] Real-handler fixtures verify self-only writes/no caller ID argument, inactive/anonymous rejection, name/bio limits, Unicode, atomic invalid input, clearing and preserved canonical name/relationships.
- [x] Contacts/chat/call-history/profile/search projections carry current nickname without private identity fields; actual Contacts/Calls/Chat rendering prefers it.
- [x] Editor checks cover both languages, prefilled/current values, Cancel, no-op disabled Save, save/clear, duplicate/pending guards, limits, retryable errors and blur/unmount.
- [x] Clerk image/email sync preserves app metadata; account deletion clears nickname/bio. Existing block/privacy rules remain covered.
- [x] Broader checkJs comparison adds no errors (31 baseline, 19 current); existing Settings/language/backend typing errors remain recorded. Editor/card annotations pass focused lint and project TypeScript.
- [x] Publish only to amicable-moose-480 development; process exit 0 and anonymous nickname/bio mutation returns UNAUTHENTICATED without changing account data.
- [x] Android JavaScript/Hermes export and artifact inspection: 5,315 modules, 49 assets, 12,461,677 bytes; nickname/bio editor included.
- [x] Update Tasks.md and task.md with scope, results and remaining acceptance checks.
- [ ] Native editor layout, keyboard, scroll, Back and Cancel. Attached-phone inspection did not reach Saflal while another app was foreground; no native success claimed.
- [ ] User saves/clears nickname and bio on real accounts; confirm two-account realtime names and profile bio, and supported incoming-call notification display. No real profile is changed by agent smoke checks.

Evidence: mobile/.expo/nickname-tests.log, nickname-ui-tests.log, nickname-lint.log, nickname-editor-lint.log, nickname-project-types.log, nickname-types-baseline.log, nickname-convex.log, nickname-dev-smoke.log, nickname-export.log and nickname-artifact.log. Existing records need no migration. Rollback and retained-schema requirements: MIGRATION_PROGRESS.md.

## Call black-screen regression (2026-10-21)

- [x] Reproduce the frame's hidden foreground on the attached Android phone without placing a call.
- [x] Verify installed RN 0.86.3 exports absoluteFill and does not export absoluteFillObject; fix photo, shade and placeholder to remain outside normal flow.
- [x] Correct the old mock that fabricated the removed property; add an installed-declaration JSX compatibility regression and pass it.
- [x] Eight mocked call/language scenarios and targeted actual-JSX type-check pass.
- [x] Real Android shared-frame screenshot shows top Back, title/status and centered placeholder after the correction. The no-ID diagnostic route avoids call queries/media operations.
- [x] User retries and confirms "Yes, the call UI is visible".
- [x] All 403 tests, focused layout/test lint, project TypeScript and targeted actual-JSX checking pass. Both task trackers record completion and remaining acceptance work.
- [ ] Broader native acceptance: every control in outgoing/incoming/connected states, photo failures, large text/rotation and background incoming calls. Rendering recovery alone does not establish all of these.

Evidence: mobile/.expo/call-black-screen-{reproduced,fixed}.png, call-layout-regression.log, call-layout-types.log, call-black-fix-ui.log and call-black-fix-tests.log. Prior Android export predates this three-reference correction. Rollback details: MIGRATION_PROGRESS.md. No real call or data operation was triggered by the diagnostic route.

## Full-photo audio call UI (2026-10-21)

- [x] All 402 regression tests pass; eight local rendered scenarios cover outgoing/incoming, ringing/connected and English/Arabic.
- [x] Rendered checks verify full-screen cover image, safe-area foreground, directional top arrow and correct Cancel/Decline/Accept/End/Mute/output controls; Back invokes no hangup/mutation.
- [x] Existing Accept, cancel, decline and end handlers still invoke the expected SDK/mutation paths; terminal/missing-photo fallback renders.
- [x] Project TypeScript/new-component lint pass. The same seven existing voice.jsx lint errors remain; before/after JSON is saved under mobile/.expo.
- [x] Android JavaScript/Hermes export passes: 5,313 modules, 49 assets and 12,452,550 bytes; artifact includes the new photo layout. This is not an APK or native-device check.
- [ ] Real Android phone: photo load/failure/crop, light/dark photos, long names, large text, landscape, status/nav-bar clearance, top Back and bottom controls for all three states.
- [ ] Two phones: incoming Accept/Decline, outgoing Cancel, connected End/Mute/audio output, reconnect status/duration and returning to the ongoing call after Back.

Evidence: mobile/.expo/call-photo-tests.log, call-photo-ui-check.log, call-photo-lint-{before,after}.json, call-photo-export.log and call-photo-artifact.log. Source comparison confirms unchanged connection logic and live-call handlers/effects. No native or OS incoming-call UI result is inferred from the mocked checks. Selective rollback and scope are in MIGRATION_PROGRESS.md.

## Blocked Contacts placement (2026-10-21)

- [x] Settings source places the Blocked Contacts row directly after Notifications, reusing /blocked-users with no duplicate entry.
- [x] English/Arabic contact terminology and Unblock button use existing shared translations and components.
- [x] All 50 existing relevant Settings/profile/blocking tests and focused changed-component lint pass; list pagination, real row IDs, confirmation, retry and server enforcement remain covered.
- [ ] Reload the app; verify Settings placement, English/Arabic title, all pages of blocked members, empty state and confirmed Unblock updating the list on a real phone.

No backend deployment/data mutation/native change. Prior Android export predates this small UI refinement. Test evidence: mobile/.expo/blocked-contacts-tests.log. Selective six-file rollback: C:/Users/user/AppData/Local/Temp/saflal-blocked-contacts-a25022b0c149437cb535018f281e3be6.

Updated: 2026-10-21.

Current verification: all 402 automated tests, project TypeScript and focused profile/header lint pass. Profile development publication and read-only anonymous-access smoke checks pass. Android JavaScript/Hermes export and artifact inspection pass. Native device checks remain pending; existing unrelated call-screen lint errors remain outside this scope. No real profile content was read and no user/block/deletion operation was invoked during this verification. Dated entries retain earlier test/build boundaries.

## Chat-header profile resume (2026-10-21)

- [x] Recovered work passes 392 baseline tests; final suite passes 402 tests.
- [x] Header sends the queried peer/chat IDs to the profile action; contact previews omit chatId and loading/missing peers have no action.
- [x] Actual profile JSX handlers show authorized details/fallbacks in English/Arabic and route only the returned photo to imageView.
- [x] Loading/unavailable profiles cannot initiate a block. Confirmation/cancel, duplicate taps, pending close protection, mutation failure/retry and blur/unmount are exercised with mocked transport.
- [x] Unblock-only waits for authoritative status, disables already-unblocked rows and allows missing target profiles to be unblocked.
- [x] Profile retry remounts the query boundary; broken images use initials and new URLs can load.
- [x] Blocked-list query requests bounded 20-row pages and uses each row's actual blockedId.
- [x] Backend tests verify active authenticated callers, membership/peer checks, verified-email provenance, friend-only email, both-direction block privacy, deletion/deactivation cleanup and existing server block enforcement/history preservation.
- [x] Focused ESLint and project tsc --noEmit pass.
- [x] Development publication succeeds. Deliberately invalid input confirms profiles.get availability; anonymous blocked-list/sync calls reject UNAUTHENTICATED without accessing account data.
- [x] Android JavaScript/Hermes export: 5,312 modules, 49 assets, 12,449,899-byte bundle. Profile UI present; configured local/development private Clerk and Stream credentials absent. This is not an APK or native-device check.
- [ ] Real Android/iOS: header tap targets, dialog layout on small screens/landscape, long bio/email, screen-reader labels, Back/close, photo navigation, image failure and English/Arabic rendering.
- [ ] Two authorized accounts: verified email appears after session synchronization, friend/block changes update the open modal, blocked messages/calls/requests/push are suppressed, unblocking respects reverse blocks and friendship rules, history remains.

Evidence: mobile/.expo/profile-resume-tests.log, profile-resume-convex.log, profile-resume-dev-smoke.log, profile-resume-export.log and profile-resume-artifact.log. Additional checkJs with noImplicitAny disabled passes; full strict backend annotation coverage is not claimed. Rollback details/checkpoints: MIGRATION_PROGRESS.md. No production acceptance or physical-device result is implied.

## Convex People/Chats search (2026-10-20)

- [x] All 381 regression tests pass, including 20 new backend/UI search tests.
- [x] Anonymous, unknown-profile and inactive-caller access denied; both anonymous endpoints also denied on development.
- [x] Schema-checked search index, bounded 1–50 pagination, invalid/blank input and optional read budgets.
- [x] People hides self, inactive accounts and both-direction blocks; minimal profile projection excludes private metadata.
- [x] Candidate order, duplicate names, English/Arabic prefix inputs and reactive profile-name changes covered by fixtures. The fixture does not emulate the native ranker.
- [x] Beyond-first-page discovery and sparse 45-candidate pages preserve continuation/split metadata; no premature empty state.
- [x] Chat ownership, malformed/duplicate direct-pair rejection, hidden-chat omission and read-only discovery.
- [x] Cleared previews stay empty after People reopening; new text/audio restores searchable chats; peer history remains available and expired previews stay hidden.
- [x] Historical chat access after blocking/inactive peers remains consistent with Chats; People stays privacy filtered.
- [x] UI debounce/rapid changes/clear/invalid input, immediate stale-result removal, 20-item independent subscriptions, skip inactive filter, FlatList pagination/refresh, loading/empty/retry and account-keyed state.
- [x] Existing conversation/friend-request/contact-preview routes, duplicate taps, late mutation results after blur/unmount, failed-image initial fallbacks and Arabic controls/RTL header.
- [x] Focused changed-file/test lint and project TypeScript pass. Deployment CLI backend typechecking disabled; no separate Convex tsconfig exists.
- [x] Development index ready; native case/prefix search and real two-page cursor traversal pass using readonly admin-assisted identities. Existing visible-chat projection verified. No verification record writes.
- [x] Arabic query accepted by the native deployment. Positive Arabic matching remains fixture-covered until suitable development names/device data are available.
- [x] Search Android JS/Hermes export: initial sandbox run failed with `spawn EPERM`; process-permitted retry passed. 5,307 modules, 49 assets, 12,432,994 bytes at `mobile/.expo/bundle-verification/search`. English/Arabic search UI present; configured local/development Clerk/Stream private credentials absent.
- [ ] Native Android/iOS keyboard, long names, image failure, scrolling, pull refresh, English/Arabic layout and screen-reader checks. ADB reported no connected device.
- [ ] Real-device account switch/leave-and-return while a query or chat mutation is pending. Hook/action guards pass in fixtures; provider/navigation integration remains unverified.
- [ ] Live reactive search rank/page movement after profile changes, blocking and messages; broad/common-name load behavior. Readonly native cursor checks pass but do not simulate these concurrent updates.
- [ ] Native APK/iOS builds and production rollout; neither is implied by a JS export.

Rollback preserves all prior personal-history cutoffs/visibility markers and their server enforcement. Disable search references before removing its queries/index; never reconnect active Convex search to legacy REST/Socket.IO. See MIGRATION_PLAN.md for the source snapshot.

## Personal chat/call deletion and ordering (2026-10-20)

- [x] Full 361-test suite passes; 22 new backend/migration/UI tests cover this feature.
- [x] Anonymous access denied locally and on development for both public deletion mutations.
- [x] Ownership, 1–50 unique-ID limits, empty/oversized/duplicate batches, full-batch validation and repeat requests.
- [x] Personal text/audio clearing, hidden previews/unread state, read-update filtering and peer-history preservation.
- [x] Known cleared private-audio ID denied to deleting member; peer retains authorized access.
- [x] Queued cleared-message push suppression; deleted missed-call alerts suppressed.
- [x] Contacts reopening, new text/audio reappearance, retained cutoff and idempotent send ordering.
- [x] Equal timestamps with later Convex creation order; both serialized send/delete outcomes.
- [x] Indexed chat ordering across page boundaries, updates to newest position, same-timestamp message order and visibility-aware call page-boundary deletion.
- [x] Mixed-direction chronological merging, day groups, refresh and pagination retain existing regression coverage.
- [x] Active-call batch rejection without partial writes; only own call flags changed and peer flag not exposed.
- [x] Shared native Modal/hook tests: frozen IDs, duplicate taps, cancel, pending dismissal locks, failure/retry, 50-item cap, blur/unmount late-result isolation, English/Arabic labels and legacy Modal defaults.
- [x] Chat row selection disables navigation; call row selection disables callback and excludes active calls.
- [x] Bounded/idempotent backfill preserves false visibility/cutoffs, including 125-call/three-page fixture; old-index fallback still hides deleted content.
- [x] Development backfill/verification: 8 chat memberships and 38 calls; zero missing metadata before enabling new indexes. No real histories deleted.
- [x] Focused lint and project TypeScript pass. Deployment CLI backend typecheck disabled; no separate Convex tsconfig exists.
- [x] Android JS/Hermes export: 5,304 modules, 49 assets, 12,421,988 bytes. Delete controls present; configured private credentials absent.
- [ ] Native Android/iOS long press, scrolling/refresh during selection, Modal touch/back behavior, safe-area and Arabic visual checks. ADB reported no connected device.
- [ ] Device account-switch and leave/return flows while a network request is pending; mocked teardown guards pass but actual auth/device interaction remains unverified.
- [ ] Real authenticated Convex reactive page movement after deletes/sends, cursor splitting at identical timestamps, simultaneous transaction conflicts and delayed notification delivery. In-memory fixtures do not simulate the live scheduler/cursor engine.
- [ ] Native APK/iOS builds and production rollout. Neither is implied by the successful Android JavaScript export.

Rollback verification must keep saved personal visibility and message cutoffs enforced, including audio/push/read filtering. `HISTORY_LISTS_READY=false` changes list-index selection only; do not revert to backend code that ignores deletion markers. See MIGRATION_PLAN.md for backup location and staged recovery.

## Automated

- [x] All eleven authentication tests pass with fullName-only creation.
- [x] Users schema and auth agree: by_clerk_id/by_fullName, with no username or string userId field.
- [x] Unauthorized creation/update rejected; anonymous current returns null.
- [x] Idempotent creation, duplicate names across distinct accounts, Unicode names, and input limits.
- [x] Unicode full names and caller-only updates.
- [x] Inactive accounts cannot recreate/update profiles.
- [x] Internal profile sync preserves app fields and cannot reactivate accounts.
- [x] Public validators do not accept caller-supplied identity/status/timestamps.
- [x] Verified-identity image fallback without a server secret.
- [x] TypeScript check.
- [x] Targeted lint.
- [x] Anonymous security smoke checks against the development deployment.
- [x] Android prebuild with Clerk plugin.
- [x] Android JavaScript bundle export passed.
- [ ] Native APK compilation was attempted but is not verified.
- [ ] Expo dependency check: reports existing patch-version drift in eight Expo packages. Kept existing SDK/package versions as requested.

The unit tests exercise registered handlers with an in-memory context; they do not simulate provider UI, native storage, or Convex's transaction scheduler.

## Device checks ? pending

- [ ] Register mobile://sso-callback in Clerk Redirect URLs.
- [ ] Google sign-in on Android and iOS.
- [ ] Apple sign-in on Android and iOS.
- [ ] Cancel each provider without an error alert.
- [ ] Real-device fullName profile completion and network-error recovery.
- [ ] Kill/relaunch the app and verify restored session.
- [ ] Sign out and verify protected routes/caches are inaccessible.
- [ ] Switch accounts without showing the previous account's profile.
- [ ] Test offline/token-expiry behavior and inactive-account access.
- [x] Configured both public authentication variables in EAS development.
- [ ] Real-device tests and a fresh installed development APK remain unverified.

No physical-device provider sign-in or iOS build has been verified by the agent.

## Blocking backend automated checks (2026-10-15)

- [x] Fourteen handler tests: node --test --test-isolation=none tests/blockedUsers.test.mjs (run from mobile).
- [x] All public operations reject anonymous, missing-profile, and inactive callers.
- [x] Valid blocking, self-block rejection, target existence, caller identity derivation, and repeated-send idempotence.
- [x] Unblock retries and deleted-target removal; reverse and other-user records preserved.
- [x] Caller-only list/status projection, no reverse-pair disclosure, no sensitive profile fields.
- [x] Empty lists, newest-first ordering, cursor continuation, page boundaries, invalid input limits, and server read caps.
- [x] Native pagination input/output metadata preserved; missing optional images and deleted profiles handled.
- [x] Server-only helper checks both directions and has no registered endpoint markers.
- [x] Public argument/return validator declarations constrain identity and output fields.
- [x] Profiles, history, friendships, requests, and calls untouched.
- [x] Targeted lint: node node_modules/eslint/bin/eslint.js convex/blockedUsers.js convex/lib/blocking.js tests/blockedUsers.test.mjs.
- [x] Project types: node node_modules/typescript/bin/tsc --noEmit.
- [x] New backend JavaScript types: node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --allowJs --skipLibCheck --strict --module esnext --moduleResolution bundler --target es2022 convex/blockedUsers.js convex/lib/blocking.js.
- [x] Local generated API declarations include blockedUsers; schema unchanged.
- [ ] Development deployment runtime validators reject invalid IDs, extra identity fields, and malformed cursors.
- [ ] Authenticated live concurrent block attempts create exactly one record; real reactive pagination/cursor splits behave correctly.

The default isolated Node test runner encountered spawn EPERM in this environment; --test-isolation=none is the successful local workaround. Unit fixtures use the real schema/index declarations but cannot prove runtime validator rejection, concurrency, or realtime behavior. No deployment/device verification was performed for blocking. UI integration and communication enforcement tests belong to the deferred phases.

## Friend-request backend checks (2026-10-15)

- [x] Twenty-three handler tests: node --test --test-isolation=none tests/friendRequests.test.mjs (from mobile).
- [x] Active Clerk-owned profiles required for all five operations; anonymous/missing/inactive callers rejected.
- [x] Self, nonexistent, inactive, already-friend, and either-direction blocked targets rejected.
- [x] Repeated pending sends reuse the ID/timestamps; crossed requests require explicit acceptance.
- [x] Rejection/cancellation history survives new sends; stale decisions cannot affect the fresh request.
- [x] Receiver-only acceptance/rejection; foreign and nonexistent IDs have the same unavailable response.
- [x] Sorted friendship creation, reuse of both existing orientations, and no duplicate writes on same-decision retries.
- [x] Opposite completed decisions/cancelled requests rejected; deleted/inactive/blocked sender requests remain rejectable.
- [x] Friendship insertion errors propagate without prematurely accepting the request.
- [x] Caller-only pending/status queries, minimal profiles, absent images/deleted senders, and no reverse-block disclosure.
- [x] Empty/boundary pages, continuation, read bounds, invalid limits, and native pagination metadata preservation.
- [x] Public validators declare ID/response boundaries; request history uses actual indexed first lookups, not unique scans.
- [x] Existing users, blocks, chats, messages, calls, and devices remain unchanged.
- [x] Lint: node node_modules/eslint/bin/eslint.js convex/friendRequests.js tests/friendRequests.test.mjs.
- [x] Strict JavaScript types: node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --allowJs --skipLibCheck --strict --module esnext --moduleResolution bundler --target es2022 convex/friendRequests.js.
- [x] Project types: node node_modules/typescript/bin/tsc --noEmit.
- [x] Combined regressions: node --test --test-isolation=none tests/friendRequests.test.mjs tests/blockedUsers.test.mjs tests/auth.test.mjs (47 passing; the same one authentication-schema failure remains).
- [x] Generated API includes friendRequests; pre-task schema/auth/blocking/package hashes match.
- [ ] Live runtime validators reject malformed IDs/cursors and caller-identity fields.
- [ ] Simultaneous same-direction/crossed sends produce one pending request, with no automatic friendship.
- [ ] Simultaneous acceptance creates one friendship; conflicting accept/reject/block operations have consistent results.
- [ ] Live subscriptions remove accepted/rejected requests and update relationship status/pagination correctly.

No backend deployment, authenticated live request, or real-device test was performed in this delivery. Handler tests are not evidence of live concurrency, transaction rollback after later write failures, runtime validators, or realtime behavior. UI and push tests remain outside scope.

## Contacts/fullName verification (2026-10-15)

- [x] All 69 tests: node --test --test-isolation=none tests/auth.test.mjs tests/blockedUsers.test.mjs tests/friendRequests.test.mjs tests/contacts.test.mjs tests/contacts-screen.test.mjs tests/profile-migration.test.mjs.
- [x] Caller authorization, private projection, both-direction block filtering, safe page bounds, sparse-page continuation, and no self/inactive users.
- [x] Rendered JSX smoke tests: ready-session guard, loading/empty states, paging guards, correct Convex send IDs, relationship labels, Arabic labels, and photo navigation.
- [x] FullName-only creation, distinct accounts sharing a name, internal-only bounded migration, repeat safety, and preserved IDs/metadata.
- [x] Targeted lint, strict JavaScript backend checks, and project TypeScript.
- [x] Development backup, staged migration, final schema/function publication, and exact preservation of two backed-up profiles except username removal.
- [x] Live anonymous-access/internal-function checks and administrator-issued identity discovery (one visible user; no sensitive fields).
- [x] Android bundle export: node node_modules/expo/bin/cli export --platform android --output-dir <temporary directory> --max-workers 2. This verifies JavaScript bundling, not APK/device behavior.
- [ ] Real Android/iOS screen rendering, sign-in/account switching, refresh/retry, and live request-state updates on devices.

Rendered tests replace native primitives and transport; they do not prove native layout, real Clerk token verification, or realtime subscriptions. Development smoke scripts are scripts/verify-contacts-deployment.mjs and scripts/verify-auth-deployment.mjs. Production, calling, and push verification remain outside this delivery.

## Direct-chat backend checks (2026-10-16)

- [x] All 88 tests pass: node --test --test-isolation=none tests/chats.test.mjs tests/auth.test.mjs tests/blockedUsers.test.mjs tests/friendRequests.test.mjs tests/contacts.test.mjs tests/contacts-screen.test.mjs tests/profile-migration.test.mjs (from mobile).
- [x] Nineteen chat handler tests cover anonymous/missing/inactive callers, self/missing/inactive/nonfriend targets, both friendship orientations, both block directions, repeated/reversed creation, and defaults/server timestamps.
- [x] Foreign/missing IDs share CHAT_UNAVAILABLE; reads return only caller settings/minimal profiles; deleted peers are null and optional metadata is omitted when absent.
- [x] Membership corruption/duplicate pairs fail safely; keyless historical chats remain readable; existing history remains readable after blocking, lost friendship, or peer inactivity.
- [x] Caller-only creation-order pagination, archived entries, sparse/orphaned pages, end cursors, native split metadata, page boundaries, and capped pagination reads.
- [x] Messages, friendships, requests, calls, profiles, and other tables are unchanged by chat handlers.
- [x] Targeted lint: node node_modules/eslint/bin/eslint.js convex/chats.js convex/schema.js tests/chats.test.mjs tests/fixtures/chatVerificationFixture.mjs scripts/verify-chats-deployment.mjs.
- [x] Strict backend JavaScript: node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --allowJs --skipLibCheck --strict --module esnext --moduleResolution bundler --target es2022 convex/chats.js (also separately checked the live fixture).
- [x] Project TypeScript: node node_modules/typescript/bin/tsc --noEmit.
- [x] Supported code generation; final api.d.ts exposes chats and excludes the temporary fixture module.
- [x] Empty development chat tables rechecked before publication; production untouched.
- [x] Live concurrency: four CLI calls from both participant identities returned one ID; database contained one chat/two memberships; retry left all data unchanged.
- [x] Live anonymous/missing-profile/inactive/outsider denial, self/nonfriend/inactive-target rejection, wrong-table IDs/extra identity fields rejected by runtime validators, real cursor continuation, minimal projection, and page boundaries.
- [x] Live blocks in both directions prevent creation/reuse while existing members retain read access.
- [x] Disposable fixture cleanup, exact preservation of all nine existing tables, temporary helper removal, and final development publication.
- [x] Schema contains only the approved additions; ten protected auth/feature/package/screen files retain pre-task hashes.
- [ ] Real Clerk sign-in identities, realtime client subscriptions, and native chat integration (deferred).

The live script is scripts/verify-chats-deployment.mjs; it temporarily stages tests/fixtures/chatVerificationFixture.mjs as an internal-only Convex module and removes it after cleanup. Run only after local checks, against the configured development deployment. Handler fixtures do not prove transactions; live concurrency was separately exercised using administrator-issued identities. Messages/read receipts/unread counts/activity ordering and UI integration are not implemented or verified by this phase. No new Android export is needed for this backend-only change.
# Devices / push recovery checks — 2026-10-16

- [x] Active Clerk-owned registration; anonymous/missing/inactive rejection; installation/token validation; no client-supplied owner/status.
- [x] Idempotent retries, locale/platform updates, token rotation, account reassignment, historical conflicts, and 20-active-device limit.
- [x] Owner/version-scoped unregister; inactive/missing profiles; invalid version rejection; stale sign-out protection.
- [x] Friend send/accept hooks enqueue once per active recipient device; mutation retries do not enqueue again.
- [x] Both-direction blocks/inactive profiles suppress enqueue and delayed payloads; registration changes invalidate queued work.
- [x] Shared text/audio eligibility, direct membership/pair validation, muted/read/expired/malformed message suppression, and localized minimal payloads.
- [x] Internal-only transport functions; bounded batches/claims/cleanup; stale send/receipt fencing and worker recovery.
- [x] Mocked Expo tickets/receipts; network/429/5xx retries; permanent-error handling; invalid-token deactivation; receipt rate-limit resend.
- [x] 115 local tests pass, including all 88 existing regressions; scoped strict annotated JavaScript check passes.
- [x] Targeted ESLint, normal project TypeScript, and local Convex code generation pass. Schema and generated API declarations match the interrupted recovery snapshot.
- [ ] Real Convex validators/concurrent registration/rotation and transaction rollback after queue failures.
- [ ] Live scheduler/cron, provider receipts, recovery, and retention checks in isolated development data.
- [ ] Mobile permission/channel setup, stable installation, token refresh, locale changes, sign-out/account-switch coordination, and revoked-permission handling.
- [ ] Real Android/iOS development builds with FCM/APNs, notification taps, foreground/background/terminated delivery, duplicate handling, and recipient guards.
- [ ] Future message mutation calls enqueue; Stream incoming/missed calls use their separate supported notification integration.

Tests use in-memory handler fixtures and mocked fetch; no real push was sent and no deployment was performed in this recovery. End-to-end notifications are not verified.

## Users image persistence checks — 2026-10-16

- [x] No-picture/no-secret session persists the supplied Clerk display image into the existing users.imageUrl; IDs, profile fields, and other users remain unchanged.
- [x] Signed picture/Backend API precedence; missing snapshots preserve photos; unchanged synchronization is idempotent.
- [x] Invalid URLs reject; anonymous fallback rejected; missing profiles not created; inactive users not reactivated; caller cannot select a target ID/status.
- [x] Actual provider callbacks/effects include matching Clerk image URLs for automatic/manual/foreground sync and delayed/changed resource loads, without retriggering on saved Convex image updates.
- [x] Stale other-account resources are excluded; signed-out/inactive/uncreated profiles do not auto-sync.
- [x] All 126 local tests pass; provider tests simulate hooks and mock native/Clerk/Convex transport.
- [x] Targeted ESLint, project TypeScript, and local Convex code generation pass.
- [ ] Reviewed development publication, actual Clerk sign-in, and direct confirmation that the existing users.imageUrl is populated in Convex.
- [ ] Real-device reload, app restart, foreground refresh, image changes, and account-switch behavior.

No live database or physical-device persistence is claimed by these tests.

## Message schema readiness — 2026-10-16

- [x] One messages table, exactly text/audio document variants; common IDs, timestamps, receipt statuses, and optional numeric expiresAt preserved.
- [x] Text payload required and audio payload fields excluded; audio storage ID/duration required and text excluded.
- [x] Existing by_chat/by_chat_created/by_expires_at indexes preserved; actual direct-chat handler creates chats with disappearingMessages=false.
- [x] Seven schema/default contract tests pass; all 133 local tests pass, including the 126 prior regressions.
- [x] Scoped strict JavaScript checking covers the schema and existing chat/push consumers with the narrowed message type.
- [x] Targeted ESLint, project TypeScript, and local Convex code generation pass.
- [ ] Audit existing deployed messages in bounded pages and confirm actual strict-validator rejection/compatibility before publication. No deployment in this delivery.
- [x] Eight protected source/manifests, all non-message table declarations, and five generated files match the rollback checkpoint; lowercase message.md is populated.
- [ ] New text/audio message creation assigns a server-owned 30-day deadline only while enabled; nonempty text, positive finite duration, and authorized private storage are enforced.
- [ ] Enable/disable by either member, reject outsider/anonymous changes, preserve historical deadlines, handle idempotent retries/concurrent sends/toggles, and generate authoritative notices.
- [ ] Filter expired messages even with delayed cleanup; verify before/at/after deadlines, expired-only/sparse pagination pages and continuation, previews/unread state, and open/reconnected realtime screens.
- [ ] Verify bounded indexed expiration batches/backlogs, exclude nonexpiring messages, handle retry/missing/shared/unauthorized audio and storage failures safely, and maintain chat metadata.
- [ ] Verify existing mobile design, both-participant realtime status, and the explanation that screenshots/downloads/backups/external copies cannot be deleted by Saflal.

The seven new tests inspect SDK-exported validator contracts plus the existing chat handler default; they do not run a deployed Convex validator or implement runtime disappearing messages. Future behavior checks above remain pending until corresponding code exists. The test runner uses --experimental-test-isolation=none because isolated worker spawning is restricted in this sandbox; the existing MODULE_TYPELESS_PACKAGE_JSON warning remains without changing the package manifest.

## Contacts/Chats conversation navigation — 2026-10-16

- [x] Accepted-contact create/reuse calls use the contact Convex ID, then navigate with the returned chat ID/source marker; rapid taps create one in-flight operation/navigation.
- [x] Failed create/reuse does not navigate and shows a generic error; pending/nonfriend rows cannot bypass friendship requirements; photo/request behavior still passes.
- [x] Default Chats uses authenticated 20-item Convex pages; loading hides stale results; exhausted/filtered-empty continuation and scroll bounds behave correctly; missing-peer rows still open existing conversations.
- [x] Convex `[id]` uses member-only getChat, ignores route-supplied profile data, rejects missing/array IDs before querying, waits for auth/details, and supports back/photo navigation and Arabic labels.
- [x] Composer remains disabled with an explicit unavailable state; no false online/read/history claims or legacy transport hooks execute in the rendered Convex tree.
- [x] Existing legacy route dispatch and the query boundary fallback remain defined; 150 local tests pass and project TypeScript passes.
- [x] New component/helper/test lint passes. Two pre-existing lint errors in preserved legacy bodies are reproduced from checkpoint source and remain outside this migration step.
- [x] Android JavaScript export passes (4,698 modules; --max-workers 1 --no-bytecode); no native/Hermes/device verification is implied. Six protected hashes and both legacy component bodies match the checkpoint.
- [ ] Android/iOS actual row taps, getChat/create/reuse permissions, loading/errors/retry/refresh, native layout, and back/photo navigation.
- [ ] Real Clerk session/account switching, late asynchronous response after unmount, and live conversation-list updates on both devices.
- [ ] Native APK/IPA compilation and real-device verification. Android JavaScript bundle-check outcome is recorded in migration progress.
- [ ] Message sending/history/audio/read receipts, disappearing settings/notices/filtering/cleanup and their runtime tests remain separate unfinished tasks.

Local screen tests mock native primitives, navigation, and Convex transport; the original backend authorization regressions also pass but no new live data/deployment tests were run here.

## Full contact-row tap correction — 2026-10-16

- [x] Row handler covers the padded contact container; accepted-friend taps navigate with the returned conversation ID.
- [x] Nonfriend/pending taps display the friendship-required alert without creating a chat or navigating.
- [x] Photo/request nested controls stop propagation and retain their independent actions.
- [x] All 152 tests, targeted contact lint, and project TypeScript pass.
- [ ] Verify actual native hit areas, nested-control behavior, and the reported selected user's friendship state on a device.
- [ ] If the user chooses pre-acceptance chatting, plan/implement/test that backend authorization change explicitly; it is not part of this correction.

## Friend-request consent correction — 2026-10-17

Local verification (actual handlers/components, mocked transport/database/native boundaries):

- [x] Full mobile suite: 179 passing tests; legacy privacy suite: 16 passing tests.
- [x] Project TypeScript and targeted mobile/backend lint checks.
- [x] Android JavaScript export: 4,701 modules, single worker, no Hermes bytecode, exit 0 after retrying the sandbox worker restriction with process permissions. Native/device builds remain unverified.
- [x] Users is the default Contacts view; Requests uses the current account's receiver-scoped endpoint and 20-item pagination.
- [x] Loading hides stale rows; sparse pages retain continuation; missing senders remain dismissible; Arabic decision labels render.
- [x] Incoming rows/previews use the server request ID; outgoing requests do not expose recipient decisions; decision presses stop row navigation.
- [x] Both decisions lock while submitting; repeated/opposite rapid taps make one mutation; safe failure allows retry; unmount suppresses late updates.
- [x] Successful decisions do not optimistically create chats or enable messages; confirmed friendship retains the existing authorized preview transition.
- [x] Account-keyed local state/subscription boundaries prevent reuse across profile changes.
- [x] Legacy sender/third-party/invalid/missing request decisions fail without writes; only the receiver can decide.
- [x] Legacy acceptance/rejection are idempotent; conditional terminal transitions prevent conflicting concurrent choices; caches contain no duplicate friend IDs.
- [x] Missing senders/blocking prevent acceptance while decline remains possible and silent; request/chat history remains intact.
- [x] Self-requests, including uppercase ObjectId variants, invalid/missing targets, blocked targets, and crossed pending requests do not establish friendships.
- [x] Pending/rejected/nonfriend/blocked message sends make no writes or notifications; accepted friends can exchange legacy messages; foreign/malformed chats fail closed.
- [x] Foreign/malformed/missing socket rooms cannot join or emit receipts; valid members retain history access.
- [x] Typing requires membership, friendship, and no block in either direction; malformed payloads/disconnects/database failures emit nothing.
- [x] Legacy Decline invokes POST reject-request; the reject route has JWT middleware; DELETE unfriend retains its handler.

Manual/live checks still required:

- [ ] On two authenticated development devices, A sends B a request; A sees outgoing pending; B sees Accept/Decline in Requests and the contact preview.
- [ ] Accept as B; both clients update to Friends through subscriptions and can open the authorized conversation. The Convex composer remains a disabled placeholder in this scope.
- [ ] With another request/pair, decline as B; both clients remain unable to create/send a new conversation; B's request disappears reactively and A receives no decline notification.
- [ ] Verify native narrow-screen layout, Arabic/right-to-left presentation, screen-reader labels, rapid taps, disconnect/retry, pagination, and sign-out/account switching.
- [ ] Verify the new legacy rejection endpoint and server guards against a development MongoDB/Socket.IO instance, including genuine concurrency and block timing; restart before testing to discard old unchecked room memberships.
- [ ] Verify existing push delivery for request/accept events on development devices; this task neither deploys backend changes nor completes mobile push integration.

## Text input and Send after acceptance - 2026-10-17

- [x] Accepted and server-authorized conversations have an editable input; nonempty text enables Send and blank drafts keep it disabled.
- [x] Pending/declined/nonfriend relationships and false/loading server permission expose no send composer.
- [x] Submission locks input/Send; double taps produce one operation; failure preserves the draft/key and shows a generic retryable error; unmount prevents late state updates.
- [x] Authenticated members exchange trimmed text through actual handlers; sender/timestamps/chat metadata are server-owned.
- [x] Anonymous/inactive/foreign callers, malformed membership/pair keys, inactive/deleted peers, nonfriends, and either block direction cannot send.
- [x] Same operation/key/payload creates one message/push; conflicting reuse fails and another sender's operation remains independent.
- [x] Message history paginates newest first, preserves native cursor metadata, excludes expired rows, caps physical reads, and retains existing membership-based history access.
- [x] Existing enabled expiration flags affect only new text sends; old timestamps/deadlines are preserved on retries.
- [x] Full mobile suite: 198 tests pass with mocked native/database/transport boundaries.
- [x] Targeted ESLint, project TypeScript, strict annotated message-backend checking, official API codegen, and Android JavaScript export (4,703 modules, no Hermes bytecode, exit 0).
- [ ] Publish reviewed Convex functions/schema to development; test two real authenticated accounts sending and receiving through subscriptions.
- [ ] Verify device keyboard/layout, reconnect/retry, pagination, blocking during a conversation, account switching, and foreground/background behavior.
- [ ] Complete receipts/unread counts, voice messages, setting/cleanup workflows, and notification-device tests in separate scopes.

## Chat input above keyboard - 2026-10-17

- [x] Verify installed keyboard-controller supports KeyboardAvoidingView/automaticOffset and the app already has KeyboardProvider.
- [x] Enable padding-based keyboard avoidance on both Android and iOS and measure the offset below the custom header automatically.
- [x] Pass the existing 198-test suite with the updated native-module mock boundary; no claim is made that these tests simulate a keyboard.
- [x] Targeted ESLint, project TypeScript, and Android JavaScript export pass (4,703 modules, no Hermes bytecode, exit 0).
- [ ] On Android/iOS devices, focus a short/multiline draft and verify the entire input/Send button remain visible above the keyboard.
- [ ] Close/reopen/switch keyboards, scroll older messages, send while keyboard is open, and check no oversized gap remains after closing.
- [ ] Verify custom header stays fixed and gesture/three-button navigation/safe-area insets do not obscure the composer.

No native device verification or deployment was performed for this layout correction.



## Recorded voice acceptance - October 17, 2026

- [x] Implement empty/whitespace Mic versus typed Send, foreground recording, RTL cancel/lock, preview/delete/retry, accessible Start/Stop, private upload/download, shared message chronology, and single-player cache ownership.
- [ ] Complete final mobile suite, targeted lint, project/scoped TypeScript, Convex binding/bundle validation, and Android JavaScript export after dependency restoration.
- [ ] On rebuilt Android and iOS apps, verify first permission prompt/rejection, hold/release, short tap, rapid release during preparation, RTL cancellation, locked recording, five-minute native completion, and disabled recording during calls.
- [ ] With two authenticated development accounts, exchange text and voice in the same paginated conversation, play/pause/replay, retry interrupted uploads, verify one message/push per operation, and confirm pending/declined/blocked users cannot send.
- [ ] Verify keyboard visibility, safe areas, background/headphone/audio interruption, cache removal on expiry/sign-out/restart/navigation, native decode errors, and no cross-account playback.

Real microphone, speaker, device gestures, Clerk HTTP authorization, deployment scheduling, and live two-account delivery require device/development verification; Node mocks do not establish them.


Voice rollback: selective pre-change copies are at C:/Users/user/AppData/Local/Temp/saflal-voice-3d1cfecc. delivery-files.json lists existing affected files; new-files.json lists feature additions. Preserve unrelated working-tree changes and inspect each file before restoring. Before any new voice data is stored, restore only those reviewed existing files and remove only reviewed feature additions, reinstall the restored dependency lock and rebuild native configuration as needed. After voice data exists, roll back the composer/history integration first while retaining additive schema, authenticated playback, storage references, and cleanup jobs until a separate data/attachment audit permits retirement. Never delete production messages or attachments as part of rollback.

## Hold/release voice acceptance - October 18, 2026

These checks supersede earlier slide/lock, normal preview and custom filesystem-cache requirements.

- [x] Press begins preparation immediately; release automatically sends without ordinary preview or another Send action (real JSX handler/controller test with native boundaries mocked).
- [x] Stable mic width and composer layout space; elapsed time and Arabic/English hold/release instructions; finger movement cannot lock/cancel recording.
- [x] Duplicate releases cannot duplicate sending; uncertain sends/upload failures retry the same recording and operation key.
- [x] Permission denial, early release, responder termination and interruption during stop/audio cleanup cannot accidentally send.
- [x] Native Blob size checks and release after transfer success/failure; no filesystem-package usage or device-file picker.
- [x] Accessible Stop sends directly; duration completion/interruption retain recoverable drafts.
- [x] Native private playback uses token headers without JS downloads/public URLs; late token results cannot start playback after account/chat changes or interruptions.
- [x] Byte-range playback returns correct 206 bytes/headers, invalid ranges return 416, and membership/expiration checks remain enforced.
- [x] Full mobile suite: 248/248 passing; project TypeScript passes; focused core/React hooks/JSX lint passes with zero errors/warnings.
- [ ] Full Expo lint remains blocked by the incomplete local @typescript-eslint/eslint-plugin dependency.
- [ ] On real Android/iOS devices, approve microphone permission, hold again at least one second, release and verify B receives exactly one playable voice message.
- [ ] Verify recording with keyboard open/closed, whitespace multiline drafts, finger movement/RTL, safe areas, short taps, five-minute cap and interruptions/calls.
- [ ] Verify local URI-to-Blob transfer, offline upload/retry, uncertain mutation responses and native Blob cleanup without expo-file-system.
- [ ] Verify real private media streaming/header authentication, range loading/seeking, play/pause/replay, native decode errors, token expiry/retry, background/sign-out unload and no cross-account playback.
- [ ] Deploy/verify compatible voice functions and HTTP playback in the intended development environment and test Clerk HTTP authorization with two actual accounts before release.

Node mocks do not prove real microphone/speaker behavior or live two-account delivery. expo-audio's temporary recording files are OS-managed, not explicitly unlinked. Expo retains its own required transitive filesystem dependency; the application no longer imports it directly. Rollback and final tests.log: C:/Users/user/AppData/Local/Temp/saflal-hold-release-64d7b75e17e04930b781e44656157f7d/without-filesystem.

## Android dependency repair verification - October 18, 2026

- [x] Verify cached `@expo/ui@57.0.22` archive SHA-512 against the existing lockfile before restoring missing files.
- [x] Restore 1,113 missing package files and one damaged declaration source map, saving the original map and an exact repair inventory.
- [x] Compare every installed package file with the archive: 1,261 checked, zero mismatches; every runtime package export exists.
- [x] Restore incomplete locked dependencies discovered by entry-point/archive auditing: 2,405 additional missing files across direct/audited dependencies, 157 in transitive navigation core, and three backed-up zero-length files. Preserve nonempty existing differences and dependency versions.
- [x] Use the SDK 57-compatible `expo-router/react-navigation` import for the recorder's `usePreventRemove`; update existing test navigation/icon mocks.
- [x] Recorder regressions: `node --test --experimental-test-isolation=none tests/voice-mic.test.mjs tests/voice-recorder.test.mjs` passes 25/25 tests. Native boundaries remain mocked.
- [x] Android JavaScript export passes with worker process permissions: 4,458 modules, 31 assets, one bundle and metadata, exit 0. Output: `mobile/.expo/bundle-verification/android`. Hermes bytecode was disabled. Initial attempts exposed `spawn EPERM`, missing Worklets files and an incompatible application navigation import; each was resolved for the final export.
- [ ] Restart the existing development Metro server with `npx expo start --clear` and load the Android app on a device.

This repair does not establish native build or device behavior. The only application code change is the recorder navigation import; dependency versions were unchanged. Integrity record and selective source/test backups: `C:/Users/user/AppData/Local/Temp/saflal-expo-ui-repair-iOTXOJ`.

## Icon font repair verification - October 18, 2026

- [x] Verify current locked `@expo/vector-icons@15.1.1` archive integrity before repairing 16 missing fonts and one zero-byte font.
- [x] Compare all 224 installed package files with the archive: zero mismatches, all 19 fonts present. Check 13 direct compiled TTF imports: no missing/empty references.
- [x] Restore the recorder's SDK-compatible navigation import and align its test icon mock with the current Ionicons component; 25/25 recorder tests pass.
- [x] Android development bundle after recovery passes through the existing Metro server: HTTP 200, 21,057,175 bytes; Feather asset present. The earlier standalone export was interrupted for recovery and is not claimed as passing. Hermes bytecode and native builds remain unverified.
- [ ] Restart Metro with `npx expo start --clear` from `mobile` and verify icons on an Android device.

Repair inventory and selective backups: `C:/Users/user/AppData/Local/Temp/saflal-icon-font-repair-rXe2Av`. No native build/device verification is implied by package integrity checks or mocked tests.


## Frontend recovery acceptance - October 18, 2026

- [x] Restore the saved top-tab/Saflal-header source and migrated chat/contact/login routes.
- [x] Full mobile regression suite passes 248/248, including routing, requests, messaging and voice tests with native/service boundaries mocked.
- [x] Project TypeScript passes; 63 protected backend/auth/configuration hashes remain unchanged.
- [x] Android development bundle through existing Metro passes: HTTP 200, 21,057,175 bytes; verified workspace, restored top tabs/Saflal header, Convex chat list and Feather asset.
- [ ] On Android, verify top tabs/swiping, header/search/profile, Google/Apple login, Users/Requests, accepted-chat navigation, text/voice delivery and keyboard placement.

Exact restored files, evidence and backup: [RECOVERY_REPORT.md](RECOVERY_REPORT.md).


## Voice send transport and authentication repair - October 19, 2026

- [x] Development metadata confirms deployed voice endpoints; anonymous upload returns 401 and empty mutation arguments reject without writes.
- [x] Full mobile suite passes 252/252; native and external-service boundaries remain mocked.
- [x] Real AAC fixture passes the installed Expo fetch body normalizer and server audio validator as unchanged raw bytes, without client Blob conversion.
- [x] Cover remote/invalid URIs, byte-size bounds, read abortion, and retained recordings/operation IDs across preparation, reading, upload and save failures.
- [x] Cover Clerk integration session tokens, legacy JWT templates, 401 refresh, native playback headers and late-token/account fencing.
- [x] Project TypeScript and focused ESLint pass; existing BOM warnings in the two edited auth files were removed and those files rechecked with zero warnings.
- [x] Android JavaScript export passes: 4,637 modules, 154 assets, one 7.7-MB bundle and metadata, exit 0. Native APK/Hermes bytecode not verified.
- [x] Device send: user confirmed "The voice message sends" on October 19, 2026.
- [ ] Confirm the receiving account gets one message and can play the recording audibly on a real device.

Detailed findings, changed files, official references and rollback are in MIGRATION_PROGRESS.md. Snapshot: C:/Users/user/AppData/Local/Temp/saflal-voice-send-t4vXED. No backend publication or live message write was performed by this repair.


## Stream ringtone repair - October 19, 2026

- [x] Original ringtone parses as three-second 22,050 Hz mono 16-bit PCM WAVE at the screen's static import path.
- [x] Both Zegocloud packages removed from manifest, lockfile and installed dependency listing; all other dependency records unchanged.
- [x] Existing Stream/Firebase startup is the selected Expo entry, before Router registration.
- [x] 253/253 mobile tests, project TypeScript and focused entry/test lint pass. Fixtures now support the existing native imports and bounded call queries. A new call-button regression prevents starting calls without confirmed friendship/communication permission.
- [x] Android JavaScript export passes: 5,290 modules, 49 assets including the ringtone, one 8.5-MB bundle; Stream startup is present and Zego package references absent. No Hermes/native build or device verification is implied.
- [ ] Rebuild the Android development client after native package removal; verify ringtone audibly starts/stops on incoming/accepted/rejected/ended/background transitions.
- [ ] Verify two actual accounts, secure call setup, mute/audio output, missed history and foreground/background/terminated incoming calls with configured native ringing and Stream push provider.
- [ ] Complete iOS support/configuration and device verification separately; the existing runtime is currently Android-only.

Mocked tests and JavaScript exports do not prove native calling or production readiness. No live call/deployment was performed.


## Callingx startup crash repair - October 19, 2026

- [x] 258/258 mobile tests pass. Actual entry/runtime tests verify Router loads with missing Callingx/media modules or thrown native setup, no token fetch occurs on native failure, successful setup runs once and authorization precedes push setup.
- [x] Expo configuration introspection succeeds with Stream ringing and Firebase plugins and the Android Stream messaging service.
- [x] Android autolinking, project TypeScript, focused lint and JavaScript bundle pass; final evidence is recorded below.
- [ ] User builds from mobile with eas build --profile development --platform android and installs that new APK, preserving the existing installed-user identity.
- [ ] Verify startup without redbox, Google/Apple session/chat behavior, two-account audio call accept/reject/end, microphone/output and foreground/background/terminated incoming calls.

An old development APK may open with calling disabled after this fix; installing a compatible rebuilt APK is required to enable native calls. No connected device was available for acceptance.


### Completed Callingx local verification

- [x] Project TypeScript, focused runtime/entry/test lint, and Android JavaScript export pass: 5,290 modules, 49 assets, one 8.5-MB bundle.
- [x] Android autolinking includes Callingx, Stream/WebRTC and Firebase with no Zego packages; generated manifest includes the Stream messaging service. Native APK/device checks remain open above.

## EAS npm dependency repair - October 19, 2026

- [x] Manifest/lock root dependencies and devDependencies agree.
- [x] Project npm config selects legacy-peer-deps=true, and EAS archive rules include mobile/.npmrc.
- [x] Required build peers are explicit exact devDependencies; all existing package versions are preserved and no React 16/Zego dependencies are added.
- [x] Isolated clean npm ci --include=dev passes with lifecycle scripts enabled: 1,173 installed packages, exit 0. Fresh Expo/NativeWind development Babel, React Refresh and RN Metro config load pass with ancestor node_modules resolution forbidden; project TypeScript passes. Manifest/lock/config inputs match the verified sandbox.
- [x] User confirms the Android development build succeeds and later confirms the repaired call flow works on the device.


## Android notification manifest conflict - October 19, 2026

- [x] New mobile/firebase.json is included by EAS archive rules and uses supported RNFirebase Gradle/schema keys.
- [x] Channel and color resource match existing Expo configuration; referenced generated color resource exists.
- [x] Actual cached Android manifest-merger reproduces the reported conflict before the fix (exit 1) and merges corrected manifests successfully (exit 0).
- [x] Parsed merged output retains exactly one matching channel/color declaration and the Stream incoming messaging service.
- [x] User confirms the full Android development build succeeds and the repaired call flow works.
- [ ] Verify foreground/background/terminated notification delivery independently on devices.

Only Firebase notification-default configuration changed. This focused check does not claim that the full remote Gradle build or native-device tests passed.

## Call service configuration repair - October 19, 2026

- [x] User reports Android development EAS build succeeded; full build was user-run.
- [x] Confirm dedicated Saflal Stream app identity and enabled authentication/permission checks.
- [x] Set missing development Convex Stream credentials server-side without logging values; remove public secret name and verify EAS excludes private local environment files.
- [x] Live saflal_audio uses actual call_member API role; members can read/join/send audio and ordinary clients cannot create/manage calls or use other types. Elevated role grants preserved.
- [x] Video, screensharing and backstage disabled; two-person attendance limit without exclusions.
- [x] Backend development publication succeeds with no schema/index changes reported.
- [x] Signed nonexistent-call webhook returns 204; unsigned webhook returns 401; anonymous token action returns UNAUTHENTICATED. No actual call or application record created.
- [x] User approves credential transfer; matching Firebase project/provider saflal-android is live and enabled; ring/missed notification flags enabled.
- [x] All 263 tests, project TypeScript and focused ESLint pass. Server and native build failures have different English/Arabic messages.
- [x] User retries and reports the repaired call flow is working; the reported setup/connection blocker is resolved.
- [ ] Two existing friend accounts: start/receive/accept, bidirectional audio, reject, mute, speaker, end, duration, missed call and history.
- [ ] Verify blocked/unauthorized callers cannot call; verify notifications in foreground, background and supported terminated-app conditions on real devices.

Configuration and mocked-boundary tests do not establish actual audio or push delivery. No further Android native build is required by this repair itself.

- [x] Follow-up CALL_CONNECTION_FAILED: real action request inherits validated audio settings, cleans failed reservations and rejects terminal/incomplete idempotency records.
- [x] Actual call provider generates a new request key after definitive server failure and reuses it after uncertain network failure.
- [x] Safe provisioning logs omit all raw SDK error/request data; regression verifies private strings cannot appear.
- [x] Follow-up complete suite: 267/267 tests; focused lint; corrected development backend publication successful.
- [x] User retries the call flow after the subsequent ID-length correction and reports "its working good". Individual call controls remain separate checks.

## Confirmed call-ID validation repair - October 19, 2026

- [x] Failed-request diagnostics confirm create-stage Stream code 4, without resolution validation.
- [x] Read-only development query confirms four failed calls have 76-character IDs; no user IDs/content displayed.
- [x] Official OpenAPI confirms maximum 64; old synthetic shape reproduces the exact maximum-length rejection without creating a call.
- [x] Real reserve handler regression verifies bounded record-derived IDs for 100-character request keys, distinct callers and idempotent retries.
- [x] New 39-character shape passes live Stream length validation and reaches expected nonexistent-call response (code 16), with no call/push created.
- [x] All 268 tests and focused ESLint pass; development backend publication succeeds; native build unchanged.
- [x] User confirms the call flow works after the short-ID deployment. This is user-reported device verification; the successful call record was not independently inspected.

- [x] User retries after the deployed call-ID fix and reports "its working good" on October 19, 2026, confirming resolution of the reported call-flow failure. Separate background/terminated push and full call-control checks remain open.

## Sustained call / webhook transport repair - October 19, 2026

- [x] Read-only call timing confirms false missed calls at the original 30-second ringing deadline.
- [x] Stream reports accepted/two participants while Convex remains ringing; real webhook executions show 401.
- [x] Preserve raw HTTP bytes and Convex byte serialization; verify gzip/plain payloads with the actual Stream HMAC helper; bound inflated and raw bodies.
- [x] Signed acceptance/join changes server state, prevents ringing expiry and ignores a delayed missed event in real-handler regression tests.
- [x] Unsigned/forged/malformed/oversized callbacks cannot change call records.
- [x] 272 tests, project TypeScript and focused ESLint pass; development publication succeeds; live plain/gzip unknown-call callbacks both return 204.
- [ ] Two-phone retry: accept, keep connected at least 45 seconds, confirm audio both ways, then hang up and verify completed history rather than missed.

The earlier user confirmation established call setup only; this subsequent report reopens sustained-audio acceptance. No new native build is required by this server-only fix.

- [x] Actual two-phone retry remains accepted with a verified join beyond the old deadline: 56.036 seconds since creation / 45.636 seconds connected, no endedAt. Confirmed by read-only live metadata.
- [ ] User confirms clear audio both directions and normal hangup/completed history after this sustained call.

- [x] User confirms the two-phone call remained working for a full minute after the webhook repair.
- [x] Investigate repeated speech: user confirms phones are nearby; live call type uses earpiece/voice mode with HiFi disabled. No audio-setting defect is confirmed.
- [ ] Retest in separate rooms or with headphones at moderate volume; confirm whether nearby-device feedback disappears and both sides hear clean audio.

## Calls tab history and call actions — 2026-10-20

- [x] Clerk readiness gate and account-keyed UI/subscriptions prevent displaying the prior account's history.
- [x] Incoming/outgoing history uses date indexes, bounded native pagination and current minimal peer profiles; owner comes from Clerk.
- [x] Mixed directions, exhausted/empty directions, identical timestamps, ID ties, deduplication and reactive changes preserve chronological merge boundaries.
- [x] Today/Yesterday/older local dates, midnight/month/year transitions, Arabic labels and foreground timer cleanup.
- [x] Full names, image sources, image-error initials, unavailable-user fallback, call-back controls and safe-area spacing in rendered JSX with native widgets mocked.
- [x] Incoming missed highlighting; outgoing unanswered, declined/cancelled/failed labels; completed duration only from verified connection/end times.
- [x] New Call opens the picker; friendsOnly defaults off for discovery and supports both friendship orientations, blocks, inactivity and sparse continuation.
- [x] Contact selection creates/reuses the authorized chat; history calls reuse chatId; duplicate taps are suppressed; active calls return to their route.
- [x] Block/unfriend races fail safely; the actual shared provider does not create a call after microphone denial; account teardown/tab blur suppress late call starts.
- [x] Error boundary retry UI and empty/loading/load-more states tested without claiming live native behavior.
- [x] All 297 regression tests pass; project TypeScript and focused ESLint pass. Convex CLI backend typechecking is unavailable because the existing JS project has no convex/tsconfig.json.
- [x] Tested query/index changes synced to the existing development deployment only; no production or call-record mutation.
- [x] Live anonymous smoke on that development endpoint: incoming/outgoing history and friendsOnly queries all reject with UNAUTHENTICATED; no private data read or test calls created.
- [x] Android/Hermes export passes: 5,295 modules, 49 assets, 12,383,692-byte bundle plus metadata under mobile/.expo/bundle-verification/calls-tab. New Calls UI is present; the private Stream credential is absent from the bundle. No new APK/release is claimed.
- [ ] Real Android layout: scroll long mixed history, inspect long names/images, bottom safe area, font scaling, Arabic alignment and day headers.
- [ ] Real Android friend-picker gestures, backdrop/close/hardware Back, sparse load-more, and contact selection.
- [ ] Two existing friend accounts: call-back and New Call, incoming/outgoing/missed updates, completed duration, changed profile photo/name and pagination during new calls.
- [ ] Device permission denial, block/unfriend race, offline/query retry and active-call return; confirm no duplicate calls.
- [ ] iOS rendering smoke where available; audio-call support remains the existing Android-only implementation.

### FlatList refinement

- [x] Calls history uses FlatList data/renderItem with call-ID keys, preserving images/full names, Arabic and day labels.
- [x] One day heading per day even with several calls; the first render is bounded to 20 rows.
- [x] Scrolling near the end requests the appropriate 20-record page; repeated end events share the in-flight guard; loading/exhausted states do not request extra pages.
- [x] All 24 focused call-history/screen tests and focused ESLint pass after the refinement.
- [ ] Real-device scroll/virtualization and continuation across incoming/outgoing/day boundaries; the earlier Android export predates this FlatList-only change.

### Calls pull-to-refresh

- [x] Native RefreshControl is present on populated and empty history; short lists support vertical pull gestures.
- [x] A refresh resets both directional first-page subscriptions together; repeated pulls do not queue duplicate resets.
- [x] Controlled refresh state stays mounted while first pages load; scroll pagination is paused during refresh and completion allows a later pull.
- [x] All 27 focused history/screen tests and focused ESLint pass after the follow-up.
- [ ] Real Android/iOS pull gestures on empty, short and paginated history, including offline failure/retry and account changes. Previous export/device results are not verification of this follow-up.
## Settings controls verification — 2026-10-20

- [x] Reusable card supports read-only selectable detail, navigation and trailing native Switch; English/Arabic alignment and picker labels are exercised through actual JSX with native widgets mocked.
- [x] Show only the matching Clerk account's primary email; stale account email is hidden.
- [x] Save only the authenticated user's notification preference; default existing users to enabled; suppress repeated taps/pending mutations.
- [x] Suppress newly queued and already queued Convex alerts across registered devices when disabled.
- [x] Exercise actual Stream synchronization action for all/none, stale work, provider failure, bounded retries, explicit retry and late-response reconciliation using provider mocks.
- [x] Transient preference-query failures enter the same retry path instead of leaving the setting pending.
- [x] Exercise incoming/missed Stream handler suppression, permission request/denial/provisional permission, errors and account teardown during permission prompts.
- [x] Exercise language persistence, reload invocation, failure rollback, unsupported/same-language selection, duplicate taps and active-call guard.
- [x] All 320 regression tests pass; focused Settings lint and project TypeScript pass. Seven unchanged existing call/voice.jsx lint errors remain separately baselined; full-repository lint is not claimed clean.
- [x] Publish only to the existing development backend; anonymous preference mutation rejects without changing any account data.
- [x] Android JavaScript/Hermes export: 5,299 modules, 49 assets, 12,392,832-byte bundle; Settings strings present and private Stream credential absent. No APK/device verification is implied.
- [ ] Real Android device: Switch persistence after restart and between two signed-in devices; signed-out/account-change isolation.
- [ ] Real Android device: off/on message, friend, missed-call and incoming-call alerts in foreground, background and terminated app; confirm ongoing calls remain usable.
- [ ] Real Android device: notification permission denial, permanently denied permission, device-settings recovery and provider sync retry.
- [ ] Real Android device: English/Arabic restart, RTL direction, email wrapping, large fonts, touch targets and safe-area layout; language change disabled during calls.
- [ ] iOS device: language reload, permission states and existing supported calling paths. No new iOS native incoming-call support is claimed.

New automated cases: `mobile/tests/settings.test.mjs` (8) and `mobile/tests/settings-screen.test.mjs` (11). Logs/build/development smoke are under `mobile/.expo`; final export/publication results are recorded in MIGRATION_PROGRESS.md. Rollback instructions and exact snapshot are in MIGRATION_PLAN.md; preserve all user/call data and reconcile saved Stream preferences before removing their synchronization path.

Settings grouped-container refinement (2026-10-20): all 11 existing Settings JSX/action tests and focused component lint pass after grouping the three rows under one shared background/border. The earlier full suite/Android export predates this visual-only revision; native appearance remains a device check. Rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-settings-group-9f8040e4b46f4abea9e8eda3c79090ac. No backend or native changes.
Settings information links (2026-10-20): existing 11 Settings screen/action tests and focused component lint pass after adding the three localized rows in a shared View. Native browser opening/error handling and availability of http://localhost:5173 are manual checks; all rows intentionally share that temporary destination. On a physical device, localhost refers to that device. The earlier full-suite/Android export result predates this follow-up. Rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-settings-links-d23d77c2a6db4674b4340415eb90bf24; no backend or stored data changes.
## Account actions and deletion — 2026-10-20

- [x] Logout/Delete Account share the existing rounded background/border and have English/Arabic labels and destructive confirmation/cancellation.
- [x] Rapid taps/duplicate confirmations submit once; teardown does not sign out a different account; errors are safe and distinguish request/configuration/call/sign-out failures.
- [x] Public endpoint accepts only explicit DELETE confirmation, derives ownership from verified Clerk identity, and rejects anonymous/unrelated inactive accounts.
- [x] Missing/invalid credentials reject before account deactivation; repeated accepted requests are idempotent.
- [x] Active calls in caller/receiver direction block deletion; old sessions and onboarding cannot restore the inactive tombstone.
- [x] Indexed batches of at most 25 remove personal device/relationship/block/push/upload metadata and only unreferenced staged files. Shared messages/audio/call history and other users' records remain.
- [x] Provider checkpoints, expired/stale leases, recovery cron, backoff, missing/failed Stream tasks and previously deactivated Stream identities are exercised with mocks.
- [x] Deletion tombstones trigger sign-out/retry across mounted sessions; concurrent logout deduplicates, handles native disconnect errors and clears caches.
- [x] All 339 regression tests, focused changed-file lint and project TypeScript pass. Android export passes: 5,300 modules, 49 assets and a 12,406,873-byte Hermes bundle. Existing unrelated call-screen lint errors remain.
- [x] Development publication and anonymous-write smoke pass; the saved development Clerk key matches the mobile instance. Secret values are absent from source and the Android bundle.
- [ ] User rotates the key shared in chat and replaces CLERK_SECRET_KEY in development Convex environment variables.
- [ ] With a deliberately disposable, authorized test account: confirm deletion, observe complete local/Clerk/Stream job status, verify sign-out on two devices and rejection of old sessions. No real account deletion has been executed by the agent.
- [ ] Real Android/iOS layout, scrolling to the actions, native confirmation/cancellation, offline/retry, active-call rejection and sign-out flows.
- [ ] Confirm other participants retain readable shared history under Deleted user and cannot send new calls/messages to the deleted identity.

Rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-account-delete-6b394715423c4a21807117d932d348c8. Retain backend schema/workers/credentials until any accepted deletion jobs finish. Source rollback cannot undo account deletion. Details and logs are in MIGRATION_PLAN.md and MIGRATION_PROGRESS.md.
Call setup permissions incident (2026-10-20): confirmed recent CALLS_PERMISSIONS_NOT_CONFIGURED logs, matching credentials/application and successful Stream configuration API access. Found permissive client grants on the extra agent type; applied only its role restriction. Live validStreamPolicy plus actual verifyCallPermissions pass; all five focused policy tests pass. No quota error was observed, and no billing/quota usage audit or real phone call is claimed. Pending: close/reopen app and retry a two-phone call. No app/native rebuild, backend publication or user/call data mutation. Rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-agent-policy-ecdfd02d-9ce4-43a7-973f-c7154acf226c; restoring permissive grants would reintroduce the failure.
Settings version footer (2026-10-20): all 17 existing Settings screen/action tests and focused lint pass. Check centered Saflal/version text below account actions, configuration-driven version, English/Arabic label and bottom safe-area padding on a real device; no device result is claimed. Earlier full-suite/export results predate this footer. Rollback snapshot: C:/Users/user/AppData/Local/Temp/saflal-settings-version-27bf0d67d2174870a2885d1a28ce1ec1. No backend/native/data changes.

## Arabic Settings/Calls and language loading (2026-10-22)

- [x] 57 focused Settings, Calls, profile editor and language-flow tests pass with --test-isolation=none.
- [x] Focused ESLint and project TypeScript checks pass.
- [x] Loading panel displays English/Arabic progress text, hides selection controls and prevents dismissing the picker while busy.
- [x] Provider raises loading before language/direction changes; duplicate selection is suppressed, unchanged language skips loading, and failed reload restores the previous choice and clears loading.
- [x] Locale direction/normal-row/leading-alignment properties are exercised by component render tests. These are not native layout assertions.
- [ ] On Android and iOS: Arabic Settings icons/content start at the right, chevrons trail on the left, email remains readable and the top back arrow points right. Check profile editor labels, inputs, Save/Cancel and notification permission/retry states.
- [ ] On Android and iOS: Arabic call history avatars start at the right, names/status/time align to the right, callback buttons trail on the left, New Call is at the left, picker content is RTL and audio-call back navigation starts at the right. Check long/mixed-script contact names.
- [ ] Switch English to Arabic and back: observe the translated spinner before restart, persisted language after restart, normal English layout, no extra restart on the already-selected language and active-call protection.
- [ ] Verify reload/storage failure recovery on a native development build; component tests cover the error paths with mocks.

Rollback: restore the exact touched files from C:/Users/user/AppData/Local/Temp/saflal-rtl-language-03253d91-722f-4f3c-84a4-90cd1d51eda9. No backend/data rollback is necessary.

- [x] Android JavaScript/Hermes export completed successfully (exit 0): mobile/.expo/rtl-language-export, one approximately 12MB bundle. Native build/physical-device checks remain unchecked above.

## Last-message previews and read/unread state (2026-10-22)

- [x] All 423 regression tests pass, including existing voice, push, history clearing and chat search suites.
- [x] Chat list shows actual text or localized microphone/Voice message/duration preview in English and Arabic.
- [x] Only outgoing messages show Sent/Read checks, in chat previews and text/audio bubbles; incoming messages retain unread badges.
- [x] 120-message backlogs are acknowledged by one membership write; unread badges remain bounded/capped and outgoing traffic cannot hide incoming unread rows.
- [x] A later message in the same millisecond stays unread; stale/repeated acknowledgements do not regress or advance the wrong cursor.
- [x] Foreign-conversation, nonmember and malformed membership access fails closed; personal clear markers and legacy receipt timestamps remain supported.
- [x] Receipts wait for a loaded message, foreground and focused route; foreground restoration, retries and blur cleanup are tested with mocks.
- [x] Project TypeScript passes. Logs: mobile/.expo/chat-preview-types.log and chat-preview-all-tests.log.
- [ ] Two-device Android/iOS: send/receive text and voice messages; confirm last preview/duration, unread badge and live sent-to-read changes in list/search and bubbles.
- [ ] Leave the conversation or background the recipient app, receive another message, and confirm it stays unread until opening that conversation again. Check offline/reconnect.
- [ ] Confirm opening an audio message's conversation means read/seen, without claiming that audio has been listened to or transport delivery was confirmed.

Rollback requires preserving optional schema readThrough if already persisted. Snapshot and details: MIGRATION_PLAN.md and MIGRATION_PROGRESS.md.

- [x] Focused changed-file ESLint, project TypeScript and Android JavaScript/Hermes export pass; mobile/.expo/chat-preview-export contains the verified bundle.
- [x] Existing development backend publication succeeds, and a live anonymous chat query is rejected without user-data writes. Native/two-device checks remain pending above.

## Nickname search (2026-10-22)

- [x] All 24 focused search tests pass; focused lint and project TypeScript pass.
- [x] People and Chats match English/Arabic nickname prefixes and retain full-name search, including profiles without nicknames.
- [x] A person/chat matching both indexes appears once within its category; category tabs skip both irrelevant queries.
- [x] Independent cursors continue nickname-only results; combined state avoids false empty results or overlapping page loads.
- [x] Nickname searches retain authenticated access, active-account/block checks for People and membership/history visibility checks for Chats.
- [ ] On Android/iOS, search an existing contact by nickname, test nickname edits/removal, duplicate full-name/nickname matches and Load More in All/People/Chats.

This change does not edit existing user profile data. Roll back the frontend before removing the compatible backend selector/index; see MIGRATION_PLAN.md.

- [x] Existing development publication succeeds with the nickname index; both live endpoints accept the field selector and reject anonymous access without user-data writes.
- [x] Android JavaScript/Hermes export passes; mobile/.expo/nickname-search-export contains the verified bundle. Physical-device nickname searches remain pending above.

## Friends-first per-launch Contacts order (2026-10-22)

- [x] All 436 regression tests pass; focused ESLint and project TypeScript pass.
- [x] Friends from both friendship orientations appear before discovery across all pages; traversal covers eligible users once with duplicate suppression.
- [x] Different tested launch seeds change order; the same seed remains stable across refresh, tab visits and component remounts. Account keys isolate subscriptions.
- [x] Authentication, malformed inputs, physical read caps, sparse pages, missing/inactive users, self and both block directions remain enforced.
- [x] Friendship changes move a user into the friends prefix without reseeding; Requests uses its original endpoint. Legacy listUsers and call-picker behavior remain covered by the regression suite.
- [x] Internal 50-record backfill is idempotent and preserves all other fields across multiple test batches.
- [x] Development publication and live backfill/verification pass: five users, three friendships, zero missing keys before frontend activation.
- [x] Android JavaScript/Hermes export passes; output: mobile/.expo/contact-order-export. This is not an APK/native build.
- [ ] On Android/iOS: fresh launch gives a new Contacts order; tab changes, scrolling, background/resume and refresh retain the launch order.
- [ ] On two devices: accept a request while Contacts is open, confirm friends remain ahead of discovery without duplicate rows, and verify blocking/reactive profile changes.
- [ ] Confirm native scrolling, sparse-page Load More, account switching and English/Arabic presentation.

Rollback: restore the frontend first and retain optional schema metadata/indexes while needed by newer clients. Snapshot and safety details are in MIGRATION_PLAN.md.

- [x] Live development native index/cursor traversal, complete eligible set, minimal profile projection, friends-first order, same-seed stability and anonymous-access rejection pass using read-only admin-issued queries. No user relationship/profile writes in this smoke test. Physical-device checks above remain pending.

## Delete own messages for everyone — 2026-10-22

- [x] 24 new deletion tests and all 460 regression tests pass.
- [x] Clerk-authenticated sender ownership; reject anonymous/inactive/unrelated/recipient access and malformed direct memberships. Hidden/expired original messages are unavailable; repeated deletion is a no-op.
- [x] Text/audio content is removed; original ID, chronology, retry key and expiration remain. Chat activity/member metadata is unchanged. No second messages table or new dependencies.
- [x] Both participant projections, native pagination metadata, page-boundary positions, unread exclusion and read-cursor behavior remain correct. Deleted latest messages show localized Chats/Search previews without original content, microphone icons, duration or receipts.
- [x] Queued push resolution suppresses tombstones. Text/audio send retries cannot restore content, including after consumed-upload cleanup. Cross-type retry keys are rejected.
- [x] Deleted voice access fails for both users, including HTTP range requests under the existing 400/private-no-store contract. Shared files survive until their last message reference disappears; missing-file and expired-upload cleanup are idempotent.
- [x] Confirmation/Cancel/dismiss/retry, pending state, duplicate suppression, stale callbacks after blur/account switch, English/Arabic strings, own/nested-voice long-press and accessibility handler forwarding are tested. VoiceMessage unmount invokes playback removal; existing playback lifecycle tests pass. These are mocked native boundaries, not a physical gesture or audible playback check.
- [x] Affected-file ESLint and project tsc --noEmit pass. Broader checkJs baseline/current both report 104 diagnostics without increases by file/error code.
- [ ] Repository-wide Expo lint is clean: currently fails with 18 errors/31 warnings in files unchanged by this feature. No automatic fixes were applied to unrelated work.
- [x] Additive backend published to development only; anonymous delete rejection and four existing history rows checked live without authenticated deletion/data changes. No backfill needed.
- [x] Android JavaScript/Hermes export passes (5,321 modules; 49 assets; 12,477,337-byte bundle). English/Arabic deletion strings are present and the configured private value is absent. Output: mobile/.expo/message-delete-export; this is not an APK/native build.
- [ ] With two disposable test accounts on Android/iOS, long-press own text/audio, Cancel, confirm, and check both placeholders appear at the same original timestamp. Received messages and placeholders must not offer deletion.
- [ ] Verify English/Arabic native alerts, physical long-press on text/voice play controls, accessibility Delete actions, scrolling, and no unintended playback on long-press. ADB found no connected device here.
- [ ] While the receiver is playing/loading audio, delete it and confirm playback stops; new/range requests must fail. Check foreground/background/offline reconnect, concurrent send/delete retries, and no unread badge or new notification from deletion. Use disposable messages only; never delete real existing messages for verification.

Rollback: restore frontend snapshots first; keep tombstone-compatible schema/projections, send deduplication and backend endpoint while needed. Preserve accepted deletions rather than recovering content or files. Snapshot details and limitations are recorded in MIGRATION_PLAN.md and MIGRATION_PROGRESS.md.

## Saflal bilingual landing Home — 2026-10-22

- [x] Frontend production build and lint pass; no errors/warnings in the final frontend lint run. Build artifacts: frontend/dist.
- [x] Cream/gold Home includes navigation, mockup hero, six feature cards, contacts/call-history showcase, steps, closing CTA and footer. All four supplied PNGs load and are preserved unchanged.
- [x] Privacy Policy, Terms of Service and About Saflal display translated coming-soon labels and do not navigate to missing pages. Only Home is implemented; unknown routes replace to /.
- [x] English and Arabic checked in isolated Chromium at 320/375/768/1024/1440 px; no horizontal overflow or clipped headings. Desktop/mobile full-page and hero screenshots visually inspected after loading lazy images.
- [x] Browser Arabic initializes RTL; saved language overrides browser language. Switching updates all copy, image descriptions, html lang/dir, title and description, and persists after reload. Restricted browser storage is handled without breaking switching.
- [x] Mobile menu opens/closes, Escape returns focus, outside click closes, and Home closes it. Keyboard skip link transfers focus to main. Feature anchor clears the sticky header. Visible focus and reduced-motion styles are present; browser checks ran with reduced motion enabled.
- [x] Missing APK configuration keeps both download buttons disabled. A temporary configured server exposes two real anchors with the expected href/download attribute and translated labels. HTTPS/same-origin URL helpers accept supported values and reject unsupported schemes/protocol-relative paths. No APK was downloaded/generated.
- [x] Thirteen representative normal-text contrast samples pass 4.5:1 (minimum measured 4.53:1); this is a targeted check, not a full accessibility audit. No browser runtime errors during verification.
- [x] README and .env.example explain local preview, APK configuration, public environment variables and future SPA hosting fallback. No backend, auth, analytics, service/data mutation or hosting deployment was added.
- [ ] Check on physical Android/iOS browsers, Safari/Firefox and assistive technologies when available; desktop Chromium emulation is not a physical-device result.
- [ ] When a real signed APK/link is supplied, verify file existence, download headers and Android installation before enabling downloads for a published site.

Local artifacts: frontend/{build,lint,browser,download,contrast}-check.log; screenshots and verification report under frontend/node_modules/.cache/landing-browser. Rollback snapshot and scoped restoration instructions are in MIGRATION_PLAN.md.

Landing fonts (2026-10-22): frontend build/lint pass. Isolated Chrome verifies actual Google Fonts loading for Roboto/English and Cairo/Arabic, matching computed body/button fonts, and no horizontal overflow at 320/390/1440 px. Both families share one display=swap import; explicit language labels and the English wordmark select their own family. Logs: frontend/font-{build,lint,browser}-check.log. No APK, backend or deployment changes.
