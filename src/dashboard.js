const extensionApi = globalThis.browser ?? globalThis.chrome;
const preferenceFields = [
  ["approval", "autoApproveMessages", "checkbox"], ["approval", "approvalThreshold", "number", 1, 10000],
  ["approval", "autoApproveFollowers", "checkbox"], ["approval", "autoApproveSubscribers", "checkbox"],
  ["approval", "autoApproveFormerSubscribers", "checkbox"], ["approval", "reviewIdleMinutes", "number", 1, 1440],
  ["alerts", "alertSound", "checkbox"], ["alerts", "alertAttention", "checkbox"], ["alerts", "alertVolume", "range", 0, 100],
  ["translation", "translationUrl", "url"], ["translation", "translationTarget", "text"]
];
const byId = (id) => document.getElementById(id);
const filters = [...document.querySelectorAll(".filter")];
const feed = byId("feed");
const emptyState = byId("empty-state");
const iconPaths = {
  hammer: ["M14 13l-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10", "m16 16 6-6", "m8 8 6-6 8 8-6 6", "m9 7-4 4", "m3 3 3 3"],
  clock: ["M12 8v4l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  alarm: ["M12 9v4l2 1", "M5 3 2 6", "m19 3 3 3", "M6.5 19.5 5 21", "m17.5 19.5 1.5 1.5", "M22 13a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  list: ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"]
};

const messages = {
  en: {
    "action.unban": "Unban / end timeout", "history.unban": "Ban/timeout removed", "unban.done": "Ban/timeout removed for {name}", "unban.explanation": "Remove this user's active ban or timeout on Twitch. This does not approve the account.",
    "directory.connectOnce": "Connect this channel once to identify its local history.", "directory.error": "Could not load chatters.",
    "filter.pending": "Pending review", "filter.everyone": "All chatters", "directory.search": "Search chatters", "directory.previous": "Previous page", "directory.next": "Next page", "directory.page": "{total} people · {page}/{pages}", "directory.loading": "Loading...", "directory.empty": "No matching chatters recorded in this channel.", "directory.title": "Channel chatters",
    "history.profile": "Chatter history", "history.local": "LOCAL HISTORY", "history.coverage": "Local records only: up to 50 messages and 100 activity events. Earlier unrecorded actions are unavailable.", "history.messages": "Messages", "history.notes": "Notes", "history.actions": "Moderation", "history.currentNote": "Current note", "history.noNote": "No note", "history.noEvents": "No recorded activity in this view.", "history.previous": "Previous", "history.current": "Current", "history.timeout": "Timeout: {seconds} s", "history.ban": "Ban", "history.warning": "Warning", "history.delete": "Message deleted", "history.approval": "Approval", "history.note": "Note changed", "history.manual": "Manual", "history.automatic": "Automatic", "history.quick": "/srs 1s", "history.legacy": "Previous state (no detailed event): {action}",
    "filter.approved": "Approved", "approval.manual": "Manually approved", "approval.messages": "Approved: message count", "approval.follower": "Approved: follower", "approval.subscriber": "Approved: subscriber", "approval.previous-subscriber": "Approved: locally observed former subscriber",
    "error.invalidSettings": "Complete the numeric settings with valid values.",
    "brand.home": "ChatterWatch home", "theme.dark": "Switch to dark mode", "theme.light": "Switch to light mode", "sidePanel.open": "Open side panel", "settings.title": "Settings", "close": "Close",
    "channel.connection": "Channel connection", "channel.placeholder": "channel", "channel.name": "Twitch channel", "connect": "Connect", "connect.connect": "Connect", "connect.disconnect": "Disconnect", "connect.signIn": "Sign in",
    "status.ready": "Ready to monitor", "status.monitoring": "Monitoring {channel}", "status.connecting": "Connecting to {channel}…", "status.signingIn": "Signing in to Twitch chat…", "status.reconnecting": "Chat disconnected; reconnecting…", "status.disconnected": "Chat disconnected", "status.interrupted": "Chat connection interrupted", "status.authFailed": "Chat authentication failed. Sign in again.",
    "counter.flagged": "{count} flagged", "metric.chatters": "CHATTERS", "metric.session": "this session", "metric.review": "NEEDS REVIEW", "metric.unvetted": "unapproved accounts", "metric.new": "NEW TODAY", "metric.signals": "account signals",
    "filter.label": "Filter chatter", "filter.all": "All", "filter.new": "New accounts", "filter.first": "First message", "filter.follower": "Recent followers", "feed.label": "Flagged chatters", "empty.quiet": "Quiet for now.", "empty.allClear": "All clear.", "empty.connect": "Connect a channel to review incoming chatters.", "empty.none": "No chatters need review right now.",
    "settings.eyebrow": "CONTROL ROOM", "settings.heading": "Monitor settings", "settings.clientId": "Twitch application client ID", "settings.clientIdPlaceholder": "Register an app at dev.twitch.tv", "settings.language": "Language", "settings.oauthHint": "Used for OAuth and Helix. A client secret is never needed or stored. Register this redirect URL in your Twitch app:", "settings.ageLimit": "Flag accounts younger than", "settings.timeoutThreshold": "Auto-timeout threshold", "settings.firstMessage": "First message", "settings.firstMessageHint": "Flag Twitch's first-msg tag", "settings.newAccount": "New account signal", "settings.newAccountHint": "Include account age in the risk check", "settings.followerWindow": "Recent follower window", "settings.recentFollower": "Recent follower", "settings.recentFollowerHint": "Include recent follows in the risk check", "settings.trustAfter": "Cool down first-message and follower flags after", "settings.matchSignals": "Match enabled signals", "settings.autoTimeout": "Auto-timeout flagged chatters", "settings.autoTimeoutHint": "Timeout at the message threshold", "settings.timeoutDuration": "Timeout duration", "settings.disconnect": "Disconnect Twitch", "settings.save": "Save settings",
    "unit.days": "days", "unit.messages": "messages", "unit.minutes": "minutes", "settings.matchAny": "OR", "settings.matchAll": "AND",
    "theme.footer": "CHAT MONITOR", "theme.local": "LOCAL RECORDS", "auth.signedOut": "Not signed in",
    "tag.newAccount": "NEW ACCOUNT", "tag.firstMessage": "FIRST MESSAGE", "tag.recentFollower": "RECENT FOLLOWER", "tag.checking": "CHECKING ACCOUNT",
    "age.unavailable": "Account age unavailable", "age.today": "Account created today", "age.days": "Account is {count} days old", "age.day": "Account is 1 day old", "age.months": "Account is {count} months old", "age.month": "Account is 1 month old", "age.years": "Account is {count} years old", "age.year": "Account is {count} year old",
    "time.now": "now", "message.one": "message", "message.many": "messages", "message.threshold": " · threshold {count}", "message.empty": "(empty message)", "message.historyCount": "@{login} · {count} messages", "message.historyEmpty": "No messages recorded in this session.",
    "history.eyebrow": "CHAT LOG", "history.title": "Message history", "action.ban": "Ban", "action.timeout": "Timeout", "action.warn": "Warn", "action.history": "History", "action.note": "Add note", "action.editNote": "Edit note", "action.approve": "Approve", "action.approvedState": "Approved", "action.warnedState": "Warned", "action.bannedState": "Banned", "action.timeoutState": "Timed out for {count} min", "action.autoTimeoutFailed": "Automatic timeout failed: {reason}",
    "approval.done": "{name} approved for this channel", "note.prompt": "Moderator note for {name}:", "note.saved": "Moderator note saved locally", "warning.reason": "Warning reason for {name}:", "warning.enterReason": "Enter a reason to warn this chatter", "warning.confirm": "Send a warning to {name}?", "warning.sent": "Warning sent to {name}", "ban.reason": "Reason (optional):", "ban.confirm": "Confirm permanent ban for {name}?", "ban.done": "{name} banned", "timeout.duration": "Timeout duration in minutes:", "timeout.invalid": "Enter a whole number from 1 to 20,160 minutes", "timeout.confirm": "Confirm timeout for {name} for {count} minutes?", "timeout.done": "{name} timed out", "settings.saved": "Settings saved on this device", "chat.disconnectedToast": "Chat disconnected", "twitch.disconnectedToast": "Twitch disconnected", "clientId.required": "Add your Twitch application client ID in settings", "channel.connecting": "Connecting to {channel}", "warning.scope": "Warning needs moderator:manage:warnings. Disconnect Twitch and sign in again to grant it.",
    "error.extension": "The extension service is unavailable. Reload the extension and try again.", "error.approval": "That chatter is no longer available.", "error.oauth": "Save your Twitch application client ID first.", "error.login": "Sign in with Twitch before connecting chat.", "error.helixLogin": "Sign in with Twitch before using Helix.", "error.moderateLogin": "Sign in and connect to a channel first.", "error.unsupported": "Unsupported request.", "error.warningScope": "Warning needs moderator:manage:warnings. Disconnect Twitch and sign in again to grant it.", "error.timeoutBounds": "Timeout must be between 1 second and 14 days.", "error.channelRequired": "Enter a channel name first.", "error.channelNotFound": "Twitch channel {channel} was not found.", "error.authExpired": "Twitch sign-in expired. Sign in again to continue.", "error.clientMismatch": "The Twitch token does not match this app or is not a user token.", "error.chatScope": "Grant the chat:read permission to connect to Twitch chat.", "error.banScope": "Grant the moderator:manage:banned_users permission to moderate chatters.", "error.followerScope": "Grant the moderator:read:followers permission or turn off recent-follower checks.", "error.signInCancelled": "Twitch sign-in was cancelled.", "error.authorization": "Twitch did not authorize this app.", "error.stateMismatch": "The Twitch sign-in state did not match. Please try again.", "error.noToken": "Twitch did not return an access token."
  },
  de: {
    "action.unban": "Ban/Timeout aufheben", "history.unban": "Ban/Timeout aufgehoben", "unban.done": "Ban/Timeout für {name} aufgehoben", "unban.explanation": "Den aktiven Ban oder Timeout dieses Nutzers auf Twitch aufheben. Das Konto wird dadurch nicht freigegeben.",
    "directory.connectOnce": "Diesen Kanal einmal verbinden, um seinen lokalen Verlauf zuzuordnen.", "directory.error": "Chatter konnten nicht geladen werden.",
    "filter.pending": "Zur Prüfung", "filter.everyone": "Alle Chatter", "directory.search": "Chatter suchen", "directory.previous": "Vorherige Seite", "directory.next": "Nächste Seite", "directory.page": "{total} Personen · {page}/{pages}", "directory.loading": "Lädt...", "directory.empty": "Keine passenden Chatter für diesen Kanal gespeichert.", "directory.title": "Chatter des Kanals",
    "history.profile": "Chatter-Verlauf", "history.local": "LOKALER VERLAUF", "history.coverage": "Nur lokale Daten: bis zu 50 Nachrichten und 100 Ereignisse. Frühere nicht erfasste Aktionen sind nicht verfügbar.", "history.messages": "Nachrichten", "history.notes": "Notizen", "history.actions": "Moderation", "history.currentNote": "Aktuelle Notiz", "history.noNote": "Keine Notiz", "history.noEvents": "Keine aufgezeichneten Ereignisse in dieser Ansicht.", "history.previous": "Vorher", "history.current": "Aktuell", "history.timeout": "Timeout: {seconds} s", "history.ban": "Ban", "history.warning": "Verwarnung", "history.delete": "Nachricht gelöscht", "history.approval": "Freigabe", "history.note": "Notiz geändert", "history.manual": "Manuell", "history.automatic": "Automatisch", "history.quick": "/srs 1s", "history.legacy": "Vorheriger Zustand (ohne Ereignisdetails): {action}",
    "filter.approved": "Freigegeben", "approval.manual": "Manuell freigegeben", "approval.messages": "Freigegeben: Nachrichtenanzahl", "approval.follower": "Freigegeben: Follower", "approval.subscriber": "Freigegeben: Abonnent", "approval.previous-subscriber": "Freigegeben: lokal beobachteter fr\u00fcherer Abonnent",
    "error.invalidSettings": "Bitte g\u00fcltige Werte in die Zahlenfelder eintragen.",
    "brand.home": "ChatterWatch Startseite", "theme.dark": "Dunkelmodus aktivieren", "theme.light": "Hellmodus aktivieren", "sidePanel.open": "Seitenleiste öffnen", "settings.title": "Einstellungen", "close": "Schließen",
    "channel.connection": "Kanalverbindung", "channel.placeholder": "Kanal", "channel.name": "Twitch-Kanal", "connect": "Verbinden", "connect.connect": "Verbinden", "connect.disconnect": "Trennen", "connect.signIn": "Anmelden",
    "status.ready": "Bereit zur Überwachung", "status.monitoring": "Überwache {channel}", "status.connecting": "Verbinde mit {channel}…", "status.signingIn": "Anmeldung im Twitch-Chat…", "status.reconnecting": "Chat getrennt; Verbindung wird wiederhergestellt…", "status.disconnected": "Chat getrennt", "status.interrupted": "Chatverbindung unterbrochen", "status.authFailed": "Chat-Anmeldung fehlgeschlagen. Bitte erneut anmelden.",
    "counter.flagged": "{count} markiert", "metric.chatters": "CHATTER", "metric.session": "diese Sitzung", "metric.review": "PRÜFEN", "metric.unvetted": "nicht freigegebene Konten", "metric.new": "HEUTE NEU", "metric.signals": "Kontosignale",
    "filter.label": "Chatter filtern", "filter.all": "Alle", "filter.new": "Neue Konten", "filter.first": "Erste Nachricht", "filter.follower": "Neue Follower", "feed.label": "Markierte Chatter", "empty.quiet": "Im Moment ist es ruhig.", "empty.allClear": "Alles in Ordnung.", "empty.connect": "Verbinde einen Kanal, um neue Chatter zu prüfen.", "empty.none": "Im Moment muss niemand geprüft werden.",
    "settings.eyebrow": "KONTROLLRAUM", "settings.heading": "Überwachungseinstellungen", "settings.clientId": "Twitch-Anwendungs-Client-ID", "settings.clientIdPlaceholder": "App auf dev.twitch.tv registrieren", "settings.language": "Sprache", "settings.oauthHint": "Für OAuth und Helix. Ein Client Secret ist nicht erforderlich und wird nicht gespeichert. Registriere diese Redirect-URL in deiner Twitch-App:", "settings.ageLimit": "Konten markieren, die jünger sind als", "settings.timeoutThreshold": "Timeout-Schwelle", "settings.firstMessage": "Erste Nachricht", "settings.firstMessageHint": "Twitch-Tag first-msg berücksichtigen", "settings.newAccount": "Signal für neue Konten", "settings.newAccountHint": "Kontoalter in die Risikoprüfung einbeziehen", "settings.followerWindow": "Zeitraum für neue Follower", "settings.recentFollower": "Neuer Follower", "settings.recentFollowerHint": "Kürzliche Follows in die Risikoprüfung einbeziehen", "settings.trustAfter": "Erste-Nachricht- und Follower-Markierung aufheben nach", "settings.matchSignals": "Aktive Signale kombinieren", "settings.autoTimeout": "Markierte Chatter automatisch mit Timeout belegen", "settings.autoTimeoutHint": "Timeout ab der Nachrichtenschwelle", "settings.timeoutDuration": "Timeout-Dauer", "settings.disconnect": "Twitch trennen", "settings.save": "Einstellungen speichern",
    "unit.days": "Tage", "unit.messages": "Nachrichten", "unit.minutes": "Minuten", "settings.matchAny": "ODER", "settings.matchAll": "UND",
    "theme.footer": "CHAT-ÜBERWACHUNG", "theme.local": "LOKALE DATEN", "auth.signedOut": "Nicht angemeldet",
    "tag.newAccount": "NEUES KONTO", "tag.firstMessage": "ERSTE NACHRICHT", "tag.recentFollower": "NEUER FOLLOWER", "tag.checking": "KONTO WIRD GEPRÜFT",
    "age.unavailable": "Kontoalter nicht verfügbar", "age.today": "Konto heute erstellt", "age.days": "Konto ist {count} Tage alt", "age.day": "Konto ist 1 Tag alt", "age.months": "Konto ist {count} Monate alt", "age.month": "Konto ist 1 Monat alt", "age.years": "Konto ist {count} Jahre alt", "age.year": "Konto ist {count} Jahr alt",
    "time.now": "jetzt", "message.one": "Nachricht", "message.many": "Nachrichten", "message.threshold": " · Schwelle {count}", "message.empty": "(leere Nachricht)", "message.historyCount": "@{login} · {count} Nachrichten", "message.historyEmpty": "In dieser Sitzung wurden keine Nachrichten erfasst.",
    "history.eyebrow": "CHATVERLAUF", "history.title": "Nachrichtenverlauf", "action.ban": "Ban", "action.timeout": "Timeout", "action.warn": "Warnen", "action.history": "Verlauf", "action.note": "Notiz", "action.editNote": "Notiz ändern", "action.approve": "Freigeben", "action.approvedState": "Freigegeben", "action.warnedState": "Verwarnt", "action.bannedState": "Gebannt", "action.timeoutState": "Timeout für {count} Min.", "action.autoTimeoutFailed": "Automatischer Timeout fehlgeschlagen: {reason}",
    "approval.done": "{name} für diesen Kanal freigegeben", "note.prompt": "Moderatornotiz für {name}:", "note.saved": "Moderatornotiz lokal gespeichert", "warning.reason": "Grund für die Warnung von {name}:", "warning.enterReason": "Bitte einen Warnungsgrund eingeben", "warning.confirm": "Warnung an {name} senden?", "warning.sent": "Warnung an {name} gesendet", "ban.reason": "Grund (optional):", "ban.confirm": "{name} dauerhaft bannen?", "ban.done": "{name} gebannt", "timeout.duration": "Timeout-Dauer in Minuten:", "timeout.invalid": "Gib eine ganze Zahl zwischen 1 und 20.160 Minuten ein", "timeout.confirm": "{name} für {count} Minuten mit Timeout belegen?", "timeout.done": "Timeout für {name} gesetzt", "settings.saved": "Einstellungen auf diesem Gerät gespeichert", "chat.disconnectedToast": "Chat getrennt", "twitch.disconnectedToast": "Twitch getrennt", "clientId.required": "Füge in den Einstellungen deine Twitch-Client-ID hinzu", "channel.connecting": "Verbinde mit {channel}", "warning.scope": "Für Warnungen wird moderator:manage:warnings benötigt. Trenne Twitch und melde dich erneut an, um die Berechtigung zu erteilen.",
    "error.extension": "Der Erweiterungsdienst ist nicht verfügbar. Lade die Erweiterung neu und versuche es erneut.", "error.approval": "Dieser Chatter ist nicht mehr verfügbar.", "error.oauth": "Speichere zuerst deine Twitch-Client-ID.", "error.login": "Melde dich bei Twitch an, bevor du den Chat verbindest.", "error.helixLogin": "Melde dich bei Twitch an, bevor du Helix verwendest.", "error.moderateLogin": "Melde dich an und verbinde zuerst einen Kanal.", "error.unsupported": "Nicht unterstützte Anfrage.", "error.warningScope": "Für Warnungen wird moderator:manage:warnings benötigt. Trenne Twitch und melde dich erneut an, um die Berechtigung zu erteilen.", "error.timeoutBounds": "Der Timeout muss zwischen 1 Sekunde und 14 Tagen liegen.", "error.channelRequired": "Gib zuerst einen Kanalnamen ein.", "error.channelNotFound": "Der Twitch-Kanal {channel} wurde nicht gefunden.", "error.authExpired": "Die Twitch-Anmeldung ist abgelaufen. Bitte erneut anmelden.", "error.clientMismatch": "Das Twitch-Token gehört nicht zu dieser App oder ist kein Benutzer-Token.", "error.chatScope": "Erteile chat:read, um den Twitch-Chat zu verbinden.", "error.banScope": "Erteile moderator:manage:banned_users, um Chatter moderieren zu können.", "error.followerScope": "Erteile moderator:read:followers oder deaktiviere die Prüfung neuer Follower.", "error.signInCancelled": "Die Twitch-Anmeldung wurde abgebrochen.", "error.authorization": "Twitch hat diese App nicht autorisiert.", "error.stateMismatch": "Der Twitch-Anmeldestatus stimmt nicht überein. Bitte erneut versuchen.", "error.noToken": "Twitch hat kein Zugriffstoken zurückgegeben."
  },
  es: {
    "action.unban": "Quitar ban/timeout", "history.unban": "Ban/timeout retirado", "unban.done": "Ban/timeout retirado a {name}", "unban.explanation": "Retirar el ban o timeout activo de este usuario en Twitch. Esto no aprueba la cuenta.",
    "directory.connectOnce": "Conecta este canal una vez para identificar su historial local.", "directory.error": "No se pudo cargar la lista.",
    "filter.pending": "Por revisar", "filter.everyone": "Todos los chatters", "directory.search": "Buscar chatters", "directory.previous": "Página anterior", "directory.next": "Página siguiente", "directory.page": "{total} personas · {page}/{pages}", "directory.loading": "Cargando...", "directory.empty": "No hay chatters registrados que coincidan en este canal.", "directory.title": "Chatters del canal",
    "history.profile": "Historial del chatter", "history.local": "HISTORIAL LOCAL", "history.coverage": "Solo registros locales: hasta 50 mensajes y 100 eventos. Las acciones anteriores no registradas no están disponibles.", "history.messages": "Mensajes", "history.notes": "Notas", "history.actions": "Moderación", "history.currentNote": "Nota actual", "history.noNote": "Sin nota", "history.noEvents": "No hay actividad registrada en esta vista.", "history.previous": "Anterior", "history.current": "Actual", "history.timeout": "Timeout: {seconds} s", "history.ban": "Ban", "history.warning": "Aviso", "history.delete": "Mensaje borrado", "history.approval": "Aprobación", "history.note": "Nota modificada", "history.manual": "Manual", "history.automatic": "Automático", "history.quick": "/srs 1s", "history.legacy": "Estado anterior (sin evento detallado): {action}",
    "filter.approved": "Aprobados", "approval.manual": "Aprobado manualmente", "approval.messages": "Aprobado: cantidad de mensajes", "approval.follower": "Aprobado: seguidor", "approval.subscriber": "Aprobado: suscriptor", "approval.previous-subscriber": "Aprobado: antiguo suscriptor observado localmente",
    "error.invalidSettings": "Completa los ajustes num\u00e9ricos con valores v\u00e1lidos.",
    "brand.home": "Inicio de ChatterWatch", "theme.dark": "Activar modo nocturno", "theme.light": "Activar modo diurno", "sidePanel.open": "Abrir panel lateral", "settings.title": "Ajustes", "close": "Cerrar",
    "channel.connection": "Conexión del canal", "channel.placeholder": "canal", "channel.name": "Canal de Twitch", "connect": "Conectar", "connect.connect": "Conectar", "connect.disconnect": "Desconectar", "connect.signIn": "Iniciar sesión",
    "status.ready": "Listo para monitorizar", "status.monitoring": "Monitorizando {channel}", "status.connecting": "Conectando con {channel}…", "status.signingIn": "Iniciando sesión en el chat de Twitch…", "status.reconnecting": "Chat desconectado; reconectando…", "status.disconnected": "Chat desconectado", "status.interrupted": "Conexión del chat interrumpida", "status.authFailed": "Falló la autenticación del chat. Inicia sesión otra vez.",
    "counter.flagged": "{count} marcados", "metric.chatters": "CHATTERS", "metric.session": "esta sesión", "metric.review": "POR REVISAR", "metric.unvetted": "cuentas sin aprobar", "metric.new": "NUEVOS HOY", "metric.signals": "señales de cuenta",
    "filter.label": "Filtrar chatter", "filter.all": "Todos", "filter.new": "Cuentas nuevas", "filter.first": "Primer mensaje", "filter.follower": "Nuevos seguidores", "feed.label": "Chatters marcados", "empty.quiet": "Todo tranquilo por ahora.", "empty.allClear": "Todo en orden.", "empty.connect": "Conecta un canal para revisar los nuevos chatters.", "empty.none": "No hay chatters que revisar ahora.",
    "settings.eyebrow": "CENTRO DE CONTROL", "settings.heading": "Ajustes de monitorización", "settings.clientId": "Client ID de la aplicación Twitch", "settings.clientIdPlaceholder": "Registra una app en dev.twitch.tv", "settings.language": "Idioma", "settings.oauthHint": "Se usa para OAuth y Helix. No se necesita ni se guarda un client secret. Registra esta URL de redirección en tu app de Twitch:", "settings.ageLimit": "Marcar cuentas con menos de", "settings.timeoutThreshold": "Umbral de timeout automático", "settings.firstMessage": "Primer mensaje", "settings.firstMessageHint": "Usar la etiqueta first-msg de Twitch", "settings.newAccount": "Señal de cuenta nueva", "settings.newAccountHint": "Incluir la antigüedad de la cuenta en el riesgo", "settings.followerWindow": "Ventana de seguidor reciente", "settings.recentFollower": "Seguidor reciente", "settings.recentFollowerHint": "Incluir follows recientes en la evaluación", "settings.trustAfter": "Dejar de marcar primer mensaje y seguidor después de", "settings.matchSignals": "Combinar señales activadas", "settings.autoTimeout": "Aplicar timeout automático a chatters marcados", "settings.autoTimeoutHint": "Aplicar timeout al alcanzar el umbral", "settings.timeoutDuration": "Duración del timeout", "settings.disconnect": "Desconectar Twitch", "settings.save": "Guardar ajustes",
    "unit.days": "días", "unit.messages": "mensajes", "unit.minutes": "minutos", "settings.matchAny": "O", "settings.matchAll": "Y",
    "theme.footer": "MONITOR DE CHAT", "theme.local": "REGISTROS LOCALES", "auth.signedOut": "Sin iniciar sesión",
    "tag.newAccount": "CUENTA NUEVA", "tag.firstMessage": "PRIMER MENSAJE", "tag.recentFollower": "SEGUIDOR RECIENTE", "tag.checking": "REVISANDO CUENTA",
    "age.unavailable": "Antigüedad de cuenta no disponible", "age.today": "Cuenta creada hoy", "age.days": "Cuenta de {count} días", "age.day": "Cuenta de 1 día", "age.months": "Cuenta de {count} meses", "age.month": "Cuenta de 1 mes", "age.years": "Cuenta de {count} años", "age.year": "Cuenta de {count} año",
    "time.now": "ahora", "message.one": "mensaje", "message.many": "mensajes", "message.threshold": " · umbral {count}", "message.empty": "(mensaje vacío)", "message.historyCount": "@{login} · {count} mensajes", "message.historyEmpty": "No hay mensajes registrados en esta sesión.",
    "history.eyebrow": "REGISTRO DEL CHAT", "history.title": "Historial de mensajes", "action.ban": "Ban", "action.timeout": "Timeout", "action.warn": "Avisar", "action.history": "Historial", "action.note": "Añadir nota", "action.editNote": "Editar nota", "action.approve": "Aprobar", "action.approvedState": "Aprobado", "action.warnedState": "Avisado", "action.bannedState": "Baneado", "action.timeoutState": "Timeout de {count} min", "action.autoTimeoutFailed": "Falló el timeout automático: {reason}",
    "approval.done": "{name} aprobado en este canal", "note.prompt": "Nota de moderación para {name}:", "note.saved": "Nota de moderación guardada localmente", "warning.reason": "Motivo del aviso a {name}:", "warning.enterReason": "Indica un motivo para avisar al chatter", "warning.confirm": "¿Enviar un aviso a {name}?", "warning.sent": "Aviso enviado a {name}", "ban.reason": "Motivo (opcional):", "ban.confirm": "¿Aplicar un ban permanente a {name}?", "ban.done": "{name} baneado", "timeout.duration": "Duración del timeout en minutos:", "timeout.invalid": "Introduce un número entero entre 1 y 20.160 minutos", "timeout.confirm": "¿Aplicar timeout a {name} durante {count} minutos?", "timeout.done": "Timeout aplicado a {name}", "settings.saved": "Ajustes guardados en este dispositivo", "chat.disconnectedToast": "Chat desconectado", "twitch.disconnectedToast": "Twitch desconectado", "clientId.required": "Añade el Client ID de tu aplicación Twitch en Ajustes", "channel.connecting": "Conectando con {channel}", "warning.scope": "Para enviar avisos hace falta moderator:manage:warnings. Desconecta Twitch e inicia sesión de nuevo para conceder el permiso.",
    "error.extension": "El servicio de la extensión no está disponible. Recarga la extensión e inténtalo de nuevo.", "error.approval": "Este chatter ya no está disponible.", "error.oauth": "Guarda primero el Client ID de tu aplicación Twitch.", "error.login": "Inicia sesión en Twitch antes de conectar el chat.", "error.helixLogin": "Inicia sesión en Twitch antes de usar Helix.", "error.moderateLogin": "Inicia sesión y conecta un canal primero.", "error.unsupported": "Solicitud no compatible.", "error.warningScope": "Para enviar avisos hace falta moderator:manage:warnings. Desconecta Twitch e inicia sesión de nuevo para conceder el permiso.", "error.timeoutBounds": "El timeout debe durar entre 1 segundo y 14 días.", "error.channelRequired": "Introduce primero el nombre de un canal.", "error.channelNotFound": "No se encontró el canal de Twitch {channel}.", "error.authExpired": "La sesión de Twitch ha caducado. Inicia sesión otra vez.", "error.clientMismatch": "El token de Twitch no pertenece a esta app o no es un token de usuario.", "error.chatScope": "Concede chat:read para conectar con el chat de Twitch.", "error.banScope": "Concede moderator:manage:banned_users para moderar chatters.", "error.followerScope": "Concede moderator:read:followers o desactiva la comprobación de nuevos seguidores.", "error.signInCancelled": "Se canceló el inicio de sesión de Twitch.", "error.authorization": "Twitch no autorizó esta aplicación.", "error.stateMismatch": "El estado de inicio de sesión de Twitch no coincide. Inténtalo otra vez.", "error.noToken": "Twitch no devolvió un token de acceso."
  }
};

let currentState = null;
let selectedFilter = "pending";
let directoryPage = 0;
let directoryVersion = 0;
let directoryLoading = false;
let directoryRefreshQueued = false;
let directorySearchTimer;
let historyAccount;
let historyView = "messages";
let toastTimer;
let currentLanguage = ModerationCore.resolveLanguage();
let languageDirty = false;
let settingsDirty = false;
let settingsRevision = 0;
let settingsSaveTimer;
let savingSettingsRevision = -1;
let settingsSavePromise;
const errorMessageKeys = new Map([
  ["The extension service is unavailable. Reload the extension and try again.", "error.extension"],
  ["That chatter is no longer available.", "error.approval"],
  ["Save your Twitch application client ID first.", "error.oauth"],
  ["Sign in with Twitch before connecting chat.", "error.login"],
  ["Sign in with Twitch before using Helix.", "error.helixLogin"],
  ["Sign in and connect to a channel first.", "error.moderateLogin"],
  ["Unsupported request.", "error.unsupported"],
  ["Warning needs moderator:manage:warnings. Disconnect Twitch and sign in again to grant it.", "warning.scope"],
  ["Timeout must be between 1 second and 14 days.", "error.timeoutBounds"],
  ["Enter a channel name first.", "error.channelRequired"],
  ["Twitch sign-in expired. Sign in again to continue.", "error.authExpired"],
  ["The Twitch token does not match this app or is not a user token.", "error.clientMismatch"],
  ["Grant the chat:read permission to connect to Twitch chat.", "error.chatScope"],
  ["Grant the moderator:manage:banned_users permission to moderate chatters.", "error.banScope"],
  ["Grant the moderator:read:followers permission or turn off recent-follower checks.", "error.followerScope"],
  ["Twitch sign-in was cancelled.", "error.signInCancelled"],
  ["Twitch did not authorize this app.", "error.authorization"],
  ["The Twitch sign-in state did not match. Please try again.", "error.stateMismatch"],
  ["Twitch did not return an access token.", "error.noToken"]
]);

function t(key, values = {}) {
  let text = messages[currentLanguage]?.[key] || messages.en[key] || key;
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

function applyLanguage(language) {
  currentLanguage = ModerationCore.resolveLanguage(language);
  document.documentElement.lang = currentLanguage;
  ExtensionView.localize();
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
  const themeButton = byId("theme-toggle");
  const themeKey = document.body.dataset.theme === "dark" ? "theme.light" : "theme.dark";
  themeButton.title = t(themeKey);
  themeButton.setAttribute("aria-label", t(themeKey));
  const languageInput = byId("language-input");
  if (languageInput) languageInput.value = currentLanguage;
  document.title = `ChatterWatch`;
}

function localizeMessage(message) {
  if (errorMessageKeys.has(message)) return t(errorMessageKeys.get(message));
  const missingChannel = message.match(/^Twitch channel “(.+)” was not found\.$/);
  if (missingChannel) return t("error.channelNotFound", { channel: missingChannel[1] });
  return message;
}

function showToast(message, isError = false) {
  const toast = byId("toast");
  toast.textContent = localizeMessage(message);
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3300);
}

async function request(type, payload = {}) {
  const response = await extensionApi.runtime.sendMessage({ type, ...payload });
  if (!response) throw new Error("The extension service is unavailable. Reload the extension and try again.");
  if (response.error) throw new Error(ExtensionView.privacyError(response.error));
  return response;
}

function updatePrivacyControls() {
  const consent = ExtensionView.dataConsent();
  byId("privacy-banner").hidden = consent.accepted;
  byId("privacy-allow").hidden = consent.accepted;
  byId("privacy-withdraw").hidden = !consent.accepted;
  byId("privacy-status").textContent = ExtensionView.label(consent.accepted ? "privacyAllowed" : "privacyOfflineStatus");
  if (!consent.accepted && (settingsDirty || settingsSaveTimer)) {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = null;
    settingsDirty = false;
    languageDirty = false;
    settingsRevision += 1;
    if (currentState) updateSettingsForm(currentState.settings);
  }
  const controls = [byId("channel-input"), ...byId("settings-form").querySelectorAll("input, select, textarea, button"),
    ...document.querySelectorAll('[data-account-action]:not([data-account-action="history"])')];
  for (const control of controls) {
    if (!consent.accepted) {
      if (!control.disabled) control.dataset.privacyDisabled = "true";
      control.disabled = true;
    } else if (control.dataset.privacyDisabled === "true") {
      control.disabled = false;
      delete control.dataset.privacyDisabled;
    }
  }
  if (!consent.accepted) for (const avatar of document.querySelectorAll(".avatar")) avatar.textContent = avatar.dataset.initial || "?";
}

async function readDataConsent() {
  const response = await request("GET_DATA_CONSENT");
  const consent = ExtensionView.updateDataConsent(response.dataConsent);
  updatePrivacyControls();
  if (consent.version !== ModerationCore.DATA_CONSENT_VERSION) throw new Error(ExtensionView.label("privacyChanged"));
  return consent;
}

async function ensureDataConsent() {
  const current = await readDataConsent();
  if (current.accepted) return current;
  const values = await ExtensionView.dialog({
    title: ExtensionView.label("privacyTitle"), body: ExtensionView.label("privacyBody"),
    accept: "privacyAllow", cancelLabel: "privacyOffline", focusStart: true,
    fields: [{ name: "agreement", label: ExtensionView.label("privacyAgreement"), type: "checkbox", value: "yes", required: true }]
  });
  if (values?.agreement !== "yes") return null;
  const response = await request("SET_DATA_CONSENT", { accepted: true, version: ModerationCore.DATA_CONSENT_VERSION, confirmed: true });
  const consent = ExtensionView.updateDataConsent(response.dataConsent);
  render(response.state);
  return consent.accepted ? consent : null;
}

function updateSettingsForm(settings) {
  const resolved = ModerationCore.normalizeSettings(settings);
  for (const [, key, type] of preferenceFields) {
    const input = byId(key);
    if (input) input[type === "checkbox" ? "checked" : "value"] = resolved[key];
  }
  byId("channel-input").value = settings.channel || "";
  byId("client-id-input").value = settings.clientId || "";
  if (!languageDirty) byId("language-input").value = settings.language || "en";
  byId("age-limit-input").value = settings.ageLimitDays;
  byId("new-account-input").checked = settings.flagNewAccounts;
  byId("follower-window-input").value = settings.recentFollowerDays;
  byId("message-threshold-input").value = settings.messageThreshold;
  byId("first-message-input").checked = settings.flagFirstMessage;
  byId("new-follower-input").checked = settings.flagNewFollower;
  byId("trust-message-input").value = settings.trustMessageThreshold;
  byId("match-any").setAttribute("aria-pressed", String(settings.matchMode === "any"));
  byId("match-all").setAttribute("aria-pressed", String(settings.matchMode === "all"));
  byId("auto-timeout-input").checked = settings.autoTimeout;
  byId("timeout-duration-input").value = settings.timeoutMinutes;
  byId("timeout-duration-wrap").hidden = !settings.autoTimeout;
}

async function setTheme(theme, persist = true) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  ExtensionView.appearance(resolvedTheme);
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const button = byId("theme-toggle");
  const key = nextTheme === "dark" ? "theme.dark" : "theme.light";
  button.title = t(key);
  button.setAttribute("aria-label", t(key));
  if (persist) await extensionApi.storage.local.set({ appearance: resolvedTheme });
}

