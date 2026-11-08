"use strict";

const extensionApi = globalThis.browser ?? globalThis.chrome;

const labels = {
  es: {
    invalidSettings: "Completa los campos con valores v\u00e1lidos.",
    moderation: "Moderaci\u00f3n", newWindow: "Abrir Multichat", settings: "Ajustes", columns: "Columnas", close: "Cerrar", save: "Guardar",
    channels: "Canales adicionales (separados por comas, 6 en total)", batch: "Intervalo entre lotes (ms)", localSlow: "Slow mode local por usuario (s, 0 = no)",
    spam: "Filtro de spam", repeats: "Ocultar texto repetido a partir del mensaje", frequency: "M\u00e1ximo de mensajes por usuario / ventana",
    window: "Ventana de detecci\u00f3n (s)", pattern: "Patr\u00f3n de spam (regex limitada)", hover: "Pausar al pasar el cursor", empty: "No hay canales configurados.",
    connected: "Conectado", connecting: "Conectando", reconnecting: "Reconectando", disconnected: "Desconectado", error: "Error",
    pause: "Pausar", resume: "En directo", detach: "Separar", slow: "Slow de Twitch (s)", apply: "Aplicar", received: "recibidos", filtered: "filtrados",
    overflow: "omitidos en lotes", skipped: "sin revisar", waiting: "Esperando canal", confirmSlow: "\u00bfCambiar el slow mode real de Twitch en #{channel} a {seconds} s? (0 = desactivar)",
    saved: "Ajustes guardados", slowSaved: "Slow mode actualizado", removed: "Este canal ya no est\u00e1 en la configuraci\u00f3n.", unavailable: "Servicio no disponible. Recarga la extensi\u00f3n.",
    conflict: "Los ajustes cambiaron en otra ventana. Cierra y vuelve a abrir Ajustes.", invalidPattern: "Regex no v\u00e1lida. Solo texto, alternativas |, anclas ^ $, y l\u00edmites \\b; sin grupos ni cuantificadores.",
    reconnectService: "Reconectando con la extensi\u00f3n",
    workspaces: "Espacios", workspaceName: "Nombre del espacio", savedWorkspaces: "Espacios guardados", saveWorkspace: "Guardar ventanas actuales", restore: "Restaurar", remove: "Eliminar",
    workspaceSaved: "Espacio guardado", workspaceRestored: "Espacio restaurado", overwrite: "\u00bfReemplazar el espacio {name}?", deleteWorkspace: "\u00bfEliminar el espacio {name}?",
    grid: "Cuadr\u00edcula", unified: "Unificado", highlights: "Resaltado de palabras", addHighlight: "A\u00f1adir resaltado", color: "Color", highlightPattern: "Palabra o regex",
    export: "Exportar TXT", pinned: "Fijados", unpin: "Desfijar", inspect: "Leer completo", deleted: "Eliminado en Twitch", quickTimeout: "Timeout de 1 segundo (/srs)", timedOut: "Timeout de 1 s aplicado a {name}", noWorkspaces: "Sin espacios guardados"
  },
  en: {
    invalidSettings: "Complete the fields with valid values.",
    moderation: "Moderation", newWindow: "Open Multichat", settings: "Settings", columns: "Columns", close: "Close", save: "Save",
    channels: "Additional channels (comma separated, 6 total)", batch: "Batch interval (ms)", localSlow: "Local slow mode per user (s, 0 = off)",
    spam: "Spam filter", repeats: "Hide repeated text starting at message", frequency: "Maximum messages per user / window",
    window: "Detection window (s)", pattern: "Spam pattern (restricted regex)", hover: "Pause on hover", empty: "No channels configured.",
    connected: "Connected", connecting: "Connecting", reconnecting: "Reconnecting", disconnected: "Disconnected", error: "Error",
    pause: "Pause", resume: "Live", detach: "Detach", slow: "Twitch slow mode (s)", apply: "Apply", received: "received", filtered: "filtered",
    overflow: "batch omissions", skipped: "not reviewed", waiting: "Waiting for channel", confirmSlow: "Change real Twitch slow mode in #{channel} to {seconds} s? (0 = off)",
    saved: "Settings saved", slowSaved: "Slow mode updated", removed: "This channel is no longer configured.", unavailable: "Service unavailable. Reload the extension.",
    conflict: "Settings changed in another window. Close and reopen Settings.", invalidPattern: "Invalid regex. Use text, alternatives |, anchors ^ $, and boundaries \\b only; no groups or quantifiers.",
    reconnectService: "Reconnecting to the extension",
    workspaces: "Workspaces", workspaceName: "Workspace name", savedWorkspaces: "Saved workspaces", saveWorkspace: "Save current windows", restore: "Restore", remove: "Remove",
    workspaceSaved: "Workspace saved", workspaceRestored: "Workspace restored", overwrite: "Replace workspace {name}?", deleteWorkspace: "Delete workspace {name}?",
    grid: "Grid", unified: "Unified", highlights: "Keyword highlights", addHighlight: "Add highlight", color: "Color", highlightPattern: "Word or regex",
    export: "Export TXT", pinned: "Pinned", unpin: "Unpin", inspect: "Read full message", deleted: "Deleted on Twitch", quickTimeout: "1-second timeout (/srs)", timedOut: "1 s timeout applied to {name}", noWorkspaces: "No saved workspaces"
  },
  de: {
    invalidSettings: "Bitte g\u00fcltige Werte in die Felder eintragen.",
    moderation: "Moderation", newWindow: "Multichat \u00f6ffnen", settings: "Einstellungen", columns: "Spalten", close: "Schlie\u00dfen", save: "Speichern",
    channels: "Weitere Kan\u00e4le (kommagetrennt, insgesamt 6)", batch: "Stapelintervall (ms)", localSlow: "Lokaler Slow Mode je Nutzer (s, 0 = aus)",
    spam: "Spamfilter", repeats: "Wiederholten Text ausblenden ab Nachricht", frequency: "Maximale Nachrichten je Nutzer / Zeitfenster",
    window: "Erkennungszeitfenster (s)", pattern: "Spammuster (eingeschr\u00e4nkte Regex)", hover: "Bei Mauszeiger pausieren", empty: "Keine Kan\u00e4le eingerichtet.",
    connected: "Verbunden", connecting: "Verbindung wird aufgebaut", reconnecting: "Erneute Verbindung", disconnected: "Getrennt", error: "Fehler",
    pause: "Pause", resume: "Live", detach: "Abtrennen", slow: "Twitch Slow Mode (s)", apply: "Anwenden", received: "empfangen", filtered: "gefiltert",
    overflow: "im Stapel ausgelassen", skipped: "ungepr\u00fcft", waiting: "Warte auf Kanal", confirmSlow: "Den echten Twitch Slow Mode in #{channel} auf {seconds} s setzen? (0 = aus)",
    saved: "Einstellungen gespeichert", slowSaved: "Slow Mode aktualisiert", removed: "Dieser Kanal ist nicht mehr eingerichtet.", unavailable: "Dienst nicht erreichbar. Erweiterung neu laden.",
    conflict: "Einstellungen wurden in einem anderen Fenster ge\u00e4ndert. Einstellungen erneut \u00f6ffnen.", invalidPattern: "Ung\u00fcltige Regex. Nur Text, Alternativen |, Anker ^ $, Grenzen \\b; keine Gruppen oder Quantoren.",
    reconnectService: "Verbindung zur Erweiterung wird wiederhergestellt",
    workspaces: "Arbeitsbereiche", workspaceName: "Name des Arbeitsbereichs", savedWorkspaces: "Gespeicherte Arbeitsbereiche", saveWorkspace: "Aktuelle Fenster speichern", restore: "Wiederherstellen", remove: "Entfernen",
    workspaceSaved: "Arbeitsbereich gespeichert", workspaceRestored: "Arbeitsbereich wiederhergestellt", overwrite: "Arbeitsbereich {name} ersetzen?", deleteWorkspace: "Arbeitsbereich {name} l\u00f6schen?",
    grid: "Raster", unified: "Zusammengef\u00fchrt", highlights: "Schl\u00fcsselw\u00f6rter hervorheben", addHighlight: "Hervorhebung hinzuf\u00fcgen", color: "Farbe", highlightPattern: "Wort oder Regex",
    export: "TXT exportieren", pinned: "Angeheftet", unpin: "L\u00f6sen", inspect: "Vollst\u00e4ndig lesen", deleted: "Auf Twitch gel\u00f6scht", quickTimeout: "Timeout f\u00fcr 1 Sekunde (/srs)", timedOut: "Timeout von 1 s f\u00fcr {name} angewendet", noWorkspaces: "Keine gespeicherten Arbeitsbereiche"
  }
};
const element = (id) => document.getElementById(id);
const panels = new Map();
const pinnedMessages = new Map();
const UNIFIED = "*";
const detachedChannel = new URLSearchParams(location.search).get("channel");
let language = ModerationCore.resolveLanguage();
let state;
let sharedSettings = ModerationCore.normalizeSettings();
let draftRevision;
let chatSettingsDirty = false;
let chatSettingsEdit = 0;
let chatSaveTimer;
let chatSavePromise;
let port;
let reconnectTimer;
let reconnectDelay = 1000;
let toastTimer;
let activeChannel;
let workspaceNames = [];

