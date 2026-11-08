# English: Installation and Usage

[Back to README](../README.md) | [Español](es.md) | [Deutsch](de.md)

## 1. Installation Guide

### Environment and Dependencies

- Desktop Chromium/Chrome/Edge 116+ or Firefox 140+. Mobile browser support is not declared.
- A Twitch account and an application registered in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Twitch may require two-factor authentication to register applications.
- Git for version control and publishing. Deno 2 is needed only to generate packages and run tests, not to install or run the packages.
- No Node.js, npm, backend, framework or compilation. Chromium can load `src/` directly, not the repository root; Firefox needs the generated manifest in `dist/firefox/`. Tooling lives in `build/` and Deno tasks run from the project root. `fflate@0.8.2` is used only for packaging, never inside the extension.
- Tests download `@std/assert@1`, `fake-indexeddb@6.2.2` and `playwright@1.56.1`. They are not runtime dependencies of the extension; the lockfile pins resolved versions.

### Load Unpacked in Chromium

1. Extract the Chromium ZIP, use `dist/chromium` after `deno task build`, or clone the repository into a stable directory.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the directory containing `manifest.json`, not `tests` or `docs`.
4. Pin Chatter Watch to the toolbar, open its panel and select **Settings**.
5. Copy the displayed OAuth URL: `https://<EXTENSION-ID>.chromiumapp.org/twitch`.
6. Register this exact OAuth Redirect URL in your Twitch application. Enter its **Client ID**, not a client secret, in the extension and save.
7. Enter the primary channel name, not a full URL, then use **Connect** to sign in and grant the requested permissions.
8. Confirm the connection and open **Multichat** using the toolbar button.

The extension ID and redirect URL may change with the browser, machine, directory or installation method. Copy the current URL from Settings again if authentication stops working. Session tokens do not survive a full browser shutdown; sign in again when required.

### Firefox

1. Extract the Firefox ZIP or run `deno task build` to generate `dist/firefox`.
2. Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` from `dist/firefox/` or the extracted Firefox ZIP, not from `src/`.
3. Open Settings, copy Firefox's displayed OAuth URL and register it in Twitch too. Do not reuse Chromium's `chromiumapp.org` URL. Save the Client ID and connect as described above.

Both browsers provide the popup, sidebar and Multichat windows. Firefox uses background scripts and `sidebarAction`; Chromium uses a service worker and `sidePanel`. References to `chrome.storage` in this guide correspond to `browser.storage` on Firefox.

Temporary installation ends when Firefox closes. For permanent distribution, submit the Firefox ZIP to [Mozilla Add-ons](https://addons.mozilla.org/developers/) as listed or unlisted and distribute the signed XPI returned by Mozilla. Packaging does not sign or publish. Keep the ID `twitch-chatter-watch@extensions.local` for future updates; changing it creates another identity and can change OAuth.

### Permissions

| Scope | Purpose |
| --- | --- |
| `chat:read` | Read channel messages through IRC |
| `moderator:manage:banned_users` | Apply/remove bans and timeouts, plus Multichat's `/srs 1s` button |
| `moderator:manage:warnings` | Warn users |
| `moderator:read:followers` | Recent-follower signal |
| `moderator:manage:chat_settings` | Change actual Twitch slow mode |
| `moderator:manage:chat_messages` | Delete a specific message from Multichat |

Reading additional channels does not require moderator status. Helix moderation actions require the appropriate scope and moderator/broadcaster privileges in the target channel. Current token validation requires `chat:read` and `moderator:manage:banned_users`, plus the follower scope when that signal is enabled. Older tokens may still read chat without the new settings scope: disconnect Twitch and sign in again to grant it before changing slow mode.

Both variants request `storage`, `identity` and `alarms`; only Chromium adds `sidePanel`. Required host access covers Twitch; translation adds optional HTTPS access to the chosen origin. No website scripts or remote code are injected. Firefox declares required `authenticationInfo`/`personallyIdentifyingInfo` for Twitch and optional `personalCommunications` for translation. There is no telemetry or independent backend. Text is sent to a translator only after configuring/authorizing its server and confirming the message. See [Privacy](PRIVACY.md).

### Development, Tests and Build

Install [Deno 2](https://docs.deno.com/runtime/getting_started/installation/) and run from the project root:

```powershell
deno task test
deno task test:build
deno task test:ui
```

These tasks cover rules and a simulated worker, packaging, and views. UI tests need installed Chrome and use simulated extension APIs and Twitch traffic, without visible windows or contacting your account. For Edge, set `$env:CHATTER_BROWSER = 'msedge'`. To use Playwright's downloaded Chromium:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` grants permissions to the test process, not to the extension; run it only against trusted code. Screenshots are saved in the temporary directory printed by the test. No compilation is required. After editing files, click **Reload** in the extensions page and reopen views. In-memory chat history resets.

