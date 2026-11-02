importScripts("core.js", "chat-flow.js");

const { parseIrcLine, accountAgeDays, normalizeSettings, getFlagReasons, recordMessage } = ModerationCore;
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

let databasePromise;
let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let reconnectAttempt = 0;
let manualDisconnect = false;
let joined = false;
let status = "disconnected";
let statusMessage = "Ready to monitor";
let activeSettings = normalizeSettings();
let sessionChatters = new Set();
let sessionNewAccounts = new Set();
let activeSessionId = "";

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

async function getAccount(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveAccount(account) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE, "readwrite").objectStore(STORE).put(account);
    request.onsuccess = () => resolve(account);
    request.onerror = () => reject(request.error);
  });
}

async function getChannelAccounts(broadcasterId) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).index("broadcasterId").getAll(broadcasterId);
    request.onsuccess = () => resolve(request.result || []);
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

async function saveCachedProfile(profile) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(PROFILE_STORE, "readwrite").objectStore(PROFILE_STORE).put(profile);
    request.onsuccess = () => resolve(profile);
    request.onerror = () => reject(request.error);
  });
}

async function getSessionData() {
  const values = await chrome.storage.local.get("settings");
  const sessionValues = await chrome.storage.session.get(["accessToken", "moderator"]);
  return {
    settings: normalizeSettings(values.settings),
    accessToken: sessionValues.accessToken || "",
    moderator: sessionValues.moderator || null
  };
}