function showMessage(entry) {
  element("message-author").textContent = `#${entry.channel} / ${entry.displayName || entry.login}${entry.deleted ? ` / ${text("deleted")}` : ""}`;
  element("message-text").textContent = entry.text;
  element("message-dialog").showModal();
}

async function messageAction(action, entry, view) {
  try {
    if (action === "pin") { pinMessage(entry, view); return; }
    if (!ExtensionView.dataConsent().accepted) throw new Error(ExtensionView.label("privacyRequired"));
    const title = ExtensionView.label(action);
    const context = `#${entry.channel} / ${entry.displayName || entry.login}\n${entry.text}`;
    if (action === "delete") {
      if (!await ExtensionView.dialog({ title, body: context, danger: true })) return;
      await request("DELETE_MESSAGE", { channel: entry.channel, id: entry.id, confirmed: true });
    } else if (action === "translate") {
      if (!sharedSettings.translationUrl) throw new Error(`${ExtensionView.label("settings")}: ${ExtensionView.label("translationUrl")}`);
      const server = new URL(sharedSettings.translationUrl).origin;
      if (!await ExtensionView.dialog({ title, body: `${ExtensionView.label("provider")}\n${server}\n\n${context}` })) return;
      const result = await request("TRANSLATE_MESSAGE", { channel: entry.channel, id: entry.id, confirmed: true });
      showMessage({ ...entry, text: `${ExtensionView.label("source")}\n${entry.text}\n\n${ExtensionView.label("result")} (${result.target})\n${result.text}` });
    }
  } catch (error) { toast(localError(error)); }
}

