# English: Installation and Usage

[Back to README](../README.md) | [Español](es.md) | [Deutsch](de.md)

## 1. Installation Guide

### Environment and Dependencies

- An up-to-date desktop Chrome or Edge supporting Chrome 116+ extension APIs. Firefox and mobile browsers are not supported.
- A Twitch account and an application registered in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Twitch may require two-factor authentication to register applications.
- Git for version control and publishing. Deno 2 is needed only for development tests, not for running the extension.
- No Node.js, npm, backend, framework, custom WebSocket server or build step. The browser runs the root files directly.
- Tests download `@std/assert@1`, `fake-indexeddb@6.2.2` and `playwright@1.56.1`. They are not runtime dependencies of the extension; the lockfile pins resolved versions.

### Load Unpacked

1. Download or clone the repository into a stable directory.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the directory containing `manifest.json`, not `tests` or `docs`.
4. Pin Chatter Watch to the toolbar, open its panel and select **Settings**.
5. Copy the displayed OAuth URL: `https://<EXTENSION-ID>.chromiumapp.org/twitch`.
6. Register this exact OAuth Redirect URL in your Twitch application. Enter its **Client ID**, not a client secret, in the extension and save.
7. Enter the primary channel name, not a full URL, then use **Connect** to sign in and grant the requested permissions.
8. Confirm the connection and open **Multichat** using the toolbar button.

The extension ID and redirect URL may change with the browser, machine, directory or installation method. Copy the current URL from Settings again if authentication stops working. Session tokens do not survive a full browser shutdown; sign in again when required.

### Permissions

| Scope | Purpose |
| --- | --- |
| `chat:read` | Read channel messages through IRC |
| `moderator:manage:banned_users` | Existing panel ban/timeout actions |
| `moderator:manage:warnings` | Warn users |
| `moderator:read:followers` | Recent-follower signal |
| `moderator:manage:chat_settings` | Change actual Twitch slow mode |

Reading additional channels does not require moderator status. Helix moderation actions require the appropriate scope and moderator/broadcaster privileges in the target channel. Current token validation requires `chat:read` and `moderator:manage:banned_users`, plus the follower scope when that signal is enabled. Older tokens may still read chat without the new settings scope: disconnect Twitch and sign in again to grant it before changing slow mode.

Browser permissions are `storage`, `identity`, `sidePanel` and `alarms`. Host access is limited to Twitch API/authentication, with TLS IRC allowed by the CSP. The extension does not inject scripts into websites or send chat to an independent backend.

### Development, Tests and Build

