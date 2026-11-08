if (typeof importScripts === "function") importScripts("core.js", "chat-flow.js");

const extensionApi = globalThis.browser ?? globalThis.chrome;

const { parseIrcLine, accountAgeDays, normalizeSettings, getFlagReasons, applyApproval, prepareReview, recordMessage } = ModerationCore;
const { DATA_CONSENT_VERSION, DATA_CONSENT_REQUIRED, DATA_CONSENT_WITHDRAWN, hasDataConsent } = ModerationCore;
const offlineRequests = new Set(["GET_STATE", "GET_CHAT_STATE", "GET_CHATTERS", "GET_ACCOUNT_HISTORY",
  "OPEN_DASHBOARD", "OPEN_CHAT_WINDOW", "SAVE_WINDOW_GEOMETRY", "LIST_WORKSPACES", "DISCONNECT"]);
const dataOperations = new Set();
let dataConsent = null;
let consentController = null;
let consentWrites = Promise.resolve();
const DB_NAME = "chatter-watch";
const DB_VERSION = 2;
const STORE = "accounts";
const PROFILE_STORE = "profiles";
const HELIX = "https://api.twitch.tv/helix";
const OAUTH_VALIDATE = "https://id.twitch.tv/oauth2/validate";
const messageIds = new Set();
const messageIdOrder = [];
const lookupsInFlight = new Map();
const messageQueues = new Map();
const accountTasks = new Map();
const chatPorts = new Set();
const dashboardPorts = new Set();
const joinedChannels = new Set();
const roomStates = new Map();
let chatConfig = ChatFlow.normalizeConfig();
const chatFlow = new ChatFlow.FlowController();
let batchTimer;
let snapshotTimer;
let snapshotRunning = false;
let queuedModeration = 0;
let runningModeration = 0;
const moderationWaiting = [];
let primaryChannel = "";
let connectionGeneration = 0;
let chatConfigRevision = 0;
let configWrites = Promise.resolve();
let settingsWrites = Promise.resolve();
let workspaceWrites = Promise.resolve();
let windowOperations = Promise.resolve();
const pendingWindowViews = new Map();
const MAX_EXTENSION_WINDOWS = 12;
let geometryWrites = Promise.resolve();
let streamPolling = false;
let lastReviewAlertAt = 0;
const quickTimeouts = new Set();

let databasePromise;
let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let connectionWatchdog = null;
let lastIrcAt = 0;
let reconnectAttempt = 0;
let manualDisconnect = false;
let joined = false;
let status = "disconnected";
let statusMessage = "Ready to monitor";
let activeSettings = normalizeSettings();
let sessionChatters = new Set();
let sessionNewAccounts = new Set();
let activeSessionId = "";

function consentStatus() {
  const accepted = hasDataConsent(dataConsent) && Boolean(consentController && !consentController.signal.aborted);
  return {
    version: DATA_CONSENT_VERSION, accepted, id: accepted ? dataConsent.id : null,
    acceptedAt: accepted ? dataConsent.acceptedAt : null,
    revision: Number.isFinite(dataConsent?.revision) ? dataConsent.revision : 0
  };
}

function requireDataConsent(expected = consentController) {
  if (!expected || expected !== consentController || expected.signal.aborted || !hasDataConsent(dataConsent)) {
    const error = new Error(expected ? DATA_CONSENT_WITHDRAWN : DATA_CONSENT_REQUIRED);
    error.name = "DataConsentError";
    throw error;
  }
  return expected;
}

function withDataConsent(operation, expected = consentController) {
  const task = Promise.resolve().then(() => {
    requireDataConsent(expected);
    return operation(expected);
  }).then((result) => {
    requireDataConsent(expected);
    return result;
  });
  dataOperations.add(task);
  const release = () => dataOperations.delete(task);
  task.then(release, release);
  return task;
}

async function clearSessionCredentials() {
  await extensionApi.storage.session.remove(["accessToken", "moderator", "dataConsentId", "broadcasterId", "broadcasterLogin", "activeSessionId"]);
  await extensionApi.storage.session.set({ chatConnected: false });
}

async function setDataConsent(message) {
  if (message.accepted !== true && message.accepted !== false) throw new Error("Choose whether to allow data use.");
  if (message.accepted && (message.confirmed !== true || message.version !== DATA_CONSENT_VERSION)) {
    throw new Error(DATA_CONSENT_REQUIRED);
  }
  if (message.accepted && consentStatus().accepted) return { state: await snapshot(), dataConsent: consentStatus() };
  const record = {
    version: DATA_CONSENT_VERSION, accepted: message.accepted,
    id: message.accepted ? crypto.randomUUID() : null,
    acceptedAt: message.accepted ? Date.now() : null,
    revision: Math.max(Date.now(), consentStatus().revision + 1)
  };
  if (message.accepted) {
    await extensionApi.storage.local.set({ dataConsent: record });
    dataConsent = record;
    consentController = new AbortController();
  } else {
    const previous = consentController;
    dataConsent = record;
    consentController = null;
    const cancellation = new Error(DATA_CONSENT_WITHDRAWN);
    cancellation.name = "DataConsentError";
    previous?.abort(cancellation);
    for (const job of moderationWaiting.splice(0)) { queuedModeration -= 1; job.resolve(); }
    broadcast("DATA_CONSENT", { dataConsent: consentStatus() });
    postChat({ type: "DATA_CONSENT", dataConsent: consentStatus() });
    const stopped = await Promise.allSettled([
      extensionApi.storage.local.set({ dataConsent: record }),
      stopChat(),
      ...dataOperations,
      ...accountTasks.values()
    ]);
    await clearSessionCredentials();
    const persistenceFailure = stopped.slice(0, 2).find((result) => result.status === "rejected");
    if (persistenceFailure) throw persistenceFailure.reason;
  }
  const state = await snapshot();
  broadcast("DATA_CONSENT", { dataConsent: consentStatus() });
  broadcast("STATE", { state });
  postChat(chatState());
  return { state, dataConsent: consentStatus() };
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("broadcasterId", "broadcasterId", { unique: false });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!database.objectStoreNames.contains(PROFILE_STORE)) database.createObjectStore(PROFILE_STORE, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

function withAccount(key, operation) {
  const task = (accountTasks.get(key) || Promise.resolve()).catch(() => {}).then(operation);
  accountTasks.set(key, task);
  const release = () => { if (accountTasks.get(key) === task) accountTasks.delete(key); };
  task.then(release, release);
  return task;
}

async function getAccount(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(store, value) {
  const consent = requireDataConsent();
  const database = await openDatabase();
  requireDataConsent(consent);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, "readwrite");
    const cancel = () => {
      try { transaction.abort(); }
      catch (error) { if (error.name !== "InvalidStateError") throw error; }
    };
    const cleanup = () => consent.signal.removeEventListener("abort", cancel);
    consent.signal.addEventListener("abort", cancel, { once: true });
    transaction.oncomplete = () => { cleanup(); resolve(value); };
    transaction.onabort = transaction.onerror = () => {
      cleanup();
      reject(consent.signal.aborted ? consent.signal.reason : transaction.error || new Error("Could not save local history."));
    };
    transaction.objectStore(store).put(value);
  });
}

function saveAccount(account) { return saveRecord(STORE, account); }