function pinMessage(entry, view) {
  const key = `${entry.channel}:${entry.id}`;
  pinnedMessages.delete(key);
  pinnedMessages.set(key, { ...entry });
  if (pinnedMessages.size > 3) pinnedMessages.delete(pinnedMessages.keys().next().value);
  if (view.viewport.contains(document.activeElement)) document.activeElement.blur();
  view.resume();
  renderPins();
}

function renderPins() {
  for (const [channel, panel] of panels) {
    panel.pins.replaceChildren();
    const entries = [...pinnedMessages].filter(([, entry]) => channel === UNIFIED || channel === entry.channel);
    panel.pins.hidden = !entries.length;
    panel.pins.setAttribute("aria-label", text("pinned"));
    for (const [key, entry] of entries) {
      const item = document.createElement("article");
      item.className = "pinned-message";
      item.dataset.deleted = String(Boolean(entry.deleted));
      const author = document.createElement("strong");
      author.textContent = `#${entry.channel} / ${entry.displayName || entry.login}${entry.deleted ? ` / ${text("deleted")}` : ""}`;
      const content = document.createElement("p");
      VirtualChat.highlight(content, entry.text, panel.view.highlights);
      const actions = document.createElement("div");
      actions.className = "pin-actions";
      const inspect = command(text("inspect"), () => showMessage(entry));
      const timeout = command("/srs 1s", async () => {
        if (!await ExtensionView.dialog({ title: text("quickTimeout"), body: `#${entry.channel} / ${entry.displayName || entry.login}\n1s /srs`, danger: true })) return;
        await request("QUICK_TIMEOUT", { channel: entry.channel, id: entry.id, confirmed: true });
        toast(text("timedOut", { name: entry.displayName || entry.login }));
      });
      timeout.className = "quick-timeout";
      timeout.title = `${text("quickTimeout")}: #${entry.channel} / ${entry.displayName || entry.login}`;
      timeout.setAttribute("aria-label", timeout.title);
      timeout.disabled = !entry.userId;
      const unpin = command("\u00d7", () => { pinnedMessages.delete(key); renderPins(); });
      unpin.title = text("unpin");
      unpin.setAttribute("aria-label", text("unpin"));
      unpin.className = "unpin-message";
      actions.append(inspect, command(ExtensionView.label("delete"), () => messageAction("delete", entry, panel.view)), command(ExtensionView.label("translate"), () => messageAction("translate", entry, panel.view)), timeout, unpin);
      item.append(author, content, actions);
      panel.pins.append(item);
    }
  }
}