function makeTag(label, className) {
  const element = document.createElement("span");
  element.className = `risk-tag ${className}`;
  element.textContent = label;
  return element;
}

function makeButton(label, className, action, account, iconName = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `action-button ${className}`;
  button.dataset.accountAction = action;
  if (action !== "history" && !ExtensionView.dataConsent().accepted) {
    button.disabled = true;
    button.dataset.privacyDisabled = "true";
  }
  if (iconName) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of iconPaths[iconName] || []) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    button.append(icon);
  }
  const text = document.createElement("span");
  text.textContent = label;
  button.append(text);
  button.setAttribute("aria-label", label);
  button.addEventListener("click", () => void runAction(action, account, button));
  return button;
}

function formatAge(days) {
  if (!Number.isFinite(days)) return t("age.unavailable");
  if (days === 0) return t("age.today");
  if (days < 30) return t(days === 1 ? "age.day" : "age.days", { count: days });
  const months = Math.floor(days / 30);
  if (months < 24) return t(months === 1 ? "age.month" : "age.months", { count: months });
  const years = (days / 365).toFixed(1).replace(/\.0$/, "");
  return t(years === "1" ? "age.year" : "age.years", { count: years });
}

function formatTime(timestamp) {
  if (!timestamp) return t("time.now");
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return t("time.now");
  const locale = { en: "en-US", de: "de-DE", es: "es-ES" }[currentLanguage];
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.floor(hours / 24), "day");
}