To run the same tests with headless Firefox:

```powershell
deno run -A npm:playwright@1.56.1 install firefox
deno task test:ui:firefox
```

Run `deno task build` to generate `dist/packages/chatter-watch-<version>-chromium.zip`, `dist/packages/chatter-watch-<version>-firefox.zip` and the `dist/chromium`/`dist/firefox` folders. The allowlist includes local resources, the Lucide 0.468.0 icon license and 16/32/48/64/96/128px branding PNGs, without tests, credentials or user data. The 512px artwork in `src/assets/icons/` is excluded from runtime ZIPs. Screenshots/metadata go to `dist/store/`, store kits to `dist/store-kits/` and source archives to `dist/source/`. Do not edit generated output. If you previously loaded the repository root, select `src/` instead and verify its OAuth redirect; `dist/chromium` and `dist/firefox` keep their existing locations. Store distribution requires separate review and signing.

## 2. Usage Guide

### Language and Autosave

Without a saved preference, the extension uses the browser's interface language. Regional variants map to a supported language: `es-MX` uses Spanish and `de-AT` uses German. Unsupported languages fall back to English. Change it in **Settings > Language**; your choice saves automatically and takes precedence on future openings, including Multichat. Language detection does not query your Twitch profile.

Panel settings, the primary channel and Multichat settings save automatically when a field is committed or 350 ms after typing stops. **Save** buttons remain available, and closing settings attempts to save pending edits. Incomplete or invalid fields do not replace saved configuration; correct the values and displayed errors. If another window changed Multichat, close and reopen Settings before editing again. Named workspaces and real Twitch actions still require their buttons; actual slow mode retains its confirmation.

Valid changes take effect when saved: changing Client ID may sign you out, changing the connected primary channel may reconnect, and enabling automatic timeout activates its moderation rules. Saving an edit is not guaranteed if the browser or computer terminates abruptly before the write completes.

### Version 1.3 Improvements

The initial theme is dark; a saved light choice is preserved. Dashboard and settings use the available width with stable geometry across themes. Only the pending-review total is emphasized; the directory has 25-person pages. **Approved** shows approval reasons without hiding messages from live chat.

The pin button opens or reuses a **pinned tab inside the browser**, not an independent window. It also reuses loading tabs and restores minimized browser windows without closing unrelated views. The native action popup requests 760 x 580 content, subject to browser size limits and scrollbar space; it still closes on focus loss. Use the pinned tab or sidebar to keep the extension open. OAuth started from the popup first moves to the pinned tab; continue sign-in there. Client ID is masked with a reveal option; it is not a Client Secret. **All settings** in Multichat opens the shared configuration in the dashboard tab.

Independent windows remember changed position/size every two seconds, on blur and on pagehide. Reopening uses saved geometry; a single-channel window starts at 520 x 760 without prior geometry. No windows automatically open at browser startup. Named workspaces retain explicit restoration. The OS may adjust missing-monitor coordinates; physical geometry still needs manual verification.

In **Automatic approval**, independently enable OR rules for more than N messages, confirmed follower, current subscriber or locally observed former subscriber. All start disabled; N defaults to 10 and accepts 1-10,000. With N=10, ten messages do not qualify by quantity and eleven do. Subscription history covers only this installation's observations, not Twitch's complete historical record. Unknown data and lookup errors do not approve anyone.

Inactivity defaults to 15 minutes and accepts 1-1,440. On the next message, counts, dismissals and automatic approval reset if that threshold or a verified stream transition occurred. Stream state is polled every minute; network failure is not stream end. Manual approvals and notes persist. A still-valid OR condition can immediately reapprove. Automatic timeout is separate and disabled by default: if its threshold is lower than N, it can act before auto-approval is reached.

Review alerts offer sound, 0-100 volume and window/taskbar attention, initially disabled. Use **Test sound** in an open, interacted-with view. A review does not sound in every window, and alerts are limited to one every ten seconds. Flashing depends on the browser/OS; focus is not stolen. Sound is not guaranteed without an audio-capable open view; the badge provides a visual indicator.

Each row offers **Delete message**, **Translate** and **Pin message**. Deletion requires confirmation, channel privileges and `moderator:manage:chat_messages`; reauthorize Twitch to grant it. Manual sanctions display the target and require confirmation, including `/srs 1s`. Timeout accepts 1-1,209,600 seconds with suggested durations; ban remains permanent. Quick notes append `RAID source_channel` or `FRONT PAGE` without replacing existing text, within a 500-character limit.