function exportChat(view, channel) {
  const blob = new Blob([ChatFlow.exportText(view.buffer.values())], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chatter-${channel === UNIFIED ? "unified" : channel}-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function text(key, values = {}) {
  let value = labels[language][key] || labels.en[key] || key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}

function localError(error) {
  const privacy = ExtensionView.privacyError(error.message);
  if (privacy !== error.message) return privacy;
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
  const response = await extensionApi.runtime.sendMessage({ type, ...payload });
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
  heading.textContent = channel === UNIFIED ? text("unified") : `#${channel}`;
  const pause = command(text("pause"), () => view.paused ? view.resume() : view.setPaused("manual", true));
  pause.className = "chat-pause";
  pause.setAttribute("aria-pressed", "false");
  const detach = command(text("detach"), () => request("OPEN_CHAT_WINDOW", { channel: channel === UNIFIED ? "" : channel }));
  const exportButton = command(text("export"), () => exportChat(view, channel));
  exportButton.prepend(ExtensionView.icon("Download"));
  exportButton.className = "export-chat";
  exportButton.title = text("export");
  exportButton.setAttribute("aria-label", text("export"));
  const room = document.createElement("span");
  room.className = "room-status";
  header.append(heading, pause, detach, exportButton, room);
  const pins = document.createElement("section");
  pins.className = "pinned-messages";
  pins.hidden = true;
  const viewport = document.createElement("div");
  viewport.className = "chat-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "list");
  viewport.setAttribute("aria-label", `#${channel}`);
  const view = new VirtualChat(viewport, {
    pauseOnHover: state.config.flow.pauseOnHover,
    unified: channel === UNIFIED, highlights: state.config.highlights || [],
    onPause: (paused, pending) => {
      pause.textContent = paused ? `${text("resume")} (${pending})` : text("pause");
      pause.title = pause.textContent;
      pause.setAttribute("aria-pressed", String(paused));
    },
    onInspect: (entry) => pinMessage(entry, view),
    onAction: messageAction
  });
  const form = document.createElement("form");
  form.className = "slow-form";
  form.hidden = channel === UNIFIED;
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
  panel.append(header, pins, viewport, form, stats);
  panel.addEventListener("pointerenter", () => { activeChannel = channel; });
  panel.addEventListener("focusin", () => { activeChannel = channel; });
  element("chat-grid").append(panel);
  return { panel, view, room, input, stats, detach, slowLabel, apply, pins, heading, exportButton };
}

function renderStats(panel, stats) {
  panel.lastStats = stats;
  panel.stats.textContent = `${stats.received} ${text("received")} / ${stats.filtered} ${text("filtered")} / ${stats.overflow} ${text("overflow")} / ${stats.moderationSkipped} ${text("skipped")}`;
  panel.stats.dataset.overload = String(stats.overflow > 0 || stats.moderationSkipped > 0);
}

function updateLayout() {
  if (!state) return;
  const unified = state.config.viewMode === "unified" && !detachedChannel;
  const columns = detachedChannel || unified ? 1 : state.config.columns;
  const grid = element("chat-grid");
  grid.dataset.columns = String(columns);
  grid.style.setProperty("--columns", columns);
  const responsiveColumns = innerWidth <= 600 ? 1 : innerWidth <= 1000 ? Math.min(columns, 2) : columns;
  grid.style.setProperty("--rows", Math.max(1, Math.ceil(panels.size / responsiveColumns)));
  document.querySelectorAll("button[data-columns]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.columns) === columns));
    button.disabled = Boolean(detachedChannel) || unified;
  });
  document.querySelectorAll("button[data-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === (unified ? "unified" : "grid")));
    button.disabled = Boolean(detachedChannel);
  });
}

