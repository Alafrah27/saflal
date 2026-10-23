# Saflal Privacy Policy

**Review draft — resolve bracketed items before publication.**

Effective date: [PUBLICATION DATE]

## 1. Who is responsible

Saflal is a free messaging application operated by [FULL LEGAL NAME], an individual operating as Saflal in Riyadh, Saudi Arabia. This policy explains personal-information handling for the Saflal application and its associated website at [OFFICIAL WEBSITE URL].

Contact the operator about privacy at **almusdarthafa999@gmail.com**, by telephone at **+966 55 547 5591**, or at [PUBLIC MAILING ADDRESS]. [CONFIRM WHETHER A SEPARATE DATA PROTECTION CONTACT IS REQUIRED AND, IF SO, ADD IT.]

## 2. Information collected and why

| Information | Where it comes from and how it is used |
| --- | --- |
| Account and sign-in information | Google or Apple, through Clerk, supplies authentication and profile information. Saflal uses an authentication identifier, name, available profile picture URL and verified primary email to create and maintain your profile and control access. Saflal's current sign-in screen does not ask you to create a Saflal password. |
| Profile information | Your profile can contain a full name, optional nickname, biography and profile picture. Nickname and biography can be changed in Settings. Information is used to identify you and help people find and communicate with you. |
| Contact and blocking relationships | Friend-request senders/recipients, request status and timestamps, accepted relationships and block relationships are stored to manage contacts, control communication and apply your choices. These are Saflal relationships; the current app does not import your phone's address book. |
| Messages and voice recordings | Saflal stores text messages, voice recordings and related sender/conversation identifiers, timestamps, read state and deletion information to deliver messages and display conversation history. Voice recordings also have duration, file-reference and upload-processing information. |
| Live calls and call history | Stream processes live audio and call signaling. Saflal stores caller/recipient identifiers, call and conversation identifiers, statuses/outcomes and relevant timestamps to connect calls, show history and handle missed or failed calls. Live-call audio and recorded voice messages are different features. |
| Device and notification information | Push tokens, an installation identifier, device platform, selected language, registration/activity state, notification preferences, delivery attempts, receipts and error codes support notifications and troubleshooting. Stream/Firebase also use device-registration information for Android incoming-call notifications. |
| Technical and local information | Connections to service providers expose network information such as IP addresses. Calling software processes connection-quality and device/session diagnostics. The app also stores session information, language preferences, push-registration information, temporary recordings and limited notification identifiers on your device. The website stores a language preference in your browser. |
| Requests you send to the operator | If you contact the published email or telephone number, your contact details and the information you choose to provide are used to address that request. [CONFIRM SUPPORT/EMAIL PROVIDER AND SUPPORT-RECORD RETENTION.] |

Authentication information is needed to use account features. A nickname and biography are optional. Messages, voice recordings and calls are supplied when you use those features. Microphone and notification permissions are requested through your device; denying them affects the corresponding feature. Do not include sensitive personal information in your profile or communications unless you intend to share it with the relevant recipients.

## 3. Who can see your information

Other signed-in users can discover your basic profile, including your name, nickname and available profile image. Your biography and account join date may appear in profile views when no blocking restriction applies. **Accepted contacts can see your verified primary email address where available.** There is no current setting to make your entire profile undiscoverable.

Conversation participants can access their shared messages and relevant read information. Call participants see relevant identity and call-history details. Blocking prevents new communication under the app's rules and restricts some profile information; it does not erase earlier shared history or information someone has already saved. Saflal does not disclose another user's private block list to you.

Notifications can reveal information on a device's notification or lock screen. Text-message alerts may contain the sender's name and a preview of up to 160 characters. Voice-message alerts use a voice-message label rather than the recording itself. Friend-request and missed-call alerts may include a person's name. Adjust your device's notification-preview settings if you want to limit what is visible.

## 4. Service providers

Saflal sends relevant information to providers that supply the features below:

- **Clerk, Google and Apple:** authentication, sign-in and associated account/profile processing. Google or Apple processes your use of the account you choose to sign in with.
- **Convex:** application database, realtime queries, server functions, upload processing and stored voice-message files.
- **Stream:** user ID, display name and available image URL; live audio, call membership, call identifiers and signaling; device registration for calling notifications; and call connection-quality/session diagnostics. A calling profile can be created when the app prepares its calling connection, before you place a call.
- **Expo:** notification tokens and notification content, delivery status, and configured app-update delivery. Notification payloads include the previews and routing identifiers described above.
- **Google Firebase/FCM:** Android device-registration/installation information and notification delivery, including Stream incoming-call signaling. On supported Apple notification paths, Apple's push service delivers notifications to the device.
- **Google Fonts:** the website requests fonts from Google's servers, which receive connection/request information, including the requesting IP address.
- **[PUBLIC WEBSITE/FILE HOSTING AND SUPPORT PROVIDERS]:** [IDENTIFY ACTUAL PROVIDERS, RELEVANT REQUEST/LOG DATA AND PURPOSES BEFORE PUBLICATION.]

Providers process relevant information to operate these functions and may use subprocessors under their arrangements with Saflal. Their processing roles are governed by applicable law and the relevant agreements. A provider's own website privacy policy is not a substitute for this notice about Saflal.

The current application has no payment integration or first-party advertising/behavioral-analytics integration. Calling diagnostics, push-delivery records, authentication security processing, update requests and hosting logs are still technical data processing. [CONFIRM OFF-PLATFORM PRACTICES AND PROVIDER SETTINGS BEFORE MAKING ANY BROADER "NO SALE," "NO SHARING," OR "NO TRACKING" STATEMENT.]

Information may also have to be disclosed in response to a legally binding obligation. This is subject to applicable law and is not a claim that the app performs continuous government reporting or automated content monitoring.

## 5. Storage, security and international processing

Application records and voice-message files are held in Convex's service infrastructure. Clerk holds authentication records, and Stream processes calling data. Device/browser storage holds the local information described above. Access to protected application functions requires authentication, and message/file access checks conversation membership. Voice-message playback uses authenticated requests rather than a public attachment link.

Stored messages are processed in a server-readable form. Saflal does **not** provide end-to-end encryption for stored messages. No internet service or storage system can guarantee absolute security. A provider's certifications should not be understood as a certification of Saflal itself.

[CONFIRM ACTUAL STORAGE AND PROCESSING COUNTRIES FOR CONVEX, CLERK, STREAM, EXPO, GOOGLE, WEBSITE HOSTING, EMAIL AND BACKUPS. DESCRIBE ANY PROCESSING OUTSIDE SAUDI ARABIA AND THE APPLICABLE APPROVED TRANSFER MECHANISM/SAFEGUARDS. DO NOT CLAIM ALL DATA STAYS IN SAUDI ARABIA.]

The app requests microphone access for voice messages and audio calls. Its present native configuration also declares camera permission, although the current calling flow is audio-only. The current composer does not provide photo/video-message uploads. [REVIEW THE RELEASE MANIFEST AND SDK BEHAVIOR; REMOVE UNUSED PERMISSIONS OR UPDATE THIS DESCRIPTION TO MATCH THE ACTUAL RELEASE.]

## 6. Retention and deletion

The controls below have different effects:

| Data or action | Current handling |
| --- | --- |
| Ordinary text and sent voice messages | There is no fixed automatic deletion period for ordinary conversations in the current app. Messages and referenced audio remain stored unless a relevant deletion process applies. [APPROVE A RETENTION PERIOD OR SPECIFIC NECESSITY CRITERIA AND IMPLEMENT THEM.] |
| Delete your sent message for everyone | Text/voice content is removed from the shared message and a deleted-message marker and related identifiers/timestamps remain. Unreferenced server audio is removed. Copies previously received outside Saflal or included in earlier notifications cannot be recalled. |
| Delete a conversation for yourself | Removes that history from your own view; the shared records and the other person's history are preserved. |
| Delete call history | Hides selected entries from your view; shared call records remain. |
| Unfinished voice uploads | Upload sessions expire after 24 hours. Scheduled cleanup runs in batches every 15 minutes; a daily sweep also handles eligible orphaned audio. Cleanup can take longer if processing is delayed. |
| Notification-delivery records | Completed, failed or suppressed delivery records become eligible for cleanup after seven days, with hourly batch processing. Pending work and retries can last longer. |
| Profile, contacts, call records, deletion metadata, logs and backups | These categories do not all have a fixed deletion deadline enforced by the current application. [ADD THE ACTUAL PERIODS/CRITERIA, PROVIDER BACKUP EXPIRATION AND DOCUMENTED REASONS FOR RETAINED RECORDS.] |
| Local recordings and device/browser data | Some session caches are cleared on sign-out or account changes. Preferences, installation/notification information and temporary native recordings can remain on the device or in OS-managed storage. There is no verified guarantee of immediate local-file erasure when a draft is discarded or sent. Browser storage can be cleared through browser controls. |

There is no current user-facing disappearing-message setting. Although the backend can recognize an expiry timestamp on a message, this does not mean all messages are deleted after 30 days, and the old seven-day auto-delete statement does not describe the current app.

### Account deletion

You can request deletion in **Settings → Delete Account**, confirm the request, and end an active call first. If a provider is unavailable, the request may fail before it is accepted; an accepted request starts a background process that retries failures.

Once accepted, Saflal disables your profile, removes its name, nickname, biography, picture reference and verified email, and displays "Deleted user." Background cleanup removes associated device registrations, friendship/request/block records, notification-delivery jobs and upload records as applicable. It requests deletion of the Clerk account and deactivation/pruning of the Stream profile.

**Shared chats, chat memberships, messages, voice files referenced by those messages, and call records currently remain.** A limited user record with authentication identifier and deletion timestamps also remains, along with deletion-job metadata. Removing profile details does not make every retained record anonymous. There is no promise that all copies or provider backups disappear immediately.

[BEFORE PUBLICATION: DOCUMENT AND VALIDATE THE LEGITIMATE REASONS, NECESSITY, RETENTION LIMITS AND LEGAL BASIS FOR THESE RETAINED RECORDS; CHANGE THE PRODUCT WHERE REQUIRED. DISCLOSURE ALONE DOES NOT ESTABLISH COMPLIANCE WITH ACCOUNT/DATA-DELETION DUTIES.]

An external way to request account deletion will be published at [PUBLIC ACCOUNT-DELETION PAGE URL]. [CONFIRM AND OPERATE THE EMAIL REQUEST/IDENTITY-VERIFICATION PROCESS DESCRIBED IN THE ACCOMPANYING ACCOUNT-DELETION DRAFT BEFORE PUBLISHING THIS LINK.]

[LEGACY DATA CHECK: CONFIRM WHETHER ANY OLD LUQYA/SAFLAL ACCOUNTS, PASSWORD HASHES, EMAILS, AVATARS, MESSAGES OR NOTIFICATIONS REMAIN IN MONGODB, CLOUDINARY OR OLD HOSTING/BACKUPS. CURRENT CONVEX DELETION DOES NOT DELETE THOSE STORES. IF ANY REMAIN, INSERT THE ACTUAL RETENTION, RECIPIENTS AND DELETION PROCESS HERE.]

## 7. Your choices and rights

You can edit your nickname and biography, manage blocked users, change language, manage notification preferences, sign out, and request account deletion in Settings. You can also manage microphone and notification permissions in device settings. Turning notifications off does not delete stored messages or account data. Changing a Google/Apple account or granting a device permission is separate from agreeing to this policy.

Under applicable Saudi personal-data law, rights may include being informed about processing, accessing and obtaining a readable copy of your information, requesting correction/completion/update, requesting destruction where applicable, withdrawing consent for processing that depends on it, and complaining to the competent authority. These rights apply subject to the law's conditions and exceptions; they do not depend on a particular button being available.

