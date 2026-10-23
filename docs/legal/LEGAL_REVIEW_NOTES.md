# Saflal: decisions and Google Play publication review

Prepared October 23, 2026. This accompanies the [Terms](TERMS_OF_SERVICE.md), [Privacy Policy](PRIVACY_POLICY.md), [About copy](ABOUT_SAFLAL.md), [account-deletion page copy](ACCOUNT_DELETION.md) and [source audit](LEGAL_AUDIT.md). They are connected to local website preview routes, but have not been deployed. No Play Console declaration has been submitted.

Arabic companion drafts (`TERMS_OF_SERVICE.ar.md`, `PRIVACY_POLICY.ar.md`, `ABOUT_SAFLAL.ar.md`, `ACCOUNT_DELETION.ar.md`) now power the website's Arabic language selection. They retain the same sections, material disclosures, eligibility, free-use statement and unresolved decisions. Neither language has been certified by counsel; no language-precedence provision has been added.

## Confirmed and unresolved decisions

| Topic | Confirmed facts / draft decision | Still required |
| --- | --- | --- |
| Service/operator | Saflal; individually operated from Riyadh. | Full legal name of the individual; any registration requirements and public mailing address. A brand name is not evidence of an incorporated entity. |
| Contact | Owner provided `almusdarthafa999@gmail.com` and `00966555475591`, normalized to `+966 55 547 5591`. | Confirm access to the mailbox/phone and operate privacy, deletion and abuse handling. No message has been sent to these contacts. |
| Eligibility | Owner explicitly selected **18+ account eligibility** after clarifying that “3+” meant a store rating. | Display eligibility before registration and determine appropriate enforcement. Complete Play's real content-rating questionnaire; do not promise a 3+ outcome or select children as target users based on that earlier answer. |
| Price | Owner confirmed that the app is free. No billing/subscription/purchase implementation was found. | No billing/refund section is needed for the current product. Advertising/data-sale practices outside the audited code remain unconfirmed; do not invent an absolute no-sale representation. |
| Markets | Intended Google Play/Android release; Riyadh and +966 imply Saudi Arabia. | Confirm actual distribution countries, Play listing category, applicable local notices and any required registrations. Arabic UI does not prove a particular launch territory. |
| Governing law | No preference/existing policy supplied. Draft assumption: Saudi law and competent Riyadh courts, subject to mandatory protections. | Operator and counsel approval. No arbitration, class waiver, forced pre-dispute process or special indemnity chosen. |
| Risk allocation | Draft uses availability limits and preserves mandatory rights; no special monetary liability cap. | Counsel review of warranty language, liability exposure, content license, acceptable use and enforcement. Free use is not a reason to invent a zero-dollar cap. |
| Retention | Actual partial deletion and cleanup schedules documented in audit E33–E41. | Category-specific retention periods/necessity criteria, backup/provider deletion, retained identifiers and content, legal holds and legacy-store cleanup. No general period was invented. |
| Legal bases/transfers | Purposes and providers are visible in code. | Actual lawful basis per purpose, data roles/DPAs, processing countries, international-transfer safeguards and any required impact assessment or data-protection contact. Do not assume all SaaS data is Saudi-hosted. |
| Support/moderation | Blocking exists; email/phone are now supplied. | Human reporting/review/removal/escalation procedures, appropriate in-app reporting, handling of underage users, child-safety duties if applicable, and any suspension/appeal process. |
| Publication/changes | Local website preview routes now display the policy, terms, about and deletion drafts; no deployed public URLs or operational external request handling were verified. | Public HTTPS domain, effective date, versioned acceptance before UGC and a functioning material-change notice method. |

## Release findings requiring resolution

| Priority | Finding | Required outcome before representing readiness |
| --- | --- | --- |
| Blocker | Mobile Settings and welcome legal links open `http://localhost:5173`. Website “Coming soon” labels have now been replaced by local preview links, but no public deployment was performed. Audit E03/E18 describes the original finding. | Host final privacy/terms/deletion HTML at working public URLs, repair app links, and verify on a physical phone without development tooling. Privacy access must work before collection/account creation. |
| Blocker | No current external account-deletion request path. Audit E41. | Publish a named Saflal deletion page with a working request method usable without reinstalling the app. An email route is possible if the operator actually handles verified requests; an informational page that sends users back to the app is insufficient. |
| Blocker | In-app deletion preserves shared text/audio/calls, chat memberships, the user row with Clerk ID, and deletion metadata without a comprehensive retention deadline. No legacy/provider-backup deletion is established. Audit E36–E41/E47–E48. | Assess necessity and lawful/Play-permitted reasons for each retained category, implement deletion/anonymization where required, set retention criteria, and test the full lifecycle. Do not label the present result “all data deleted” or “anonymous.” Disclosure alone is insufficient. |
| Blocker | New 18+ terms/acceptable-use rules have no recorded acceptance/version in the code. Existing links are placeholders. Audit E18. | Present accessible terms and require acceptance before UGC submission. Establish evidence of acceptance and an operational moderation process appropriate to this service. |
| High | No report-user/content handling workflow was found, although block/unblock exists. Audit E18/E27. | Review Play UGC requirements for the exact interaction model, implement an accessible in-app reporting/feedback route where required, and establish review/action handling. Never advertise reporting/moderation as already working. |
| High | Google Play's extra Child Safety Standards apply if listed as Social/Dating or if actual behavior falls within anonymous/random chat definitions. Adult-only eligibility does not remove those standards. | Confirm classification honestly. If applicable, publish CSAE standards naming Saflal, provide the required in-app feedback method and trained safety contact, and establish lawful CSAM handling/reporting. Do not claim certification merely because the ToS prohibits abuse. |
| High | Camera/video descriptions and camera permission remain despite audio-only service. Audit E31. | Inspect the merged release manifest and SDK behavior, remove unnecessary permissions where feasible, correct user-facing permission descriptions and align Data safety. Do not change native identifiers or calling packages as part of this legal-drafting task. |
| High | SDK/hosting logs, call diagnostics, storage regions, support records and backup lifetimes are not fully verified. Audit E22/E29/E30. | Inspect the actual release and provider controls; complete the data inventory and required disclosures. Remove unnecessary identifier/token logging. No remote analytics SDK found does not mean no technical processing. |
| High | Stream auto-recording/transcription settings are not explicitly audited/disabled by the first-party policy check. | Verify the deployed call type has recording/transcription disabled if the release is intended not to provide them. Do not promise “calls are never recorded” without this check. |

