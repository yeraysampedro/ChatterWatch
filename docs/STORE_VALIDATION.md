# Final ZIP Validation

Version 1.3.0. Validated 2026-11-07T20:27:45.254Z.

**Archive/asset checks: PASS. Publication certification: NOT READY.**

## Extension ZIPs

| Browser | Entries | Root manifest | Icon | Screenshots inside | Source match |
| --- | --- | --- | --- | --- | --- |
| chromium | 21 | Manifest V3, browser-specific | 128x128 PNG | 0 (correct: listing uploads are separate) | PASS |
| firefox | 21 | Manifest V3, browser-specific | 128x128 PNG | 0 (correct: listing uploads are separate) | PASS |

## Store Kits

Extract these ZIPs. Upload only the nested package from packages/ as the extension, and the five screenshots separately to the listing.

| Kit | Listing icon | Screenshots | Pixel dimensions | ZIP integrity |
| --- | --- | --- | --- | --- |
| dist/chatter-watch-1.3.0-chromium-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |
| dist/chatter-watch-1.3.0-firefox-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |

## Publication Blockers / Missing Evidence

- Public URL unavailable or unverified (404): https://github.com/yeraysampedro/Twtich-Moderatr/blob/main/PRIVACY.md
- No authorized Twitch reviewer credentials/test Client ID have been supplied. Provide them privately in the store dashboard; none are included in this kit.
- Application-wide distribution license and publisher/account contact declarations require the owner's decision.
- At-rest encryption compliance remains unresolved: this implementation uses browser storage/IndexedDB without its own encryption. Do not certify compliance without resolving the store-policy requirement.

## Warnings

- Extension ZIPs deliberately contain no listing screenshots. Upload the five screenshots separately to each store listing; never upload the entire store kit as the extension.
- Screenshots use fictional demonstration data with simulated extension APIs and do not establish live Twitch authorization or delivery.
- No authenticated store submission, signature, approval or live OS/browser-lifecycle certification has been performed.
- The 128px store artwork includes 16px transparent padding. Runtime icon dimensions are valid; recheck the store's artwork-weight guidance for the packaged original.
- German/Spanish listing copy is supplied, but the current package has no _locales metadata. Verify Chrome's available listing locales before using those translations there.

## Public URLs

- HTTP 200: https://github.com/yeraysampedro/Twtich-Moderatr/issues (publicly reachable)
- HTTP 200: https://github.com/yeraysampedro/Twtich-Moderatr (publicly reachable)
- HTTP 404: https://github.com/yeraysampedro/Twtich-Moderatr/blob/main/PRIVACY.md (unavailable/unverified)

## Package SHA-256

- dist/chatter-watch-1.3.0-chromium.zip: 9a15264ca166d4e6095b155bf55a45183501cc29b35bfebe57983e1ba41340ac
- dist/chatter-watch-1.3.0-firefox.zip: 8ec3fb939a7921ac012cb922ac6ab0aa27c64ec3b9a0b07db00e073c0e9514a6

## Kit SHA-256

- dist/chatter-watch-1.3.0-chromium-store-kit.zip: 0d1caefbecc092e1b96e0e854390d242e861af6d8a959f55ff1bc659356ac3b7
- dist/chatter-watch-1.3.0-firefox-store-kit.zip: f503ff55943652ae7ac10643ae678c3752b30c49ddb5e9a048268e85b5ce15dd

Machine-readable evidence: assets/store/validation.json, metadata.json and inventory.json. Remote-code checks are focused static checks, not a penetration test or a store approval.

## Mozilla Validator

web-ext 9.1.0: exit 0, 0 errors, 0 warnings. Actual output: assets/store/firefox-lint.json (also included inside both kits).

## Source Archive

dist/chatter-watch-1.3.0-source.zip: 25ab5e7c5b63423f6537cd5b4e8591984f97f1f3a0b7078987a06168b3c853c3. 44 allowlisted source/resource/documentation files. Extract and run deno task build; no Twitch credentials are needed to reproduce the runtime packages.

PASS: extracted source archive rebuild matches both runtime ZIP SHA-256 values.
