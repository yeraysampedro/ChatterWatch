# Final ZIP Validation

Version 1.0.0. Validated 2026-11-08T18:46:16.138Z.

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
| dist/store-kits/chatter-watch-1.0.0-chromium-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |
| dist/store-kits/chatter-watch-1.0.0-firefox-store-kit.zip | Exactly one 128x128 PNG | Exactly 5 | All 1280x800, opaque | PASS |

## Publication Blockers / Missing Evidence

- The publicly published privacy text does not match the local policy, or could not be verified. Publish the current policy and rerun validation; HTTP 200 alone is insufficient.
- Reviewer credentials, the actual store callback and live Twitch access are not validated by this build. This tool never reads the local account file and excludes it from every archive; only `deno task store:submission` reads it, to write the Git-ignored private reviewer notes for the stores' private fields.
- Publisher/account contact declarations (for example the AMO support email) require the owner's decision.
- At-rest encryption compliance remains unresolved: this implementation uses browser storage/IndexedDB without its own encryption. Do not certify compliance without resolving the store-policy requirement.

## Warnings

- Extension ZIPs deliberately contain no listing screenshots. Upload the five screenshots separately to each store listing; never upload the entire store kit as the extension.
- Screenshots use fictional demonstration data with simulated extension APIs and do not establish live Twitch authorization or delivery.
- No authenticated store submission, signature, approval or live OS/browser-lifecycle certification has been performed.
- The 128px store artwork includes 16px transparent padding. Runtime icon dimensions are valid; recheck the store's artwork-weight guidance for the packaged original.
- German/Spanish listing copy is supplied, but the current package has no _locales metadata. Verify Chrome's available listing locales before using those translations there.

## Public URLs

- HTTP 200: https://github.com/yeraysampedro/ChatterWatch/issues (publicly reachable)
- HTTP 200: https://github.com/yeraysampedro/ChatterWatch (publicly reachable)
- HTTP 200: https://github.com/yeraysampedro/ChatterWatch/blob/main/docs/PRIVACY.md (publicly reachable)

## Package SHA-256

- dist/packages/chatter-watch-1.0.0-chromium.zip: 6c6e153f37badce3b48750720631a341c4f27c13977c736e668789f12e8b47a8
- dist/packages/chatter-watch-1.0.0-firefox.zip: 82b78b7244f2ea30a28457812277e246c632413125c83a0adf254eca9e0fc851

## Kit SHA-256

- dist/store-kits/chatter-watch-1.0.0-chromium-store-kit.zip: 1bd8c6751e5daeeaa85171a28a53bdf9e75cb6549f60d027017bd0487c8cbc58
- dist/store-kits/chatter-watch-1.0.0-firefox-store-kit.zip: 4dc6076f1316a62110a52b5d4c20610ef5d2c1066f6eb8c0363eb8187fac147e

Machine-readable evidence: dist/store/validation.json, metadata.json and inventory.json. Remote-code checks are focused static checks, not a penetration test or a store approval.

## Published Privacy Content

BLOCKED: public and local policy text differ or the public content could not be checked.

Source: https://raw.githubusercontent.com/yeraysampedro/ChatterWatch/main/docs/PRIVACY.md

Local SHA-256: fd0958d322eff706026aa43d0c0780309f7a31afcc8e7bfa11960a7144307190

Published SHA-256: 7a0dc8668a33345cd02e5931fbb4165910047d45f09763603bfba2dcf781b28a

## Mozilla Validator

web-ext 9.1.0: exit 0, 0 errors, 0 warnings. Actual output: dist/store/firefox-lint.json (also included inside both kits).

## Source Archive

dist/source/chatter-watch-1.0.0-source.zip: 9c0cde4030f052878643423d48a381e695054c1ca184d2fd7be07cde35d8b84c. 63 allowlisted source/resource/documentation files. Extract and run deno task build; no Twitch credentials are needed to reproduce the runtime packages.

PASS: extracted source archive rebuild matches both runtime ZIP SHA-256 values.
