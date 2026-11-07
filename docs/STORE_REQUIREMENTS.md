# Store Publication Requirements

Reviewed: **2026-11-07**. Target: Twitch Chatter Watch **1.3.0**, Chrome Web Store (CWS) and Mozilla Add-ons (AMO).
Scope: primary-source requirements research only; no submission, signing, package audit, asset generation or authenticated dashboard inspection.
Project behavior comes from [PRIVACY.md](../PRIVACY.md) and [docs/STORE_SUBMISSION.md](STORE_SUBMISSION.md), not an independent runtime verification.
**Required** means an explicit store requirement; **recommended/optional** is not a publication blocker; **publisher action** requires the owner's decision or account.

## Images: Required Versus Recommended

| Store / asset | Status | Verified specification |
| --- | --- | --- |
| CWS store/extension icon | Required | **128x128 PNG**; include the extension icon in the submitted ZIP and supply the listing icon. A larger master does not replace this size. [C1], [C2] |
| CWS icon artwork | Recommended sizing | For square artwork, **96x96 within a 128x128 canvas**, with **16px transparent padding per side**; other shapes have different visual-weight guidance. This is not a requirement to reduce the canvas to 96px. [C1] |
| CWS screenshots | Required | **At least 1, at most 5**; use **1280x800**, square corners, no padding, and actual extension UI. [C1], [C2] |
| CWS alternate screenshot size | Documented discrepancy | The images guide also permits **640x400**; the dashboard guide specifies **1280x800**. Use 1280x800 for this release to satisfy both. [C1], [C2] |
| CWS small promotional tile | Optional | **440x280**, PNG or JPEG; recommended for visibility, explicitly **not mandatory**. [C1], [C2] |
| CWS marquee promotional tile / video | Optional | **1400x560**, PNG or JPEG; a YouTube video is also optional. A marquee image is needed for marquee placement, not ordinary publication. [C1], [C2] |
| AMO listing icon | Listing guidance | The official listing guide describes **32x32 and 64x64**, PNG or JPEG. Retain these derivatives alongside the 128px master; do not assume CWS's 128px rule applies to AMO's uploader. Reconfirm current upload acceptance. [M1] |
| AMO screenshots | Recommended | **1280x800**, otherwise **1.6:1**; the guide gives no practical screenshot-count limit. Up to five is this project's shared asset plan, not an AMO maximum. [M1] |

For this project, prepare one 128px PNG, 32/64px derivatives and 1-5 real UI captures at 1280x800 using fictional accounts/messages. Fictional fixtures are an editorial safety choice, not a quoted store requirement; screenshots must accurately represent the product. [C1]
AMO's visual guide is dated **2019-03-18**: its icon sizes, count language and formatting advice are guidance to reconfirm, not evidence that today's uploader has identical validation. [M1]

## Chrome Listing Fields

- **Required package metadata:** `name` (maximum **75 characters**), version, icons and short `description` (maximum **132 characters**). Manifest metadata cannot be edited in the listing dashboard; changes require a new package/version. [C4], [C9]
- **Listing preparation:** detailed description, primary category and language. Open with the actual purpose, describe existing features and avoid keyword spam. The consulted dashboard guide does not establish a numeric detailed-description limit; confirm the current field counter. [C2]
- **Optional store URLs, required by this project's deliverable:** homepage and support URL. A repository homepage is not automatically a verified publisher/Official URL; that separate field requires site-ownership verification. [C2]
- **Localization caveat:** CWS listing locales correspond to packaged `_locales/LOCALE_CODE` directories. An in-app language selector alone does not establish available listing locales; verify the final package before promising separate ES/EN/DE listings. Promotional tiles cannot be localized. [C2]
- **Publisher action:** choose category, language, distribution and applicable mature-content setting accurately; do not infer a rating or publisher verification from the extension's topic. [C2]

## Chrome Privacy, Purpose And Permissions

**Required:** complete the single-purpose description, permission justifications, remote-code declaration, data-use disclosures/certifications and privacy-policy URL, consistently with the submitted package. [C3]
Suggested single purpose, subject to owner approval: "Read and moderate Twitch chat through a local dashboard and multichat views." Present filtering, review, translation and exports as related chat workflows, not unrelated purposes. CWS requires a narrow, understandable single purpose. [C3]

Suggested justification mapping from the local privacy notice; the final manifest remains authoritative. Each required and optional permission must be minimal and justified. [C3], [C5]

| Permission / access | Justification to adapt to the actual submission |
| --- | --- |
| `storage` | Persist settings/workspaces locally and keep OAuth/session state in session storage. IndexedDB account records are a separate local data store. |
| `identity` | Launch Twitch OAuth and receive the browser-specific authorization redirect. |
| `alarms` | Schedule authentication/status checks and stream-state polling supporting moderation. |
| `sidePanel` | Provide the Chromium side-panel interface; do not claim it is a Firefox permission. |
| Required Twitch hosts | Contact Twitch's authentication and API services for requested account/chat moderation functions; explain each actual host pattern. |
| Optional HTTPS hosts | Reach the user's chosen LibreTranslate-compatible origin only after an origin grant; explain why an arbitrary HTTPS endpoint is configurable and why access is requested per origin. Optional access is still subject to minimum-permission policy. |