async function apiRequest(path, { method = "GET", body, token, clientId, query } = {}) {
  const auth = token && clientId ? { accessToken: token, settings: { clientId } } : await getSessionData();
  if (!auth.accessToken || !auth.settings.clientId) throw new Error("Sign in with Twitch before using Helix.");
  const url = new URL(`${HELIX}${path}`);
  if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Client-Id": auth.settings.clientId,
      "Authorization": `Bearer ${auth.accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).message || ""; } catch { /* Response may be empty. */ }
    if (response.status === 401) await chrome.storage.session.remove(["accessToken", "moderator"]);
    throw new Error(detail || `Twitch API returned ${response.status}.`);
  }
  return response.status === 204 ? null : response.json();
}

async function validateToken(token, clientId, settings = activeSettings) {
  const response = await fetch(OAUTH_VALIDATE, { headers: { Authorization: `OAuth ${token}` } });
  if (!response.ok) throw new Error("Twitch sign-in expired. Sign in again to continue.");
  const user = await response.json();
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
  chrome.runtime.sendMessage({ type, ...payload }).catch(() => {});
}

async function snapshot() {
  const { settings, moderator } = await getSessionData();
  const broadcasterId = (await chrome.storage.session.get("broadcasterId")).broadcasterId;
  const accounts = broadcasterId ? await getChannelAccounts(broadcasterId) : [];
  const flagged = accounts
    .filter((account) => !account.isVetted && !account.dismissed && (account.reasons?.length || account.lookupPending))
    .sort((left, right) => (right.lastMessageAt || 0) - (left.lastMessageAt || 0));
  return {
    settings,
    moderator,
    status,
    statusMessage,
    broadcasterId: broadcasterId || "",
    chatters: sessionChatters.size,
    newAccounts: sessionNewAccounts.size,
    flagged: flagged.length,
    accounts: flagged.slice(0, 100)
  };
}

async function publishSnapshot() {
  if (snapshotTimer || snapshotRunning || !dashboardPorts.size) return;
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
    type: "CHAT_STATE", config: chatConfig, revision: chatConfigRevision, status, statusMessage,
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
  await chrome.storage.local.set({ chatConfig: next });
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
    if (activeSettings.flagNewFollower) {
      try { updates.followedAt = await checkFollower(account.broadcasterId, account.userId); }
      catch (error) { updates.followerError = error.message || "Follower lookup failed"; }
    }
    const current = await getAccount(account.key);
    if (!current) return;
    Object.assign(current, updates, { lookupPending: false });
    current.reasons = getFlagReasons(current, activeSettings);
    await saveAccount(current);
    await applyAutomaticTimeout(current);
    await publishSnapshot();
  })().finally(() => lookupsInFlight.delete(account.key));
  lookupsInFlight.set(account.key, task);
  return task;
}

async function processChatMessage(message) {
  if (message.command !== "PRIVMSG" || !message.prefix || hasPrivilegedBadge(message.tags)) return;
  const userId = message.tags["user-id"];
  const broadcasterId = message.tags["room-id"] || (await chrome.storage.session.get("broadcasterId")).broadcasterId;
  if (!userId || !broadcasterId) return;
  const login = getLogin(message.prefix);
  if (!login || login === "tmi.twitch.tv") return;
  const displayName = message.tags["display-name"] || login;
  sessionChatters.add(userId);
  const account = await getAccountOrCreate({ broadcasterId, userId, login, displayName, tags: message.tags });
  account.login = login;
  account.displayName = displayName;
  account.ageDays = account.createdAt ? accountAgeDays(account.createdAt) : null;
  recordMessage(account, message, activeSessionId);
  account.reasons = getFlagReasons(account, activeSettings);
  await saveAccount(account);
  await publishSnapshot();

  if (account.lookupPending && !account.isVetted && !account.dismissed) await lookupSignals(account);
  else await applyAutomaticTimeout(account);
}

function handleChatMessage(message) {
  if (message.command !== "PRIVMSG" || !message.tags["user-id"]) return Promise.resolve();
  if (hasPrivilegedBadge(message.tags)) return Promise.resolve();
  if (queuedModeration >= 256) {
    chatFlow.channel(primaryChannel).stats.moderationSkipped += 1;
    return Promise.resolve();
  }
  queuedModeration += 1;
  return new Promise((resolve) => {
    moderationWaiting.push({ message, resolve, session: activeSessionId });
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
    Promise.resolve().then(() => job.session === activeSessionId ? processChatMessage(job.message) : undefined)
      .catch((error) => console.warn("Could not process chat message", error))
      .finally(() => {
        messageQueues.delete(key);
        runningModeration -= 1;
        queuedModeration -= 1;
        job.resolve();
        drainModeration();
      });
  }
}

async function moderateUser(account, { duration, reason }) {
  const { moderator } = await getSessionData();
  const broadcasterId = account.broadcasterId;
  if (!moderator?.user_id || !broadcasterId) throw new Error("Sign in and connect to a channel first.");
  const body = { data: { user_id: account.userId, reason: String(reason || "").slice(0, 500) } };
  if (duration != null) body.data.duration = duration;
  await apiRequest(`/moderation/bans?broadcaster_id=${encodeURIComponent(broadcasterId)}&moderator_id=${encodeURIComponent(moderator.user_id)}`, { method: "POST", body });
  account.latestAction = duration == null ? "Banned" : `Timed out for ${Math.ceil(duration / 60)} min`;
  account.dismissed = true;
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
  await saveAccount(account);
  await publishSnapshot();
}

async function applyAutomaticTimeout(account) {
  if (!activeSettings.autoTimeout || account.autoTimeoutApplied || account.isVetted || account.dismissed) return;
  if (!account.reasons?.length || account.messageCount < activeSettings.messageThreshold) return;
  account.autoTimeoutApplied = true;
  await saveAccount(account);
  try {
    await moderateUser(account, {
      duration: activeSettings.timeoutMinutes * 60,
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
    void startChat({ reconnect: true }).catch((error) => {
      void setStatus("error", error.message);
      scheduleReconnect();
    });
  }, delay);
}

async function startChat({ reconnect = false, resume = false } = {}) {
  const generation = ++connectionGeneration;
  if (!reconnect && !resume) {
    manualDisconnect = false;
    reconnectAttempt = 0;
    sessionChatters = new Set();
    sessionNewAccounts = new Set();
    activeSessionId = crypto.randomUUID();
    await chrome.storage.session.set({ activeSessionId });
  } else if (!activeSessionId) {
    const storedSession = await chrome.storage.session.get("activeSessionId");
    activeSessionId = storedSession.activeSessionId || crypto.randomUUID();
    await chrome.storage.session.set({ activeSessionId });
  }
  const { settings, accessToken, moderator } = await getSessionData();
  activeSettings = settings;
  if (!accessToken || !moderator?.user_id) throw new Error("Sign in with Twitch before connecting chat.");
  const nextPrimary = ChatFlow.channelName(settings.channel);
  if (new Set([nextPrimary, ...chatConfig.channels]).size > ChatFlow.MAX_CHANNELS) throw new Error("Remove a chat before connecting another primary channel (maximum 6).");
  const broadcaster = await loadChannel();
  if (generation !== connectionGeneration) return;
  primaryChannel = nextPrimary;
  manualDisconnect = false;
  await chrome.storage.session.set({ chatConnected: true });
  await chrome.storage.session.set({ broadcasterId: broadcaster.id, broadcasterLogin: broadcaster.login });
  if (generation !== connectionGeneration) return;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) socket.close();
  joined = false;
  joinedChannels.clear();
  roomStates.clear();
  syncChannels();
  await setStatus("connecting", `Connecting to ${broadcaster.login}…`);
  const connection = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
  socket = connection;
  connection.onopen = () => {
    if (socket !== connection) return;
    const nickname = moderator.login || "moderator";
    connection.send(`PASS oauth:${accessToken}\r\n`);
    connection.send(`NICK ${nickname}\r\n`);
    connection.send("CAP REQ :twitch.tv/tags twitch.tv/commands\r\n");
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => sendIrc("PING :chatter-watch"), 20_000);
    void setStatus("connecting", "Signing in to Twitch chat…");
  };
  connection.onmessage = (event) => {
    if (socket !== connection) return;
    for (const line of String(event.data).split("\r\n").filter(Boolean)) {
      const message = parseIrcLine(line);
      if (!message) continue;
      if (message.command === "PING") {
        sendIrc(`PONG :${message.trailing || message.params[0] || "tmi.twitch.tv"}`);
      } else if (message.command === "001" && !joined) {
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
          void chrome.storage.session.remove(["accessToken", "moderator"]);
          void setStatus("error", "Chat authentication failed. Sign in again.");
          manualDisconnect = true;
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
  await chrome.storage.session.set({ chatConnected: false });
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (socket) socket.close(1000, "Disconnected by moderator");
  socket = null;
  joined = false;
  joinedChannels.clear();
  roomStates.clear();
  await chrome.storage.session.remove("broadcasterId");
  await setStatus("disconnected", "Chat disconnected");
}

async function handleMessage(message) {
  await chatReady;
  if (message.type === "GET_CHAT_STATE") return chatState();
  if (message.type === "SAVE_CHAT_CONFIG") {
    const task = configWrites.then(() => saveChatConfig(message));
    configWrites = task.catch(() => {});
    return task;
  }
  if (message.type === "SET_SLOW_MODE") return setTwitchSlowMode(message);
  if (message.type === "OPEN_CHAT_WINDOW") {
    const channel = message.channel ? ChatFlow.channelName(message.channel) : "";
    if (channel && !allChannels().includes(channel)) throw new Error("Add this channel before detaching it.");
    const url = new URL(chrome.runtime.getURL("chat.html"));
    if (channel) url.searchParams.set("channel", channel);
    const windowInfo = await chrome.windows.create({ url: url.href, type: "popup", width: channel ? 460 : 1180, height: 760 });
    return { windowId: windowInfo.id };
  }
  if (message.type === "GET_STATE") return { state: await snapshot() };
  if (message.type === "AUTH") {
    const { settings } = await getSessionData();
    if (!settings.clientId) throw new Error("Save your Twitch application client ID first.");
    const moderator = await validateToken(String(message.accessToken || ""), settings.clientId);
    await chrome.storage.session.set({ accessToken: String(message.accessToken), moderator });
    await publishSnapshot();
    return { state: await snapshot() };
  }
  if (message.type === "SAVE_SETTINGS") {
    const stored = await chrome.storage.local.get("settings");
    const previousSettings = normalizeSettings(stored.settings);
    const nextSettings = normalizeSettings(message.settings);
    const nextPrimary = nextSettings.channel ? ChatFlow.channelName(nextSettings.channel) : "";
    if (new Set([nextPrimary, ...chatConfig.channels].filter(Boolean)).size > ChatFlow.MAX_CHANNELS) throw new Error("At most 6 channels, including the primary channel, are supported.");
    activeSettings = nextSettings;
    await chrome.storage.local.set({ settings: activeSettings });
    primaryChannel = nextPrimary;
    const clientChanged = previousSettings.clientId !== activeSettings.clientId;
    const channelChanged = previousSettings.channel !== activeSettings.channel;
    if (clientChanged) {
      await chrome.storage.session.remove(["accessToken", "moderator"]);
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
  if (message.type === "CONNECT") {
    await startChat();
    return { state: await snapshot() };
  }
  if (message.type === "DISCONNECT") {
    await stopChat();
    return { state: await snapshot() };
  }
  if (message.type === "VET" || message.type === "DISMISS" || message.type === "NOTE" || message.type === "MODERATE" || message.type === "WARN") {
    const account = await getAccount(String(message.key || ""));
    if (!account) throw new Error("That chatter is no longer available.");
    if (message.type === "VET") {
      account.isVetted = true;
      account.dismissed = false;
      account.reasons = [];
      account.latestAction = "Approved";
    } else if (message.type === "DISMISS") {
      account.dismissed = true;
    } else if (message.type === "NOTE") {
      account.note = String(message.note || "").trim().slice(0, 500);
    } else if (message.type === "WARN") {
      const reason = String(message.reason || "").trim();
      if (!reason) throw new Error("Enter a reason for the warning.");
      await warnUser(account, reason);
    } else {
      const duration = message.action === "ban" ? null : Number(message.duration);
      if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 1_209_600)) throw new Error("Timeout must be between 1 second and 14 days.");
      await moderateUser(account, { duration, reason: message.reason });
    }
    await saveAccount(account);
    await publishSnapshot();
    return { state: await snapshot() };
  }
  throw new Error("Unsupported request.");
}

async function refreshAllReasons() {
  const broadcasterId = (await chrome.storage.session.get("broadcasterId")).broadcasterId;
  if (!broadcasterId) return;
  const accounts = await getChannelAccounts(broadcasterId);
  for (const account of accounts) {
    account.ageDays = account.createdAt ? accountAgeDays(account.createdAt) : null;
    account.reasons = getFlagReasons(account, activeSettings);
    await saveAccount(account);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (["STATE", "ERROR", "NOTICE"].includes(message.type)) return false;
  handleMessage(message).then(sendResponse).catch((error) => sendResponse({ error: error.message || "Something went wrong." }));
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
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

chrome.alarms.create("token-validation", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "token-validation") return;
  void (async () => {
    const { settings, accessToken, moderator } = await getSessionData();
    if (!accessToken) return;
    try {
      const validated = await validateToken(accessToken, settings.clientId, settings);
      await chrome.storage.session.set({ moderator: validated });
    } catch (error) {
      await chrome.storage.session.remove(["accessToken", "moderator"]);
      manualDisconnect = true;
      if (socket) socket.close();
      await setStatus("error", error.message);
    }
  })();
});

const chatReady = (async () => {
  try {
    const saved = await chrome.storage.local.get("chatConfig");
    chatConfig = ChatFlow.normalizeConfig(saved.chatConfig);
    chatFlow.configure(chatConfig.flow);
    const { settings, accessToken } = await getSessionData();
    const storedSession = await chrome.storage.session.get(["activeSessionId", "chatConnected"]);
    activeSettings = settings;
    primaryChannel = settings.channel ? ChatFlow.channelName(settings.channel) : "";
    if (allChannels().length > ChatFlow.MAX_CHANNELS) chatConfig.channels = chatConfig.channels.slice(0, 5);
    resetBatchTimer();
    if (accessToken && settings.channel && storedSession.chatConnected === true) {
      await startChat({ resume: Boolean(storedSession.activeSessionId) });
    }
  } catch (error) {
    await setStatus("error", error.message);
  }
})();