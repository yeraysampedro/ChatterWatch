(function (root) {
  "use strict";
  const api = root.browser ?? root.chrome;
  const translations = {
    en: { cancel: "Cancel", confirm: "Confirm", reason: "Reason", seconds: "Duration (seconds)", note: "Note", raid: "Raid source channel", save: "Save", pinWindow: "Keep open in a window", page: "Open extension page", show: "Show / hide Client ID", approval: "Automatic approval", autoApproveMessages: "Approve after more than N messages", approvalThreshold: "N messages", autoApproveFollowers: "Approve confirmed followers", autoApproveSubscribers: "Approve current subscribers", autoApproveFormerSubscribers: "Approve former subscribers observed locally", reviewIdleMinutes: "Recheck after inactivity (minutes)", alerts: "Review alerts", alertSound: "Sound for new pending review", alertAttention: "Request taskbar attention", alertVolume: "Volume (%)", testSound: "Test sound", translation: "Translation", translationUrl: "LibreTranslate HTTPS endpoint", translationTarget: "Target language code", allowServer: "Allow translation server", translate: "Translate", delete: "Delete message", pin: "Pin message", provider: "Send this message to the configured translation server?", pending: "Unsaved changes", saving: "Saving...", saved: "Saved", invalid: "Check the fields", error: "Not saved", settings: "All settings", permanent: "Permanent ban", source: "Original", result: "Translation", audioError: "Sound is unavailable. Interact with this window and try again.", allowError: "Permission was not granted.", approve: "Approve", quickNotes: "Quick note", freeNote: "Free text" },
    es: { cancel: "Cancelar", confirm: "Confirmar", reason: "Motivo", seconds: "Duraci\u00f3n (segundos)", note: "Nota", raid: "Canal de origen de la raid", save: "Guardar", pinWindow: "Mantener abierto en una ventana", page: "Abrir p\u00e1gina de la extensi\u00f3n", show: "Mostrar / ocultar Client ID", approval: "Aprobaci\u00f3n autom\u00e1tica", autoApproveMessages: "Aprobar al superar N mensajes", approvalThreshold: "N mensajes", autoApproveFollowers: "Aprobar seguidores confirmados", autoApproveSubscribers: "Aprobar suscriptores actuales", autoApproveFormerSubscribers: "Aprobar antiguos suscriptores observados localmente", reviewIdleMinutes: "Revisar tras inactividad (minutos)", alerts: "Alertas de revisi\u00f3n", alertSound: "Sonido al recibir una nueva revisi\u00f3n", alertAttention: "Solicitar atenci\u00f3n en la barra de tareas", alertVolume: "Volumen (%)", testSound: "Probar sonido", translation: "Traducci\u00f3n", translationUrl: "Endpoint HTTPS de LibreTranslate", translationTarget: "C\u00f3digo de idioma de destino", allowServer: "Autorizar servidor de traducci\u00f3n", translate: "Traducir", delete: "Borrar mensaje", pin: "Fijar mensaje", provider: "\u00bfEnviar este mensaje al servidor de traducci\u00f3n configurado?", pending: "Cambios sin guardar", saving: "Guardando...", saved: "Guardado", invalid: "Revisa los campos", error: "No guardado", settings: "Todos los ajustes", permanent: "Ban permanente", source: "Original", result: "Traducci\u00f3n", audioError: "Sonido no disponible. Interact\u00faa con esta ventana y vuelve a probar.", allowError: "No se concedi\u00f3 el permiso.", approve: "Aprobar", quickNotes: "Nota r\u00e1pida", freeNote: "Texto libre" },
    de: { cancel: "Abbrechen", confirm: "Best\u00e4tigen", reason: "Grund", seconds: "Dauer (Sekunden)", note: "Notiz", raid: "Herkunftskanal des Raids", save: "Speichern", pinWindow: "In einem Fenster offen halten", page: "Erweiterungsseite \u00f6ffnen", show: "Client ID anzeigen / verbergen", approval: "Automatische Freigabe", autoApproveMessages: "Nach mehr als N Nachrichten freigeben", approvalThreshold: "N Nachrichten", autoApproveFollowers: "Best\u00e4tigte Follower freigeben", autoApproveSubscribers: "Aktuelle Abonnenten freigeben", autoApproveFormerSubscribers: "Lokal beobachtete fr\u00fchere Abonnenten freigeben", reviewIdleMinutes: "Nach Inaktivit\u00e4t erneut pr\u00fcfen (Minuten)", alerts: "Pr\u00fcfhinweise", alertSound: "Ton bei neuer Pr\u00fcfung", alertAttention: "Aufmerksamkeit in der Taskleiste", alertVolume: "Lautst\u00e4rke (%)", testSound: "Ton testen", translation: "\u00dcbersetzung", translationUrl: "LibreTranslate HTTPS-Endpunkt", translationTarget: "Zielsprachencode", allowServer: "\u00dcbersetzungsserver erlauben", translate: "\u00dcbersetzen", delete: "Nachricht l\u00f6schen", pin: "Nachricht anheften", provider: "Diese Nachricht an den konfigurierten \u00dcbersetzungsserver senden?", pending: "Ungespeicherte \u00c4nderungen", saving: "Speichert...", saved: "Gespeichert", invalid: "Felder pr\u00fcfen", error: "Nicht gespeichert", settings: "Alle Einstellungen", permanent: "Dauerhafter Ban", source: "Original", result: "\u00dcbersetzung", audioError: "Ton nicht verf\u00fcgbar. Mit diesem Fenster interagieren und erneut testen.", allowError: "Berechtigung nicht erteilt.", approve: "Freigeben", quickNotes: "Schnellnotiz", freeNote: "Freier Text" }
  };
  let audio;
  let activeDialog;
  function icon(name) {
    function build([tag, attributes, children = []]) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      for (const child of children) node.append(build(child));
      return node;
    }
    const node = build(AppIcons[name]);
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function label(key) { return translations[ModerationCore.resolveLanguage(document.documentElement.lang)]?.[key] || translations.en[key] || key; }
  function localize() {
    for (const node of document.querySelectorAll("[data-icon]")) node.replaceChildren(icon(node.dataset.icon));
    for (const node of document.querySelectorAll("[data-view-label]")) node.textContent = label(node.dataset.viewLabel);
    for (const node of document.querySelectorAll("[data-view-title]")) { node.title = label(node.dataset.viewTitle); node.setAttribute("aria-label", node.title); }
  }
  function saveState(state) {
    const node = document.getElementById("save-state");
    if (node) { node.textContent = label(state); node.dataset.state = state; }
  }
  function dialog({ title, body = "", fields = [], accept = "confirm", danger = false }) {
    if (activeDialog) return Promise.resolve(null);
    const node = document.createElement("dialog");
    node.className = "action-dialog";
    const form = document.createElement("form");
    const heading = document.createElement("h2");
    heading.id = "action-dialog-heading";
    heading.textContent = title;
    node.setAttribute("aria-labelledby", heading.id);
    const description = document.createElement("p");
    description.textContent = body;
    form.append(heading, description);
    for (const field of fields) {
      const wrapper = document.createElement("label");
      wrapper.textContent = field.label;
      const input = document.createElement(field.options ? "select" : field.multiline ? "textarea" : "input");
      input.name = field.name;
      if (field.options) for (const [value, text] of field.options) { const option = document.createElement("option"); option.value = value; option.textContent = text; input.append(option); }
      else if (!field.multiline) input.type = field.type || "text";
      input.value = field.value ?? "";
      if (field.presets) {
        const presets = document.createElement("datalist");
        presets.id = `presets-${field.name}`;
        for (const value of field.presets) { const option = document.createElement("option"); option.value = value; presets.append(option); }
        input.setAttribute("list", presets.id);
        wrapper.append(presets);
      }
      for (const property of ["min", "max", "step", "maxLength", "required", "pattern"]) if (field[property] !== undefined) input[property] = field[property];
      wrapper.append(input);
      form.append(wrapper);
    }
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = label("cancel");
    cancel.className = "dialog-cancel";
    const confirm = document.createElement("button");
    confirm.type = "submit";
    confirm.className = `dialog-confirm${danger ? " danger" : ""}`;
    confirm.textContent = label(accept);
    actions.append(cancel, confirm);
    form.append(actions);
    node.append(form);
    document.body.append(node);
    activeDialog = node;
    return new Promise((resolve) => {
      let result = null;
      form.addEventListener("submit", (event) => { event.preventDefault(); result = Object.fromEntries(new FormData(form)); node.close(); });
      cancel.addEventListener("click", () => node.close());
      node.addEventListener("close", () => { node.remove(); activeDialog = null; resolve(result); }, { once: true });
      node.showModal();
      cancel.focus();
    });
  }
  async function playSound(volume = 30) {
    try {
      audio ||= new AudioContext();
      if (audio.state !== "running" && !navigator.userActivation?.isActive) return false;
      await audio.resume();
      if (audio.state !== "running") return false;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, audio.currentTime);
      gain.gain.setValueAtTime(Math.max(0, Math.min(100, volume)) / 500, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.22);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      return true;
    } catch { return false; }
  }
  async function rememberWindow(view, channel = "") {
    if (!api.windows?.getCurrent) return;
    const info = await api.windows.getCurrent();
    if (info.type !== "popup") return;
    let previous = "";
    const save = () => {
      const bounds = { left: Math.round(screenX), top: Math.round(screenY), width: outerWidth, height: outerHeight };
      const encoded = JSON.stringify(bounds);
      if (encoded === previous || bounds.width < 320 || bounds.height < 300) return;
      previous = encoded;
      void api.runtime.sendMessage({ type: "SAVE_WINDOW_GEOMETRY", view, channel, bounds }).catch(() => {});
    };
    const timer = setInterval(save, 2000);
    addEventListener("pagehide", () => { save(); clearInterval(timer); }, { once: true });
    addEventListener("blur", save);
  }
  function appearance(value) {
    document.body.dataset.theme = value === "light" ? "light" : "dark";
    document.documentElement.style.colorScheme = document.body.dataset.theme;
    document.documentElement.style.backgroundColor = getComputedStyle(document.body).getPropertyValue("--paper");
  }
  root.ExtensionView = { label, localize, saveState, dialog, playSound, rememberWindow, appearance, icon };
  try { document.documentElement.dataset.popup = String(Boolean(api.extension?.getViews?.({ type: "popup" }).includes(root))); } catch {}
  document.addEventListener("pointerdown", () => {
    try { audio ||= new AudioContext(); if (audio.state === "suspended") void audio.resume().catch(() => {}); } catch {}
  }, { passive: true });
})(globalThis);