- **Required disclosure includes local handling:** authentication, usernames/identifiers, account notes and chat samples do not become exempt because they stay on-device or no publisher backend exists. CWS explicitly requires disclosure and a privacy policy for local-only processing/storage too. [C5], questions 2-7 and 14.
- **Candidate data categories, not completed certifications:** authentication information for OAuth/session credentials; personally identifiable information for usernames/IDs; personal communications for chat messages, including optional translation. Review any overlapping website-content category against the exact data and current form; do not assert collection of browsing history merely because Twitch is accessed. [C3], [C5]
- **Third-party flows:** disclose Twitch OAuth/API/IRC and the optional user-selected translation service. The local notice says translation sends selected text and language/format parameters, not Twitch credentials or author/channel metadata; text can itself contain personal data and network requests expose the client's IP. These claims still need final-package verification. [PRIVACY.md](../PRIVACY.md)
- **Required Limited Use:** restrict use/transfer to the disclosed purpose and permitted exceptions; prohibit sale, unrelated advertising and creditworthiness uses; restrict human access. Publish an affirmative Limited Use compliance statement on the extension's website or a linked policy page. Do not copy the policy's Google-API example as though this extension uses Google APIs. [C7]; [C5], Limited uses.
- **Consent:** where prominent disclosure/consent is required, it must appear in the product before handling the data, not only in the listing or policy. Preserve the described per-message translation confirmation and disclose provider-dependent handling. A store checkbox is not user consent. [C5], question 10.
- **Security and unresolved wording:** the handling policy requires secure handling and modern cryptography in transit; FAQ question 9 additionally says data must be encrypted at rest using strong encryption. The local notice does not establish application-level encryption of local records. Do not claim encrypted storage or certify this point without checking the actual implementation/browser protection and, if necessary, obtaining CWS clarification. [C8], [C5]
- **Do not assume an IRC exemption:** FAQ question 15 discusses clients using user-specified servers, but this product also uses fixed Twitch authentication/API services and local account records. That text is not a verified exemption from this product's disclosures or policy obligations. [C5]
- **Remote-code answer is conditional:** select "No, I am not using remote code" only after verifying all executable JS/WASM is packaged and no response/CDN resource is executed. MV3's prohibition is not waived by filling in a justification. Twitch/translation network data is not itself remote code; JSON/text must remain data, never executable input. [C3], [C6]

## Firefox Listing, Signing And Data

- **Required distribution step:** Mozilla signing is required for installation in Firefox release/beta, including self-distributed/unlisted extensions. A local ZIP or temporary installation is not a signed release. Listed and unlisted submissions remain subject to policy and review; no approval-time guarantee is implied. [M4]
- **Submission:** use a Mozilla/AMO developer account, accept applicable agreement/policies, upload the Firefox package and pass validation. Accepted archive extensions are `.zip`, `.xpi` or `.crx`; the upload maximum is **200 MB**. Choose actual supported desktop platforms, not Android by assumption. [M2]
- **Listing materials:** name, unique AMO slug, summary, longer description, categories (up to two), applicable payment/experimental declarations, license and reviewer notes. Support email and website fields are documented; the guide does not establish that both contact fields are mandatory. [M2]
- **Summary limit:** **250 characters** in the official listing guide. It calls the longer description practically unlimited, not a guaranteed current numeric maximum; verify field limits in the live form. Keep copy concise and feature-accurate. [M1]
- **Support:** homepage, support website and support email are recommended; the guide recommends providing all three where possible, at least considering email. Do not turn that recommendation into a verified mandatory public-email rule. The publisher must supply any requested account contact details personally. [M1], [M2]
- **License:** select the project's actual distribution license in AMO. Publishing source is not equivalent to granting an open-source license. The local checklist says the included Lucide license covers selected third-party icons only; it is not the application's license. Owner decision remains unresolved. [M2], [M4]; [local checklist](STORE_SUBMISSION.md)
- **Privacy policy:** the submission guide requires a policy whenever data leaves the user's device, describing what is sent and why; provide it in the listing's policy field, not just as an unverified external link. Built-in data consent does not establish an exemption from that documented listing requirement. [M1], [M2]
- **Built-in data consent:** all **new extensions since 2025-11-03** must declare whether/what they collect or transmit. Supported from **desktop Firefox 140**, Android 142. Keeping desktop minimum 140 avoids the older-desktop custom-consent fallback, provided the actual package uses built-in consent. [M3]
- **Manifest taxonomy:** declare transmitted data under `browser_specific_settings.gecko.data_collection_permissions`. Required data is accepted at install or installation is cancelled; optional data is not granted by default and must be requested through a user action, with later revocation available. [M3]
- **Project mapping to verify:** the local notice declares required `authenticationInfo` and `personallyIdentifyingInfo` for Twitch, optional `personalCommunications` for translation. Do not declare `none`: Twitch credentials/identifiers already leave the browser. Confirm every outgoing operation against the taxonomy, not only telemetry. [M3], [M5]; [PRIVACY.md](../PRIVACY.md)
- **No blanket implicit consent:** continuous/background connections are not the self-evident single-use exception; the taxonomy also excludes authentication, identifying information and personal communications from that exception. Retain explicit consent and optional-translation controls. [M3], [M5]
- **Technical review:** least-privilege permissions, self-contained executable code, no remote code execution, encrypted remote transport and reviewable source are required. If preprocessing/minification/bundling generates submitted files, supply matching source and reproducible build instructions; native JavaScript is not a blanket exemption for generated artifacts. Prepare sources/build details for the generated Firefox package rather than asserting none can be requested. [M5], [M6]
- **Reviewer access:** supply testing instructions and, where accounts are needed, suitable test credentials privately to reviewers. The owner must arrange an authorized Twitch test setup; never put reusable credentials in screenshots, public docs or the repository. [M5], section 3; [C8].