async function getChannelAccounts(broadcasterId, summaries = false) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const index = database.transaction(STORE).objectStore(STORE).index("broadcasterId");
    const request = summaries ? index.openCursor(broadcasterId) : index.getAll(broadcasterId);
    const accounts = [];
    request.onsuccess = () => {
      if (!summaries) { resolve(request.result || []); return; }
      const cursor = request.result;
      if (!cursor) { resolve(accounts); return; }
      accounts.push(accountSummary(cursor.value));
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

async function getCachedProfile(userId) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(PROFILE_STORE).objectStore(PROFILE_STORE).get(userId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function saveCachedProfile(profile) { return saveRecord(PROFILE_STORE, profile); }

async function getSessionData() {
  const values = await extensionApi.storage.local.get("settings");
  const sessionValues = await extensionApi.storage.session.get(["accessToken", "moderator", "dataConsentId"]);
  const authorized = consentStatus().accepted && sessionValues.dataConsentId === dataConsent.id;
  return {
    settings: normalizeSettings(values.settings),
    accessToken: authorized ? sessionValues.accessToken || "" : "",
    moderator: authorized ? sessionValues.moderator || null : null
  };
}

async function apiRequest(path, { method = "GET", body, token, clientId, query } = {}) {
  const consent = requireDataConsent();
  const auth = token && clientId ? { accessToken: token, settings: { clientId } } : await getSessionData();
  if (!auth.accessToken || !auth.settings.clientId) throw new Error("Sign in with Twitch before using Helix.");
  const url = new URL(`${HELIX}${path}`);
  if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  requireDataConsent(consent);
  const response = await fetch(url, {
    method,
    signal: AbortSignal.any([consent.signal, AbortSignal.timeout(15_000)]),
    headers: {
      "Client-Id": auth.settings.clientId,
      "Authorization": `Bearer ${auth.accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  requireDataConsent(consent);
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).message || ""; } catch { /* Response may be empty. */ }
    requireDataConsent(consent);
    if (response.status === 401) {
      await extensionApi.storage.session.remove(["accessToken", "moderator"]);
      await stopChat();
    }
    throw new Error(detail || `Twitch API returned ${response.status}.`);
  }
  const data = response.status === 204 ? null : await response.json();
  requireDataConsent(consent);
  return data;
}

async function validateToken(token, clientId, settings = activeSettings) {
  const consent = requireDataConsent();
  const response = await fetch(OAUTH_VALIDATE, {
    headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.any([consent.signal, AbortSignal.timeout(15_000)])
  });
  requireDataConsent(consent);
  if (!response.ok) {
    const error = new Error(response.status === 401 ? "Twitch sign-in expired. Sign in again to continue." : "Twitch validation is temporarily unavailable.");
    error.authFailure = response.status === 401;
    throw error;
  }
  const user = await response.json();
  requireDataConsent(consent);
  if (user.client_id !== clientId || !user.user_id) throw new Error("The Twitch token does not match this app or is not a user token.");
  if (!user.scopes.includes("chat:read")) throw new Error("Grant the chat:read permission to connect to Twitch chat.");
  if (!user.scopes.includes("moderator:manage:banned_users")) throw new Error("Grant the moderator:manage:banned_users permission to moderate chatters.");
  if (settings.flagNewFollower && !user.scopes.includes("moderator:read:followers")) throw new Error("Grant the moderator:read:followers permission or turn off recent-follower checks.");
  return user;
}

async function loadChannel() {
  const { settings } = await getSessionData();
  if (!settings.channel) throw new Error("Enter a channel name first.");
  const result = await apiRequest(`/users?login=${encodeURIComponent(settings.channel)}`);
  const broadcaster = result.data?.[0];
  if (!broadcaster) throw new Error(`Twitch channel “${settings.channel}” was not found.`);
  return broadcaster;
}

function broadcast(type, payload = {}) {
  extensionApi.runtime.sendMessage({ type, ...payload }).catch(() => {});
}

async function reviewChannelId(settings) {
  const session = await extensionApi.storage.session.get(["broadcasterId", "broadcasterLogin"]);
  if (session.broadcasterId && session.broadcasterLogin === settings.channel) return session.broadcasterId;
  const saved = (await extensionApi.storage.local.get("lastReviewChannel")).lastReviewChannel;
  return saved?.login === settings.channel ? saved.id : "";
}

function accountSummary(account) {
  const { activityHistory, ...summary } = account;
  return { ...summary, recentMessages: (account.recentMessages || []).slice(0, 3) };
}

async function listChatters(message) {
  const { settings } = await getSessionData();
  const broadcasterId = await reviewChannelId(settings);
  const all = broadcasterId ? await getChannelAccounts(broadcasterId, true) : [];
  const query = String(message.query || "").trim().toLowerCase().slice(0, 80);
  const filter = ["all", "pending", "approved", "new", "first", "follower"].includes(message.filter) ? message.filter : "all";
  const accounts = all.filter((account) => {
    if (account.createdAt) account.ageDays = accountAgeDays(account.createdAt);
    if (query && !`${account.login || ""} ${account.displayName || ""}`.toLowerCase().includes(query)) return false;
    if (filter === "pending") return !account.reviewExempt && !account.isVetted && !account.dismissed && (account.reasons?.length || account.lookupPending);
    if (filter === "approved") return account.isVetted;
    if (filter === "new") return Number.isFinite(account.ageDays) && account.ageDays < settings.ageLimitDays;
    if (filter === "first") return account.firstMessage;
    if (filter === "follower") {
      const age = Date.now() - Date.parse(account.followedAt || "");
      return age >= 0 && age <= settings.recentFollowerDays * 86400000;
    }
    return true;
  }).sort((left, right) => (right.lastMessageAt || 0) - (left.lastMessageAt || 0) || String(left.key).localeCompare(String(right.key)));
  const pageSize = 25;
  const page = Math.max(0, Math.min(Number.isInteger(message.page) ? message.page : 0, Math.max(0, Math.ceil(accounts.length / pageSize) - 1)));
  return { accounts: accounts.slice(page * pageSize, (page + 1) * pageSize).map(accountSummary), total: accounts.length, page, pageSize, broadcasterId };
}

function recordAccountActivity(account, event, moderator) {
  account.activityHistory = [{ id: crypto.randomUUID(), at: Date.now(), actor: moderator?.login || moderator?.user_id || "", ...event }, ...(account.activityHistory || [])].slice(0, 100);
}

async function recordMessageAction(broadcasterId, entry, event, moderator) {
  if (!/^\d+$/.test(entry.userId)) return;
  await withAccount(`${broadcasterId}:${entry.userId}`, async () => {
    const account = await getAccountOrCreate({ broadcasterId, userId: entry.userId, login: entry.login, displayName: entry.displayName || entry.login, tags: {} });
    recordAccountActivity(account, event, moderator);
    if (event.type === "timeout") { account.latestAction = `Timed out for ${event.duration} s`; account.autoTimeoutApplied = true; }
    await saveAccount(account);
  });
  await publishSnapshot();
}

async function snapshot() {
  const { settings, moderator } = await getSessionData();
  const broadcasterId = await reviewChannelId(settings);
  const accounts = broadcasterId ? await getChannelAccounts(broadcasterId, true) : [];
  const flagged = accounts
    .filter((account) => !account.reviewExempt && !account.isVetted && !account.dismissed && (account.reasons?.length || account.lookupPending))
    .sort((left, right) => (right.lastMessageAt || 0) - (left.lastMessageAt || 0));
  await extensionApi.action?.setBadgeText({ text: consentStatus().accepted && settings.alertAttention && flagged.length ? (flagged.length > 999 ? "999+" : String(flagged.length)) : "" });
  return {
    settings,
    dataConsent: consentStatus(),
    moderator,
    status,
    statusMessage,
    broadcasterId: broadcasterId || "",
    chatters: sessionChatters.size,
    newAccounts: sessionNewAccounts.size,
    flagged: flagged.length,
    accounts: flagged.slice(0, 100).map(accountSummary),
    approved: accounts.filter((account) => account.isVetted).sort((left, right) => (right.lastMessageAt || 0) - (left.lastMessageAt || 0)).slice(0, 100).map(accountSummary)
  };
}

async function publishSnapshot() {
  if (snapshotTimer || snapshotRunning || (!dashboardPorts.size && !activeSettings.alertAttention)) return;
  snapshotTimer = setTimeout(async () => {
    snapshotTimer = null;
    snapshotRunning = true;
    try { broadcast("STATE", { state: await snapshot() }); } catch (error) { console.warn("Could not publish moderator state", error); }
    finally { snapshotRunning = false; }
  }, 500);
}

async function setStatus(nextStatus, message) {
  status = nextStatus;
  statusMessage = message;
  postChat({ type: "CHAT_STATUS", status, statusMessage, rooms: Object.fromEntries(roomStates) });
  await publishSnapshot();
}

function postChat(message) {
  for (const port of chatPorts) {
    try { port.postMessage(message); } catch { chatPorts.delete(port); }
  }
}

function allChannels(config = chatConfig) {
  return [...new Set([primaryChannel, ...config.channels].filter(Boolean))];
}

function chatState() {
  return {
    type: "CHAT_STATE", config: chatConfig, revision: chatConfigRevision, status, statusMessage, dataConsent: consentStatus(),
    primaryChannel, rooms: Object.fromEntries(roomStates),
    channels: allChannels().map((channel) => chatFlow.snapshot(channel))
  };
}

function resetBatchTimer() {
  clearInterval(batchTimer);
  batchTimer = setInterval(() => {
    const batches = chatFlow.flush();
    if (chatPorts.size) postChat({ type: "CHAT_BATCH", batches });
  }, chatConfig.flow.batchMs);
}

function syncChannels() {
  const desired = new Set(allChannels());
  for (const channel of [...joinedChannels]) {
    if (desired.has(channel)) continue;
    sendIrc(`PART #${channel}`);
    joinedChannels.delete(channel);
    roomStates.delete(channel);
  }
  for (const channel of [...chatFlow.channels.keys()]) {
    if (!desired.has(channel)) chatFlow.channels.delete(channel);
  }
  if (!joined) return;
  for (const channel of desired) {
    if (joinedChannels.has(channel)) continue;
    sendIrc(`JOIN #${channel}`);
    joinedChannels.add(channel);
  }
}

function ingestChat(message) {
  if (!consentStatus().accepted) return;
  const channel = message.params[0]?.replace(/^#/, "").toLowerCase();
  if (!joinedChannels.has(channel)) return;
  if (message.command === "CLEARMSG" || message.command === "CLEARCHAT") {
    const deletion = { id: message.tags["target-msg-id"], userId: message.tags["target-user-id"] };
    chatFlow.purge(channel, deletion);
    postChat({ type: "CHAT_PURGE", channel, ...deletion });
    return;
  }
  if (message.command !== "PRIVMSG" || markMessageId(message.tags.id)) return;
  chatFlow.ingest({
    channel, id: message.tags.id || crypto.randomUUID(), userId: message.tags["user-id"] || "",
    login: getLogin(message.prefix), displayName: message.tags["display-name"] || getLogin(message.prefix),
    text: message.trailing, sentAt: Number(message.tags["tmi-sent-ts"]) || Date.now()
  });
  if (channel === primaryChannel) void handleChatMessage(message);
}

async function saveChatConfig(message) {
  if (message.revision !== chatConfigRevision) throw new Error("Chat settings changed in another window. Reload settings and try again.");
  const next = ChatFlow.normalizeConfig(message.config);
  if (allChannels(next).length > ChatFlow.MAX_CHANNELS) throw new Error("At most 6 channels, including the primary channel, are supported.");
  await extensionApi.storage.local.set({ chatConfig: next });
  chatConfig = next;
  chatConfigRevision += 1;
  chatFlow.configure(next.flow);
  syncChannels();
  resetBatchTimer();
  postChat(chatState());
  return { config: chatConfig, revision: chatConfigRevision };
}

async function setTwitchSlowMode(message) {
  const channel = ChatFlow.channelName(message.channel);
  if (!allChannels().includes(channel)) throw new Error("Add this channel before changing its slow mode.");
  const seconds = Number(message.seconds);
  if (!Number.isInteger(seconds) || (seconds !== 0 && (seconds < 3 || seconds > 120))) {
    throw new Error("Twitch slow mode must be 0 (off) or 3 to 120 seconds.");
  }
  const { moderator } = await getSessionData();
  if (!moderator?.scopes?.includes("moderator:manage:chat_settings")) {
    throw new Error("Sign in again and grant moderator:manage:chat_settings to change Twitch slow mode.");
  }
  const result = await apiRequest("/users", { query: { login: channel } });
  const broadcaster = result.data?.[0];
  if (!broadcaster) throw new Error("Twitch channel was not found.");
  const body = { slow_mode: seconds !== 0 };
  if (seconds !== 0) body.slow_mode_wait_time = seconds;
  const updated = await apiRequest("/chat/settings", {
    method: "PATCH", query: { broadcaster_id: broadcaster.id, moderator_id: moderator.user_id }, body
  });
  const settings = updated?.data?.[0];
  if (settings) roomStates.set(channel, { ...roomStates.get(channel), slow: settings.slow_mode ? settings.slow_mode_wait_time : 0 });
  postChat({ type: "CHAT_STATUS", status, statusMessage, rooms: Object.fromEntries(roomStates) });
  return { ok: true };
}

async function quickTimeout(message) {
  if (message.confirmed !== true) throw new Error("Confirm this moderation action first.");
  const channel = ChatFlow.channelName(message.channel);
  if (!allChannels().includes(channel)) throw new Error("This channel is no longer configured.");
  const entry = chatFlow.channels.get(channel)?.history.values().find((item) => item.id === message.id);
  if (!entry || !/^\d+$/.test(entry.userId)) throw new Error("This message is no longer available for a timeout.");
  const { moderator } = await getSessionData();
  if (!moderator?.scopes?.includes("moderator:manage:banned_users")) throw new Error("Sign in again and grant moderator:manage:banned_users.");
  const key = `${channel}:${entry.userId}`;
  if (quickTimeouts.has(key)) throw new Error("A timeout for this user is already in progress.");
  quickTimeouts.add(key);
  try {
    const result = await apiRequest("/users", { query: { login: channel } });
    const broadcaster = result.data?.[0];
    if (!broadcaster) throw new Error("Twitch channel was not found.");
    await apiRequest("/moderation/bans", {
      method: "POST", query: { broadcaster_id: broadcaster.id, moderator_id: moderator.user_id },
      body: { data: { user_id: entry.userId, duration: 1, reason: "/srs" } }
    });
    await recordMessageAction(broadcaster.id, entry, { type: "timeout", duration: 1, reason: "/srs", source: "quick", messageId: entry.id }, moderator);
    return { ok: true };
  } finally { quickTimeouts.delete(key); }
}

function chatWindowUrl(channel = "") {
  const url = new URL(extensionApi.runtime.getURL("chat.html"));
  if (channel) url.searchParams.set("channel", ChatFlow.channelName(channel));
  return url.href;
}

function geometryKey(message) {
  if (message.view === "dashboard") return "dashboard";
  const channel = message.channel ? ChatFlow.channelName(message.channel) : "";
  if (channel && !allChannels().includes(channel)) throw new Error("This channel is no longer configured.");
  return channel ? `chat-${channel}` : "chat-grid";
}

async function saveWindowGeometry(message) {
  const key = geometryKey(message);
  const stored = (await extensionApi.storage.local.get("windowGeometry")).windowGeometry || {};
  const entries = Object.entries(stored).filter(([name]) => name !== key).slice(-15);
  const next = Object.fromEntries([...entries, [key, windowBounds(message.bounds)]]);
  await extensionApi.storage.local.set({ windowGeometry: next });
  return { ok: true };
}

async function openDashboard(page = false, settings = false, pinned = false) {
  const target = new URL(extensionApi.runtime.getURL("dashboard.html"));
  if (settings) target.searchParams.set("settings", "1");
  if (!page) {
    const existing = (await currentExtensionWindows()).find((info) => info.view === "dashboard");
    if (existing) {
      if (settings) broadcast("OPEN_SETTINGS");
      await focusExtensionWindow(existing);
      return { windowId: existing.id };
    }
    const bounds = (await extensionApi.storage.local.get("windowGeometry")).windowGeometry?.dashboard;
    const info = await createExtensionWindow({ url: target.href, type: "popup", width: 820, height: 820, ...(bounds ? windowBounds(bounds) : {}) });
    return { windowId: info.id };
  }
  const windows = await extensionApi.windows.getAll({ windowTypes: ["normal"] });
  const base = extensionApi.runtime.getURL("dashboard.html");
  const existing = (await extensionApi.tabs.query({})).find((tab) => {
    const url = tab.pendingUrl || tab.url || "";
    return windows.some((info) => info.id === tab.windowId) &&
      (url === base || url.startsWith(`${base}?`) || url.startsWith(`${base}#`));
  });
  if (existing) {
    const loading = existing.pendingUrl || existing.status === "loading";
    await extensionApi.tabs.update(existing.id, {
      active: true, ...(pinned ? { pinned: true } : {}), ...(settings && loading ? { url: target.href } : {})
    });
    if (settings && !loading) broadcast("OPEN_SETTINGS");
    await focusExtensionWindow(windows.find((info) => info.id === existing.windowId));
    return { tabId: existing.id, windowId: existing.windowId };
  }
  const windowInfo = windows.find((info) => info.focused) || windows[0];
  const tab = await extensionApi.tabs.create({ url: target.href, active: true, pinned, ...(windowInfo ? { windowId: windowInfo.id } : {}) });
  await focusExtensionWindow(windowInfo || { id: tab.windowId });
  return { tabId: tab.id, windowId: tab.windowId };
}

function runWindowOperation(operation) {
  const task = windowOperations.then(operation);
  windowOperations = task.catch(() => {});
  return task;
}

async function focusExtensionWindow(info) {
  if (info.tabId >= 0) await extensionApi.tabs.update(info.tabId, { active: true });
  await extensionApi.windows.update(info.id, { focused: true, ...(info.state === "minimized" ? { state: "normal" } : {}) });
}

async function createExtensionWindow(options) {
  if ((await currentExtensionWindows()).length >= MAX_EXTENSION_WINDOWS) throw new Error("At most 12 extension windows can be open. Close an existing window before opening another.");
  const info = await extensionApi.windows.create(options);
  pendingWindowViews.set(info.id, options.url);
  return info;
}

async function openChatWindow(message) {
  const channel = message.channel ? ChatFlow.channelName(message.channel) : "";
  if (channel && !allChannels().includes(channel)) throw new Error("Add this channel before detaching it.");
  const existing = (await currentChatWindows()).find((info) => info.channel === channel);
  if (existing) {
    await focusExtensionWindow(existing);
    return { windowId: existing.id };
  }
  const bounds = (await extensionApi.storage.local.get("windowGeometry")).windowGeometry?.[geometryKey({ channel })];
  const info = await createExtensionWindow({ url: chatWindowUrl(channel), type: "popup", width: channel ? 520 : 1180, height: 760, ...(bounds ? windowBounds(bounds) : {}) });
  return { windowId: info.id };
}

function retainedEntry(message) {
  const channel = ChatFlow.channelName(message.channel);
  if (!allChannels().includes(channel)) throw new Error("This channel is no longer configured.");
  const entry = chatFlow.channels.get(channel)?.history.values().find((item) => item.id === message.id);
  if (!entry) throw new Error("This message is no longer available.");
  return { channel, entry };
}

async function deleteChatMessage(message) {
  if (message.confirmed !== true) throw new Error("Confirm this moderation action first.");
  const { channel, entry } = retainedEntry(message);
  if (entry.deleted) throw new Error("This message was already deleted.");
  const { moderator } = await getSessionData();
  if (!moderator?.scopes?.includes("moderator:manage:chat_messages")) throw new Error("Sign in again and grant moderator:manage:chat_messages.");
  const broadcaster = (await apiRequest("/users", { query: { login: channel } })).data?.[0];
  if (!broadcaster) throw new Error("Twitch channel was not found.");
  await apiRequest("/moderation/chat", { method: "DELETE", query: { broadcaster_id: broadcaster.id, moderator_id: moderator.user_id, message_id: entry.id } });
  await recordMessageAction(broadcaster.id, entry, { type: "delete", messageId: entry.id, source: "manual" }, moderator);
  chatFlow.purge(channel, { id: entry.id });
  postChat({ type: "CHAT_PURGE", channel, id: entry.id });
  return { ok: true };
}

async function translateChatMessage(message) {
  const consent = requireDataConsent();
  if (message.confirmed !== true) throw new Error("Confirm sending this message to your translation server.");
  const { entry } = retainedEntry(message);
  const { settings } = await getSessionData();
  if (!settings.translationUrl) throw new Error("Configure a LibreTranslate HTTPS endpoint in Settings first.");
  const url = new URL(settings.translationUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("Use an HTTPS translation URL without credentials or fragment.");
  if (!await extensionApi.permissions.contains({ origins: [`${url.origin}/*`], ...(globalThis.browser ? { data_collection: ["personalCommunications"] } : {}) })) throw new Error("Allow this translation server in Settings first.");
  requireDataConsent(consent);
  const response = await fetch(url.href, {
    method: "POST", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: AbortSignal.any([consent.signal, AbortSignal.timeout(15_000)]),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: entry.text, source: "auto", target: settings.translationTarget, format: "text" })
  });
  if (!response.ok) throw new Error(`Translation server returned ${response.status}.`);
  const data = await response.json();
  requireDataConsent(consent);
  if (typeof data.translatedText !== "string") throw new Error("Translation server did not return translatedText.");
  return { text: data.translatedText.slice(0, 8000), target: settings.translationTarget };
}

async function notifyReview(account) {
  if (account.reviewNotified || account.isVetted || account.dismissed || (!account.reasons?.length && !account.lookupPending)) return;
  account.reviewNotified = true;
  if (Date.now() - lastReviewAlertAt < 10_000) return;
  lastReviewAlertAt = Date.now();
  if (activeSettings.alertSound) {
    const port = [...dashboardPorts, ...chatPorts][0];
    try { port?.postMessage({ type: "REVIEW_ALERT", volume: activeSettings.alertVolume }); } catch {}
  }
  if (activeSettings.alertAttention) {
    await extensionApi.action?.setBadgeText({ text: "!" });
    const contexts = await extensionApi.runtime.getContexts({ contextTypes: ["TAB"] });
    const windowIds = [...new Set(contexts.map((context) => context.windowId).filter((id) => id >= 0))].slice(0, 12);
    for (const windowId of windowIds) {
      try { await extensionApi.windows.update(windowId, { drawAttention: true }); } catch {}
    }
  }
}

async function pollStream() {
  if (streamPolling || manualDisconnect || !primaryChannel) return;
  streamPolling = true;
  const channel = primaryChannel;
  const generation = connectionGeneration;
  try {
    const { broadcasterId } = await extensionApi.storage.session.get("broadcasterId");
    if (!broadcasterId) return;
    const result = await apiRequest("/streams", { query: { user_id: broadcasterId } });
    if (generation !== connectionGeneration) return;
    const stored = (await extensionApi.storage.local.get("reviewSession")).reviewSession || {};
    const streamId = result.data?.[0]?.id || null;
    if (stored.channel === channel && Object.hasOwn(stored, "streamId") && stored.streamId !== streamId) {
      activeSessionId = crypto.randomUUID();
      await extensionApi.storage.session.set({ activeSessionId });
    }
    await extensionApi.storage.local.set({ reviewSession: { channel, epoch: activeSessionId, streamId } });
  } finally { streamPolling = false; }
}

async function currentExtensionWindows() {
  const contexts = await extensionApi.runtime.getContexts({ contextTypes: ["TAB"] });
  const windows = await extensionApi.windows.getAll({ windowTypes: ["popup"] });
  const base = new URL(chatWindowUrl());
  const dashboardPath = new URL(extensionApi.runtime.getURL("dashboard.html")).pathname;
  const found = new Map();
  for (const [windowId] of pendingWindowViews) {
    if (!windows.some((info) => info.id === windowId)) pendingWindowViews.delete(windowId);
  }
  for (const context of [...contexts, ...[...pendingWindowViews].filter(([windowId]) => !contexts.some((item) => item.windowId === windowId)).map(([windowId, documentUrl]) => ({ windowId, documentUrl }))]) {
    if (!context.documentUrl) continue;
    const url = new URL(context.documentUrl);
    if (url.protocol !== base.protocol || url.host !== base.host || ![base.pathname, dashboardPath].includes(url.pathname)) continue;
    const windowInfo = windows.find((item) => item.id === context.windowId && item.type === "popup");
    if (windowInfo) found.set(windowInfo.id, { ...windowInfo, tabId: context.tabId, view: url.pathname === dashboardPath ? "dashboard" : "chat", channel: url.searchParams.get("channel") || "" });
  }
  for (const context of contexts) pendingWindowViews.delete(context.windowId);
  return [...found.values()];
}

async function currentChatWindows() {
  return (await currentExtensionWindows()).filter((info) => info.view === "chat");
}

function workspaceName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 40) throw new Error("Workspace name must contain 1 to 40 characters.");
  return name;
}

function windowBounds(value) {
  const bounds = {};
  for (const [key, min, max] of [["left", -100000, 100000], ["top", -100000, 100000], ["width", 320, 7680], ["height", 300, 4320]]) {
    if (!Number.isInteger(value[key])) throw new Error("Invalid saved window bounds.");
    bounds[key] = Math.max(min, Math.min(max, value[key]));
  }
  return bounds;
}

async function workspaces() {
  const stored = await extensionApi.storage.local.get("chatWorkspaces");
  return Array.isArray(stored.chatWorkspaces) ? stored.chatWorkspaces.slice(0, 8) : [];
}

async function manageWorkspace(message) {
  const name = workspaceName(message.name);
  const saved = await workspaces();
  const index = saved.findIndex((entry) => entry.name === name);
  if (message.type === "DELETE_WORKSPACE") {
    if (index >= 0) saved.splice(index, 1);
  } else if (message.type === "SAVE_WORKSPACE") {
    if (index < 0 && saved.length >= 8) throw new Error("At most 8 workspaces are supported.");
    const open = await currentChatWindows();
    if (!open.length || open.length > 12) throw new Error("Open 1 to 12 Multichat popup windows before saving.");
    const workspace = {
      name, config: ChatFlow.normalizeConfig({ ...chatConfig, channels: allChannels() }),
      windows: open.map((info) => ({ channel: info.channel ? ChatFlow.channelName(info.channel) : "", ...windowBounds(info), state: info.state === "maximized" ? "maximized" : "normal" }))
    };
    if (index < 0) saved.push(workspace);
    else saved[index] = workspace;
  } else {
    if (index < 0) throw new Error("Workspace was not found.");
    const workspace = saved[index];
    const config = ChatFlow.normalizeConfig(workspace.config);
    if (!Array.isArray(workspace.windows) || !workspace.windows.length || workspace.windows.length > 12) throw new Error("Invalid workspace windows.");
    const descriptors = workspace.windows.map((info) => {
      const channel = info.channel ? ChatFlow.channelName(info.channel) : "";
      if (channel && !allChannels(config).includes(channel)) throw new Error("Workspace channel is not configured.");
      return { channel, ...windowBounds(info), state: info.state === "maximized" ? "maximized" : "normal" };
    });
    const configTask = configWrites.then(() => saveChatConfig({ config, revision: chatConfigRevision }));
    configWrites = configTask.catch(() => {});
    await configTask;
    const available = await currentChatWindows();
    const failures = [];
    for (const descriptor of descriptors) {
      try {
        const existingIndex = available.findIndex((info) => info.channel === descriptor.channel);
        let windowInfo;
        if (existingIndex >= 0) {
          windowInfo = available.splice(existingIndex, 1)[0];
          await extensionApi.windows.update(windowInfo.id, { state: "normal" });
          await extensionApi.windows.update(windowInfo.id, windowBounds(descriptor));
        } else {
          windowInfo = await createExtensionWindow({ url: chatWindowUrl(descriptor.channel), type: "popup", focused: false, ...windowBounds(descriptor) });
        }
        if (descriptor.state === "maximized") await extensionApi.windows.update(windowInfo.id, { state: "maximized" });
      } catch (error) { failures.push(error.message); }
    }
    if (failures.length) throw new Error(`Workspace partially restored: ${failures.join("; ")}`);
    return { ok: true };
  }
  await extensionApi.storage.local.set({ chatWorkspaces: saved });
  return { names: saved.map((entry) => entry.name) };
}

function markMessageId(id) {
  if (!id) return false;
  if (messageIds.has(id)) return true;
  messageIds.add(id);
  messageIdOrder.push(id);
  if (messageIdOrder.length > 2000) messageIds.delete(messageIdOrder.shift());
  return false;
}

function hasPrivilegedBadge(tags) {
  if (tags.mod === "1" || tags["user-type"] === "mod" || tags["user-type"] === "staff" || tags["user-type"] === "admin") return true;
  return (tags.badges || "").split(",").some((badge) => /^(broadcaster|moderator|vip|founder)\//.test(badge));
}

function getLogin(prefix) {
  return prefix.split("!", 1)[0].toLowerCase();
}

async function fetchProfile(userId) {
  const cached = await getCachedProfile(userId);
  if (cached) return cached;
  const result = await apiRequest(`/users?id=${encodeURIComponent(userId)}`);
  const user = result.data?.[0];
  if (!user) return null;
  const profile = { userId, createdAt: user.created_at, profileImage: user.profile_image_url, displayName: user.display_name, login: user.login };
  await saveCachedProfile(profile);
  return profile;
}

async function checkFollower(broadcasterId, userId) {
  const result = await apiRequest(`/channels/followers?broadcaster_id=${encodeURIComponent(broadcasterId)}&user_id=${encodeURIComponent(userId)}`);
  return result.data[0]?.followed_at || null;
}

async function getAccountOrCreate({ broadcasterId, userId, login, displayName, tags }) {
  const key = `${broadcasterId}:${userId}`;
  const existing = await getAccount(key);
  if (existing) return existing;
  const created = {
    key, broadcasterId, userId, login, displayName, profileImage: "", createdAt: "", ageDays: null,
    messageCount: 0, firstSeenAt: Date.now(), lastMessageAt: 0, firstMessage: false,
    isFollower: null, isVetted: false, dismissed: false, note: "", recentMessages: [], reasons: [],
    lookupPending: true, profileError: "", autoTimeoutApplied: false, latestAction: ""
  };
  if (tags["first-msg"] === "1") created.firstMessage = true;
  await saveAccount(created);
  sessionNewAccounts.add(userId);
  return created;
}

async function lookupSignals(account) {
  if (lookupsInFlight.has(account.key)) return lookupsInFlight.get(account.key);
  const task = (async () => {
    const updates = {};
    try {
      const profile = await fetchProfile(account.userId);
      if (profile) {
        updates.createdAt = profile.createdAt;
        updates.ageDays = accountAgeDays(profile.createdAt);
        updates.profileImage = profile.profileImage;
        updates.displayName = profile.displayName || account.displayName;
      } else {
        updates.profileError = "Account details unavailable";
      }
    } catch (error) {
      updates.profileError = error.message || "Account lookup failed";
    }
    if (activeSettings.flagNewFollower || activeSettings.autoApproveFollowers) {
      try { updates.followedAt = await checkFollower(account.broadcasterId, account.userId); updates.followerError = ""; updates.followerCheckedAt = Date.now(); }
      catch (error) { updates.followerError = error.message || "Follower lookup failed"; }
    }
    const current = await getAccount(account.key);
    if (!current) return;
    Object.assign(current, updates, { lookupPending: false });
    current.reasons = getFlagReasons(current, activeSettings);
    applyApproval(current, activeSettings);
    await notifyReview(current);
    await saveAccount(current);
    await applyAutomaticTimeout(current);
    await publishSnapshot();
  })().finally(() => lookupsInFlight.delete(account.key));
  lookupsInFlight.set(account.key, task);
  return task;
}

async function processChatMessage(message) {
  requireDataConsent();
  if (message.command !== "PRIVMSG" || !message.prefix) return;
  const userId = message.tags["user-id"];
  const broadcasterId = message.tags["room-id"] || (await extensionApi.storage.session.get("broadcasterId")).broadcasterId;
  if (!userId || !broadcasterId) return;
  const login = getLogin(message.prefix);
  if (!login || login === "tmi.twitch.tv") return;
  const displayName = message.tags["display-name"] || login;
  sessionChatters.add(userId);
  return withAccount(`${broadcasterId}:${userId}`, async () => {
    const account = await getAccountOrCreate({ broadcasterId, userId, login, displayName, tags: message.tags });
    account.login = login;
    account.displayName = displayName;
    account.ageDays = account.createdAt ? accountAgeDays(account.createdAt) : null;
    prepareReview(account, message, activeSessionId, activeSettings);
    if (account.reviewExempt && !hasPrivilegedBadge(message.tags)) account.lookupPending = true;
    account.reviewExempt = hasPrivilegedBadge(message.tags);
    if (account.reviewExempt) account.lookupPending = false;
    recordMessage(account, message, activeSessionId);
    account.reasons = getFlagReasons(account, activeSettings);
    applyApproval(account, activeSettings);
    await notifyReview(account);
    await saveAccount(account);
    await publishSnapshot();
    if (account.lookupPending && !account.isVetted && !account.dismissed) await lookupSignals(account);
    else await applyAutomaticTimeout(account);
  });
}

function handleChatMessage(message) {
  if (!consentStatus().accepted) return Promise.resolve();
  if (message.command !== "PRIVMSG" || !message.tags["user-id"]) return Promise.resolve();
  if (queuedModeration >= 256) {
    chatFlow.channel(primaryChannel).stats.moderationSkipped += 1;
    return Promise.resolve();
  }
  queuedModeration += 1;
  return new Promise((resolve) => {
    moderationWaiting.push({ message, resolve, session: activeSessionId, consent: consentController });
    drainModeration();
  });
}

function drainModeration() {
  while (runningModeration < 4) {
    const index = moderationWaiting.findIndex(({ message }) => !messageQueues.has(`${message.tags["room-id"]}:${message.tags["user-id"]}`));
    if (index < 0) return;
    const job = moderationWaiting.splice(index, 1)[0];
    const key = `${job.message.tags["room-id"]}:${job.message.tags["user-id"]}`;
    messageQueues.set(key, true);
    runningModeration += 1;
    withDataConsent(() => job.session === activeSessionId ? processChatMessage(job.message) : undefined, job.consent)
      .catch((error) => { if (error.name !== "DataConsentError") console.warn("Could not process chat message", error); })
      .finally(() => {
        messageQueues.delete(key);
        runningModeration -= 1;
        queuedModeration -= 1;
        job.resolve();
        drainModeration();
      });
  }
}

async function moderateUser(account, { duration, reason, source = "manual", action = duration == null ? "ban" : "timeout" }) {
  const { moderator } = await getSessionData();
  const broadcasterId = account.broadcasterId;
  if (!moderator?.user_id || !broadcasterId) throw new Error("Sign in and connect to a channel first.");
  if (!moderator.scopes?.includes("moderator:manage:banned_users")) throw new Error("Sign in again and grant moderator:manage:banned_users.");
  const query = { broadcaster_id: broadcasterId, moderator_id: moderator.user_id };
  if (action === "unban") {
    await apiRequest("/moderation/bans", { method: "DELETE", query: { ...query, user_id: account.userId } });
    Object.assign(account, { latestAction: "Ban/timeout removed", dismissed: false, autoTimeoutApplied: true });
    recordAccountActivity(account, { type: "unban", source }, moderator);
  } else {
    const body = { data: { user_id: account.userId, reason: String(reason || "").slice(0, 500) } };
    if (duration != null) body.data.duration = duration;
    await apiRequest("/moderation/bans", { method: "POST", query, body });
    account.latestAction = duration == null ? "Banned" : `Timed out for ${duration} s`;
    if (duration == null) account.dismissed = true;
    else account.autoTimeoutApplied = true;
    recordAccountActivity(account, { type: duration == null ? "ban" : "timeout", duration: duration ?? null, reason: body.data.reason, source }, moderator);
  }
  await saveAccount(account);
  await publishSnapshot();
}

async function warnUser(account, reason) {
  const { moderator } = await getSessionData();
  if (!moderator?.scopes?.includes("moderator:manage:warnings")) {
    throw new Error("Warning needs moderator:manage:warnings. Disconnect Twitch and sign in again to grant it.");
  }
  await apiRequest(`/moderation/warnings?broadcaster_id=${encodeURIComponent(account.broadcasterId)}&moderator_id=${encodeURIComponent(moderator.user_id)}`, {
    method: "POST",
    body: { data: { user_id: account.userId, reason: String(reason || "").trim().slice(0, 500) } }
  });
  account.latestAction = "Warned";
  recordAccountActivity(account, { type: "warning", reason: String(reason).trim().slice(0, 500), source: "manual" }, moderator);
  await saveAccount(account);
  await publishSnapshot();
}

async function applyAutomaticTimeout(account) {
  if (!activeSettings.autoTimeout || account.reviewExempt || account.autoTimeoutApplied || account.isVetted || account.dismissed) return;
  if (!account.reasons?.length || account.messageCount < activeSettings.messageThreshold) return;
  account.autoTimeoutApplied = true;
  await saveAccount(account);
  try {
    await moderateUser(account, {
      duration: activeSettings.timeoutMinutes * 60,
      source: "automatic",
      reason: `Automatic timeout: flagged chatter reached ${activeSettings.messageThreshold} messages.`
    });
  } catch (error) {
    account.autoTimeoutApplied = false;
    account.latestAction = `Automatic timeout failed: ${error.message}`;
    await saveAccount(account);
    broadcast("ERROR", { message: account.latestAction });
    await publishSnapshot();
  }
}

function sendIrc(line) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(`${line}\r\n`);
}

function scheduleReconnect() {
  if (manualDisconnect || reconnectTimer) return;
  const delay = Math.min(30_000, 1000 * (2 ** reconnectAttempt++));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void withDataConsent(() => startChat({ reconnect: true })).catch((error) => {
      if (error.name === "DataConsentError" || !consentStatus().accepted) return;
      void setStatus("error", error.message);
      scheduleReconnect();
    });
  }, delay);
}