function localizedStatus(state) {
  if (state.status === "connected") return t("status.monitoring", { channel: state.settings.channel });
  if (state.status === "connecting") return state.statusMessage.startsWith("Connecting")
    ? t("status.connecting", { channel: state.settings.channel })
    : t("status.signingIn");
  if (state.status === "reconnecting") return t("status.reconnecting");
  if (state.status === "disconnected") return state.statusMessage === "Ready to monitor" ? t("status.ready") : t("status.disconnected");
  if (state.statusMessage.includes("authentication failed")) return t("status.authFailed");
  if (state.statusMessage.includes("connection interrupted")) return t("status.interrupted");
  return state.statusMessage;
}

function localizedAction(action) {
  if (action === "Approved") return t("action.approvedState");
  if (action === "Warned") return t("action.warnedState");
  if (action === "Banned") return t("action.bannedState");
  if (action === "Ban/timeout removed") return t("history.unban");
  const seconds = action.match(/^Timed out for (\d+) s$/);
  if (seconds) return t("history.timeout", { seconds: seconds[1] });
  const timeout = action.match(/^Timed out for (\d+) min$/);
  if (timeout) return t("action.timeoutState", { count: timeout[1] });
  const automaticTimeout = action.match(/^Automatic timeout failed: (.+)$/);
  return automaticTimeout ? t("action.autoTimeoutFailed", { reason: automaticTimeout[1] }) : action;
}

