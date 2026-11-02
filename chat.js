"use strict";

const labels = {
  es: {
    moderation: "Moderaci\u00f3n", newWindow: "Nueva ventana", settings: "Ajustes", columns: "Columnas", close: "Cerrar", save: "Guardar",
    channels: "Canales adicionales (separados por comas, 6 en total)", batch: "Intervalo entre lotes (ms)", localSlow: "Slow mode local por usuario (s, 0 = no)",
    spam: "Filtro de spam", repeats: "Ocultar texto repetido a partir del mensaje", frequency: "M\u00e1ximo de mensajes por usuario / ventana",
    window: "Ventana de detecci\u00f3n (s)", pattern: "Patr\u00f3n de spam (regex limitada)", hover: "Pausar al pasar el cursor", empty: "No hay canales configurados.",
    connected: "Conectado", connecting: "Conectando", reconnecting: "Reconectando", disconnected: "Desconectado", error: "Error",
    pause: "Pausar", resume: "En directo", detach: "Separar", slow: "Slow de Twitch (s)", apply: "Aplicar", received: "recibidos", filtered: "filtrados",
    overflow: "omitidos en lotes", skipped: "sin revisar", waiting: "Esperando canal", confirmSlow: "\u00bfCambiar el slow mode real de Twitch en #{channel} a {seconds} s? (0 = desactivar)",
    saved: "Ajustes guardados", slowSaved: "Slow mode actualizado", removed: "Este canal ya no est\u00e1 en la configuraci\u00f3n.", unavailable: "Servicio no disponible. Recarga la extensi\u00f3n.",
    conflict: "Los ajustes cambiaron en otra ventana. Cierra y vuelve a abrir Ajustes.", invalidPattern: "Regex no v\u00e1lida. Solo texto, alternativas |, anclas ^ $, y l\u00edmites \\b; sin grupos ni cuantificadores.",
    reconnectService: "Reconectando con la extensi\u00f3n"
  },
  en: {
    moderation: "Moderation", newWindow: "New window", settings: "Settings", columns: "Columns", close: "Close", save: "Save",
    channels: "Additional channels (comma separated, 6 total)", batch: "Batch interval (ms)", localSlow: "Local slow mode per user (s, 0 = off)",
    spam: "Spam filter", repeats: "Hide repeated text starting at message", frequency: "Maximum messages per user / window",
    window: "Detection window (s)", pattern: "Spam pattern (restricted regex)", hover: "Pause on hover", empty: "No channels configured.",
    connected: "Connected", connecting: "Connecting", reconnecting: "Reconnecting", disconnected: "Disconnected", error: "Error",
    pause: "Pause", resume: "Live", detach: "Detach", slow: "Twitch slow mode (s)", apply: "Apply", received: "received", filtered: "filtered",
    overflow: "batch omissions", skipped: "not reviewed", waiting: "Waiting for channel", confirmSlow: "Change real Twitch slow mode in #{channel} to {seconds} s? (0 = off)",
    saved: "Settings saved", slowSaved: "Slow mode updated", removed: "This channel is no longer configured.", unavailable: "Service unavailable. Reload the extension.",
    conflict: "Settings changed in another window. Close and reopen Settings.", invalidPattern: "Invalid regex. Use text, alternatives |, anchors ^ $, and boundaries \\b only; no groups or quantifiers.",
    reconnectService: "Reconnecting to the extension"
  },
  de: {
    moderation: "Moderation", newWindow: "Neues Fenster", settings: "Einstellungen", columns: "Spalten", close: "Schlie\u00dfen", save: "Speichern",
    channels: "Weitere Kan\u00e4le (kommagetrennt, insgesamt 6)", batch: "Stapelintervall (ms)", localSlow: "Lokaler Slow Mode je Nutzer (s, 0 = aus)",
    spam: "Spamfilter", repeats: "Wiederholten Text ausblenden ab Nachricht", frequency: "Maximale Nachrichten je Nutzer / Zeitfenster",
    window: "Erkennungszeitfenster (s)", pattern: "Spammuster (eingeschr\u00e4nkte Regex)", hover: "Bei Mauszeiger pausieren", empty: "Keine Kan\u00e4le eingerichtet.",
    connected: "Verbunden", connecting: "Verbindung wird aufgebaut", reconnecting: "Erneute Verbindung", disconnected: "Getrennt", error: "Fehler",
    pause: "Pause", resume: "Live", detach: "Abtrennen", slow: "Twitch Slow Mode (s)", apply: "Anwenden", received: "empfangen", filtered: "gefiltert",
    overflow: "im Stapel ausgelassen", skipped: "ungepr\u00fcft", waiting: "Warte auf Kanal", confirmSlow: "Den echten Twitch Slow Mode in #{channel} auf {seconds} s setzen? (0 = aus)",
    saved: "Einstellungen gespeichert", slowSaved: "Slow Mode aktualisiert", removed: "Dieser Kanal ist nicht mehr eingerichtet.", unavailable: "Dienst nicht erreichbar. Erweiterung neu laden.",
    conflict: "Einstellungen wurden in einem anderen Fenster ge\u00e4ndert. Einstellungen erneut \u00f6ffnen.", invalidPattern: "Ung\u00fcltige Regex. Nur Text, Alternativen |, Anker ^ $, Grenzen \\b; keine Gruppen oder Quantoren.",
    reconnectService: "Verbindung zur Erweiterung wird wiederhergestellt"
  }
};
const element = (id) => document.getElementById(id);
const panels = new Map();
const detachedChannel = new URLSearchParams(location.search).get("channel");
let language = "es";
let state;
let draftRevision;
let port;
let reconnectTimer;
let reconnectDelay = 1000;
let toastTimer;
let activeChannel;