For translation, configure an HTTPS LibreTranslate-compatible endpoint (usually `/translate`), a two-letter target language and choose **Allow translation server**. No server or API key is preconfigured: the endpoint must accept the JSON request without a key stored by this extension. Each translation asks for consent showing the origin and text; the original is retained and the result appears inside the extension. Twitch tokens, cookies and author/channel metadata are not forwarded. Review the provider policy: its operator receives the connection/text and may retain them. Revoking permission or clearing the URL disables new translations.

### Multichat Layout and Windows

Since 1.3.1, **Open Multichat** and **Detach** reuse and focus the matching window, even while loading or receiving repeated clicks. The dashboard tab is reused too. A maximum of twelve independent extension popup windows applies, including older detached dashboards and workspace restoration; pinned browser tabs do not count toward that limit. Unrelated windows and old duplicates are not closed; close duplicates from earlier versions manually. Workspaces exceeding available capacity report partial restoration.

### All Chatters and Local History

**Pending review** retains the pending queue. **All chatters** searches locally recorded primary-channel users, including approved, dismissed and moderation-exempt users. New-account, first-message and follower filters use that complete local directory, not just pending users. Search by login/display name and navigate 25-person pages. This is not Twitch's complete viewer list; unreceived messages or overloaded review queues can leave gaps.

A confirmed timeout no longer automatically dismisses the person. A ban resolves the pending item, but its record remains in All chatters and applicable filters. Existing approval keeps its meaning; sanctions do not erase notes or retained messages.

To remove an active ban or timeout, find the person in **All chatters**, choose **Unban / end timeout**, and confirm the displayed user/channel. This uses the existing `moderator:manage:banned_users` scope and requires channel privileges. Only a successful Twitch response records a removal and clears the local dismissal; it does not approve the account or erase its history. Another automatic timeout is suppressed for the same review cycle, but inactivity or a stream transition can start a new cycle. An expired/nonexistent sanction, denied permission or concurrent Twitch update reports an error without a successful history event.

**History** opens Messages, Notes and Moderation. Up to 50 recent messages per person/channel persist across sessions, together with up to 100 combined local events: manual/automatic timeouts and `/srs 1s`, bans, ban/timeout removals, warnings, deletions, manual approvals and note edits. Events include date, reason, duration, source and actor when available. Errors are not recorded as successful sanctions. The current note remains even if older events are evicted.

History comes only from local storage; it cannot recover earlier Twitch timeouts the extension never recorded. Legacy records may show only the latest state without a detailed date. After this version has connected to a channel once, its local records remain readable after disconnecting. Uninstalling or clearing extension storage removes them; there is no time-based automatic purge. See [Privacy](PRIVACY.md).

### Channel Organization

Follower-based auto-approval uses lookups no more than five minutes old, refreshed on later messages when needed. Changes to the same account are processed in order so a delayed update cannot overwrite a manual approval or note.

1. Connect the primary channel from the moderation panel.
2. Open **Multichat**, then **Settings**. Enter additional channel names separated by commas, such as `channel_two, channel_three`; do not enter URLs.
3. Save. The limit is six unique channels including the primary channel. Names contain letters, numbers and underscores; a leading `#` or `@` is optional.
4. Choose 1, 2 or 3 columns. Narrow windows reduce the number of columns automatically.
5. Use **Detach** to open or focus a channel's independent window. **Open Multichat** opens or focuses the existing grid. Move/resize windows using your operating system.
6. Remove an additional channel from Settings to leave it. Its detached window becomes empty. Change the primary channel in the moderation panel.

All views share the connection, settings, language and theme. Layout/filter changes affect all grids; single-channel windows remain one column. Pause and scroll state are local to each view. Concurrent settings edits are revision-checked: if a save is rejected, close and reopen Settings before editing again.

Closing a window does not disconnect IRC. **Disconnect** in the panel stops every shared channel. Window restoration is explicit through **Workspaces**, never automatic at browser startup. Account review, notes, approvals and automatic panel sanctions remain limited to the primary channel. Additional channels support slow mode and the manual `/srs 1s` action when you have privileges there.

### Saved Workspaces and Unified Feed

Open **Workspaces**, enter a name and choose **Save current windows**. This stores channels, columns, filters, highlights and view mode, plus position, size and normal/maximized state of Multichat popup windows. Up to 8 workspaces are supported, with 1-40 character names and 1-12 windows per workspace. Replacing an existing name requires confirmation; saved workspaces can also be deleted.

