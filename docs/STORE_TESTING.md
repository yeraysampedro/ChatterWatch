# Testing Instructions for Store Reviewers

ChatterWatch 1.0.0. These instructions describe the implemented extension. They are suitable for the Chrome Web Store Test instructions field and Mozilla Notes for Reviewers after the publisher provides the private test-access details below.

## Credentials and Access: Publisher Must Supply Privately

**Real credentials are private and are not included in this document or any store/source kit.** The owner has reported preparing accounts in an ignored local file; its contents were not opened or validated during housekeeping. Actual sign-in, channel roles, the store callback and private reviewer access still require verification. Screenshot accounts such as SampleViewer01 and demo_moderator are fictional fixtures, not usable login credentials. Automated-test strings such as test-token are not valid Twitch authorization.

| Required access item | Value / preparation |
| --- | --- |
| Twitch test moderator/broadcaster username | Publisher supplies a dedicated authorized test account in the store's private reviewer field. Do not use a production account. |
| Password and any required verification/2FA procedure | Publisher supplies privately through the store's approved reviewer-access process. Do not publish, commit or place these values in an archive. |
| Twitch application Client ID | Publisher supplies the ID of an application configured with the exact callback of the submitted browser build. Client ID is not a Client Secret. |
| Authorized primary test channel | Publisher identifies a channel where the test account has moderator or broadcaster rights for all moderation tests. |
| Separate test chatter account or arranged test messages | Needed to produce incoming chat and safely test review, deletion and timeouts. Any login details are supplied privately. |
| Optional translation test endpoint | Publisher supplies a working LibreTranslate-compatible HTTPS endpoint accepting the extension's anonymous JSON request, or marks translation unavailable for live testing. No default provider or API-key storage is included. |

Account creation, verification, moderator assignment and store-private credentials are publisher actions. Revoke or rotate temporary reviewer access after review. Missing access must be reported as a review-preparation blocker, not replaced with invented credentials.

## Publisher Preflight: Complete Before Pasting Reviewer Notes

1. **Dedicated Twitch account.** Create an owner-controlled test account through Twitch's official sign-up flow, using an address and any verification method the owner can maintain. Do not use a production account, an invented identity/age, a bought account or an inbox you cannot monitor. Keep its password in the owner's password manager, never in this repository or an assistant conversation.
2. **Authorized primary channel.** Prefer that test broadcaster's own channel, or have the owner of another controlled test channel grant the account moderator privileges. The authorized broadcaster/moderator token still needs the required OAuth scopes. A broadcaster cannot be used as the target of its own ban/timeout test.
3. **Separate ordinary chatter.** Arrange a second controlled account or explicitly allow reviewers to send harmless messages from their own account. The test target must not be the broadcaster, a moderator or another exempt role. Only perform timeout/deletion tests on an agreed test account; do not moderate random users in a public channel.
4. **Exact store callback.** Open https://chrome.google.com/webstore/devconsole and copy the actual item ID of the submitted extension. Chrome extension IDs are 32 lowercase letters in the range a-p. Register `https://<STORE-ITEM-ID>.chromiumapp.org/twitch` in the Twitch application at https://dev.twitch.tv/console/apps. Compare it with the URL displayed by the store-identity extension build. Keep an unpacked-development callback separately if needed; it is not a substitute. Supply the actual Client ID, never a Client Secret. Firefox has its own identity callback: copy/register the URL displayed by that build rather than deriving it from the Chrome item ID or Gecko ID.
5. **Account access from new devices.** Test that both arranged accounts can sign in. A successful local login does not guarantee that Twitch will omit an email/new-device/2FA challenge for a reviewer in another location. Prepare a monitored private contact and a store-approved way to coordinate a fresh challenge if one occurs. Do not publish mailbox passwords, verification codes, recovery codes or an OTP seed, and do not bypass or disable Twitch security checks merely to make review easier. If workable reviewer access cannot be arranged, mark that as a blocker.
6. **Live smoke test before submission.** In the controlled channel, leave automatic timeout off and initially leave auto-approval off. Confirm messages arrive in Multichat and the person appears in All chatters. Pending review only contains people matching enabled review signals, so an arbitrary established/approved/exempt chatter is not guaranteed to appear there. Use an unapproved test chatter and the appropriate enabled signals for the review-queue test; use All chatters to find an already resolved person. Cancel a moderation dialog first, then perform only an agreed short timeout/deletion and restore changed settings.