function text(key, values = {}) {
  let value = labels[language][key] || labels.en[key] || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}

function localError(error) {
  if (error.message.includes("settings changed")) return text("conflict");
  if (/pattern|regex|quantifier/i.test(error.message)) return text("invalidPattern");
  return error.message;
}

function toast(message) {
  element("chat-toast").textContent = message;
  element("chat-toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element("chat-toast").hidden = true; }, 5000);
}

async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response) throw new Error(text("unavailable"));
  if (response.error) throw new Error(response.error);
  return response;
}

function command(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = label;
  button.addEventListener("click", async () => {
    button.disabled = true;
    try { await action(); } catch (error) { toast(localError(error)); }
    finally { button.disabled = false; }
  });
  return button;
}

function createPanel(channel) {
  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.dataset.channel = channel;
  const header = document.createElement("header");
  header.className = "chat-panel-header";
  const heading = document.createElement("h2");
  heading.textContent = `#${channel}`;
  const pause = command(text("pause"), () => view.paused ? view.resume() : view.setPaused("manual", true));
  pause.className = "chat-pause";
  pause.setAttribute("aria-pressed", "false");
  const detach = command(text("detach"), () => request("OPEN_CHAT_WINDOW", { channel }));
  const room = document.createElement("span");
  room.className = "room-status";
  header.append(heading, pause, detach, room);
  const viewport = document.createElement("div");
  viewport.className = "chat-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "list");
  viewport.setAttribute("aria-label", `#${channel}`);
  const view = new VirtualChat(viewport, {
    pauseOnHover: state.config.flow.pauseOnHover,
    onPause: (paused, pending) => {
      pause.textContent = paused ? `${text("resume")} (${pending})` : text("pause");
      pause.title = pause.textContent;
      pause.setAttribute("aria-pressed", String(paused));
    },
    onInspect: (entry) => {
      element("message-author").textContent = entry.displayName || entry.login;
      element("message-text").textContent = entry.text;
      element("message-dialog").showModal();
    }
  });
  const form = document.createElement("form");
  form.className = "slow-form";
  const label = document.createElement("label");
  const slowLabel = document.createElement("span");
  slowLabel.textContent = text("slow");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "120";
  input.value = "0";
  input.required = true;
  label.append(slowLabel, input);
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = text("apply");
  form.append(label, apply);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const seconds = Number(input.value);
    if (!confirm(text("confirmSlow", { channel, seconds: String(seconds) }))) return;
    apply.disabled = true;
    try { await request("SET_SLOW_MODE", { channel, seconds }); toast(text("slowSaved")); }
    catch (error) { toast(localError(error)); }
    finally { apply.disabled = false; }
  });
  const stats = document.createElement("p");
  stats.className = "chat-stats";
  panel.append(header, viewport, form, stats);
  panel.addEventListener("pointerenter", () => { activeChannel = channel; });
  panel.addEventListener("focusin", () => { activeChannel = channel; });
  element("chat-grid").append(panel);
  return { panel, view, room, input, stats, detach, slowLabel, apply };
}