function renderCard(account, index) {
  const card = document.createElement("article");
  card.className = "chatter-card";
  card.style.animationDelay = `${Math.min(index, 6) * 35}ms`;

  const top = document.createElement("div");
  top.className = "card-top";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.dataset.initial = (account.displayName || account.login || "?").slice(0, 1).toUpperCase();
  if (account.profileImage && ExtensionView.dataConsent().accepted) {
    const image = document.createElement("img");
    image.src = account.profileImage;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => { avatar.textContent = (account.displayName || account.login || "?").slice(0, 1).toUpperCase(); }, { once: true });
    avatar.append(image);
  } else {
    avatar.textContent = (account.displayName || account.login || "?").slice(0, 1).toUpperCase();
  }

  const identity = document.createElement("div");
  identity.className = "identity";
  const displayName = document.createElement("div");
  displayName.className = "display-name";
  displayName.textContent = account.displayName || account.login;
  const login = document.createElement("div");
  login.className = "login-name";
  login.textContent = `@${account.login}`;
  identity.append(displayName, login);

  const time = document.createElement("span");
  time.className = "card-time";
  time.textContent = formatTime(account.lastMessageAt);
  top.append(avatar, identity, time);
  card.append(top);

  const riskTags = document.createElement("div");
  riskTags.className = "risk-tags";
  const established = account.messageCount >= currentState.settings.trustMessageThreshold;
  if (currentState.settings.flagNewAccounts && account.ageDays != null && account.ageDays < currentState.settings.ageLimitDays) riskTags.append(makeTag(t("tag.newAccount"), "new-account"));
  if (!established && account.firstMessage && currentState.settings.flagFirstMessage) riskTags.append(makeTag(t("tag.firstMessage"), "first-message"));
  if (!established && account.followedAt && Date.now() - Date.parse(account.followedAt) <= currentState.settings.recentFollowerDays * 86_400_000 && currentState.settings.flagNewFollower) riskTags.append(makeTag(t("tag.recentFollower"), "new-follower"));
  if (account.lookupPending && riskTags.childElementCount === 0) riskTags.append(makeTag(t("tag.checking"), "checking"));
  if (riskTags.childElementCount) card.append(riskTags);

  const age = document.createElement("p");
  age.className = "account-age";
  age.textContent = formatAge(account.ageDays);
  card.append(age);
  if (account.isVetted) {
    const approval = document.createElement("p");
    approval.className = "account-age";
    approval.textContent = t(`approval.${account.approvalReason || "manual"}`);
    card.append(approval);
  }

  const messageCount = document.createElement("p");
  messageCount.className = "account-age";
  const count = document.createElement("strong");
  count.textContent = `${account.messageCount} ${t(account.messageCount === 1 ? "message.one" : "message.many")}`;
  messageCount.append(count, document.createTextNode(t("message.threshold", { count: currentState.settings.messageThreshold })));
  card.append(messageCount);

  if (account.recentMessages?.length) {
    const messages = document.createElement("div");
    messages.className = "message-stack";
    for (const entry of account.recentMessages.slice(0, 3)) {
      const line = document.createElement("div");
      line.className = "message-line";
      line.textContent = entry.text || t("message.empty");
      messages.append(line);
    }
    card.append(messages);
  }

  if (account.note) {
    const note = document.createElement("div");
    note.className = "note-line";
    note.textContent = account.note;
    card.append(note);
  }
  if (account.latestAction) {
    const action = document.createElement("p");
    action.className = "account-age";
    action.textContent = localizedAction(account.latestAction);
    card.append(action);
  }

  const actions = document.createElement("div");
  actions.className = "action-row";
  actions.append(
    makeButton(t("action.ban"), "ban", "ban", account, "hammer"),
    makeButton(t("action.timeout"), "", "timeout", account, "clock"),
    makeButton(t("action.warn"), "warning", "warn", account, "alarm"),
    makeButton(t("action.history"), "", "history", account, "list")
  );
  card.append(actions);
  const secondaryActions = document.createElement("div");
  secondaryActions.className = "secondary-actions";
  secondaryActions.append(
    makeButton(account.note ? t("action.editNote") : t("action.note"), "", "note", account),
    makeButton(t("action.approve"), "vet", "vet", account),
    makeButton(t("action.unban"), "unban", "unban", account)
  );
  card.append(secondaryActions);
  return card;
}