async function startChat({ reconnect = false, resume = false } = {}) {
  const consent = requireDataConsent();
  const generation = ++connectionGeneration;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const { settings, accessToken, moderator } = await getSessionData();
  if (!reconnect && !resume) {
    manualDisconnect = false;
    reconnectAttempt = 0;
    sessionChatters = new Set();
    sessionNewAccounts = new Set();
    const stored = (await extensionApi.storage.local.get("reviewSession")).reviewSession;
    activeSessionId = stored?.channel === settings.channel ? stored.epoch : crypto.randomUUID();
    await extensionApi.storage.local.set({ reviewSession: { ...((stored?.channel === settings.channel && stored) || {}), channel: settings.channel, epoch: activeSessionId } });
    await extensionApi.storage.session.set({ activeSessionId });
  } else if (!activeSessionId) {
    const storedSession = await extensionApi.storage.session.get("activeSessionId");
    activeSessionId = storedSession.activeSessionId || crypto.randomUUID();
    await extensionApi.storage.session.set({ activeSessionId });
  }
  activeSettings = settings;
  if (!accessToken || !moderator?.user_id) throw new Error("Sign in with Twitch before connecting chat.");
  const nextPrimary = ChatFlow.channelName(settings.channel);
  if (new Set([nextPrimary, ...chatConfig.channels]).size > ChatFlow.MAX_CHANNELS) throw new Error("Remove a chat before connecting another primary channel (maximum 6).");
  const broadcaster = await loadChannel();
  requireDataConsent(consent);
  if (generation !== connectionGeneration) return;
  primaryChannel = nextPrimary;
  manualDisconnect = false;
  await extensionApi.storage.session.set({ chatConnected: true });
  await extensionApi.storage.session.set({ broadcasterId: broadcaster.id, broadcasterLogin: broadcaster.login });
  await extensionApi.storage.local.set({ lastReviewChannel: { id: broadcaster.id, login: broadcaster.login } });
  if (generation !== connectionGeneration) return;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  clearTimeout(connectionWatchdog);
  const previousSocket = socket;
  socket = null;
  if (previousSocket && (previousSocket.readyState === WebSocket.OPEN || previousSocket.readyState === WebSocket.CONNECTING)) previousSocket.close();
  joined = false;
  joinedChannels.clear();
  roomStates.clear();
  syncChannels();
  await setStatus("connecting", `Connecting to ${broadcaster.login}…`);
  requireDataConsent(consent);
  const connection = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
  socket = connection;
  lastIrcAt = Date.now();
  connectionWatchdog = setTimeout(() => { if (socket === connection && !joined) connection.close(); }, 30_000);
  connection.onopen = () => {
    if (socket !== connection) return;
    const nickname = moderator.login || "moderator";
    connection.send(`PASS oauth:${accessToken}\r\n`);
    connection.send(`NICK ${nickname}\r\n`);
    connection.send("CAP REQ :twitch.tv/tags twitch.tv/commands\r\n");
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (socket !== connection) return;
      if (Date.now() - lastIrcAt > 75_000) connection.close();
      else sendIrc("PING :chatter-watch");
    }, 20_000);
    void setStatus("connecting", "Signing in to Twitch chat…");
  };
  connection.onmessage = (event) => {
    if (socket !== connection) return;
    lastIrcAt = Date.now();
    for (const line of String(event.data).split("\r\n").filter(Boolean)) {
      const message = parseIrcLine(line);
      if (!message) continue;
      if (message.command === "PING") {
        sendIrc(`PONG :${message.trailing || message.params[0] || "tmi.twitch.tv"}`);
      } else if (message.command === "001" && !joined) {
        clearTimeout(connectionWatchdog);
        joined = true;
        reconnectAttempt = 0;
        syncChannels();
      } else if (message.command === "ROOMSTATE") {
        const channel = message.params[0]?.replace(/^#/, "");
        if (joinedChannels.has(channel)) {
          const previous = roomStates.get(channel) || {};
          roomStates.set(channel, { ...previous, connected: true, ...(message.tags.slow !== undefined ? { slow: Number(message.tags.slow) } : {}) });
          void setStatus("connected", `Monitoring ${broadcaster.login}`);
        }
      } else if (["PRIVMSG", "CLEARMSG", "CLEARCHAT"].includes(message.command)) {
        ingestChat(message);
      } else if (message.command === "RECONNECT") {
        connection.close();
      } else if (message.command === "NOTICE") {
        const notice = message.tags["msg-id"] || message.trailing || "Twitch chat notice";
        if (/authentication|improperly formatted auth/i.test(message.trailing || "")) {
          void extensionApi.storage.session.remove(["accessToken", "moderator"]);
          void setStatus("error", "Chat authentication failed. Sign in again.");
          manualDisconnect = true;
          void extensionApi.storage.session.set({ chatConnected: false });
          connection.close();
        } else {
          broadcast("NOTICE", { message: `${notice}: ${message.trailing || ""}` });
        }
      }
    }
  };
  connection.onerror = () => {
    if (socket === connection) void setStatus("error", "Chat connection interrupted");
  };
  connection.onclose = () => {
    if (socket !== connection) return;
    clearTimeout(connectionWatchdog);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    socket = null;
    joined = false;
    joinedChannels.clear();
    roomStates.clear();
    if (manualDisconnect) void setStatus("disconnected", "Chat disconnected");
    else {
      void setStatus("reconnecting", "Chat disconnected; reconnecting…");
      scheduleReconnect();
    }
  };
}