function renderStats(panel, stats) {
  panel.lastStats = stats;
  panel.stats.textContent = `${stats.received} ${text("received")} / ${stats.filtered} ${text("filtered")} / ${stats.overflow} ${text("overflow")} / ${stats.moderationSkipped} ${text("skipped")}`;
  panel.stats.dataset.overload = String(stats.overflow > 0 || stats.moderationSkipped > 0);
}

function updateLayout() {
  if (!state) return;
  const columns = detachedChannel ? 1 : state.config.columns;
  const grid = element("chat-grid");
  grid.dataset.columns = String(columns);
  grid.style.setProperty("--columns", columns);
  const responsiveColumns = innerWidth <= 600 ? 1 : innerWidth <= 1000 ? Math.min(columns, 2) : columns;
  grid.style.setProperty("--rows", Math.max(1, Math.ceil(panels.size / responsiveColumns)));
  document.querySelectorAll("button[data-columns]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.columns) === columns));
    button.disabled = Boolean(detachedChannel);
  });
}

function renderStatus() {
  if (!state) return;
  element("connection-status").textContent = state.status === "error" ? `${text("error")}: ${state.statusMessage}` : text(state.status);
  for (const [channel, panel] of panels) {
    const room = state.rooms[channel];
    panel.room.textContent = room?.connected ? `${text("connected")} / Slow: ${room.slow ?? 0}s` : text("waiting");
    if (room?.slow !== undefined && document.activeElement !== panel.input) panel.input.value = room.slow;
  }
}

function receive(message) {
  if (message.type === "CHAT_STATE") {
    state = message;
    reconnectDelay = 1000;
    const channels = message.channels.filter((channel) => !detachedChannel || channel.channel === detachedChannel);
    for (const [channel, panel] of panels) {
      if (channels.some((entry) => entry.channel === channel)) continue;
      panel.view.destroy();
      panel.panel.remove();
      panels.delete(channel);
    }
    for (const channel of channels) {
      if (!panels.has(channel.channel)) panels.set(channel.channel, createPanel(channel.channel));
      const panel = panels.get(channel.channel);
      panel.view.configure(state.config.flow.pauseOnHover);
      panel.view.replace(channel.entries);
      renderStats(panel, channel.stats);
    }
    element("no-channels").hidden = panels.size !== 0;
    element("no-channels").textContent = text(detachedChannel ? "removed" : "empty");
    updateLayout();
    renderStatus();
  } else if (message.type === "CHAT_BATCH") {
    for (const batch of message.batches) {
      const panel = panels.get(batch.channel);
      if (panel) { panel.view.append(batch.entries); renderStats(panel, batch.stats); }
    }
  } else if (message.type === "CHAT_PURGE") {
    panels.get(message.channel)?.view.purge(message);
  } else if (message.type === "CHAT_STATUS" && state) {
    Object.assign(state, { status: message.status, statusMessage: message.statusMessage, rooms: message.rooms });
    renderStatus();
  }
}

function connectPort() {
  clearTimeout(reconnectTimer);
  try {
    port = chrome.runtime.connect({ name: "multichat" });
    port.onMessage.addListener(receive);
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      element("connection-status").textContent = text("reconnectService");
      reconnectTimer = setTimeout(connectPort, reconnectDelay);
      reconnectDelay = Math.min(30_000, reconnectDelay * 2);
    });
  } catch { element("connection-status").textContent = text("unavailable"); }
}