Select a workspace and choose **Restore**. Matching channel/grid windows are reused and missing windows are opened without requesting focus. Unrelated or surplus windows are neither closed nor moved. The browser or OS may adjust coordinates when monitors change; negative coordinates are preserved for multi-monitor layouts. Supported sizes are 320-7,680 by 300-4,320 pixels. Physical multi-monitor positioning still requires manual verification.

Workspaces persist in `chrome.storage.local` across browser restarts, but contain no credentials, messages, pins or pauses. Restoring does not sign in or change the primary moderation channel. Saved channels are combined with the current primary, subject to the six-channel limit; adjust the primary/configuration first if that limit would be exceeded. Partial restore errors are reported and restoration can be retried without duplicating matching windows.

The **Grid / Unified** selector changes all shared grids. **Unified** merges the latest 1,000 available messages by Twitch timestamp, breaking ties by channel and sequence, with `#channel` tags. It does not wait indefinitely for delayed messages: arrivals are placed by timestamp while within retained history. Single-channel detached windows remain individual. Slow-mode controls stay in individual views so there is no ambiguous multi-channel action.

### Highlights, Pins and One-Second Timeout

In **Settings > Keyword highlights**, add up to 12 rules. Each combines literal text or restricted regex with a color picker; only matching text is colored. The spam filter's regex safety restrictions also apply. For example, `\balert\b|need help` identifies two expressions. The first matching rule wins when ranges overlap. Highlights are independent of spam filtering, shared between views, and apply to loaded history and pinned messages too.

Click a message or press Enter on a focused row to pin it at the top. Each window holds up to 3 pins; a fourth replaces the oldest. Pinning returns the list to live so the rest of the chat keeps moving. Pins are local, survive grid/unified switching within that window, and disappear when it closes or reloads. **Read full message** opens the complete text; **Unpin** releases it. A pin can retain context after its message leaves the live buffer.

Each pin has a **`/srs 1s`** button that asks for confirmation of an exact one-second timeout with reason `/srs`, displaying the author and channel. Canceling sends no sanction. It requires `moderator:manage:banned_users` and moderator/broadcaster privileges. Receiving `/srs` never triggers it automatically. The worker resolves the user from the retained message, not an arbitrary view-supplied ID. If the message has left history, the request is rejected; errors are not presented as success.

### Ghost Messages and Local Export

`CLEARMSG` marks its target and `CLEARCHAT` marks affected user/channel messages as deleted. They remain visible under a red overlay in live history, paused history and pins; nothing is restored on Twitch. Messages never received or already evicted cannot be recovered. Virtualization still recycles off-screen rows and keeps bounded history: retaining a deletion does not keep every DOM node forever.

The download button in each header (**Export TXT**) downloads its current live buffer, up to 1,000 messages, even while you are reading a paused snapshot. It includes ISO time, channel, author, text and `[deleted]` markers. Unified mode exports its combined timeline; pins already evicted from the live buffer are excluded. The file is UTF-8 plain text, with no tokens or server upload. Browser download settings determine the destination. Exports can contain personal data and deleted content: store locally and check authorization before sharing.

### Influx and Spam Settings

| Setting | Default | Range and behavior |
| --- | --- | --- |
| Batch interval | 200 ms | 100-1,000 ms; lower means less latency, higher means fewer updates |
| Local slow mode | 0 s | 0-120 s per user/channel; 0 disables it |
| Spam filter | On | Enables repetition, frequency and pattern checks |
| Repetition | 3 | 2-20; hide from the nth identical normalized text, across authors |
| Frequency | 6 | 2-50; allow up to this many messages per user/window |
| Detection window | 10 s | 1-120 s; fixed window starting at the first event for each key |
| Pattern | Empty | Restricted regex; maximum 240 characters and 12 alternatives |
| Pause on hover | On | Freeze reading while the pointer is over the message list |

Repetition uses NFKC normalization, lowercase and collapsed whitespace. Tracking is isolated per channel; filtered messages also count toward the detection window. Local slow mode remains active when spam filtering is disabled. Saving settings resets internal filter tracking, but not visible totals or retained history. New rules affect only new messages.

Example pattern: `\bpromo\b|buy now|https://`. Supported syntax includes literal text, `|` alternatives, `^`/`$` anchors, `\b` boundaries and the punctuation escapes accepted by the validator. Do not include `/.../` delimiters; matching is Unicode and case-insensitive. Groups, classes, wildcards and quantifiers such as `(a+)+`, `[a-z]`, `.*`, `?` or `{3}` are rejected to prevent expensive backtracking from blocking the worker. `\b` follows JavaScript semantics, not full linguistic word segmentation.