Google Play's [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-gb) requires a public privacy policy and accurate collection/use/sharing/security/retention disclosures. Its [account-deletion guidance](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) describes both request paths and retained-data exceptions. Its [UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB) requires accepted user rules and appropriate moderation; [Child Safety Standards guidance](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en-GB) defines the additional covered categories. These policies were checked for this audit; review them again when submitting the actual release.

## Candidate Data safety inventory — verify in Play Console

This is a mapping for review, not an automatically completed declaration. Google Play's definitions of collection, sharing, optional processing, ephemerality and service-provider exceptions must be applied to the actual release and contracts. Do not mark “no data collected.”

| Potential Play category | Evidence / decision to verify |
| --- | --- |
| Personal information: name, email, user IDs, other profile information | Clerk/Convex; names/nicknames/bio, account/service IDs and verified friend-visible email. Full name/account identifiers support core account operation; optional biography is separately editable. |
| Messages: other in-app messages | Stored text messages and message/notification content; include previews transferred through push infrastructure. |
| Audio files: voice or sound recordings | Stored recorded voice messages. Review how the form distinguishes live-call audio processing from stored recordings and ephemeral processing. |
| App activity / other user-generated content / interactions | Friend requests, contacts within Saflal, blocks, read state, call activity and deletion requests; choose only the definitions actually matching these records. |
| Device or other IDs | Expo/FCM/Stream push registrations, installation identifiers, and account-linked device records. |
| App information/performance and diagnostics | Stream RTC/device/session statistics and actual release logging. Validate payloads and SDK declarations. |
| Photos / profile images | URLs synchronized from Clerk and images displayed from providers; determine the actual transfer/collection paths. Declared image-picker/camera permissions alone are not proof of a photo-message feature. |
| Approximate location | No active GPS/location feature found. Determine whether any provider uses IP-derived location in a way reportable under Play's definitions. IP receipt alone is not proof of collecting a location field. |
| Financial information, address-book contacts, advertising ID | No current first-party billing, phonebook-import or advertising-ID flow found. Validate the release and SDK behavior before answering. A developer support phone number is not evidence that users' phone numbers are collected. |

SDK inclusion matters even if the developer does not personally view the resulting data. Confirm purposes and sharing/processor classifications rather than treating every network destination as either a new sale or an automatic exemption. Consult [Play's Data safety instructions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) while completing the form.

## Publication acceptance checklist

- Resolve every bracketed field and legal decision in all public drafts; remove reviewer notes from published pages. Approve final English wording and obtain legal review of the Arabic version if published.
- Match the operator/service/contact names across policy, deletion page, app and Play listing. Use the final rating and adult target-audience declaration from truthful questionnaire answers.
- Verify public policy/deletion URLs in a signed-out browser and the release app. Policies must be publicly accessible HTML, with no editing access or login requirement.
- Verify Google/Apple sign-in configuration, session restoration and sign-out in the release build; no assumption that a displayed provider button proves configuration.
- With two test accounts, verify friendship, text/voice delivery, read state, block effects, voice authorization, personal history clearing and delete-for-everyone behavior.
- Test accepted account deletion through Convex, Clerk and Stream, retained-data rules, failure recovery, external requests, legacy stores where applicable and the real backup/deletion schedules. Confirm that support can handle data-copy/correction requests without exposing another user's messages.
- Test audio-only calls, permission prompts, background/terminated-app incoming calls, rejected/missed calls and call-history deletion on supported Android devices. Review foreground-service/full-screen intent declarations against the actual release.
- Inspect network requests, logs and merged permissions; reconcile Privacy Policy, Data safety, permissions and SDK disclosures. Do not assert end-to-end encryption.
- If applicable, verify content/child-safety reports, escalation, action handling and contact readiness. Do not confuse a written prohibition with an implemented process.
- Reassess any change to the product, SDKs, providers, ads, eligibility, territories or retention before release. No migration, deployment, destructive cleanup or production cutover is authorized by these documents.

## Reviewer conclusion

The source-backed drafts are ready for operator/counsel review. **They are not publication-ready while placeholders or the blockers above remain.** This review does not guarantee Google Play acceptance and does not establish compliance with Saudi law or every launch country's rules. A qualified attorney familiar with the actual markets should review before publication.
