# Privacy and Data Handling

Applies to ChatterWatch 1.0.0. Updated 8 November 2026.

## Data Use and Your Choice

ChatterWatch uses Twitch account/session information, configured channels, chatter identifiers and profile metadata, message text/timestamps, and moderator notes/actions to provide its chat-reading and moderation workspace. Authentication/API/IRC traffic goes to Twitch. Remote profile images may load from Twitch's image CDN only while data use is allowed. A separately configured translation provider receives only a selected message and language options after its own permission and per-message confirmation; that provider also receives ordinary network information such as the requesting IP address.

Twitch features and new account-history writes are off until you review the in-extension disclosure, select its initially unchecked consent box and choose **Allow data use**. Twitch OAuth authorization, browser permissions, an old signed-in session or closing the notice do not substitute for this choice. The notice identifies data categories, purposes, recipients, storage/retention and withdrawal. The publisher must also prominently show this disclosure in the store listing **before installation**, and publish this current policy; the in-extension notice does not replace those publication steps.

Choose **Stay offline** to read existing local history without Twitch/provider requests, remote avatars or changes to account records. Local display/window preferences and the privacy choice remain available. **Settings > Data and privacy > Withdraw consent and disconnect** stops new Twitch/provider activity, aborts in-flight fetches where possible and removes extension session credentials. Existing profiles, messages, notes and activity remain on the device, read-only, as a separate retention choice. A withdrawal cannot recall data already transmitted or undo a Twitch moderation action.

Consent is recorded locally with its notice version, decision/acceptance time and a local identifier/revision used to prevent stale requests from reactivating a session. Material changes to these data practices require a new notice version and a new affirmative choice; existing grants are not silently migrated. Allowing data use does not itself enable automatic sanctions.

## Purpose

The extension reads Twitch chat, assists account review and performs moderation actions requested by an authorized user. It does not contain advertising, analytics or telemetry and does not operate a publisher-controlled backend. No telemetry does not mean no data transmission: Twitch authentication, chat connections and moderation requests necessarily communicate with Twitch.

## Twitch

After data-use consent, the browser identity API opens Twitch's official authorization flow when you choose to sign in. The extension uses the configured Client ID and session access token to connect to Twitch IRC and Helix. Twitch receives the authentication information, channel/user identifiers and action parameters required for requested operations. Twitch's policies govern its processing. Profile-image URLs returned by Twitch may request images from its CDN while consent is allowed; offline mode displays local initials instead. The extension does not obtain your Twitch password. A Client Secret is neither required nor stored. Masking the Client ID is a visual privacy feature, not encryption.

## Local Storage

- Browser local extension storage: configuration, language, appearance, saved workspaces, remembered window geometry, translation endpoint/target, the data-use consent record, the primary-channel review epoch/last observed stream ID and the last identified review channel for offline access to local history.
- Browser session storage: access token, authenticated identity, the corresponding consent-grant identifier and connection/session metadata. Session credentials are not synchronized between devices.
- IndexedDB: locally observed chatter profiles (including users exempt from automatic review), user/channel identifiers, current notes, up to 50 recent message samples per person/channel across sessions, review outcomes, approval reasons/timestamps and observed subscription evidence. Each record also retains up to 100 local activity events, including confirmed bans/timeouts, their removal, warnings/deletions, manual approvals and note changes, with date, duration, reason, previous/current note and acting moderator identifier when known. There is currently no automatic time-based purge of this database.
- Bounded in-memory buffers: live and paused chat histories, queued batches and local message pins. These are not a durable archive and may disappear when a view or background context closes.

The former-subscriber rule only uses subscription status actually observed locally. It is not a complete historical subscription lookup. Manual approvals are persistent; automatic approvals and dismissals can be reevaluated after configured inactivity or a verified stream transition. Such reevaluation does not delete the underlying notes/profile records or undo a Twitch sanction.