async function stopChat() {
  connectionGeneration += 1;
  manualDisconnect = true;
  const previous = socket;
  socket = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  clearTimeout(connectionWatchdog);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (previous) previous.close(1000, "Disconnected by moderator");
  joined = false;
  joinedChannels.clear();
  roomStates.clear();
  await extensionApi.storage.session.set({ chatConnected: false });
  await extensionApi.storage.session.remove("broadcasterId");
  await setStatus("disconnected", "Chat disconnected");
}

async function saveModeratorSettings(settings) {
  const stored = await extensionApi.storage.local.get("settings");
  const previousSettings = normalizeSettings(stored.settings);
  const nextSettings = normalizeSettings(settings);
  if (nextSettings.translationUrl) {
    const url = new URL(nextSettings.translationUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("Use an HTTPS translation URL without credentials or fragment.");
  }
  const nextPrimary = nextSettings.channel ? ChatFlow.channelName(nextSettings.channel) : "";
  if (new Set([nextPrimary, ...chatConfig.channels].filter(Boolean)).size > ChatFlow.MAX_CHANNELS) throw new Error("At most 6 channels, including the primary channel, are supported.");
  await extensionApi.storage.local.set({ settings: nextSettings });
  activeSettings = nextSettings;
  primaryChannel = nextPrimary;
  const clientChanged = previousSettings.clientId !== activeSettings.clientId;
  const channelChanged = previousSettings.channel !== activeSettings.channel;
  if (clientChanged) {
    await extensionApi.storage.session.remove(["accessToken", "moderator", "dataConsentId"]);
    if (socket) await stopChat();
  } else if (channelChanged && socket) {
    await stopChat();
    if (activeSettings.channel) await startChat();
  }
  syncChannels();
  postChat(chatState());
  await refreshAllReasons();
  await publishSnapshot();
  return { settings: activeSettings };
}

async function handleMessage(message) {
  await consentReady;
  if (message.type === "GET_DATA_CONSENT") return { dataConsent: consentStatus() };
  if (message.type === "SET_DATA_CONSENT") {
    const task = consentWrites.then(() => setDataConsent(message));
    consentWrites = task.catch(() => {});
    return task;
  }
  await chatReady;
  if (!offlineRequests.has(message.type)) return withDataConsent(() => dispatchMessage(message));
  return dispatchMessage(message);
}

async function dispatchMessage(message) {
  if (message.type === "GET_CHATTERS") return listChatters(message);
  if (message.type === "GET_ACCOUNT_HISTORY") {
    const { settings } = await getSessionData();
    const broadcasterId = await reviewChannelId(settings);
    const key = String(message.key || "");
    if (!broadcasterId || !key.startsWith(`${broadcasterId}:`)) throw new Error("This account does not belong to the selected channel.");
    return withAccount(key, async () => {
      const account = await getAccount(key);
      if (!account || account.broadcasterId !== broadcasterId) throw new Error("That chatter is no longer available.");
      return { account: { ...account, recentMessages: (account.recentMessages || []).slice(0, 50), activityHistory: (account.activityHistory || []).slice(0, 100) } };
    });
  }
  if (message.type === "OPEN_DASHBOARD") return runWindowOperation(() => openDashboard(message.page === true || message.pinned === true, message.settings === true, message.pinned === true));
  if (message.type === "DELETE_MESSAGE") return deleteChatMessage(message);
  if (message.type === "TRANSLATE_MESSAGE") return translateChatMessage(message);
  if (message.type === "SAVE_WINDOW_GEOMETRY") {
    const task = geometryWrites.then(() => saveWindowGeometry(message));
    geometryWrites = task.catch(() => {});
    return task;
  }
  if (message.type === "GET_CHAT_STATE") return chatState();
  if (message.type === "SAVE_CHAT_CONFIG") {
    const task = configWrites.then(() => saveChatConfig(message));
    configWrites = task.catch(() => {});
    return task;
  }
  if (message.type === "SET_SLOW_MODE") return setTwitchSlowMode(message);
  if (message.type === "QUICK_TIMEOUT") return quickTimeout(message);
  if (message.type === "LIST_WORKSPACES") return { names: (await workspaces()).map((entry) => entry.name) };
  if (["SAVE_WORKSPACE", "RESTORE_WORKSPACE", "DELETE_WORKSPACE"].includes(message.type)) {
    const task = workspaceWrites.then(() => runWindowOperation(() => manageWorkspace(message)));
    workspaceWrites = task.catch(() => {});
    return task;
  }
  if (message.type === "OPEN_CHAT_WINDOW") {
    return runWindowOperation(() => openChatWindow(message));
  }
  if (message.type === "GET_STATE") return { state: await snapshot() };
  if (message.type === "AUTH") {
    if (message.consentId !== dataConsent.id) throw new Error(DATA_CONSENT_WITHDRAWN);
    const { settings } = await getSessionData();
    if (!settings.clientId) throw new Error("Save your Twitch application client ID first.");
    const moderator = await validateToken(String(message.accessToken || ""), settings.clientId);
    await extensionApi.storage.session.set({ accessToken: String(message.accessToken), moderator, dataConsentId: message.consentId });
    await publishSnapshot();
    return { state: await snapshot() };
  }
  if (message.type === "SAVE_SETTINGS") {
    const task = settingsWrites.then(() => saveModeratorSettings(message.settings));
    settingsWrites = task.catch(() => {});
    return task;
  }
  if (message.type === "CONNECT") {
    await startChat();
    return { state: await snapshot() };
  }
  if (message.type === "DISCONNECT") {
    await stopChat();
    return { state: await snapshot() };
  }
  if (message.type === "VET" || message.type === "DISMISS" || message.type === "NOTE" || message.type === "MODERATE" || message.type === "WARN") {
    return withAccount(String(message.key || ""), async () => {
    const account = await getAccount(String(message.key || ""));
    if (!account) throw new Error("That chatter is no longer available.");
    const { moderator } = await getSessionData();
    if (message.type === "VET") {
      account.isVetted = true;
      account.approvalSource = "manual";
      account.approvalReason = "manual";
      account.approvedAt = Date.now();
      account.lookupPending = false;
      account.dismissed = false;
      account.reasons = [];
      account.latestAction = "Approved";
      recordAccountActivity(account, { type: "approval", source: "manual" }, moderator);
    } else if (message.type === "DISMISS") {
      account.dismissed = true;
    } else if (message.type === "NOTE") {
      const note = String(message.note || "").trim().slice(0, 500);
      if (note !== (account.note || "")) recordAccountActivity(account, { type: "note", note, previousNote: account.note || "", source: "manual" }, moderator);
      account.note = note;
    } else if (message.type === "WARN") {
      const reason = String(message.reason || "").trim();
      if (!reason) throw new Error("Enter a reason for the warning.");
      await warnUser(account, reason);
    } else {
      if (message.confirmed !== true) throw new Error("Confirm this moderation action first.");
      if (!["ban", "timeout", "unban"].includes(message.action)) throw new Error("Unsupported moderation action.");
      const duration = message.action === "timeout" ? Number(message.duration) : null;
      if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1_209_600)) throw new Error("Timeout must be between 1 second and 14 days.");
      await moderateUser(account, { action: message.action, duration, reason: message.reason });
    }
    await saveAccount(account);
    await publishSnapshot();
    return { state: await snapshot() };
    });
  }
  throw new Error("Unsupported request.");
}