function renderStatus() {
  if (!state) return;
  element("connection-status").textContent = !ExtensionView.dataConsent().accepted ? ExtensionView.label("privacyOfflineStatus")
    : state.status === "error" ? `${text("error")}: ${state.statusMessage}` : text(state.status);
  for (const [channel, panel] of panels) {
    if (channel === UNIFIED) {
      panel.room.textContent = state.channels.map((entry) => `#${entry.channel}: ${text(state.rooms[entry.channel]?.connected ? "connected" : "waiting")}`).join(" / ");
      continue;
    }
    const room = state.rooms[channel];
    panel.room.textContent = room?.connected ? `${text("connected")} / Slow: ${room.slow ?? 0}s` : text("waiting");
    if (room?.slow !== undefined && document.activeElement !== panel.input) panel.input.value = room.slow;
  }
}

function receive(message) {
  if (message.type === "DATA_CONSENT") {
    ExtensionView.updateDataConsent(message.dataConsent);
    renderStatus();
    return;
  }
  if (message.type === "REVIEW_ALERT") { if (ExtensionView.dataConsent().accepted) void ExtensionView.playSound(message.volume); return; }
  if (message.type === "CHAT_STATE") {
    state = { ...message, dataConsent: ExtensionView.updateDataConsent(message.dataConsent) };
    reconnectDelay = 1000;
    const unified = state.config.viewMode === "unified" && !detachedChannel;
    const channels = unified && message.channels.length ? [{
      channel: UNIFIED, entries: ChatFlow.mergeTimeline(...message.channels.map((channel) => channel.entries)), stats: combinedStats()
    }] : message.channels.filter((channel) => !detachedChannel || channel.channel === detachedChannel);
    for (const [channel, panel] of panels) {
      if (channels.some((entry) => entry.channel === channel)) continue;
      panel.view.destroy();
      panel.panel.remove();
      panels.delete(channel);
    }
    for (const channel of channels) {
      if (!panels.has(channel.channel)) panels.set(channel.channel, createPanel(channel.channel));
      const panel = panels.get(channel.channel);
      panel.view.configure(state.config.flow.pauseOnHover, state.config.highlights || []);
      panel.view.replace(channel.entries);
      renderStats(panel, channel.stats);
    }
    for (const channel of message.channels) {
      for (const entry of channel.entries) {
        const pinned = pinnedMessages.get(`${entry.channel}:${entry.id}`);
        if (pinned && entry.deleted) pinned.deleted = true;
      }
    }
    renderPins();
    element("no-channels").hidden = panels.size !== 0;
    element("no-channels").textContent = text(detachedChannel ? "removed" : "empty");
    updateLayout();
    renderStatus();
  } else if (message.type === "CHAT_BATCH") {
    for (const batch of message.batches) {
      const channelState = state?.channels.find((entry) => entry.channel === batch.channel);
      if (channelState) channelState.stats = batch.stats;
      const panel = panels.get(batch.channel);
      if (panel) { panel.view.append(batch.entries); renderStats(panel, batch.stats); }
    }
    const unifiedPanel = panels.get(UNIFIED);
    if (unifiedPanel) {
      unifiedPanel.view.append(message.batches.flatMap((batch) => batch.entries));
      renderStats(unifiedPanel, combinedStats());
    }
  } else if (message.type === "CHAT_PURGE") {
    panels.get(message.channel)?.view.purge(message);
    panels.get(UNIFIED)?.view.purge(message);
    ChatFlow.markDeleted([...pinnedMessages.values()], message);
    renderPins();
  } else if (message.type === "CHAT_STATUS" && state) {
    Object.assign(state, { status: message.status, statusMessage: message.statusMessage, rooms: message.rooms });
    renderStatus();
  }
}