The All chatters directory is a local record search, not a complete Twitch audience or moderation-history service. Historic actions that were never recorded cannot be recovered; older records may contain only an undated latest-action label. Message and activity bounds can evict older entries. Reading local history does not itself send it to Twitch or a translation provider. Disconnecting does not erase it; deletion controls are described below.

## Optional Translation

Translation is off until data use is allowed, the user supplies a compatible HTTPS endpoint, grants access to that origin and, on Firefox, grants optional personal-communications data consent. Each message translation still requires confirmation showing the destination origin and selected text. General data-use consent does not replace these separate controls.

The request sends the selected message text, source language `auto`, target language and plain-text format to that endpoint. It does not send the Twitch token, moderator identity, author/channel metadata, browser cookies or an Authorization header. Network connections inherently expose information such as the requesting IP address to the chosen service. Message text itself may contain personal data. The provider may retain/process requests under its own policy; choose and trust that provider before authorizing it. The publisher does not supply or guarantee a translation server. Automatic redirects are rejected.

No translation request is made just by receiving chat, saving an endpoint or granting a domain permission. Revoking the domain permission or Firefox data permission prevents subsequent requests. Clear the configured endpoint to disable the feature. Remove previously granted site access through the browser's extension-permission controls if it is no longer needed.

## Local Exports, Alerts and Deleted Messages

TXT export creates a local download of the selected live buffer. It can include usernames, timestamps, message text and deletion markers. It does not upload the file. The user controls its destination and any later sharing. Downloaded copies are not removed when the extension is uninstalled.

Sound is generated locally. Attention requests use native browser window APIs or an extension badge, without an external notification service. Sounds may require interaction with an open view; taskbar effects depend on the operating system/browser.

Messages received before Twitch deletion can remain locally as marked ghosts in bounded buffers and pins. This does not restore content on Twitch and cannot recover messages never received or already evicted. Existing account message samples may remain in IndexedDB independently of live-buffer deletion markers.

## Permissions

`storage`, `identity` and `alarms` support local state, OAuth and scheduled validation/status checks. Chromium also uses `sidePanel`. Required host access covers Twitch API/authentication. Optional HTTPS host access is requested only for the chosen translation origin. It is not blanket site access granted on installation. No content scripts are injected into websites. Firefox declares required authentication/identifying data and optional personal communications for translation.

## Limited Use and Security

ChatterWatch's use and transfer of user information follows the Chrome Web Store User Data Policy's Limited Use restrictions. Data is used only for the disclosed chat reading, review and moderation features, including optional user-confirmed translation. It is not sold or transferred for advertising, data-broker services, creditworthiness or lending purposes. The publisher operates no backend for reading users' chat records. Any support access to specific user-provided data requires the user's explicit consent; other access or transfers must remain within the applicable policy's limited security/legal exceptions.

Twitch API/authentication traffic uses HTTPS and IRC uses WSS. Optional translation requires HTTPS. Local extension records use browser-managed storage and IndexedDB; the extension does not implement its own encryption of those records at rest. The publisher must assess the applicable store requirements and actual browser/OS protection before certifying security compliance. This limited-use statement does not claim that every store security check or live-service validation has been completed.

## Control and Removal

Use **Withdraw consent and disconnect** in **Settings > Data and privacy** (also reachable through the browser's extension-options page) to stop data activity and remove session credentials while keeping prior local history read-only. Ordinary chat disconnection is not withdrawal of the stored data-use consent. Uninstall the extension or clear its extension storage/IndexedDB through browser developer tools to delete local records and settings; this is a separate user action, not an automatic consequence of opting out. Revoke the application's authorization in Twitch settings if needed. Delete downloaded exports separately. There is no cross-device synchronization or publisher backup to erase.

## Publisher Contact and Publication

For non-sensitive questions use https://github.com/yeraysampedro/ChatterWatch/issues and follow the redaction guidance in SUPPORT.md. Do not post credentials or private chat records publicly. Before publication the publisher must supply accurate support/identity information, publish this notice at a publicly accessible URL, and verify that the store's privacy declarations match the exact submitted package and any deployed translation service. This repository notice is not evidence that store review or signing has been completed.