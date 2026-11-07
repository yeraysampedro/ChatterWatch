# Privacy and Data Handling

Applies to Twitch Chatter Watch 1.3.0. Updated 7 November 2026.

## Purpose

The extension reads Twitch chat, assists account review and performs moderation actions requested by an authorized user. It does not contain advertising, analytics or telemetry and does not operate a publisher-controlled backend. No telemetry does not mean no data transmission: Twitch authentication, chat connections and moderation requests necessarily communicate with Twitch.

## Twitch

The browser identity API opens Twitch's official authorization flow. The extension uses the configured Client ID and session access token to connect to Twitch IRC and Helix. Twitch receives the authentication information, channel/user identifiers and action parameters required for requested operations. Twitch's policies govern its processing. A Client Secret is neither required nor stored. Masking the Client ID is a visual privacy feature, not encryption.

## Local Storage

- Browser local extension storage: configuration, language, appearance, saved workspaces, remembered window geometry, translation endpoint/target and the primary-channel review epoch/last observed stream ID.
- Browser session storage: access token, authenticated identity and connection/session metadata. Session credentials are not synchronized between devices.
- IndexedDB: reviewed-account profiles, user/channel identifiers, notes, recent message samples, review outcomes, approval reasons/timestamps and observed subscription evidence. There is currently no automatic time-based purge of this database.
- Bounded in-memory buffers: live and paused chat histories, queued batches and local message pins. These are not a durable archive and may disappear when a view or background context closes.

The former-subscriber rule only uses subscription status actually observed locally. It is not a complete historical subscription lookup. Manual approvals are persistent; automatic approvals and dismissals can be reevaluated after configured inactivity or a verified stream transition. Such reevaluation does not delete the underlying notes/profile records or undo a Twitch sanction.

## Optional Translation

Translation is off until the user supplies a compatible HTTPS endpoint, grants access to that origin and, on Firefox, grants optional personal-communications data consent. Each message translation requires confirmation showing the destination origin and selected text.

The request sends the selected message text, source language `auto`, target language and plain-text format to that endpoint. It does not send the Twitch token, moderator identity, author/channel metadata, browser cookies or an Authorization header. Network connections inherently expose information such as the requesting IP address to the chosen service. Message text itself may contain personal data. The provider may retain/process requests under its own policy; choose and trust that provider before authorizing it. The publisher does not supply or guarantee a translation server. Automatic redirects are rejected.

No translation request is made just by receiving chat, saving an endpoint or granting a domain permission. Revoking the domain permission or Firefox data permission prevents subsequent requests. Clear the configured endpoint to disable the feature. Remove previously granted site access through the browser's extension-permission controls if it is no longer needed.

## Local Exports, Alerts and Deleted Messages

TXT export creates a local download of the selected live buffer. It can include usernames, timestamps, message text and deletion markers. It does not upload the file. The user controls its destination and any later sharing. Downloaded copies are not removed when the extension is uninstalled.

Sound is generated locally. Attention requests use native browser window APIs or an extension badge, without an external notification service. Sounds may require interaction with an open view; taskbar effects depend on the operating system/browser.

Messages received before Twitch deletion can remain locally as marked ghosts in bounded buffers and pins. This does not restore content on Twitch and cannot recover messages never received or already evicted. Existing account message samples may remain in IndexedDB independently of live-buffer deletion markers.

## Permissions

`storage`, `identity` and `alarms` support local state, OAuth and scheduled validation/status checks. Chromium also uses `sidePanel`. Required host access covers Twitch API/authentication. Optional HTTPS host access is requested only for the chosen translation origin. It is not blanket site access granted on installation. No content scripts are injected into websites. Firefox declares required authentication/identifying data and optional personal communications for translation.

## Limited Use and Security

Twitch Chatter Watch's use and transfer of user information follows the Chrome Web Store User Data Policy's Limited Use restrictions. Data is used only for the disclosed chat reading, review and moderation features, including optional user-confirmed translation. It is not sold or transferred for advertising, data-broker services, creditworthiness or lending purposes. The publisher operates no backend for reading users' chat records. Any support access to specific user-provided data requires the user's explicit consent; other access or transfers must remain within the applicable policy's limited security/legal exceptions.

Twitch API/authentication traffic uses HTTPS and IRC uses WSS. Optional translation requires HTTPS. Local extension records use browser-managed storage and IndexedDB; the extension does not implement its own encryption of those records at rest. The publisher must assess the applicable store requirements and actual browser/OS protection before certifying security compliance. This limited-use statement does not claim that every store security check or live-service validation has been completed.

## Control and Removal

Disconnect Twitch to stop the shared connection and remove the current session through the panel's Disconnect Twitch command. This does not erase notes or account records. Uninstall the extension or clear its extension storage/IndexedDB through browser developer tools to remove local extension data. Revoke authorization in Twitch settings if needed. Delete downloaded exports separately. There is no cross-device synchronization or publisher backup to erase.

## Publisher Contact and Publication

For non-sensitive questions use https://github.com/yeraysampedro/Twtich-Moderatr/issues and follow the redaction guidance in SUPPORT.md. Do not post credentials or private chat records publicly. Before publication the publisher must supply accurate support/identity information, publish this notice at a publicly accessible URL, and verify that the store's privacy declarations match the exact submitted package and any deployed translation service. This repository notice is not evidence that store review or signing has been completed.