function combinedStats() {
  const total = { received: 0, filtered: 0, overflow: 0, moderationSkipped: 0 };
  for (const channel of state.channels) for (const key of Object.keys(total)) total[key] += channel.stats[key] || 0;
  return total;
}

function addHighlight(rule = { pattern: "", color: "#ffe08a" }) {
  if (element("highlight-rules").children.length >= 12) return;
  const row = document.createElement("div");
  row.className = "highlight-rule";
  const pattern = document.createElement("input");
  pattern.type = "text";
  pattern.value = rule.pattern;
  pattern.maxLength = 240;
  pattern.required = true;
  pattern.setAttribute("aria-label", text("highlightPattern"));
  const color = document.createElement("input");
  color.type = "color";
  color.value = rule.color;
  color.setAttribute("aria-label", text("color"));
  const remove = command("\u00d7", () => {
    row.remove();
    element("add-highlight").disabled = false;
    scheduleChatSettingsSave(true);
  });
  remove.title = text("remove");
  remove.setAttribute("aria-label", text("remove"));
  row.append(pattern, color, remove);
  element("highlight-rules").append(row);
  element("add-highlight").disabled = element("highlight-rules").children.length >= 12;
}

async function refreshWorkspaces(selected = "") {
  workspaceNames = (await request("LIST_WORKSPACES")).names || [];
  const select = element("workspace-select");
  select.replaceChildren();
  for (const name of workspaceNames) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.append(option);
  }
  if (!workspaceNames.length) {
    const option = document.createElement("option");
    option.textContent = text("noWorkspaces");
    option.value = "";
    select.append(option);
  } else if (workspaceNames.includes(selected)) select.value = selected;
  element("restore-workspace").disabled = !workspaceNames.length;
  element("delete-workspace").disabled = !workspaceNames.length;
}

async function workspaceAction(type, name) {
  const buttons = [...element("workspaces-dialog").querySelectorAll("button:not([data-close])")];
  buttons.forEach((button) => { button.disabled = true; });
  element("workspace-error").textContent = "";
  try {
    await request(type, { name });
    await refreshWorkspaces(name);
    if (type !== "DELETE_WORKSPACE") toast(text(type === "SAVE_WORKSPACE" ? "workspaceSaved" : "workspaceRestored"));
  } catch (error) { element("workspace-error").textContent = localError(error); }
  finally {
    buttons.forEach((button) => { button.disabled = false; });
    element("restore-workspace").disabled = !workspaceNames.length;
    element("delete-workspace").disabled = !workspaceNames.length;
  }
}