async function refreshAllReasons() {
  const broadcasterId = (await extensionApi.storage.session.get("broadcasterId")).broadcasterId;
  if (!broadcasterId) return;
  const accounts = await getChannelAccounts(broadcasterId, true);
  for (const previous of accounts) {
    await withAccount(previous.key, async () => {
      const account = await getAccount(previous.key);
      if (!account) return;
      account.ageDays = account.createdAt ? accountAgeDays(account.createdAt) : null;
      account.reasons = getFlagReasons(account, activeSettings);
      applyApproval(account, activeSettings);
      await saveAccount(account);
    });
  }
}

extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (["STATE", "ERROR", "NOTICE", "OPEN_SETTINGS", "DATA_CONSENT"].includes(message.type)) return false;
  handleMessage(message).then(sendResponse).catch((error) => sendResponse({ error: error.message || "Something went wrong." }));
  return true;
});

extensionApi.runtime.onConnect.addListener((port) => {
  if (port.name === "dashboard") {
    dashboardPorts.add(port);
    port.onDisconnect.addListener(() => dashboardPorts.delete(port));
  } else if (port.name === "multichat") {
    chatPorts.add(port);
    port.onDisconnect.addListener(() => chatPorts.delete(port));
    void chatReady.then(() => {
      if (chatPorts.has(port)) port.postMessage(chatState());
    }).catch(() => chatPorts.delete(port));
  }
});