The final credentials and new-device verification arrangement belong exclusively in Chrome's private Test instructions or AMO's private reviewer notes. Do not put a filled credential block in this public Markdown file, a store-kit ZIP, GitHub Issues, a screenshot or source control. The extension does not obtain credentials from this document or any setup script.

**Twitch application-owner prerequisite:** the official registration guide requires a verified email and 2FA for the account registering the application. This owner can be different from the temporary reviewer account; do not share the owner's production account or its 2FA secrets. At the developer console, use Applications → Register Your Application, add the exact OAuth Redirect URL, complete Twitch's human verification, and obtain the Client ID from Manage. The current extension uses `response_type=token` (implicit grant); select an application registration that supports that flow. Twitch's token guide states that its Public client type is limited to device-code flow and cannot use implicit grant. If the console presents Public/Confidential choices, do not choose Public merely because the extension runs in a browser. The implicit request still needs no Client Secret, and any generated secret must remain outside the extension and review notes.

Official references checked for this preparation: https://dev.twitch.tv/docs/authentication/register-app/ and https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/ . Reconfirm current console labels and flow restrictions when registering; this document does not bypass email, CAPTCHA, new-device or 2FA checks.

## Concise English Reviewer Notes Template

This template is not complete until the owner replaces the access markers in the store's private reviewer field. Leave the second-account password out if the reviewer will use their own ordinary Twitch account. Do not claim that login verification is disabled or that a live test succeeded unless it was actually checked.

```text
Login: this extension requires a Twitch account and a Twitch application Client ID.

Test moderator/broadcaster username: <ENTER_PRIVATELY>
Test account password: <ENTER_PRIVATELY>
Primary authorized test channel: <ENTER_CHANNEL>
Client ID (not a Client Secret): <ENTER_CLIENT_ID>
Registered callback for this store build: <ENTER_VERIFIED_CALLBACK>
Second ordinary test chatter: <ENTER_USERNAME_AND_PASSWORD_PRIVATELY_OR_STATE_REVIEWERS_MAY_USE_THEIR_OWN_ACCOUNT>
New-device/2FA verification arrangement: <ENTER_A_WORKING_PRIVATE_CONTACT_AND_PROCEDURE>

Setup:
1. Open the toolbar popup and use the pin button to open a pinned dashboard tab inside the browser.
2. Review the data-use disclosure. Cancel/Stay offline first; then reopen, check the initially unchecked consent box and choose Allow data use.
3. Open Settings, enter the Client ID and primary test channel, and save.
4. Click Connect in that tab, sign in through Twitch with the test moderator/broadcaster account and approve the requested scopes.
5. Wait for Connected / Monitoring.

Core features:
- From the separate ordinary account, open twitch.tv/<CHANNEL> and send harmless sample messages. They appear in Multichat and in All chatters. Pending review is conditional on enabled account-review signals; it does not list every chatter.
- Find the test chatter, add a note, inspect local history and approve them. Approved messages remain in live chat.
- Open Multichat, add another public channel for read-only observation, and switch Grid / Unified. Do not perform moderation in an unrelated public channel.
- Test timeout or deletion only on the agreed second account/message in the controlled primary channel. Manual actions require confirmation; cancel first, then confirm one arranged test action. Automatic timeout is separate and should remain disabled for this review unless specifically arranged.

Translation is optional and disabled until a compatible HTTPS LibreTranslate endpoint is configured and authorized. No translation server is supplied; this optional test can be skipped. Each translation requires message-level confirmation and sends the selected text to the configured provider, never the Twitch token.

All executable extension code is packaged locally. There are no website content scripts and no publisher-operated backend or telemetry. Records are stored locally; network traffic includes Twitch authentication/API/IRC and, only if configured and confirmed, the optional translation provider. Local storage is not described as application-encrypted.

After testing, restore any changed channel settings and disconnect. The publisher will rotate temporary review passwords or retain the dedicated accounts only for future authorized reviews, and revoke unneeded sessions/authorizations.
```