async function showHistory(account) {
  const channel = currentState.settings.channel;
  const response = await request("GET_ACCOUNT_HISTORY", { key: account.key });
  if (channel !== currentState.settings.channel) return;
  historyAccount = response.account;
  historyView = "messages";
  renderHistory();
  if (!byId("history-dialog").open) byId("history-dialog").showModal();
}

function renderHistory() {
  const account = historyAccount;
  if (!account) return;
  byId("history-user").textContent = `#${currentState.settings.channel} / @${account.login}`;
  for (const button of document.querySelectorAll("[data-history-view]")) button.setAttribute("aria-pressed", String(button.dataset.historyView === historyView));
  byId("history-note-panel").hidden = historyView !== "notes";
  byId("history-note").textContent = account.note || t("history.noNote");
  const list = byId("history-list");
  list.replaceChildren();
  const events = historyView === "messages" ? (account.recentMessages || []).map((entry) => ({ at: entry.sentAt, text: entry.text }))
    : (account.activityHistory || []).filter((entry) => historyView === "notes" ? entry.type === "note" : entry.type !== "note").map((entry) => ({ at: entry.at, text: [
      t(`history.${entry.type}`, { seconds: entry.duration }),
      `${t(`history.${entry.source || "manual"}`)}${entry.actor ? ` / @${entry.actor}` : ""}`,
      entry.type === "note" ? `${t("history.previous")}: ${entry.previousNote || t("history.noNote")}\n${t("history.current")}: ${entry.note || t("history.noNote")}` : entry.reason || ""
    ].filter(Boolean).join("\n") }));
  if (events.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = historyView === "messages" ? t("message.historyEmpty") : t("history.noEvents");
    if (historyView === "actions" && account.latestAction) empty.textContent += `\n${t("history.legacy", { action: localizedAction(account.latestAction) })}`;
    list.append(empty);
  } else {
    for (const entry of events) {
      const item = document.createElement("li");
      const timestamp = document.createElement("time");
      const locale = { en: "en-US", de: "de-DE", es: "es-ES" }[currentLanguage];
      if (Number.isFinite(entry.at)) {
        timestamp.dateTime = new Date(entry.at).toISOString();
        timestamp.textContent = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(entry.at);
      }
      const text = document.createElement("p");
      text.textContent = entry.text || t("message.empty");
      item.append(timestamp, text);
      list.append(item);
    }
  }
}