extensionApi.alarms.create("token-validation", { periodInMinutes: 60 });
extensionApi.alarms.create("stream-status", { periodInMinutes: 1 });
extensionApi.alarms.onAlarm.addListener((alarm) => {
  if (!consentStatus().accepted) return;
  if (alarm.name === "stream-status") {
    void withDataConsent(() => pollStream()).catch((error) => { if (error.name !== "DataConsentError") broadcast("NOTICE", { message: error.message }); });
    return;
  }
  if (alarm.name !== "token-validation") return;
  void withDataConsent(async () => {
    const { settings, accessToken, moderator } = await getSessionData();
    if (!accessToken) return;
    try {
      const validated = await validateToken(accessToken, settings.clientId, settings);
      await extensionApi.storage.session.set({ moderator: validated });
    } catch (error) {
      if (!error.authFailure) { broadcast("NOTICE", { message: error.message }); return; }
      await extensionApi.storage.session.remove(["accessToken", "moderator"]);
      await stopChat();
      await setStatus("error", error.message);
    }
  }).catch((error) => { if (error.name !== "DataConsentError") broadcast("NOTICE", { message: error.message }); });
});

const consentReady = (async () => {
  dataConsent = (await extensionApi.storage.local.get("dataConsent")).dataConsent || null;
  if (hasDataConsent(dataConsent)) consentController = new AbortController();
  return consentController;
})();

const chatReady = (async () => {
  try {
    const initialConsent = await consentReady;
    const saved = await extensionApi.storage.local.get("chatConfig");
    chatConfig = ChatFlow.normalizeConfig(saved.chatConfig);
    chatFlow.configure(chatConfig.flow);
    const { settings, accessToken } = await getSessionData();
    const storedSession = await extensionApi.storage.session.get(["activeSessionId", "chatConnected"]);
    activeSettings = settings;
    primaryChannel = settings.channel ? ChatFlow.channelName(settings.channel) : "";
    if (allChannels().length > ChatFlow.MAX_CHANNELS) chatConfig.channels = chatConfig.channels.slice(0, 5);
    resetBatchTimer();
    if (!initialConsent || initialConsent !== consentController || !consentStatus().accepted) {
      await clearSessionCredentials();
      manualDisconnect = true;
      return;
    }
    if (accessToken && settings.channel && storedSession.chatConnected === true) {
      await withDataConsent(() => startChat({ resume: Boolean(storedSession.activeSessionId) }), initialConsent);
    }
  } catch (error) {
    if (error.name !== "DataConsentError") await setStatus("error", error.message);
  }
})();