## Package and Setup

1. Extract the browser-specific store kit. Submit only `packages/chatter-watch-1.0.0-chromium.zip` or `packages/chatter-watch-1.0.0-firefox.zip` through the relevant review workflow. The store kit itself is not an installable extension ZIP. The separately generated Firefox `-unsigned.xpi` is also unsigned submission/development input, not a permanent-install asset.
2. Use desktop Chromium/Chrome 116+ or Firefox 140+. The ordinary Firefox release requires signing for permanent installation; temporary loading is a development check, not proof of signing. No mobile compatibility is claimed.
3. Open the extension and use the pin button for a pinned dashboard tab inside the browser, not a detached window. Repeated clicks reuse the tab. This avoids the native toolbar popup closing while the official OAuth flow runs.
4. Choose **Review data use**, read the data categories, purposes, recipients, retention and withdrawal information, and test **Stay offline** first. No Twitch login/HTTP/IRC or remote avatars should start. Reopen the notice, check its initially unchecked consent box and choose **Allow data use** before enabling Twitch features. OAuth permission alone is not data-use consent.
5. Open Settings. Confirm the displayed browser-specific OAuth redirect is registered in the test Twitch application. A locally unpacked Chrome installation can have a different ID/redirect from the store build. Prepare the final redirect after the item ID is known, before submitting the item for review.
6. Enter the supplied Client ID and primary test channel. Settings save automatically after a valid edit or through Save. No Client Secret is requested.
7. Select Connect in the pinned tab and complete Twitch's official sign-in. Grant the listed scopes: `chat:read`, `moderator:manage:banned_users`, `moderator:manage:warnings`, `moderator:read:followers`, `moderator:manage:chat_settings`, `moderator:manage:chat_messages`.
8. Wait for Connected/Monitoring. Scope authorization is not the same as permission to moderate any channel: the account must have the appropriate role in the target channel.

### Withdraw and Stay Offline