Filters hide messages locally. They do not delete messages on Twitch or trigger warnings, bans or timeouts. Primary-channel review receives messages before visual filtering unless its own queue is saturated. Leave the existing automatic-timeout option disabled until you understand its separate account rules.

### Actual Twitch Slow Mode

At the bottom of a channel, enter **0** to disable or an integer from **3 to 120 seconds** to enable. Click **Apply** and confirm. This calls Helix `PATCH /chat/settings` and changes chat participation for real users, subject to Twitch's own exceptions and rules. It is not a visual throttle. Room status shows the value received from Twitch. HTTP 403 usually means missing channel privileges; a missing scope requires reauthorization.

### Pause, Reading and Shortcuts

- Hovering, manually scrolling upward by at least one pixel or focusing inside the list freezes the view. New messages continue entering a bounded buffer.
- **Pause** adds a manual pause. **Live** clears pauses and jumps to the latest messages. When the pointer is still inside, hover does not pause again until it leaves and re-enters.
- Moving the pointer or receiving messages does not release scroll lock: manually reach the exact bottom or choose Live/End. Reaching the bottom clears scroll pause, but hover, focus or manual pause may still be active.
- The button counter indicates messages received during pause, not an unlimited recoverable backlog. Resume shows the latest retained history; older messages may have been discarded.
- Rows display up to two lines. Click or press Enter to pin one, then use Read full message on its pin. Chat HTML is rendered as text, never executed.

| Shortcut in Multichat | Action |
| --- | --- |
| Space | Toggle pause/live for the hovered, focused or first channel |
| End | Return that channel to live |
| S | Open Settings |
| N | Open or focus the Multichat grid |
| Esc | Close the open dialog |
| Tab, Enter | Navigate/activate controls; Enter pins a message row |

Page shortcuts are ignored when typing in inputs, on buttons/links, with Ctrl/Alt/Meta, or while a dialog is open. They are not operating-system-wide shortcuts.

### Performance, Data and Limits

Each channel keeps up to 1,000 messages and 250 pending entries per batch. Overflow keeps the newest messages and increments **batch omissions**. Spam tracking holds at most 5,000 keys per channel, evicting older keys when full; detection is best effort. The paused snapshot is bounded too. Only visible rows plus a small overscan area are recycled in the DOM. Received text is capped at 2,000 characters per message.

Account review allows 256 outstanding jobs and four concurrent jobs. **Not reviewed** counts messages discarded when this queue is full; do not assume every chatter was examined. An open moderation panel receives grouped state at most every 500 ms. This is not a complete audit log or a promise of a specific FPS on all hardware/load levels.

IRC `CLEARMSG` and `CLEARCHAT` mark ghost messages in live history, paused copies and pins. They do not erase account history already persisted by the moderation panel. Worker history and counters are in memory and disappear when it restarts; an open view may retain its local copy until reconnection, and pins until closed. Twitch IRC does not replay messages missed during disconnection. Heartbeats and reconnect backoff are provided, but uninterrupted delivery during machine sleep is not guaranteed.

Settings live in `chrome.storage.local`; OAuth state lives in `chrome.storage.session`. IndexedDB persists profiles, account history and notes without automatic expiration. **Disconnect Twitch** removes the session, not this stored data. Remove the extension or clear its storage through extension developer tools to erase everything. Never publish tokens or personal chat data.

### Troubleshooting and GitHub

- OAuth failure: check the exact redirect URL and Client ID, reload and sign in again. Never put secrets in project files.
- Waiting for a channel: verify it exists, the primary connection is active, and the network permits `wss://irc-ws.chat.twitch.tv:443`. Notices/errors may contain original English Twitch responses.
- Batch omissions: lower the interval, tune local spam/slow mode or reduce channels. Counters accumulate in memory and are not themselves a disconnection alarm.
- Service unavailable after reload: close obsolete views and open them again.
- UI tests cannot find a browser: install Chrome/Edge or use the Chromium installation command above.

Automated checks use simulated traffic. Real OAuth, channel privileges, actual slow-mode changes, one-second timeouts and physical multi-monitor restoration still require manual verification. Use an authorized account in a channel you control and restore its previous slow-mode setting afterward.

Precise publishing commands are in [README: GitHub](../README.md#publicar-en-github). Create an empty GitHub repository, substitute your account in the remote URL, then run `git init -b main`, `git add .`, `git commit`, `git remote add origin` and `git push -u origin main` as shown there. Review staged files for secrets first. Publishing a repository does not publish to browser stores.