async function refreshDirectory() {
  if (!currentState) return;
  if (directoryLoading) { directoryRefreshQueued = true; return; }
  directoryLoading = true;
  const version = directoryVersion;
  const channel = currentState.settings.channel;
  feed.setAttribute("aria-busy", "true");
  byId("directory-status").textContent = t("directory.loading");
  try {
    const result = await request("GET_CHATTERS", { filter: selectedFilter, query: byId("chatter-search").value, page: directoryPage });
    if (version !== directoryVersion || channel !== currentState.settings.channel) return;
    directoryPage = result.page;
    byId("directory-status").textContent = t("directory.page", { total: result.total, page: result.page + 1, pages: Math.max(1, Math.ceil(result.total / result.pageSize)) });
    byId("directory-previous").disabled = result.page === 0;
    byId("directory-next").disabled = (result.page + 1) * result.pageSize >= result.total;
    feed.setAttribute("aria-label", t("directory.title"));
    feed.replaceChildren();
    if (!result.accounts.length) {
      const empty = document.createElement("p");
      empty.className = "directory-empty";
      empty.textContent = t(result.broadcasterId ? "directory.empty" : "directory.connectOnce");
      feed.append(empty);
    }
    result.accounts.forEach((account, index) => feed.append(renderCard(account, index)));
  } catch (error) {
    if (version === directoryVersion && channel === currentState.settings.channel) {
      byId("directory-status").textContent = t("directory.error");
      showToast(error.message, true);
    }
  }
  finally {
    directoryLoading = false;
    feed.setAttribute("aria-busy", "false");
    if (directoryRefreshQueued) { directoryRefreshQueued = false; void refreshDirectory(); }
  }
}

function render(state) {
  state = { ...state, dataConsent: ExtensionView.updateDataConsent(state.dataConsent) };
  if (!state.dataConsent.accepted) state = { ...state, moderator: null, status: "disconnected" };
  if (currentState && currentState.settings.channel !== state.settings.channel) {
    directoryVersion += 1;
    directoryPage = 0;
    feed.replaceChildren();
    byId("history-dialog").close();
  }
  currentState = state;
  applyLanguage(languageDirty ? currentLanguage : state.settings.language);
  if (!settingsDirty && byId("settings-panel").hidden && document.activeElement !== byId("channel-input")) updateSettingsForm(state.settings);
  const statusBar = document.querySelector(".stream-status");
  statusBar.dataset.status = state.status;
  byId("status-text").textContent = state.dataConsent.accepted ? localizedStatus(state) : ExtensionView.label("privacyOfflineStatus");
  byId("flagged-count").textContent = t("counter.flagged", { count: state.flagged });
  byId("filter-all-count").textContent = state.flagged;
  byId("auth-label").textContent = state.moderator?.login ? `@${state.moderator.login}` : t("auth.signedOut");
  byId("connect-button").classList.toggle("connected", state.status === "connected");
  byId("connect-button").disabled = ["connecting", "reconnecting"].includes(state.status);
  byId("connect-button").querySelector("span:last-child").textContent = state.status === "connected" ? t("connect.disconnect") : state.moderator ? t("connect.connect") : t("connect.signIn");
  updatePrivacyControls();

  void refreshDirectory();
  if (byId("history-dialog").open) renderHistory();
}