## Publisher Actions And Evidence Limits

1. Approve descriptions, identity, categories, ratings, locales and distribution choices in the actual dashboards; satisfy account verification/agreements there. No logged-in dashboard was accessed in this research. [C2], [C4], [M2]
2. Use the supplied project homepage **https://github.com/yeraysampedro/Twtich-Moderatr** and support candidate **https://github.com/yeraysampedro/Twtich-Moderatr/issues**. Their prior public retrieval is supplied task context, not a new verification here; confirm ownership and willingness to monitor Issues. Optional store URL status does not remove this project's support-URL deliverable. [C2], [M1]
3. Choose and publish an accessible privacy-policy URL; add an accurate Limited Use statement and real contact route. **No privacy publication URL, contact email, license selection or compliance certification has been invented.** [C3], [C7], [M2]
4. Choose the application's license and confirm rights to branding/assets; preserve third-party notices. A public GitHub repository does not decide the license. [M2], [M4]; [local checklist](STORE_SUBMISSION.md)
5. Verify the final ZIP's hosts, permissions, data flows, absence of executable remote code, encryption claims and consent/revocation behavior; then complete certifications and arrange private reviewer access. This note is not a code/security audit. [C3], [C8], [M3], [M5]
6. Submit through the owner's accounts; obtain the signed Firefox XPI and actual review outcomes. Generated bundles and screenshots alone do not prove publication or permanent-install success. [M2], [M4]
7. Recheck policies at submission: Mozilla's current policy page announces changes effective **2026-12-01**. They are not treated here as effective on 2026-11-07. [M5]

**Conflicts/unknowns:** CWS 640x400 versus 1280x800 wording; AMO's dated 32/64px guidance; unverified current dashboard validators/long-description limits; CWS at-rest encryption wording; final package compliance and publisher decisions remain open as noted above.
**Retrieval issue:** `https://developer.chrome.com/docs/webstore/program-policies/user-data` returned **HTTP 404**. The official FAQ and its linked Handling Requirements/Limited Use pages below were retrieved instead. All other cited source pages were retrieved successfully; no GUI applications were launched.

## Primary Sources

All URLs below were reviewed on **2026-11-07**; page dates are editorial labels, not guarantees that every field reflects the current dashboard.

[C1]: https://developer.chrome.com/docs/webstore/images
[C2]: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
[C3]: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
[C4]: https://developer.chrome.com/docs/webstore/prepare
[C5]: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
[C6]: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
[C7]: https://developer.chrome.com/docs/webstore/program-policies/limited-use
[C8]: https://developer.chrome.com/docs/webstore/program-policies/data-handling
[C9]: https://developer.chrome.com/docs/extensions/reference/manifest/name
[M1]: https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/
[M2]: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
[M3]: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
[M4]: https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
[M5]: https://extensionworkshop.com/documentation/publish/add-on-policies/
[M6]: https://extensionworkshop.com/documentation/publish/source-code-submission/

- [C1] Images; [C2] Listing dashboard; [C3] Privacy dashboard; [C4] Package preparation; [C9] Manifest name.
- [C5] User Data FAQ; [C6] Remote-hosted code; [C7] Limited Use; [C8] Handling Requirements.
- [M1] Appealing listing (**2019-03-18**); [M2] Submitting an add-on (**2026-05-10**); [M3] Built-in data consent (**2026-10-18**).
- [M4] Signing/distribution (**2024-08-21**); [M5] Add-on Policies (**2026-10-20**, announces December change); [M6] Source submission (footer **2019-06-10**, body contains newer environment details).