# Store Submission Checklist

Version 1.3.1. This checklist supports Chrome Web Store and Mozilla Add-ons (AMO); it does not submit or publish anything.

## Prepared Materials

- [STORE_LISTING.md](STORE_LISTING.md): product name, descriptions in EN/DE/ES, live Support URL, screenshot order and localized captions.
- [STORE_PERMISSIONS.md](STORE_PERMISSIONS.md): strict single purpose and copy-ready `storage`, `identity`, `sidePanel`, `alarms` and host-permission justifications; remote-code explanation and security limits.
- [STORE_TESTING.md](STORE_TESTING.md): detailed reviewer steps and a checklist of credentials/access the publisher must supply privately. No working credentials are included in public documents or packages.
- [STORE_REQUIREMENTS.md](STORE_REQUIREMENTS.md): dated official sources and required-versus-optional store fields.
- `dist/store/`: 128px icon, Firefox 32/64px derivatives, five 1280x800 screenshots per browser, optional promotional images, asset hashes and generated metadata.
- [STORE_VALIDATION.md](STORE_VALIDATION.md): generated analysis of the actual extension ZIPs and the two store-kit ZIPs, including publication blockers. A structural PASS is not a store approval.

Run `deno task store:assets` to capture both browser sets, rebuild the extension packages, export metadata and create `dist/store-kits/chatter-watch-1.3.1-chromium-store-kit.zip` and `dist/store-kits/chatter-watch-1.3.1-firefox-store-kit.zip`. Each kit has exactly one listing icon of 128x128 and five 1280x800 screenshots. Extract the kit before uploading: only the ZIP inside `packages/` is the installable extension. Captures are separate listing uploads and intentionally absent from the extension ZIP itself. `--capture-only` regenerates images; `--bundle-only` revalidates existing images/packages and rebuilds kits.

The verified support route is https://github.com/yeraysampedro/Twtich-Moderatr/issues . Publish the current policy and support documents to the repository before submitting their URLs; this command does not commit, push or publish them.

## Prepare the Release

Before filling private reviewer access fields, complete the Publisher Preflight in [STORE_TESTING.md](STORE_TESTING.md): actual store item ID/callback, owner-controlled test broadcaster, ordinary test chatter, a compatible Twitch OAuth app and a workable new-device/2FA arrangement. These account operations are not automated by the build. Do not copy fictional screenshot accounts or test-token strings into a real submission.

The public privacy check compares the raw published policy with the local policy after normalizing line endings. A reachable GitHub page alone is no longer sufficient: a mismatch is reported as a publication blocker. Do not remove that blocker by changing a checkbox or claiming that the current text is already public.

1. Run the core/worker, Chromium UI, Firefox UI and build tests described in the README.
2. Run `deno task build`. Use the versioned Chromium ZIP for Chrome Web Store and the Firefox ZIP for AMO. Both have the manifest at their root and include the selected Lucide icons and license.
	For a source-review request, extract the matching source ZIP supplied in the store kit and run `deno task build` from its root using Deno 2. Runtime files are copied without transpilation; build.js creates the browser-specific manifests and ZIPs. The lockfile pins packaging/test dependencies. Source review does not require Twitch credentials or executing moderation actions.
3. Perform authorized-channel smoke tests for OAuth, chat delivery, manual deletion, confirmations, timeout, stream transitions and permission failures. Use a test channel and restore any modified slow-mode settings.
4. Verify native browser lifecycle, geometry restoration, attention behavior and audio restrictions. Configure a test translation endpoint only if demonstrating translation.
5. Confirm the exact package version, stable Firefox ID, extension identity and corresponding Twitch redirect URL. Never submit exported conversations, credentials or private notes.

## Listing and Privacy

- Describe actual 1.3.1 behavior using IMPLEMENTATION.md. Superseded v0.1 planning PDFs were removed; no planning document or generated report constitutes platform certification.
- Publish PRIVACY.md at a public URL and provide accurate publisher support/identity details. Complete the store's data and permission declarations for the submitted build.
- Resolve the local at-rest-encryption policy question documented in STORE_REQUIREMENTS.md/STORE_PERMISSIONS.md before security certification. The code uses browser storage and IndexedDB without its own encryption; do not label it encrypted without evidence.
- Explain required Twitch host access and storage/identity/alarms/sidePanel. Optional HTTPS access is granted per configured translation origin, not automatically for all websites.
- Firefox declares required authenticationInfo/personallyIdentifyingInfo and optional personalCommunications for translation. Do not claim that chat text is never transmitted if the optional translator is enabled.
- Choose the project's distribution/license terms as the owner. The included LICENSE.lucide covers the selected third-party icons only; it does not license the entire application.
- Supply appropriate screenshots and reviewer instructions. Do not place reusable account secrets or access tokens in public documents or the repository.
- Original branding PNGs are in `src/assets/icons/`. Use the 128px icon where requested and the 512px artwork for high-resolution listing materials, checking the store's current asset requirements. Runtime packages include the 16/32/48/64/96/128px variants; the 512px artwork stays outside those packages. These are separate from the licensed Lucide UI-action icons.

## Reviewer Workflow

1. Load the appropriate package. Open the dashboard and pin it into a persistent extension window.
2. Register the displayed browser-specific redirect URL in an authorized Twitch application. Enter its Client ID, then sign in from the persistent window and grant the requested scopes.
3. Connect a test channel. Open Multichat and verify a retained message remains visible after local approval. Review the separate Approved list and optional approval settings.
4. Test manual moderation only on authorized test users/messages. Cancel first to verify no action is sent; then confirm an agreed test action. Deleting a message requires moderator:manage:chat_messages.
5. For translation, configure an HTTPS LibreTranslate-compatible endpoint, authorize its origin (and Firefox data consent), and confirm sending one test message. The endpoint must accept the request format without a separately stored API key.
6. Enable optional review alerts and test sound in an interacted-with view. Taskbar attention is best-effort and must not steal focus.

## External Steps

Developer accounts, publisher details, public policy/support URLs, actual Twitch authorization, translation-server deployment, store review and Firefox signing require the publisher's own account and decisions. No credentials, payments or publishing actions are performed by the build. Firefox temporary loading is not permanent installation; obtain the signed XPI from Mozilla for distribution. Chrome review/publication is a separate dashboard process.

Housekeeping preserves existing source work and private account data. When authorized by the owner, it removes superseded generated releases/drafts and retains only final artifacts; it does not authorize committing, force-pushing, deleting accounts or disabling authentication checks. Store review passwords belong only in approved private storage and the store's private fields, never in versioned code, source ZIPs, screenshots, Issues or an assistant conversation. A local login test cannot guarantee the absence of a challenge for a reviewer in another location.

Official guidance: https://developer.chrome.com/docs/webstore/publish/ and https://extensionworkshop.com/documentation/publish/submitting-an-add-on/ . Recheck current policy at submission time.