async function runAction(action, account, button) {
  button.disabled = true;
  try {
    if (action !== "history" && !ExtensionView.dataConsent().accepted) throw new Error(ExtensionView.label("privacyRequired"));
    if (action === "vet") {
      await request("VET", { key: account.key });
      showToast(t("approval.done", { name: account.displayName }));
    } else if (action === "note") {
      const values = await ExtensionView.dialog({ title: t("note.prompt", { name: account.displayName }), accept: "save", fields: [
        { name: "template", label: ExtensionView.label("quickNotes"), options: [["", ExtensionView.label("freeNote")], ["RAID", "RAID"], ["FRONT PAGE", "FRONT PAGE"]] },
        { name: "source", label: ExtensionView.label("raid"), pattern: "[A-Za-z0-9_]{1,25}", maxLength: 25 },
        { name: "note", label: ExtensionView.label("note"), multiline: true, value: account.note || "", maxLength: 500 }
      ] });
      if (!values) return;
      if (values.template === "RAID" && !values.source) throw new Error(ExtensionView.label("raid"));
      const addition = values.template === "RAID" ? `RAID ${values.source}` : values.template;
      const note = [values.note.trim(), addition].filter(Boolean).join("\n");
      if (note.length > 500) throw new Error("Note exceeds 500 characters.");
      await request("NOTE", { key: account.key, note });
      showToast(t("note.saved"));
    } else if (action === "history") {
      await showHistory(account);
    } else if (action === "warn") {
      const reason = window.prompt(t("warning.reason", { name: account.displayName }), "");
      if (reason === null) return;
      if (!reason.trim()) {
        showToast(t("warning.enterReason"), true);
        return;
      }
      if (!window.confirm(t("warning.confirm", { name: account.displayName }))) return;
      await request("WARN", { key: account.key, reason });
      showToast(t("warning.sent", { name: account.displayName }));
    } else if (action === "unban") {
      if (!await ExtensionView.dialog({
        title: t("action.unban"), body: `#${currentState.settings.channel} / ${account.displayName || account.login}\n${t("unban.explanation")}`
      })) return;
      await request("MODERATE", { key: account.key, action, confirmed: true });
      showToast(t("unban.done", { name: account.displayName }));
    } else if (action === "ban" || action === "timeout") {
      const values = await ExtensionView.dialog({ title: t(`action.${action}`), danger: true,
        body: `#${currentState.settings.channel} / ${account.displayName || account.login}${action === "ban" ? `\n${ExtensionView.label("permanent")}` : ""}`,
        fields: [...(action === "timeout" ? [{ name: "duration", label: ExtensionView.label("seconds"), type: "number", min: 1, max: 1209600, required: true, value: currentState.settings.timeoutMinutes * 60, presets: [1, 60, 300, 600, 1800, 3600, 86400] }] : []),
          { name: "reason", label: ExtensionView.label("reason"), maxLength: 500 }]
      });
      if (!values) return;
      await request("MODERATE", { key: account.key, action, duration: action === "timeout" ? Number(values.duration) : null, reason: values.reason, confirmed: true });
      showToast(action === "ban" ? t("ban.done", { name: account.displayName }) : t("timeout.done", { name: account.displayName }));
    }
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = action !== "history" && !ExtensionView.dataConsent().accepted;
    if (action !== "history") void refreshDirectory();
  }
}

function validSettingsForm() {
  return byId("settings-form").checkValidity()
    && [...byId("settings-form").querySelectorAll('input[type="number"]')].every((input) => input.value !== "");
}

function flushSettingsSave() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = null;
  if (settingsDirty && validSettingsForm()) void saveSettings().catch((error) => showToast(error.message, true));
  else if (settingsDirty) ExtensionView.saveState("invalid");
}

function scheduleSettingsSave(immediate = false) {
  settingsDirty = true;
  ExtensionView.saveState("pending");
  settingsRevision += 1;
  clearTimeout(settingsSaveTimer);
  if (immediate) flushSettingsSave();
  else settingsSaveTimer = setTimeout(flushSettingsSave, 350);
}

async function saveSettings() {
  clearTimeout(settingsSaveTimer);
  settingsSaveTimer = null;
  if (!validSettingsForm()) throw new Error(t("error.invalidSettings"));
  const revision = settingsRevision;
  if (savingSettingsRevision === revision) return settingsSavePromise;
  const settings = {
    ...Object.fromEntries(preferenceFields.map(([, key, type]) => [key, type === "checkbox" ? byId(key).checked : ["number", "range"].includes(type) ? Number(byId(key).value) : byId(key).value])),
    clientId: byId("client-id-input").value,
    channel: byId("channel-input").value,
    language: byId("language-input").value,
    ageLimitDays: Number(byId("age-limit-input").value),
    flagNewAccounts: byId("new-account-input").checked,
    recentFollowerDays: Number(byId("follower-window-input").value),
    messageThreshold: Number(byId("message-threshold-input").value),
    flagFirstMessage: byId("first-message-input").checked,
    flagNewFollower: byId("new-follower-input").checked,
    trustMessageThreshold: Number(byId("trust-message-input").value),
    matchMode: byId("match-all").getAttribute("aria-pressed") === "true" ? "all" : "any",
    autoTimeout: byId("auto-timeout-input").checked,
    timeoutMinutes: Number(byId("timeout-duration-input").value)
  };
  savingSettingsRevision = revision;
  ExtensionView.saveState("saving");
  settingsSavePromise = request("SAVE_SETTINGS", { settings }).then((response) => {
    if (revision === settingsRevision) {
      settingsDirty = false;
      languageDirty = false;
      if (currentState) render({ ...currentState, settings: response.settings });
      applyLanguage(response.settings.language);
      updateSettingsForm(response.settings);
      ExtensionView.saveState("saved");
    }
    return response;
  }).catch((error) => {
    if (savingSettingsRevision === revision) savingSettingsRevision = -1;
    ExtensionView.saveState("error");
    throw error;
  });
  return settingsSavePromise;
}

async function signIn(consent) {
  if (document.documentElement.dataset.popup === "true") {
    await request("OPEN_DASHBOARD", { page: true, pinned: true });
    window.close();
    return false;
  }
  consent ||= await ensureDataConsent();
  if (!consent) return false;
  const clientId = byId("client-id-input").value.trim();
  if (!clientId) {
    byId("settings-panel").hidden = false;
    showToast(t("clientId.required"), true);
    return false;
  }
  await saveSettings();
  const redirectUri = extensionApi.identity.getRedirectURL("twitch");
  const state = crypto.randomUUID();
  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.searchParams.set("response_type", "token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "chat:read moderator:manage:banned_users moderator:manage:warnings moderator:read:followers moderator:manage:chat_settings moderator:manage:chat_messages");
  url.searchParams.set("state", state);
  url.searchParams.set("force_verify", "false");
  if ((await readDataConsent()).id !== consent.id) throw new Error(ExtensionView.label("privacyInterrupted"));
  const callbackUrl = await extensionApi.identity.launchWebAuthFlow({ url: url.toString(), interactive: true });
  if ((await readDataConsent()).id !== consent.id) throw new Error(ExtensionView.label("privacyInterrupted"));
  if (!callbackUrl) throw new Error(t("error.signInCancelled"));
  const callback = new URL(callbackUrl);
  const parameters = new URLSearchParams(callback.hash.slice(1));
  const error = callback.searchParams.get("error") || parameters.get("error");
  if (error) throw new Error(callback.searchParams.get("error_description") || parameters.get("error_description") || t("error.authorization"));
  if (parameters.get("state") !== state) throw new Error(t("error.stateMismatch"));
  const accessToken = parameters.get("access_token");
  if (!accessToken) throw new Error(t("error.noToken"));
  await request("AUTH", { accessToken, consentId: consent.id });
  return true;
}

async function connectOrDisconnect() {
  if (currentState?.status === "connected") {
    await request("DISCONNECT");
    showToast(t("chat.disconnectedToast"));
    return;
  }
  if (document.documentElement.dataset.popup === "true" && (!currentState?.moderator || !ExtensionView.dataConsent().accepted)) {
    await signIn();
    return;
  }
  const consent = await ensureDataConsent();
  if (!consent) return;
  await saveSettings();
  if (!currentState?.moderator && !await signIn(consent)) return;
  await request("CONNECT");
  showToast(t("channel.connecting", { channel: byId("channel-input").value.trim() }));
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    selectedFilter = button.dataset.filter;
    directoryPage = 0;
    directoryVersion += 1;
    feed.replaceChildren();
    filters.forEach((filter) => filter.classList.toggle("active", filter === button));
    if (currentState) render(currentState);
  });
});