Send requests or privacy complaints to **almusdarthafa999@gmail.com**. We may need proportionate information to verify that you are entitled to make the request and protect other people's information. Do not send passwords or authentication codes. Saflal currently has no self-service data-export tool. [APPROVE AND OPERATE THE MANUAL ACCESS/COPY/CORRECTION/DELETION AND COMPLAINT PROCESS, INCLUDING RESPONSE WITHIN THE APPLICABLE LEGAL DEADLINES.]

You may raise a personal-data complaint with the Saudi Data and Artificial Intelligence Authority through its [Personal Data Protection Platform](https://dgp.sdaia.gov.sa/). Rights under other countries' laws may apply depending on where Saflal is offered and your circumstances. [CONFIRM LAUNCH COUNTRIES AND ADD ANY REQUIRED LOCAL NOTICES/REPRESENTATIVE CONTACTS.]

## 8. Legal grounds and automated processing

Saflal uses the information described above to authenticate accounts, provide requested communications, apply security/access rules, deliver notifications and handle account requests. These functions automatically apply rules such as membership, blocking, upload limits, read state and call-status transitions. The current app does not provide generative-AI messages or transcription features.

[LEGAL BASIS REVIEW: FOR EACH PURPOSE ABOVE, INSERT THE APPLICABLE SAUDI LEGAL BASIS. SEPARATELY ADDRESS PROFILE/DIRECTORY AND FRIEND-EMAIL DISCLOSURE, OPTIONAL NOTIFICATIONS, SECURITY, USER-SUPPLIED SENSITIVE INFORMATION AND RETAINED SHARED HISTORY. IF RELYING ON CONSENT, IDENTIFY THE ACTUAL REQUEST/WITHDRAWAL MECHANISM AND RECORDKEEPING. ACCEPTANCE OF TERMS OR OS PERMISSION ALONE MUST NOT BE PRESENTED AS BLANKET CONSENT TO EVERY PRACTICE.]

## 9. Adults only

Saflal accounts are intended for people **18 and older**. The current app does not verify age or provide parental-consent controls. If you believe someone under 18 has created an account, contact **almusdarthafa999@gmail.com**. [ESTABLISH A PROCESS FOR REVIEWING AND HANDLING THESE REQUESTS BEFORE PUBLICATION.] A Google Play content rating is separate from this account-eligibility rule.

## 10. Updates and contact

The current version of this policy will be available at [PUBLIC PRIVACY POLICY URL] with its effective date. [SPECIFY AN ACTUAL METHOD FOR NOTIFYING USERS OF MATERIAL CHANGES BEFORE THEY TAKE EFFECT AND OBTAIN ANY NEW CONSENT REQUIRED BY LAW.]

Saflal — [FULL LEGAL NAME], individual operator  
Riyadh, Saudi Arabia  
**almusdarthafa999@gmail.com** · **+966 55 547 5591**  
[PUBLIC MAILING ADDRESS]

---

### Reviewer notes — remove from the published version

- This draft describes the audited source, not verified production traffic or a completed compliance program. Resolve all brackets; do not publish this review version as a finished policy.
- Owner-confirmed: free service, 18+ account rule, individual in Riyadh, contact details and intended Google Play release. The full legal identity, hosting regions, provider/support arrangements, legacy stores, retention and legal bases remain open.
- Code evidence: [LEGAL_AUDIT.md](LEGAL_AUDIT.md), especially E08–E10 and E19–E41. Law-related rights and notice topics were checked against the official SDAIA guidance and [Saudi PDPL text](https://misa.gov.sa/app/uploads/2025/08/PersonalDataProtectionLaw.pdf) linked in that audit. Final interpretation needs Saudi counsel.
- No claims are made of guaranteed security, universal 30-day erasure, irreversible account anonymization, no third-party sharing, no technical telemetry, Saudi-only hosting, enabled data export, or tested video/iOS calling. No sale/advertising representation should be expanded beyond confirmed actual practices.
- Review Google Play Data safety against the release binary and all SDK processing. Publish accessible HTML, repair app links, and validate an external deletion-request path. Account deletion's broad retained data requires specific review and likely engineering work; this text is not an exemption.
- **Have a qualified attorney familiar with Saudi privacy law and the launch markets review this draft before publication.**
