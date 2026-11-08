(function (root) {
  "use strict";
  const api = root.browser ?? root.chrome;
  const translations = {
    en: { cancel: "Cancel", confirm: "Confirm", reason: "Reason", seconds: "Duration (seconds)", note: "Note", raid: "Raid source channel", save: "Save", pinWindow: "Pin in a browser tab", page: "Open extension page", show: "Show / hide Client ID", approval: "Automatic approval", autoApproveMessages: "Approve after more than N messages", approvalThreshold: "N messages", autoApproveFollowers: "Approve confirmed followers", autoApproveSubscribers: "Approve current subscribers", autoApproveFormerSubscribers: "Approve former subscribers observed locally", reviewIdleMinutes: "Recheck after inactivity (minutes)", alerts: "Review alerts", alertSound: "Sound for new pending review", alertAttention: "Request taskbar attention", alertVolume: "Volume (%)", testSound: "Test sound", translation: "Translation", translationUrl: "LibreTranslate HTTPS endpoint", translationTarget: "Target language code", allowServer: "Allow translation server", translate: "Translate", delete: "Delete message", pin: "Pin message", provider: "Send this message to the configured translation server?", pending: "Unsaved changes", saving: "Saving...", saved: "Saved", invalid: "Check the fields", error: "Not saved", settings: "All settings", permanent: "Permanent ban", source: "Original", result: "Translation", audioError: "Sound is unavailable. Interact with this window and try again.", allowError: "Permission was not granted.", approve: "Approve", quickNotes: "Quick note", freeNote: "Free text" },
    es: { cancel: "Cancelar", confirm: "Confirmar", reason: "Motivo", seconds: "Duraci\u00f3n (segundos)", note: "Nota", raid: "Canal de origen de la raid", save: "Guardar", pinWindow: "Fijar en una pesta\u00f1a del navegador", page: "Abrir p\u00e1gina de la extensi\u00f3n", show: "Mostrar / ocultar Client ID", approval: "Aprobaci\u00f3n autom\u00e1tica", autoApproveMessages: "Aprobar al superar N mensajes", approvalThreshold: "N mensajes", autoApproveFollowers: "Aprobar seguidores confirmados", autoApproveSubscribers: "Aprobar suscriptores actuales", autoApproveFormerSubscribers: "Aprobar antiguos suscriptores observados localmente", reviewIdleMinutes: "Revisar tras inactividad (minutos)", alerts: "Alertas de revisi\u00f3n", alertSound: "Sonido al recibir una nueva revisi\u00f3n", alertAttention: "Solicitar atenci\u00f3n en la barra de tareas", alertVolume: "Volumen (%)", testSound: "Probar sonido", translation: "Traducci\u00f3n", translationUrl: "Endpoint HTTPS de LibreTranslate", translationTarget: "C\u00f3digo de idioma de destino", allowServer: "Autorizar servidor de traducci\u00f3n", translate: "Traducir", delete: "Borrar mensaje", pin: "Fijar mensaje", provider: "\u00bfEnviar este mensaje al servidor de traducci\u00f3n configurado?", pending: "Cambios sin guardar", saving: "Guardando...", saved: "Guardado", invalid: "Revisa los campos", error: "No guardado", settings: "Todos los ajustes", permanent: "Ban permanente", source: "Original", result: "Traducci\u00f3n", audioError: "Sonido no disponible. Interact\u00faa con esta ventana y vuelve a probar.", allowError: "No se concedi\u00f3 el permiso.", approve: "Aprobar", quickNotes: "Nota r\u00e1pida", freeNote: "Texto libre" },
    de: { cancel: "Abbrechen", confirm: "Best\u00e4tigen", reason: "Grund", seconds: "Dauer (Sekunden)", note: "Notiz", raid: "Herkunftskanal des Raids", save: "Speichern", pinWindow: "In einem Browser-Tab anheften", page: "Erweiterungsseite \u00f6ffnen", show: "Client ID anzeigen / verbergen", approval: "Automatische Freigabe", autoApproveMessages: "Nach mehr als N Nachrichten freigeben", approvalThreshold: "N Nachrichten", autoApproveFollowers: "Best\u00e4tigte Follower freigeben", autoApproveSubscribers: "Aktuelle Abonnenten freigeben", autoApproveFormerSubscribers: "Lokal beobachtete fr\u00fchere Abonnenten freigeben", reviewIdleMinutes: "Nach Inaktivit\u00e4t erneut pr\u00fcfen (Minuten)", alerts: "Pr\u00fcfhinweise", alertSound: "Ton bei neuer Pr\u00fcfung", alertAttention: "Aufmerksamkeit in der Taskleiste", alertVolume: "Lautst\u00e4rke (%)", testSound: "Ton testen", translation: "\u00dcbersetzung", translationUrl: "LibreTranslate HTTPS-Endpunkt", translationTarget: "Zielsprachencode", allowServer: "\u00dcbersetzungsserver erlauben", translate: "\u00dcbersetzen", delete: "Nachricht l\u00f6schen", pin: "Nachricht anheften", provider: "Diese Nachricht an den konfigurierten \u00dcbersetzungsserver senden?", pending: "Ungespeicherte \u00c4nderungen", saving: "Speichert...", saved: "Gespeichert", invalid: "Felder pr\u00fcfen", error: "Nicht gespeichert", settings: "Alle Einstellungen", permanent: "Dauerhafter Ban", source: "Original", result: "\u00dcbersetzung", audioError: "Ton nicht verf\u00fcgbar. Mit diesem Fenster interagieren und erneut testen.", allowError: "Berechtigung nicht erteilt.", approve: "Freigeben", quickNotes: "Schnellnotiz", freeNote: "Freier Text" }
  };
  const privacyTranslations = {
    en: {
      privacyTitle: "Data use before Twitch features start",
      privacySummary: "Review how your Twitch identity, chat messages and moderation history are handled locally and by Twitch. Optional translations need separate confirmation. You can stay offline.",
      privacyReview: "Review data use",
      privacyAllow: "Allow data use",
      privacyOffline: "Stay offline",
      privacyAgreement: "I have read this notice and consent to the data use described above.",
      privacySettings: "Data and privacy",
      privacyAllowed: "Data use is allowed. You can withdraw consent at any time.",
      privacyOfflineStatus: "Offline / read-only. Twitch access and new account records are blocked.",
      privacyWithdraw: "Withdraw consent and disconnect",
      privacyWithdrawn: "Consent withdrawn. Existing local history remains available read-only.",
      privacyRequired: "Review and allow data use in Settings before using Twitch or changing account records.",
      privacyInterrupted: "Consent was withdrawn. Earlier requests may already have reached Twitch or the translation provider.",
      privacyChanged: "The data-use notice has changed. Reload this view and review the current notice.",
      privacyDelete: "To erase retained data, clear this extension's storage in browser tools or uninstall it. Delete downloaded TXT exports separately. This does not undo actions on Twitch.",
      privacyBody: "Purpose: ChatterWatch processes Twitch data only to read chat, review accounts and perform authorized moderation. It does not collect browsing history, run advertising, sell data or send telemetry to a publisher backend.\n\nData: your Twitch identity, OAuth session token/scopes and configured channels; chatter IDs/names, avatar URLs, account creation dates, follower/subscriber signals, message text/timestamps, notes and moderation/approval history. Display preferences and your consent choice are stored locally.\n\nDestinations: authentication, API and IRC traffic go to Twitch. Remote profile images load from Twitch's CDN only while data use is allowed. A configured translation provider receives only the selected message text and language options after separate permission and per-message confirmation; it also sees network information such as your IP. Twitch credentials are never forwarded to that provider.\n\nStorage: tokens stay in extension session storage. Your device retains up to 50 messages and 100 activity events per account/channel, plus profiles and notes. Live chat buffers are bounded and temporary. Retained records remain until you clear extension storage or uninstall; there is no automatic age-based purge or application-provided encryption at rest.\n\nYour choice: allowing data use does not enable automatic sanctions. Stay offline permits read-only access to existing local history without Twitch/translation requests or remote avatars. Withdraw consent in Settings > Data and privacy to stop new activity and remove session credentials; existing local history is kept read-only. Withdrawal cannot recall earlier transmissions or undo Twitch actions."
    },
    es: {
      privacyTitle: "Uso de datos antes de activar Twitch",
      privacySummary: "Revisa c\u00f3mo se usan tu identidad Twitch, los mensajes y el historial de moderaci\u00f3n en este dispositivo y en Twitch. Traducir exige otra confirmaci\u00f3n. Puedes seguir sin conexi\u00f3n.",
      privacyReview: "Revisar uso de datos",
      privacyAllow: "Permitir uso de datos",
      privacyOffline: "Seguir sin conexi\u00f3n",
      privacyAgreement: "He le\u00eddo este aviso y consiento el uso de datos descrito arriba.",
      privacySettings: "Datos y privacidad",
      privacyAllowed: "Uso de datos permitido. Puedes retirar el consentimiento en cualquier momento.",
      privacyOfflineStatus: "Sin conexi\u00f3n / solo lectura. Twitch y los nuevos registros de cuentas est\u00e1n bloqueados.",
      privacyWithdraw: "Retirar consentimiento y desconectar",
      privacyWithdrawn: "Consentimiento retirado. El historial local sigue disponible en solo lectura.",
      privacyRequired: "Revisa y permite el uso de datos en Ajustes antes de usar Twitch o modificar registros.",
      privacyInterrupted: "Se retir\u00f3 el consentimiento. Las peticiones anteriores pueden haber llegado a Twitch o al traductor.",
      privacyChanged: "El aviso de datos ha cambiado. Recarga esta vista y revisa el aviso actual.",
      privacyDelete: "Para borrar los datos conservados, elimina el almacenamiento de esta extensi\u00f3n desde las herramientas del navegador o desinst\u00e1lala. Borra aparte los TXT descargados. Esto no deshace acciones en Twitch.",
      privacyBody: "Finalidad: ChatterWatch trata datos de Twitch solo para leer chat, revisar cuentas y realizar moderaci\u00f3n autorizada. No recopila historial de navegaci\u00f3n, muestra publicidad, vende datos ni env\u00eda telemetr\u00eda a un servidor del editor.\n\nDatos: tu identidad Twitch, token/permisos OAuth y canales configurados; identificadores/nombres de chatters, URL de avatares, fechas de creaci\u00f3n, se\u00f1ales de seguidores/suscriptores, texto/fechas de mensajes, notas e historial de moderaci\u00f3n/aprobaci\u00f3n. Las preferencias de pantalla y el consentimiento se guardan localmente.\n\nDestinos: autenticaci\u00f3n, API e IRC se comunican con Twitch. Los avatares remotos se cargan desde su CDN solo cuando se permite el uso de datos. Un traductor configurado recibe \u00fanicamente el texto seleccionado y opciones de idioma tras autorizar el servidor y confirmar ese mensaje; tambi\u00e9n ve datos de red como tu IP. Nunca se le env\u00edan credenciales Twitch.\n\nAlmacenamiento: los tokens permanecen en el almacenamiento de sesi\u00f3n de la extensi\u00f3n. El dispositivo conserva hasta 50 mensajes y 100 eventos por cuenta/canal, adem\u00e1s de perfiles y notas. Los buffers en directo son acotados y temporales. Los registros duran hasta borrar el almacenamiento o desinstalar; no hay purga autom\u00e1tica por fecha ni cifrado propio en reposo.\n\nTu decisi\u00f3n: permitir datos no activa sanciones autom\u00e1ticas. Sin conexi\u00f3n puedes leer el historial local existente, sin peticiones a Twitch/traductores ni avatares remotos. Retira el consentimiento en Ajustes > Datos y privacidad para detener nueva actividad y eliminar las credenciales de sesi\u00f3n; se conserva el historial local en solo lectura. Retirarlo no recupera transmisiones anteriores ni deshace acciones de Twitch."
    },
    de: {
      privacyTitle: "Datennutzung vor dem Start der Twitch-Funktionen",
      privacySummary: "Pr\u00fcfe, wie Twitch-Identit\u00e4t, Chatnachrichten und Moderationsverlauf lokal und bei Twitch verarbeitet werden. \u00dcbersetzungen erfordern eine weitere Best\u00e4tigung. Du kannst offline bleiben.",
      privacyReview: "Datennutzung pr\u00fcfen",
      privacyAllow: "Datennutzung erlauben",
      privacyOffline: "Offline bleiben",
      privacyAgreement: "Ich habe diesen Hinweis gelesen und stimme der oben beschriebenen Datennutzung zu.",
      privacySettings: "Daten und Datenschutz",
      privacyAllowed: "Datennutzung erlaubt. Die Einwilligung kann jederzeit widerrufen werden.",
      privacyOfflineStatus: "Offline / nur lesen. Twitch-Zugriff und neue Kontodatens\u00e4tze sind gesperrt.",
      privacyWithdraw: "Einwilligung widerrufen und trennen",
      privacyWithdrawn: "Einwilligung widerrufen. Der lokale Verlauf bleibt lesbar.",
      privacyRequired: "Datennutzung in Einstellungen pr\u00fcfen und erlauben, bevor Twitch verwendet oder Datens\u00e4tze ge\u00e4ndert werden.",
      privacyInterrupted: "Die Einwilligung wurde widerrufen. Fr\u00fchere Anfragen k\u00f6nnen Twitch oder den \u00dcbersetzer bereits erreicht haben.",
      privacyChanged: "Der Datenschutzhinweis wurde ge\u00e4ndert. Diese Ansicht neu laden und den aktuellen Hinweis pr\u00fcfen.",
      privacyDelete: "Zum L\u00f6schen gespeicherter Daten den Erweiterungsspeicher in den Browser-Werkzeugen leeren oder die Erweiterung deinstallieren. Heruntergeladene TXT-Dateien separat l\u00f6schen. Twitch-Aktionen werden dadurch nicht r\u00fcckg\u00e4ngig gemacht.",
      privacyBody: "Zweck: ChatterWatch verarbeitet Twitch-Daten nur zum Lesen von Chats, Pr\u00fcfen von Konten und f\u00fcr autorisierte Moderation. Kein Browserverlauf, keine Werbung, kein Datenverkauf und keine Telemetrie an einen Herausgeber-Server.\n\nDaten: deine Twitch-Identit\u00e4t, OAuth-Sitzungstoken/Berechtigungen und konfigurierte Kan\u00e4le; Chatter-IDs/Namen, Avatar-URLs, Erstellungsdaten, Follower-/Abonnentensignale, Nachrichtentexte/Zeitpunkte, Notizen und Moderations-/Freigabeverlauf. Anzeigeeinstellungen und Einwilligungsentscheidung werden lokal gespeichert.\n\nEmpf\u00e4nger: Anmeldung, API und IRC kommunizieren mit Twitch. Externe Profilbilder werden nur bei erlaubter Datennutzung vom Twitch-CDN geladen. Ein konfigurierter \u00dcbersetzer erh\u00e4lt nur den ausgew\u00e4hlten Text und Sprachoptionen nach Serverfreigabe und einzelner Nachrichtenbest\u00e4tigung; er sieht auch Netzwerkinformationen wie deine IP. Twitch-Zugangsdaten werden nie an ihn weitergegeben.\n\nSpeicherung: Token bleiben im Sitzungsspeicher der Erweiterung. Das Ger\u00e4t beh\u00e4lt bis zu 50 Nachrichten und 100 Ereignisse je Konto/Kanal sowie Profile und Notizen. Live-Puffer sind begrenzt und vor\u00fcbergehend. Gespeicherte Datens\u00e4tze bleiben bis zum Leeren des Speichers oder zur Deinstallation; keine automatische zeitbasierte L\u00f6schung oder anwendungseigene Verschl\u00fcsselung im Ruhezustand.\n\nDeine Wahl: Erlaubte Datennutzung aktiviert keine automatischen Sanktionen. Offline bleibt vorhandener lokaler Verlauf lesbar, ohne Twitch-/\u00dcbersetzungsanfragen oder externe Avatare. Unter Einstellungen > Daten und Datenschutz widerrufen, um neue Aktivit\u00e4t zu stoppen und Sitzungstoken zu entfernen; der lokale Verlauf bleibt schreibgesch\u00fctzt. Ein Widerruf kann fr\u00fchere \u00dcbertragungen oder Twitch-Aktionen nicht r\u00fcckg\u00e4ngig machen."
    }
  };
  for (const language of Object.keys(privacyTranslations)) Object.assign(translations[language], privacyTranslations[language]);
  let currentConsent = { version: ModerationCore.DATA_CONSENT_VERSION, accepted: false, id: null, acceptedAt: null, revision: 0 };
  let audio;
  let activeDialog;
  function updateDataConsent(value) {
    if (!value || !Number.isInteger(value.version) || !Number.isFinite(value.revision)) {
      currentConsent = { ...currentConsent, accepted: false, id: null, acceptedAt: null };
      return currentConsent;
    }
    if (value.version < currentConsent.version || value.revision < currentConsent.revision) return currentConsent;
    const revoked = !value.accepted && (currentConsent.accepted || value.revision > currentConsent.revision);
    currentConsent = { ...value, accepted: ModerationCore.hasDataConsent(value) };
    if (revoked) activeDialog?.close();
    return currentConsent;
  }
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
  function privacyError(message) {
    if (message === ModerationCore.DATA_CONSENT_REQUIRED) return label("privacyRequired");
    if (message === ModerationCore.DATA_CONSENT_WITHDRAWN) return label("privacyInterrupted");
    return message;
  }
  function localize() {
    for (const node of document.querySelectorAll("[data-icon]")) node.replaceChildren(icon(node.dataset.icon));
    for (const node of document.querySelectorAll("[data-view-label]")) node.textContent = label(node.dataset.viewLabel);
    for (const node of document.querySelectorAll("[data-view-title]")) { node.title = label(node.dataset.viewTitle); node.setAttribute("aria-label", node.title); }
  }
  function saveState(state) {
    const node = document.getElementById("save-state");
    if (node) { node.textContent = label(state); node.dataset.state = state; }
  }
  function dialog({ title, body = "", fields = [], accept = "confirm", cancelLabel = "cancel", focusStart = false, danger = false }) {
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
    cancel.textContent = label(cancelLabel);
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
      if (focusStart) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        node.scrollTop = 0;
      } else cancel.focus();
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
  root.ExtensionView = { label, localize, saveState, dialog, playSound, rememberWindow, appearance, icon,
    updateDataConsent, dataConsent: () => currentConsent, privacyError };
  try { document.documentElement.dataset.popup = String(Boolean(api.extension?.getViews?.({ type: "popup" }).includes(root))); } catch {}
  document.addEventListener("pointerdown", () => {
    try { audio ||= new AudioContext(); if (audio.state === "suspended") void audio.resume().catch(() => {}); } catch {}
  }, { passive: true });
})(globalThis);