# Testing Instructions for Store Reviewers

Twitch Chatter Watch 1.3.0. These instructions describe the implemented extension. They are suitable for the Chrome Web Store Test instructions field and Mozilla Notes for Reviewers after the publisher provides the private test-access details below.

## Credentials and Access: Publisher Must Supply Privately

**No real Twitch test credentials have been provided for this release.** There is no working username/password, access token or Client ID in this document or the store kit. Screenshot accounts such as SampleViewer01 and demo_moderator are fictional fixtures, not usable login credentials. Automated-test strings such as test-token are not valid Twitch authorization.

| Required access item | Value / preparation |
| --- | --- |
| Twitch test moderator/broadcaster username | Publisher supplies a dedicated authorized test account in the store's private reviewer field. Do not use a production account. |
| Password and any required verification/2FA procedure | Publisher supplies privately through the store's approved reviewer-access process. Do not publish, commit or place these values in an archive. |
| Twitch application Client ID | Publisher supplies the ID of an application configured with the exact callback of the submitted browser build. Client ID is not a Client Secret. |
| Authorized primary test channel | Publisher identifies a channel where the test account has moderator or broadcaster rights for all moderation tests. |
| Separate test chatter account or arranged test messages | Needed to produce incoming chat and safely test review, deletion and timeouts. Any login details are supplied privately. |
| Optional translation test endpoint | Publisher supplies a working LibreTranslate-compatible HTTPS endpoint accepting the extension's anonymous JSON request, or marks translation unavailable for live testing. No default provider or API-key storage is included. |

Account creation, verification, moderator assignment and store-private credentials are publisher actions. Revoke or rotate temporary reviewer access after review. Missing access must be reported as a review-preparation blocker, not replaced with invented credentials.

## Package and Setup

1. Extract the browser-specific store kit. Install only `packages/chatter-watch-1.3.0-chromium.zip` or `packages/chatter-watch-1.3.0-firefox.zip` through the relevant review workflow. The store kit itself is not an installable extension ZIP.
2. Use desktop Chromium/Chrome 116+ or Firefox 140+. The ordinary Firefox release requires signing for permanent installation; temporary loading is a development check, not proof of signing. No mobile compatibility is claimed.
3. Open the extension and use the pin-window button for a persistent dashboard. This avoids the native toolbar popup closing while the official OAuth flow runs.
4. Open Settings. Confirm the displayed browser-specific OAuth redirect is registered in the test Twitch application. A locally unpacked Chrome installation can have a different ID/redirect from the store build. Prepare the final redirect after the item ID is known, before submitting the item for review.
5. Enter the supplied Client ID and primary test channel. Settings save automatically after a valid edit or through Save. No Client Secret is requested.
6. Select Connect in the persistent window and complete Twitch's official sign-in. Grant the listed scopes: `chat:read`, `moderator:manage:banned_users`, `moderator:manage:warnings`, `moderator:read:followers`, `moderator:manage:chat_settings`, `moderator:manage:chat_messages`.
7. Wait for Connected/Monitoring. Scope authorization is not the same as permission to moderate any channel: the account must have the appropriate role in the target channel.

## Core Reading and Review

1. Send harmless messages from the arranged test chatter using Twitch's own chat UI. The extension is a reading/moderation tool, not a general message-composition client.
2. Open Multichat, add up to six unique channels including the primary, switch between Grid and Unified, and detach an individual channel. These views share the connection and settings.
3. Pause and resume; scroll upward one pixel to lock the view, then choose Live/End or reach the bottom to resume. Pin a retained message and verify new messages continue in the live buffer.
4. Observe applicable review signals in the primary-channel dashboard. Add a free-text note or RAID/FRONT PAGE note and approve a test chatter. The person leaves Pending Review and appears in Approved with a reason; their allowed messages remain in live chat.
5. Optional: enable quantity-based auto-approval with N=2 for a controlled new test chatter. Two messages do not qualify by quantity; the third does. Disable other approval conditions for this boundary test. Restore prior settings afterward.
6. Inactivity defaults to 15 minutes. A verified stream transition or configured inactivity makes automatic decisions/dismissals eligible for reevaluation on the next message. Manual approvals persist. Current subscription uses IRC evidence; previous subscription is only locally observed history, not a historical Twitch query.

## Safe Moderation Checks

1. Open a ban/timeout dialog for the authorized test chatter and cancel. No sanction should be sent. Verify that the target and channel remain clear while the dialog is open.
2. With the publisher's authorization, confirm a short timeout on the test account. The manual duration is in seconds; never use a real participant for an unarranged sanction. `/srs 1s` also requests confirmation before its one-second timeout.
3. Delete one agreed test message using the row's Delete action and confirm. Only that retained message is targeted; the local feed keeps it as a marked deletion ghost. Missing scope or role must report an error rather than success.
4. If testing actual slow mode, record the channel's existing value, make an agreed temporary change, confirm it and restore the original value immediately afterward. Local slow/filter controls do not themselves change Twitch settings.
5. Automatic timeout is separate and initially disabled. Leave it disabled unless testing it has been specifically arranged. A ban is permanent; no successful ban test is required merely to demonstrate the confirmation UI.

## Optional Translation and Host Permission

1. Open All settings and enter the supplied HTTPS LibreTranslate-compatible endpoint and a two-letter target language. Saving the endpoint must not send chat text.
2. Select Allow translation server and approve only the requested origin. Firefox also requests optional personalCommunications consent.
3. Select Translate for a retained test message. The dialog identifies the destination origin and text. Cancel first and verify no translation request; repeat and confirm to view original plus translation.
4. Network inspection should show a JSON body containing `q`, `source`, `target` and `format`, with no Twitch Authorization/Client-Id headers, cookies or author/channel metadata. The provider will still see network information such as IP and the message text itself.
5. Revoke the origin permission (and optionally Firefox data consent) and confirm that a new request is rejected. Clear the configured URL to disable the feature. JSON responses are displayed as text, not executed as code.

## Preferences, Alerts and Cleanup

1. Change language or theme and open another view. Confirm the shared preference appears there and persists after reload; pause, scroll and pins remain window-local.
2. Move/resize a detached window, close and reopen it. The browser may adjust unavailable-monitor positions. The native action popup itself cannot be forced to remain open on focus loss.
3. Enable optional review alerts and use Test sound in an interacted-with view. Alerts are rate-limited to one per ten seconds and routed to one view; taskbar effects depend on the OS/browser. They must not steal focus.
4. Export TXT from a channel or Unified view using harmless sample messages. The file is local and limited to the retained live buffer; do not upload private chat records with a review report.
5. Disconnect Twitch and restore all changed test-channel/settings values. Clear extension storage/IndexedDB or uninstall the test profile to remove stored notes and samples; delete downloaded exports separately.

## Known Evidence Limits

The repository's automated tests and store screenshots simulate extension APIs and Twitch traffic. They validate local behavior, not live authorization/delivery, a deployed translation provider, native multi-monitor behavior or browser suspension guarantees. The current build does not implement its own encryption of local records at rest; the corresponding store-policy compliance question remains unresolved. Do not certify or publish until the owner resolves the recorded blockers in STORE_VALIDATION.md.