Install [Deno 2](https://docs.deno.com/runtime/getting_started/installation/) and run from the project root:

```powershell
deno task test
deno task test:ui
```

The first task tests rules, bursts and a simulated worker. The second needs an installed Chrome and runs headless, without visible windows. Chrome APIs and Twitch traffic are simulated; your Twitch account is not contacted. For Edge, set `$env:CHATTER_BROWSER = 'msedge'`. To use Playwright's downloaded Chromium:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` grants permissions to the test process, not to the extension; run it only against trusted code. Screenshots are saved in the temporary directory printed by the test. No compilation is required. After editing files, click **Reload** in the extensions page and reopen views. In-memory chat history resets.

Optional distribution ZIP in PowerShell:

```powershell
Compress-Archive -Path manifest.json,core.js,worker.js,dashboard.html,dashboard.css,dashboard.js,chat.html,chat.css,chat.js,chat-flow.js,virtual-chat.js -DestinationPath chatter-watch.zip -Force
```

The archive contains only runtime files. Load unpacked uses the folder, not this ZIP. Store publication requires a separate submission and review.

## 2. Usage Guide

### Multichat Layout and Windows

1. Connect the primary channel from the moderation panel.
2. Open **Multichat**, then **Settings**. Enter additional channel names separated by commas, such as `channel_two, channel_three`; do not enter URLs.
3. Save. The limit is six unique channels including the primary channel. Names contain letters, numbers and underscores; a leading `#` or `@` is optional.
4. Choose 1, 2 or 3 columns. Narrow windows reduce the number of columns automatically.
5. Use **Detach** on a channel to open a native single-channel window. **New window** opens another complete grid. Move/resize windows using your operating system.
6. Remove an additional channel from Settings to leave it. Its detached window becomes empty. Change the primary channel in the moderation panel.

All views share the connection, settings, language and theme. Layout/filter changes affect all grids; single-channel windows remain one column. Pause and scroll state are local to each view. Concurrent settings edits are revision-checked: if a save is rejected, close and reopen Settings before editing again.

Closing a window does not disconnect IRC. **Disconnect** in the panel stops every shared channel. Window positions and windows themselves are not restored automatically after browser shutdown. Account review, notes, approvals and panel sanctions remain limited to the primary channel; additional chats are read-only except for their slow-mode control.

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

- Hovering, manually scrolling upward or focusing inside the list freezes the view. New messages continue entering a bounded buffer.
- **Pause** adds a manual pause. **Live** clears pauses and jumps to the latest messages. When the pointer is still inside, hover does not pause again until it leaves and re-enters.
- Scrolling to the bottom clears the scroll pause, but hover, focus or manual pause may still be active.
- The button counter indicates messages received during pause, not an unlimited recoverable backlog. Resume shows the latest retained history; older messages may have been discarded.
- Rows display up to two lines. Click a row or press Enter while it is focused to inspect the complete received text. Chat HTML is rendered as text, never executed.

| Shortcut in Multichat | Action |
| --- | --- |
| Space | Toggle pause/live for the hovered, focused or first channel |
| End | Return that channel to live |
| S | Open Settings |
| N | Open another grid window |
| Esc | Close the open dialog |
| Tab, Enter | Navigate/activate controls; Enter opens a message row |

Page shortcuts are ignored when typing in inputs, on buttons/links, with Ctrl/Alt/Meta, or while a dialog is open. They are not operating-system-wide shortcuts.

### Performance, Data and Limits

Each channel keeps up to 1,000 messages and 250 pending entries per batch. Overflow keeps the newest messages and increments **batch omissions**. Spam tracking holds at most 5,000 keys per channel, evicting older keys when full; detection is best effort. The paused snapshot is bounded too. Only visible rows plus a small overscan area are recycled in the DOM. Received text is capped at 2,000 characters per message.

Account review allows 256 outstanding jobs and four concurrent jobs. **Not reviewed** counts messages discarded when this queue is full; do not assume every chatter was examined. An open moderation panel receives grouped state at most every 500 ms. This is not a complete audit log or a promise of a specific FPS on all hardware/load levels.

IRC `CLEARMSG` and `CLEARCHAT` remove messages from live and paused Multichat history. They do not erase account history already persisted by the moderation panel. Multichat messages and counters are in memory and disappear when the worker restarts. Twitch IRC does not replay messages missed during disconnection. Heartbeats and reconnect backoff are provided, but uninterrupted delivery during machine sleep is not guaranteed.

Settings live in `chrome.storage.local`; OAuth state lives in `chrome.storage.session`. IndexedDB persists profiles, account history and notes without automatic expiration. **Disconnect Twitch** removes the session, not this stored data. Remove the extension or clear its storage through extension developer tools to erase everything. Never publish tokens or personal chat data.

### Troubleshooting and GitHub

- OAuth failure: check the exact redirect URL and Client ID, reload and sign in again. Never put secrets in project files.
- Waiting for a channel: verify it exists, the primary connection is active, and the network permits `wss://irc-ws.chat.twitch.tv:443`. Notices/errors may contain original English Twitch responses.
- Batch omissions: lower the interval, tune local spam/slow mode or reduce channels. Counters accumulate in memory and are not themselves a disconnection alarm.
- Service unavailable after reload: close obsolete views and open them again.
- UI tests cannot find a browser: install Chrome/Edge or use the Chromium installation command above.

Automated checks use simulated traffic. Real OAuth, channel privileges and actual slow-mode changes still need manual verification with an authorized account. Use a channel you control and restore its previous slow-mode setting afterward.

Precise publishing commands are in [README: GitHub](../README.md#publicar-en-github). Create an empty GitHub repository, substitute your account in the remote URL, then run `git init -b main`, `git add .`, `git commit`, `git remote add origin` and `git push -u origin main` as shown there. Review staged files for secrets first. Publishing a repository does not publish to browser stores.