function openSettings() {
  if (!state) return;
  draftRevision = state.revision;
  const flow = state.config.flow;
  element("channels").value = state.config.channels.join(", ");
  element("batch-ms").value = flow.batchMs;
  element("local-slow").value = flow.localSlowSeconds;
  element("spam-enabled").checked = flow.spamEnabled;
  element("repeat-limit").value = flow.repeatLimit;
  element("frequency-limit").value = flow.frequencyLimit;
  element("window-seconds").value = flow.windowSeconds;
  element("spam-pattern").value = flow.pattern;
  element("pause-hover").checked = flow.pauseOnHover;
  element("config-error").textContent = "";
  element("chat-settings-dialog").showModal();
}

function applyPreferences({ settings, appearance }) {
  language = labels[settings?.language] ? settings.language : "es";
  document.documentElement.lang = language;
  document.body.dataset.theme = appearance === "dark" ? "dark" : "light";
  document.querySelectorAll("[data-label]").forEach((node) => { node.textContent = text(node.dataset.label); });
  document.querySelector(".layout-control").setAttribute("aria-label", text("columns"));
  for (const panel of panels.values()) {
    panel.detach.textContent = text("detach");
    panel.detach.title = text("detach");
    panel.slowLabel.textContent = text("slow");
    panel.apply.textContent = text("apply");
    panel.view.onPause(panel.view.paused, panel.view.pending);
    if (panel.lastStats) renderStats(panel, panel.lastStats);
  }
  renderStatus();
}

element("chat-settings").addEventListener("click", openSettings);
element("open-grid").addEventListener("click", () => request("OPEN_CHAT_WINDOW").catch((error) => toast(localError(error))));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => element(button.dataset.close).close()));
document.querySelectorAll("button[data-columns]").forEach((button) => button.addEventListener("click", async () => {
  if (!state) return;
  try { await request("SAVE_CHAT_CONFIG", { revision: state.revision, config: { ...state.config, columns: Number(button.dataset.columns) } }); }
  catch (error) { toast(localError(error)); }
}));
element("chat-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const config = ChatFlow.normalizeConfig({
      channels: element("channels").value.split(",").map((channel) => channel.trim()).filter(Boolean), columns: state.config.columns,
      flow: {
        batchMs: Number(element("batch-ms").value), localSlowSeconds: Number(element("local-slow").value),
        spamEnabled: element("spam-enabled").checked, repeatLimit: Number(element("repeat-limit").value),
        frequencyLimit: Number(element("frequency-limit").value), windowSeconds: Number(element("window-seconds").value),
        pattern: element("spam-pattern").value, pauseOnHover: element("pause-hover").checked
      }
    });
    await request("SAVE_CHAT_CONFIG", { config, revision: draftRevision });
    element("chat-settings-dialog").close();
    toast(text("saved"));
  } catch (error) { element("config-error").textContent = localError(error); }
  finally { button.disabled = false; }
});
document.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, button, a, [contenteditable=true]") || document.querySelector("dialog[open]") || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const view = (panels.get(activeChannel) || panels.values().next().value)?.view;
  if (event.code === "Space" && view) { event.preventDefault(); view.paused ? view.resume() : view.setPaused("manual", true); }
  if (event.key === "End" && view) { event.preventDefault(); view.resume(); }
  if (event.key.toLowerCase() === "s") { event.preventDefault(); openSettings(); }
  if (event.key.toLowerCase() === "n") { event.preventDefault(); void request("OPEN_CHAT_WINDOW").catch((error) => toast(localError(error))); }
});
window.addEventListener("resize", updateLayout);
document.addEventListener("visibilitychange", () => { if (!document.hidden) for (const panel of panels.values()) panel.view.schedule(); });
window.addEventListener("pagehide", () => {
  clearTimeout(reconnectTimer);
  port?.disconnect();
  for (const panel of panels.values()) panel.view.destroy();
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") void chrome.storage.local.get(["settings", "appearance"]).then(applyPreferences);
});
void chrome.storage.local.get(["settings", "appearance"]).then(applyPreferences).catch((error) => toast(localError(error)));
connectPort();