function connectPort() {
  clearTimeout(reconnectTimer);
  try {
    port = extensionApi.runtime.connect({ name: "multichat" });
    port.onMessage.addListener(receive);
    port.onDisconnect.addListener(() => {
      void extensionApi.runtime.lastError;
      element("connection-status").textContent = text("reconnectService");
      reconnectTimer = setTimeout(connectPort, reconnectDelay);
      reconnectDelay = Math.min(30_000, reconnectDelay * 2);
    });
  } catch { element("connection-status").textContent = text("unavailable"); }
}

async function openSettings() {
  if (!state) return;
  if (chatSavePromise) await chatSavePromise.catch(() => {});
  clearTimeout(chatSaveTimer);
  chatSettingsDirty = false;
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
  element("highlight-rules").replaceChildren();
  element("add-highlight").disabled = false;
  for (const rule of state.config.highlights || []) addHighlight(rule);
  element("config-error").textContent = "";
  element("chat-settings-dialog").showModal();
}

function applyPreferences({ settings, appearance }) {
  sharedSettings = ModerationCore.normalizeSettings(settings);
  language = ModerationCore.resolveLanguage(settings?.language || undefined);
  document.documentElement.lang = language;
  ExtensionView.appearance(appearance);
  ExtensionView.localize();
  document.querySelectorAll("[data-label]").forEach((node) => { node.textContent = text(node.dataset.label); });
  document.querySelector(".layout-control").setAttribute("aria-label", text("columns"));
  for (const panel of panels.values()) {
    panel.detach.textContent = text("detach");
    panel.detach.title = text("detach");
    panel.slowLabel.textContent = text("slow");
    panel.apply.textContent = text("apply");
    panel.exportButton.title = text("export");
    panel.exportButton.replaceChildren(ExtensionView.icon("Download"), document.createTextNode(text("export")));
    panel.exportButton.setAttribute("aria-label", text("export"));
    if (panel.view.unified) panel.heading.textContent = text("unified");
    panel.view.onPause(panel.view.paused, panel.view.pending);
    if (panel.lastStats) renderStats(panel, panel.lastStats);
    panel.view.schedule();
  }
  renderPins();
  renderStatus();
}

element("chat-settings").addEventListener("click", openSettings);
element("all-settings").addEventListener("click", () => request("OPEN_DASHBOARD", { page: true, settings: true }).catch((error) => toast(error.message)));
element("add-highlight").addEventListener("click", () => { addHighlight(); scheduleChatSettingsSave(); });
element("open-workspaces").addEventListener("click", async () => {
  element("workspace-error").textContent = "";
  element("workspaces-dialog").showModal();
  try { await refreshWorkspaces(); } catch (error) { element("workspace-error").textContent = localError(error); }
});
element("workspace-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = element("workspace-name").value.trim();
  if (workspaceNames.includes(name) && !confirm(text("overwrite", { name }))) return;
  void workspaceAction("SAVE_WORKSPACE", name);
});
element("restore-workspace").addEventListener("click", () => void workspaceAction("RESTORE_WORKSPACE", element("workspace-select").value));
element("delete-workspace").addEventListener("click", () => {
  const name = element("workspace-select").value;
  if (name && confirm(text("deleteWorkspace", { name }))) void workspaceAction("DELETE_WORKSPACE", name);
});
document.querySelectorAll("button[data-mode]").forEach((button) => button.addEventListener("click", async () => {
  if (!state) return;
  try { await request("SAVE_CHAT_CONFIG", { revision: state.revision, config: { ...state.config, viewMode: button.dataset.mode } }); }
  catch (error) { toast(localError(error)); }
}));
async function openGrid() {
  const button = element("open-grid");
  if (button.disabled) return;
  button.disabled = true;
  try { await request("OPEN_CHAT_WINDOW"); }
  catch (error) { toast(localError(error)); }
  finally { button.disabled = false; }
}
element("open-grid").addEventListener("click", openGrid);
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", async () => {
  if (button.dataset.close === "chat-settings-dialog") {
    try { await saveChatSettings(); }
    catch (error) { element("config-error").textContent = localError(error); return; }
  }
  element(button.dataset.close).close();
}));
document.querySelectorAll("button[data-columns]").forEach((button) => button.addEventListener("click", async () => {
  if (!state) return;
  try { await request("SAVE_CHAT_CONFIG", { revision: state.revision, config: { ...state.config, columns: Number(button.dataset.columns) } }); }
  catch (error) { toast(localError(error)); }
}));
function flushChatSettingsSave() {
  clearTimeout(chatSaveTimer);
  chatSaveTimer = null;
  if (chatSettingsDirty && element("chat-settings-form").checkValidity()) {
    void saveChatSettings().catch((error) => { element("config-error").textContent = localError(error); });
  }
}

