# Support

## Public Support URL

https://github.com/yeraysampedro/Twtich-Moderatr/issues

Use the issue tracker for non-sensitive bugs, feature requests and setup questions. The page was publicly accessible on 7 November 2026; a GitHub account is needed to submit an issue. The publisher must monitor this channel; no response-time guarantee is implied.

Homepage: https://github.com/yeraysampedro/Twtich-Moderatr

## Before Reporting

1. Check the extension version and use the correct Chromium or Firefox package.
2. Read the relevant [English](docs/en.md), [Spanish](docs/es.md) or [German](docs/de.md) guide.
3. For OAuth problems, compare the exact redirect shown in Settings with the redirect registered in Twitch Developers. Use a Client ID, never a Client Secret.
4. For denied moderation actions, verify the Twitch scope and the account's moderator/broadcaster privileges in the target channel. Reauthorize when a new scope is required.
5. For translation, verify the selected HTTPS endpoint, its origin permission, Firefox data consent and provider requirements. No default provider or API key is included.

## Information to Include

- Extension version, browser/version and operating system.
- Which view is affected: popup, sidebar, detached window or extension page.
- Reproduction steps, expected behavior and actual behavior.
- Whether it also happens after reloading the extension.
- A redacted error message or screenshot using fictional/test data when possible.

Never post Twitch access tokens, Client Secrets, passwords, private messages, raw storage/IndexedDB dumps or unredacted chat exports. The Client ID is not a secret, but it does not need to be posted publicly to describe most problems. Remove identifying chat details from screenshots.

## Sensitive Security or Privacy Reports

Do not disclose exploit details, credentials or private user data in a public issue. If a private reporting channel is not available in the repository's Security page, post only a request for a private contact route and wait for the maintainer to provide it. No support email or private-reporting URL has been invented here.

## Data Removal

Disconnect Twitch to stop the session. To erase local extension settings, notes and review records, uninstall the extension or clear its extension storage and IndexedDB through browser tools. Delete downloaded TXT files separately. Revoke Twitch authorization in Twitch settings if necessary. See [PRIVACY.md](PRIVACY.md).

## Before Store Publication

The owner must publish this file and the current privacy policy, provide any required account contact details, select the application's license and confirm they will monitor support. These files are local preparation materials until published; creating them does not push to GitHub or submit to either store.