byId("chatter-search").addEventListener("input", () => {
  directoryPage = 0;
  directoryVersion += 1;
  clearTimeout(directorySearchTimer);
  directorySearchTimer = setTimeout(() => void refreshDirectory(), 200);
});
for (const [id, direction] of [["directory-previous", -1], ["directory-next", 1]]) byId(id).addEventListener("click", () => {
  directoryPage += direction;
  directoryVersion += 1;
  void refreshDirectory();
});
for (const button of document.querySelectorAll("[data-history-view]")) button.addEventListener("click", () => {
  historyView = button.dataset.historyView;
  renderHistory();
});

byId("match-any").addEventListener("click", () => {
  byId("match-any").setAttribute("aria-pressed", "true");
  byId("match-all").setAttribute("aria-pressed", "false");
  scheduleSettingsSave(true);
});
byId("match-all").addEventListener("click", () => {
  byId("match-any").setAttribute("aria-pressed", "false");
  byId("match-all").setAttribute("aria-pressed", "true");
  scheduleSettingsSave(true);
});

byId("settings-toggle").addEventListener("click", () => { byId("settings-panel").hidden = false; });
byId("settings-close").addEventListener("click", () => { flushSettingsSave(); byId("settings-panel").hidden = true; });
byId("language-input").addEventListener("change", (event) => {
  languageDirty = true;
  applyLanguage(event.target.value);
  if (currentState) render(currentState);
});
byId("history-close").addEventListener("click", () => byId("history-dialog").close());
byId("theme-toggle").addEventListener("click", () => void setTheme(document.body.dataset.theme === "dark" ? "light" : "dark"));
byId("auto-timeout-input").addEventListener("change", (event) => { byId("timeout-duration-wrap").hidden = !event.target.checked; });
for (const target of [byId("settings-form"), byId("channel-input")]) {
  target.addEventListener("input", () => scheduleSettingsSave());
  target.addEventListener("change", () => scheduleSettingsSave(true));
}
window.addEventListener("pagehide", flushSettingsSave);
byId("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveSettings();
    byId("settings-panel").hidden = true;
    showToast(t("settings.saved"));
  } catch (error) { showToast(error.message, true); }
});
byId("connect-button").addEventListener("click", async () => {
  const button = byId("connect-button");
  button.disabled = true;
  try { await connectOrDisconnect(); }
  catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});
byId("disconnect-button").addEventListener("click", async () => {
  try {
    await request("DISCONNECT");
    await extensionApi.storage.session.remove(["accessToken", "moderator"]);
    byId("settings-panel").hidden = true;
    showToast(t("twitch.disconnectedToast"));
  } catch (error) { showToast(error.message, true); }
});
byId("open-side-panel").addEventListener("click", async () => {
  try {
    if (extensionApi.sidebarAction?.open) {
      await extensionApi.sidebarAction.open();
    } else {
      const windowInfo = await extensionApi.windows.getCurrent();
      await extensionApi.sidePanel.open({ windowId: windowInfo.id });
    }
    window.close();
  } catch (error) { showToast(error.message, true); }
});

if (extensionApi.sidePanel?.open || extensionApi.sidebarAction?.open) byId("open-side-panel").hidden = false;
async function openView(button, type, payload = {}) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await request(type, payload);
    if (type === "OPEN_DASHBOARD" && payload.page && document.documentElement.dataset.popup === "true") window.close();
  }
  catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
}
byId("open-multichat").addEventListener("click", (event) => void openView(event.currentTarget, "OPEN_CHAT_WINDOW"));
byId("pin-window").addEventListener("click", (event) => void openView(event.currentTarget, "OPEN_DASHBOARD", { page: true, pinned: true }));
byId("open-page").addEventListener("click", (event) => void openView(event.currentTarget, "OPEN_DASHBOARD", { page: true }));
byId("show-client-id").addEventListener("click", () => {
  const input = byId("client-id-input");
  input.type = input.type === "password" ? "text" : "password";
  byId("show-client-id").setAttribute("aria-pressed", String(input.type === "text"));
});
for (const id of ["privacy-review", "privacy-allow"]) byId(id).addEventListener("click", () => {
  void ensureDataConsent().catch((error) => showToast(error.message, true));
});
byId("privacy-withdraw").addEventListener("click", async () => {
  const button = byId("privacy-withdraw");
  button.disabled = true;
  try {
    const response = await request("SET_DATA_CONSENT", { accepted: false });
    render(response.state);
    showToast(ExtensionView.label("privacyWithdrawn"));
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});
byId("show-client-id").replaceChildren(ExtensionView.icon("Eye"));
function buildPreferences() {
  const groups = new Map();
  for (const [group, key, type, min, max] of preferenceFields) {
    if (!groups.has(group)) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "preference-group";
      const legend = document.createElement("legend");
      legend.dataset.viewLabel = group;
      fieldset.append(legend);
      groups.set(group, fieldset);
      byId("shared-preferences").append(fieldset);
    }
    const wrapper = document.createElement("label");
    wrapper.className = "preference-field";
    const caption = document.createElement("span");
    caption.dataset.viewLabel = key;
    const input = document.createElement("input");
    input.id = key;
    input.type = type;
    if (min !== undefined) { input.min = min; input.max = max; input.required = true; }
    if (key === "translationTarget") { input.pattern = "[a-z]{2}"; input.maxLength = 2; input.required = true; }
    wrapper.append(caption, input);
    if (type === "checkbox") wrapper.append(caption);
    groups.get(group).append(wrapper);
  }
  const sound = document.createElement("button");
  sound.type = "button";
  sound.className = "preference-command";
  sound.dataset.viewLabel = "testSound";
  sound.addEventListener("click", async () => { if (!await ExtensionView.playSound(Number(byId("alertVolume").value))) showToast(ExtensionView.label("audioError"), true); });
  groups.get("alerts").append(sound);
  const permission = document.createElement("button");
  permission.type = "button";
  permission.className = "preference-command";
  permission.dataset.viewLabel = "allowServer";
  permission.addEventListener("click", async () => {
    try {
      const url = new URL(byId("translationUrl").value);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use an HTTPS endpoint without credentials.");
      const granted = await extensionApi.permissions.request({ origins: [`${url.origin}/*`], ...(globalThis.browser ? { data_collection: ["personalCommunications"] } : {}) });
      if (!granted) throw new Error(ExtensionView.label("allowError"));
      await saveSettings();
      showToast(t("settings.saved"));
    } catch (error) { showToast(error.message, true); }
  });
  groups.get("translation").append(permission);
}
buildPreferences();
void ExtensionView.rememberWindow("dashboard").catch(() => {});
let dashboardPort;
function connectDashboardPort() {
  try {
    dashboardPort = extensionApi.runtime.connect({ name: "dashboard" });
    dashboardPort.onMessage?.addListener((message) => { if (message.type === "REVIEW_ALERT" && ExtensionView.dataConsent().accepted) void ExtensionView.playSound(message.volume); });
    dashboardPort.onDisconnect.addListener(() => {
      void extensionApi.runtime.lastError;
      setTimeout(connectDashboardPort, 1000);
    });
  } catch { showToast(t("error.extension"), true); }
}
connectDashboardPort();
byId("redirect-uri").textContent = extensionApi.identity.getRedirectURL("twitch");
extensionApi.storage.local.get("appearance").then(({ appearance }) => setTheme(appearance, false));
extensionApi.storage.onChanged?.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.appearance) void setTheme(changes.appearance.newValue, false);
  if (changes.settings && currentState && !settingsDirty) {
    const next = { ...currentState, settings: ModerationCore.normalizeSettings(changes.settings.newValue) };
    updateSettingsForm(next.settings);
    render(next);
  }
});
extensionApi.runtime.onMessage.addListener((message) => {
  if (message.type === "DATA_CONSENT") {
    const consent = ExtensionView.updateDataConsent(message.dataConsent);
    if (currentState) render({ ...currentState, dataConsent: consent });
    else updatePrivacyControls();
  }
  if (message.type === "OPEN_SETTINGS") byId("settings-panel").hidden = false;
  if (message.type === "STATE") render(message.state);
  if (message.type === "ERROR" || message.type === "NOTICE") showToast(message.message, message.type === "ERROR");
});

applyLanguage(currentLanguage);
updatePrivacyControls();
request("GET_STATE").then((response) => {
  render(response.state);
  if (new URLSearchParams(location.search).get("settings") === "1") {
    updateSettingsForm(response.state.settings);
    byId("settings-panel").hidden = false;
  }
}).catch((error) => showToast(error.message, true));