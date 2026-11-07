# Final ZIP Validation

Version 1.3.1. Validated 2026-11-07T23:00:58.171Z.

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
| dist/store-kits/chatter-watch-1.3.1-chromium-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |
| dist/store-kits/chatter-watch-1.3.1-firefox-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |

## Publication Blockers / Missing Evidence

- Public URL unavailable or unverified (404): https://github.com/yeraysampedro/Twtich-Moderatr/blob/main/docs/PRIVACY.md
- The publicly published privacy text does not match the local policy, or could not be verified. Publish the current policy and rerun validation; HTTP 200 alone is insufficient.
- Reviewer credentials, the actual store callback and live Twitch access are not validated by this build. Any local account file remains private, unread and excluded from every archive; supply review access only through the store's private fields.
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
- HTTP 404: https://github.com/yeraysampedro/Twtich-Moderatr/blob/main/docs/PRIVACY.md (unavailable/unverified)

## Package SHA-256

- dist/packages/chatter-watch-1.3.1-chromium.zip: 63ebbe73c403d47e4a7d6a9e0592935685b3e691ad185bddeadbb9ae4931396e
- dist/packages/chatter-watch-1.3.1-firefox.zip: b36707895d20964fd4cd323ac93b148c8bd1ba0fa574967cefb254f424cc98d0

## Kit SHA-256

- dist/store-kits/chatter-watch-1.3.1-chromium-store-kit.zip: 2b09728e14f4f5460f6b9a0fa0d2cf2fe5017cb1f395f869ff223bab8078c822
- dist/store-kits/chatter-watch-1.3.1-firefox-store-kit.zip: 901c2ac78bb1e8e735490b6754be188c40a2abdc83616a3cbd686c09afa655bc

Machine-readable evidence: dist/store/validation.json, metadata.json and inventory.json. Remote-code checks are focused static checks, not a penetration test or a store approval.

## Published Privacy Content

BLOCKED: public and local policy text differ or the public content could not be checked.

Source: https://raw.githubusercontent.com/yeraysampedro/Twtich-Moderatr/main/docs/PRIVACY.md

Local SHA-256: 89989bd407db3e1d7070c2382cba4f6b13c0c5af35f05c1dc17679f8cd8ae560

Published SHA-256: unavailable

## Mozilla Validator

web-ext 9.1.0: exit 0, 0 errors, 0 warnings. Actual output: dist/store/firefox-lint.json (also included inside both kits).

## Source Archive

dist/source/chatter-watch-1.3.1-source.zip: 0ff5af967851c846a6e4b61b2b3a291483310c5f4a65151a5bddb4d0b8cce775. 45 allowlisted source/resource/documentation files. Extract and run deno task build; no Twitch credentials are needed to reproduce the runtime packages.

PASS: extracted source archive rebuild matches both runtime ZIP SHA-256 values.
