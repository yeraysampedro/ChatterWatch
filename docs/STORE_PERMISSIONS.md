# Permission Justifications - Ready to Paste

Twitch Chatter Watch 1.3.1. English text for the Chrome Web Store Privacy practices fields and Mozilla reviewer notes. Checked against the local manifest and relevant request paths on 7 November 2026. Recheck against the exact ZIP submitted. These explanations are not a security certification or permission to bypass store review.

## Single Purpose

Twitch Chatter Watch provides one dedicated workspace for monitoring and moderating Twitch chat. Its multichat views, chatter review, message organization and optional translation of a selected chat message support that same workflow. It is not a general website reader, browser automation tool or standalone translation service.

## storage

The storage permission saves user-selected settings, language, appearance, chat configuration, named workspaces and remembered window geometry in extension-local storage. It also keeps the Twitch access token, authenticated identity and connection metadata in browser session storage so extension views can share one authenticated chat connection. The extension does not use storage.sync or synchronize these records to a publisher server. Account notes and review history use a separate local IndexedDB database.

## identity

The identity permission uses the browser's getRedirectURL and launchWebAuthFlow APIs for Twitch's official OAuth sign-in. It provides the installation-specific callback and returns the authorization result to the extension without requesting the user's Twitch password or a Client Secret. The resulting session token is used only for the Twitch chat and moderation operations authorized by the user. It is not sent to translation providers.

## sidePanel

The sidePanel permission opens the packaged moderation dashboard in Chrome's side panel, allowing users to keep their moderation view available while working in other tabs. The panel displays extension-owned HTML and the same settings/session as the popup and detached windows. It does not read or inject scripts into the current website. This permission is present only in the Chromium package; Firefox uses its sidebar_action API instead.

## alarms

The alarms permission schedules hourly validation of the existing Twitch session token and one-minute Twitch stream-status checks when monitoring is active. These checks support authentication recovery and distinguish verified stream transitions from temporary chat/network disconnections when deciding whether chatters should be reviewed again. Alarms do not perform analytics, track browsing activity or schedule unrelated background tasks.

## Host Permission - Combined Store Field

Required hosts https://api.twitch.tv/* and https://id.twitch.tv/* support Twitch Helix requests and OAuth token validation for chat moderation. Optional https://*/* supports a user-selected or self-hosted HTTPS LibreTranslate endpoint whose domain is not known in advance. It is not automatically granted for all sites: the user selects an endpoint and explicitly authorizes that origin; each message transfer requires confirmation. The grant is checked before each request, with additional optional data consent on Firefox. There is no website injection, browsing-history access or remote JavaScript/Wasm loading. Responses remain JSON/text, rendered as text; executable code is packaged locally.

## Host Details for Reviewers

| Declaration | Why it is needed | Limits and user control |
| --- | --- | --- |
| Required `https://api.twitch.tv/*` | Twitch Helix account/follower/stream lookups and authorized bans, timeouts, warnings, slow-mode changes and specific-message deletion. | Requests use Twitch authentication and appropriate OAuth scopes; Twitch enforces channel privileges. No arbitrary website is read through this host declaration. |
| Required `https://id.twitch.tv/*` | Validate the Twitch user token associated with the configured Client ID; the browser identity flow also presents Twitch's official authorization page. | No Client Secret is requested. Twitch credentials are not reused for non-Twitch services. |
| Optional `https://*/*` | Permit a user-configured LibreTranslate-compatible HTTPS service, including self-hosted deployments; there is no predetermined translation domain. | The wildcard declares eligible optional origins, not an installation-time all-sites grant. The permission request uses only the configured `${url.origin}/*`; clearing the endpoint disables translation and browser controls can revoke the grant. |
| CSP `wss://irc-ws.chat.twitch.tv:443` | Shared encrypted Twitch IRC connection for the configured channels. | This is a `connect-src` allowance, not an additional wildcard host-permission declaration. No website content script is installed. |

Optional permission requests are still subject to store least-privilege review. A service on a fixed domain would allow a narrower declaration; that is not the current configurable-provider product. Do not describe the optional wildcard as absent or as automatically granted.

## Remote Code Declaration

For this implementation, the supported answer to the store's remote-code question is **No, I am not using remote code**. Use this answer only for the inspected package; update it if the architecture changes. All executable extension JavaScript and the selected Lucide icon data are bundled in the ZIP. Background importScripts loads only the packaged core.js and chat-flow.js. There is no remote script/CDN dependency, downloaded executable module or Wasm component, eval-based response execution, or remotely supplied application logic.

Network access is not remote code execution. Twitch responses are API/IRC data. The optional translation service returns JSON containing a string named translatedText; that string is capped and displayed with textContent along with the original message. It is not assigned to a script element or evaluated. The restricted chat-filter regex is user configuration interpreted by local validation/filter code, not downloaded program code. Profile images, where present, are image resources rather than executable scripts.

The CSP is `script-src 'self'; object-src 'self'; connect-src 'self' https: wss://irc-ws.chat.twitch.tv:443`. The HTTPS connect-src allowance permits network transport to the separately authorized translation origin; it does not permit loading HTTPS scripts or grant additional host access. Do not claim that a CSP alone proves the absence of all vulnerabilities.

## Translation Security and Consent

- No default translation server: the user supplies an HTTPS endpoint without embedded username/password or a fragment and explicitly grants origin access.
- Every translation requires per-message confirmation identifying the destination origin and selected text. Merely saving a URL or granting permission sends no message.
- The worker checks permissions.contains before fetching. Firefox additionally checks optional personalCommunications consent; revoking either required grant prevents further translation.
- The request sends only retained message text, source `auto`, target language and plain-text format. It omits browser cookies, referrer and Twitch authentication headers, rejects redirects and has a timeout.
- The server still sees network metadata, including the requesting IP, and the message itself may contain personal data. Provider retention is outside the extension's control. The feature is not described as local/offline translation.

## Data Disclosure Must Match These Explanations

Permission justifications do not replace the privacy-policy URL or data-use declarations. OAuth/session credentials, Twitch usernames/IDs, locally handled chat samples/notes and optional message translation must be evaluated in the dashboard's authentication, identifying-information and communications categories. Do not select "no data handled" just because the publisher has no telemetry/backend. Firefox's generated manifest declares required authenticationInfo/personallyIdentifyingInfo and optional personalCommunications.

The code uses browser extension storage/session storage and IndexedDB; it does not implement its own at-rest encryption. Do not claim application-level encrypted storage or automatically certify that point. Review current store security wording and the browser/OS protection actually available before making compliance declarations.

## Verification References

- src/manifest.json: required/optional permissions and CSP; it becomes the root manifest.json in the runtime package.
- src/worker.js: apiRequest, validateToken, translateChatMessage, pollStream, token-validation/stream-status alarms.
- src/dashboard.js: official identity flow, side-panel opening and explicit translation-origin permission request.
- src/chat.js and src/view-tools.js: confirmation dialogs and text-only rendering.
- build/build.js: runtime allowlist and Firefox-specific manifest generation.
- tests/worker_test.js: translation consent, retained source text, omitted credentials and rejected redirects; additional moderation/connection regressions.
- tests/ui_test.js: translated HTML-like strings remain text; canceling actions does not send moderation requests.

Policy sources: [Chrome privacy/permissions](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [Chrome remote-hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code), [Mozilla add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/), [Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/). See [STORE_REQUIREMENTS.md](STORE_REQUIREMENTS.md) for dated requirements and unresolved publisher actions.