function scheduleChatSettingsSave(immediate = false) {
  chatSettingsDirty = true;
  ExtensionView.saveState("pending");
  chatSettingsEdit += 1;
  element("config-error").textContent = "";
  clearTimeout(chatSaveTimer);
  if (immediate) flushChatSettingsSave();
  else chatSaveTimer = setTimeout(flushChatSettingsSave, 350);
}

async function saveChatSettings() {
  clearTimeout(chatSaveTimer);
  chatSaveTimer = null;
  if (chatSavePromise) {
    await chatSavePromise;
    return saveChatSettings();
  }
  if (!chatSettingsDirty) return;
  if (!element("chat-settings-form").checkValidity()) throw new Error(text("invalidSettings"));
  const edit = chatSettingsEdit;
  const config = ChatFlow.normalizeConfig({
    channels: element("channels").value.split(",").map((channel) => channel.trim()).filter(Boolean), columns: state.config.columns,
    viewMode: state.config.viewMode,
    highlights: [...element("highlight-rules").children].map((row) => ({ pattern: row.querySelector('input[type="text"]').value, color: row.querySelector('input[type="color"]').value })),
    flow: {
      batchMs: Number(element("batch-ms").value), localSlowSeconds: Number(element("local-slow").value),
      spamEnabled: element("spam-enabled").checked, repeatLimit: Number(element("repeat-limit").value),
      frequencyLimit: Number(element("frequency-limit").value), windowSeconds: Number(element("window-seconds").value),
      pattern: element("spam-pattern").value, pauseOnHover: element("pause-hover").checked
    }
  });
  ExtensionView.saveState("saving");
  chatSavePromise = request("SAVE_CHAT_CONFIG", { config, revision: draftRevision }).then((response) => {
    draftRevision = response.revision;
    if (edit === chatSettingsEdit) {
      chatSettingsDirty = false;
      element("config-error").textContent = "";
      ExtensionView.saveState("saved");
    }
  }).catch((error) => { ExtensionView.saveState("error"); throw error; }).finally(() => { chatSavePromise = null; });
  return chatSavePromise;
}

element("chat-settings-form").addEventListener("input", () => scheduleChatSettingsSave());
element("chat-settings-form").addEventListener("change", () => scheduleChatSettingsSave(true));
element("chat-settings-dialog").addEventListener("close", flushChatSettingsSave);
element("chat-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await saveChatSettings();
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
  if (event.key.toLowerCase() === "n") { event.preventDefault(); void openGrid(); }
});
window.addEventListener("resize", updateLayout);
document.addEventListener("visibilitychange", () => { if (!document.hidden) for (const panel of panels.values()) panel.view.schedule(); });
window.addEventListener("pagehide", () => {
  flushChatSettingsSave();
  clearTimeout(reconnectTimer);
  port?.disconnect();
  for (const panel of panels.values()) panel.view.destroy();
});
extensionApi.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") void extensionApi.storage.local.get(["settings", "appearance"]).then(applyPreferences);
});
applyPreferences({});
void extensionApi.storage.local.get(["settings", "appearance"]).then(applyPreferences).catch((error) => toast(localError(error)));
connectPort();
void ExtensionView.rememberWindow("chat", detachedChannel || "").catch(() => {});