Open Settings (or the browser's extension-options page), then **Data and privacy > Withdraw consent and disconnect**. Verify that session credentials are removed, IRC/API/translation activity stops and remote profile images are replaced by local initials. Search and open old messages/notes through All chatters without new network activity; account edits and sanctions remain blocked. History is deliberately retained, not erased by withdrawal. Reopen the view and verify it stays offline. Re-enable only through the current notice and another affirmative choice, then sign in again if required. To delete retained records, use the browser's storage-clearing tools or uninstall; remove TXT exports separately.

## Core Reading and Review

1. Send harmless messages from the arranged test chatter using Twitch's own chat UI. The extension is a reading/moderation tool, not a general message-composition client.
2. Open Multichat, add up to six unique channels including the primary, switch between Grid and Unified, and detach an individual channel. These views share the connection and settings.
3. Pause and resume; scroll upward one pixel to lock the view, then choose Live/End or reach the bottom to resume. Pin a retained message and verify new messages continue in the live buffer.
4. Observe applicable review signals in the primary-channel dashboard. Add a free-text note or RAID/FRONT PAGE note and approve a test chatter. The person leaves Pending Review and appears in Approved with a reason; their allowed messages remain in live chat.
5. Optional: enable quantity-based auto-approval with N=2 for a controlled new test chatter. Two messages do not qualify by quantity; the third does. Disable other approval conditions for this boundary test. Restore prior settings afterward.
6. Inactivity defaults to 15 minutes. A verified stream transition or configured inactivity makes automatic decisions/dismissals eligible for reevaluation on the next message. Manual approvals persist. Current subscription uses IRC evidence; previous subscription is only locally observed history, not a historical Twitch query.

## Safe Moderation Checks

After an authorized timeout, verify the chatter remains in applicable review/category filters and is always reachable through All chatters. Open History and check the recorded duration, reason, source and date. Change a local note and verify its current/previous values in Notes. Search and page through the directory; these are local observed records, not Twitch's complete historical moderation log. Existing undetailed legacy states are labeled rather than assigned invented dates.

1. Open a ban/timeout dialog for the authorized test chatter and cancel. No sanction should be sent. Verify that the target and channel remain clear while the dialog is open.
2. With the publisher's authorization, confirm a short timeout on the test account. The manual duration is in seconds; never use a real participant for an unarranged sanction. `/srs 1s` also requests confirmation before its one-second timeout.
3. While an agreed timeout is still active, find the person in All chatters and choose **Unban / end timeout**. Cancel first, then confirm removal. The same action can remove an agreed test ban; the record remains accessible after a ban resolves Pending Review. Verify a removal event in History and unchanged approval/notes. A timeout that already expired must report Twitch's error rather than an invented successful removal.
4. Delete one agreed test message using the row's Delete action and confirm. Only that retained message is targeted; the local feed keeps it as a marked deletion ghost. Missing scope or role must report an error rather than success.
5. If testing actual slow mode, record the channel's existing value, make an agreed temporary change, confirm it and restore the original value immediately afterward. Local slow/filter controls do not themselves change Twitch settings.
6. Automatic timeout is separate and initially disabled. Leave it disabled unless testing it has been specifically arranged. A ban has no automatic expiry; no successful ban test is required merely to demonstrate the confirmation UI. Removing a sanction suppresses another automatic timeout in the current review cycle, not indefinitely.

## Optional Translation and Host Permission

1. Open All settings and enter the supplied HTTPS LibreTranslate-compatible endpoint and a two-letter target language. Saving the endpoint must not send chat text.
2. Select Allow translation server and approve only the requested origin. Firefox also requests optional personalCommunications consent.
3. Select Translate for a retained test message. The dialog identifies the destination origin and text. Cancel first and verify no translation request; repeat and confirm to view original plus translation.
4. Network inspection should show a JSON body containing `q`, `source`, `target` and `format`, with no Twitch Authorization/Client-Id headers, cookies or author/channel metadata. The provider will still see network information such as IP and the message text itself.
5. Revoke the origin permission (and optionally Firefox data consent) and confirm that a new request is rejected. Clear the configured URL to disable the feature. JSON responses are displayed as text, not executed as code.

## Preferences, Alerts and Cleanup

Repeated and concurrent Open Multichat/Detach clicks must reuse the matching window, including while it loads. Minimizing and reopening focuses/restores it; closing it permits a later replacement. The dashboard pin action reuses a pinned browser tab, including loading tabs, and restores a minimized browser. At most twelve extension popup windows can be open, including workspace restoration; pinned tabs are not counted. Existing duplicates and unrelated windows are not closed. Check the actual toolbar popup opens with wide content (760px requested, subject to browser limits/scrollbar space), rather than testing only a file opened in a tab. Dashboard tabs and sidebars still fill 280px through wide desktop viewports in both themes.

1. Change language or theme and open another view. Confirm the shared preference appears there and persists after reload; pause, scroll and pins remain window-local.
2. Move/resize a detached window, close and reopen it. The browser may adjust unavailable-monitor positions. The native action popup itself cannot be forced to remain open on focus loss.
3. Enable optional review alerts and use Test sound in an interacted-with view. Alerts are rate-limited to one per ten seconds and routed to one view; taskbar effects depend on the OS/browser. They must not steal focus.
4. Export TXT from a channel or Unified view using harmless sample messages. The file is local and limited to the retained live buffer; do not upload private chat records with a review report.
5. Disconnect Twitch and restore all changed test-channel/settings values. Clear extension storage/IndexedDB or uninstall the test profile to remove stored notes and samples; delete downloaded exports separately.

## Automated Example-Account Scenarios

The automated counterparts use only the fictional identities in [tests/example_accounts.js](../tests/example_accounts.js), not the owner's private account file. No real passwords, tokens or Twitch logins are required, and no messages or sanctions are sent to Twitch. These fixtures do not verify that any similarly named real account exists or has a channel role.

| Fictional identity | Simulated role / evidence |
| --- | --- |
| `demo` / DemoBroadcaster | Primary-channel broadcaster; exempt from automatic review sanctions. |
| `demo_moderator` / DemoModerator | Authorized session actor and a moderation-exempt chatter. |
| `sample_viewer_01` / SampleViewer01 | Two-day-old ordinary account, first-message tag and a recent follow. |
| `sample_viewer_02` / SampleViewer02 | Established ordinary account with a recent follow, but no first-message tag. |
| `demo_regular` / DemoRegular | Established ordinary account without an enabled review signal. |
| `demo_subscriber` / DemoSubscriber | Current subscription evidence, with automatic approval initially disabled. |
| `demo_helper` / DemoHelper | VIP with otherwise applicable review signals; exempt from automatic sanctions. |

[Worker scenarios](../tests/example_accounts_test.js) run with both Chromium and Firefox API shapes. They feed IRC frames through the production worker and inspect its runtime-message responses rather than inserting preapproved database records:

- Pending Review contains only applicable accounts; All chatters and name search retain ordinary and exempt accounts.
- With only quantity approval enabled and N=2, the second message is still pending and the third is approved. All three messages remain in chat.
- Extra-channel messages and broadcaster/moderator/VIP roles cannot trigger automatic account sanctions. An ordinary primary-channel account is the positive control for the explicitly enabled automatic-timeout scenario.
- Unconfirmed actions, a zero-second timeout, a missing OAuth scope and a simulated channel-role denial return errors without adding successful moderation history or dismissing the chatter.
- Removing bans/timeouts records success only after the simulated Twitch response, preserves approval/history and prevents another automatic timeout in that review cycle. Missing confirmation/scope and Twitch 400/403/409 failures leave the account unchanged.

The [browser scenario](../tests/example_accounts_ui_test.js) connects the actual dashboard and Multichat pages to the actual worker, using simulated extension APIs, Twitch HTTP/IRC and IndexedDB. It checks cancel-before-confirm, an exact one-second timeout with a stable target while another chatter speaks, removing that timeout and a later ban through All chatters, note edits and previous values, local history, manual approval without hiding chat, canceled/confirmed deletion with live and pinned ghosts, and history access after disconnect. Worker snapshot/batch timers run normally in this scenario; unexpected browser HTTP(S) requests are blocked.

Run the focused account scenarios from the repository root:

```text
deno task test --filter "example accounts"
deno task test:ui --filter "example accounts"
deno task test:ui:firefox --filter "example accounts"
```

They are also included in the unfiltered test tasks. Browser prerequisites and the `CHATTER_BROWSER=msedge` alternative are described in [README.md](../README.md#development-and-verification). Test dependencies may download on the first run. The browser suite uses isolated headless contexts; it does not sign in through an existing personal browser profile.

On Windows, double-click [build/run-example-account-tests.bat](../build/run-example-account-tests.bat) to run all three focused suites. It requires Deno 2 on PATH and the browsers described above, works from any current directory, honors `CHATTER_BROWSER`, and pauses to keep the results visible. It stops at the first failing suite and preserves its exit code. Pass `--no-pause` when invoking it from an automated command or an existing terminal.

Separately, `deno task test:native` runs [native_popup_test.js](../tests/native_popup_test.js) with the actual extension loaded in an empty headless Chromium profile. It checks native popup sizing and Settings in EN/ES/DE and light/dark themes, pinned-tab reuse, full tab width and the popup sign-in handoff. It requires Playwright's full Chromium; `CHATTER_CHROMIUM_EXECUTABLE` can select an existing compatible binary. This test neither signs in to Twitch nor verifies the publisher's accounts.

For the disclosure/consent boundary, `deno task test --filter privacy` covers absent/stale consent, data actions, session credentials, late responses and failed consent persistence. `deno task test:ui --filter "privacy UI"` and its Firefox counterpart exercise the real worker and views in EN/ES/DE: visible data details, unchecked/declined consent, no early OAuth/avatar requests, explicit acceptance, withdrawal, retained offline history and rejection of stale UI/OAuth results. All Twitch identities, tokens and avatar responses in these checks are fictional.

## Known Evidence Limits

Most automated tests and store screenshots simulate extension APIs and Twitch traffic; the separate native popup test uses actual local Chromium extension APIs without Twitch sign-in. These checks do not establish live authorization/delivery, a deployed translation provider, native multi-monitor behavior or browser suspension guarantees. The current build does not implement its own encryption of local records at rest; the corresponding store-policy compliance question remains unresolved. Do not certify or publish until the owner resolves the recorded blockers in STORE_VALIDATION.md.