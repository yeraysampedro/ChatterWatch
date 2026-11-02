# Deutsch: Installation und Bedienung

[Zurück zum README](../README.md) | [Español](es.md) | [English](en.md)

## 1. Installationsanleitung

### Umgebung und Abhängigkeiten

- Aktuelles Chrome oder Edge auf einem Desktop-System mit Unterstützung der Chrome-116+-Erweiterungs-APIs. Firefox und mobile Browser werden nicht unterstützt.
- Twitch-Konto und eine registrierte Anwendung in der [Twitch Developer Console](https://dev.twitch.tv/console/apps). Twitch kann für die Registrierung eine Zwei-Faktor-Authentifizierung verlangen.
- Git für Versionsverwaltung und Veröffentlichung. Deno 2 wird nur für Entwicklungstests benötigt, nicht für die Nutzung der Erweiterung.
- Weder Node.js noch npm, Backend, Framework, eigener WebSocket-Server oder Build-Schritt sind erforderlich. Der Browser führt die Dateien im Hauptverzeichnis direkt aus.
- Tests laden `@std/assert@1`, `fake-indexeddb@6.2.2` und `playwright@1.56.1`. Diese Pakete gehören nicht zu den Laufzeitabhängigkeiten der Erweiterung; das Lockfile hält die aufgelösten Versionen fest.

### Entpackte Erweiterung laden

1. Repository herunterladen oder in ein dauerhaftes Verzeichnis klonen.
2. `chrome://extensions` oder `edge://extensions` öffnen und **Entwicklermodus** aktivieren.
3. **Entpackte Erweiterung laden / Load unpacked** auswählen und den Ordner mit `manifest.json` öffnen, nicht `tests` oder `docs`.
4. Chatter Watch an die Symbolleiste anheften, das Panel öffnen und **Einstellungen** auswählen.
5. Die angezeigte OAuth-URL kopieren: `https://<ERWEITERUNGS-ID>.chromiumapp.org/twitch`.
6. Diese exakte URL als OAuth Redirect URL in der Twitch-Anwendung registrieren. Die **Client ID**, kein Client Secret, in der Erweiterung eintragen und speichern.
7. Den Namen des Hauptkanals ohne vollständige URL eingeben, mit **Verbinden** anmelden und die angeforderten Berechtigungen bestätigen.
8. Den Verbindungsstatus prüfen und **Multichat** über die Schaltfläche in der oberen Symbolleiste öffnen.

Erweiterungs-ID und Weiterleitungs-URL können sich durch einen anderen Browser, Computer, Pfad oder Installationsweg ändern. Bei Anmeldeproblemen die aktuelle URL erneut aus den Einstellungen kopieren. Sitzungstokens überstehen kein vollständiges Beenden des Browsers; bei Bedarf erneut anmelden.

### Berechtigungen

| Scope | Zweck |
| --- | --- |
| `chat:read` | Nachrichten über IRC lesen |
| `moderator:manage:banned_users` | Ban und Timeout im bestehenden Panel |
| `moderator:manage:warnings` | Nutzer verwarnen |
| `moderator:read:followers` | Signal für kürzlich gefolgte Nutzer |
| `moderator:manage:chat_settings` | Tatsächlichen Twitch Slow Mode ändern |

Das Lesen zusätzlicher Kanäle erfordert keine Moderatorrolle. Für Helix-Moderationsaktionen sind der passende Scope und Moderator- beziehungsweise Broadcaster-Rechte im Zielkanal erforderlich. Die aktuelle Tokenprüfung verlangt `chat:read` und `moderator:manage:banned_users`; bei aktivierter Follower-Prüfung auch den entsprechenden Follower-Scope. Ältere Tokens können ohne den neuen Einstellungs-Scope weiterhin lesen. Vor einem Slow-Mode-Wechsel Twitch trennen und erneut anmelden, um die Berechtigung zu erteilen.

Browserberechtigungen sind `storage`, `identity`, `sidePanel` und `alarms`. Hostzugriffe sind auf Twitch-API und Anmeldung begrenzt; TLS-IRC ist in der CSP erlaubt. Die Erweiterung injiziert keine Skripte in Webseiten und sendet Chatdaten nicht an ein eigenes Backend.

### Entwicklung, Tests und Build

[Deno 2 installieren](https://docs.deno.com/runtime/getting_started/installation/) und im Hauptverzeichnis ausführen:

```powershell
deno task test
deno task test:ui
```

Die erste Aufgabe prüft Regeln, Nachrichtenlast und einen simulierten Worker. Die zweite benötigt installiertes Chrome und läuft headless, ohne sichtbare Fenster. Chrome-APIs und Twitch-Verkehr werden simuliert; dein Twitch-Konto wird nicht angesprochen. Für Edge vorher `$env:CHATTER_BROWSER = 'msedge'` setzen. Für das von Playwright heruntergeladene Chromium:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` erteilt dem Testprozess Berechtigungen, nicht der Erweiterung. Nur für vertrauenswürdigen Code verwenden. Screenshots werden im vom Test angezeigten temporären Verzeichnis gespeichert. Eine Kompilierung ist nicht erforderlich. Nach Änderungen auf der Erweiterungsseite **Neu laden** wählen und die Ansichten erneut öffnen. Der Chatverlauf im Arbeitsspeicher wird zurückgesetzt.

Optionales ZIP zur Verteilung mit PowerShell:

```powershell
Compress-Archive -Path manifest.json,core.js,worker.js,dashboard.html,dashboard.css,dashboard.js,chat.html,chat.css,chat.js,chat-flow.js,virtual-chat.js -DestinationPath chatter-watch.zip -Force
```

Das ZIP enthält ausschließlich Laufzeitdateien. Zum entpackten Laden den Ordner verwenden, nicht das ZIP. Eine Store-Veröffentlichung erfordert ein gesondertes Einreichungs- und Prüfverfahren.

## 2. Bedienungsanleitung

### Multichat und Fenster

1. Den Hauptkanal im Moderationspanel verbinden.
2. **Multichat** und dann **Einstellungen** öffnen. Zusätzliche Kanalnamen durch Kommas trennen, etwa `kanal_zwei, kanal_drei`; keine URLs eingeben.
3. Speichern. Es sind höchstens sechs eindeutige Kanäle einschließlich Hauptkanal möglich. Namen dürfen Buchstaben, Ziffern und Unterstriche enthalten; ein führendes `#` oder `@` ist optional.
4. Eine, zwei oder drei Spalten auswählen. Bei schmalen Fenstern wird die Spaltenanzahl automatisch reduziert.
5. **Abtrennen** öffnet einen Kanal in einem eigenen nativen Fenster. **Neues Fenster** öffnet ein weiteres vollständiges Raster. Fenster mit den Mitteln des Betriebssystems verschieben oder vergrößern.
6. Einen zusätzlichen Kanal aus den Einstellungen entfernen, um ihn zu verlassen. Sein abgetrenntes Fenster wird leer. Den Hauptkanal im Moderationspanel ändern.

Alle Ansichten teilen Verbindung, Einstellungen, Sprache und Farbschema. Änderungen an Layout oder Filtern wirken auf alle Raster; Ein-Kanal-Fenster behalten eine Spalte. Pause und Scrollposition gelten nur für die jeweilige Ansicht. Gleichzeitige Änderungen werden anhand einer Revision geprüft: Bei abgelehntem Speichern Einstellungen schließen und erneut öffnen.

Das Schließen eines Fensters trennt IRC nicht. **Trennen** im Panel beendet alle geteilten Kanalverbindungen. Fenster und Positionen werden nach dem Beenden des Browsers nicht automatisch wiederhergestellt. Kontoprüfung, Notizen, Freigaben und Sanktionen des Panels bleiben auf den Hauptkanal beschränkt. Zusätzliche Chats sind bis auf den Slow-Mode-Regler nur lesbar.

### Nachrichtenlast und Spamfilter

| Einstellung | Standard | Werte und Verhalten |
| --- | --- | --- |
| Stapelintervall | 200 ms | 100-1.000 ms; kleiner bedeutet weniger Verzögerung, größer weniger Aktualisierungen |
| Lokaler Slow Mode | 0 s | 0-120 s je Nutzer und Kanal; 0 deaktiviert ihn |
| Spamfilter | Ein | Aktiviert Wiederholungs-, Häufigkeits- und Musterprüfung |
| Wiederholung | 3 | 2-20; ab dem n-ten identischen normalisierten Text ausblenden, auch bei verschiedenen Autoren |
| Häufigkeit | 6 | 2-50; höchstens diese Anzahl Nachrichten je Nutzer und Zeitfenster zulassen |
| Erkennungszeitfenster | 10 s | 1-120 s; festes Fenster ab dem ersten Ereignis je Schlüssel |
| Muster | Leer | Eingeschränkte Regex, maximal 240 Zeichen und 12 Alternativen |
| Pause bei Mauszeiger | Ein | Ansicht einfrieren, solange sich der Zeiger in der Nachrichtenliste befindet |

Wiederholungen werden nach NFKC-Normalisierung, Kleinschreibung und Zusammenfassung von Leerraum erkannt. Die Zähler sind je Kanal getrennt; ausgefilterte Nachrichten zählen ebenfalls zum Zeitfenster. Der lokale Slow Mode bleibt bei ausgeschaltetem Spamfilter aktiv. Speichern setzt interne Filterzähler zurück, nicht sichtbare Gesamtzähler oder gespeicherten Verlauf. Neue Regeln gelten nur für neue Nachrichten.

Gültiges Muster: `\bpromo\b|buy now|https://`. Unterstützt werden wörtlicher Text, Alternativen mit `|`, Anker `^`/`$`, Wortgrenzen `\b` und vom Validator akzeptierte Escape-Sequenzen für Satzzeichen. Keine `/.../`-Begrenzer verwenden; der Vergleich ist Unicode-basiert und ignoriert Groß-/Kleinschreibung. Gruppen, Zeichenklassen, Platzhalter und Quantoren wie `(a+)+`, `[a-z]`, `.*`, `?` oder `{3}` werden abgelehnt. Dadurch können teure Backtracking-Ausdrücke den Worker nicht blockieren. `\b` folgt JavaScript-Regeln, nicht einer vollständigen sprachlichen Wortsegmentierung.

Filter blenden Nachrichten lokal aus. Sie löschen nichts auf Twitch und lösen keine Verwarnungen, Bans oder Timeouts aus. Die Kontoprüfung des Hauptkanals erhält Nachrichten vor der visuellen Filterung, sofern ihre eigene Warteschlange nicht überlastet ist. Den automatischen Timeout des bestehenden Panels deaktiviert lassen, bis seine getrennten Kontoregeln verstanden sind.

### Tatsächlicher Twitch Slow Mode

Unter einem Chat **0** zum Deaktivieren oder eine ganze Zahl von **3 bis 120 Sekunden** zum Aktivieren eingeben. **Anwenden** wählen und bestätigen. Dies ruft Helix `PATCH /chat/settings` auf und ändert die Teilnahmebedingungen für echte Nutzer, einschließlich der Twitch-eigenen Ausnahmen und Regeln. Es ist keine bloße Anzeigeverzögerung. Der Raumstatus zeigt den von Twitch empfangenen Wert. HTTP 403 weist meistens auf fehlende Kanalrechte hin; ein fehlender Scope erfordert eine erneute Autorisierung.

### Pause, Lesen und Tastenkürzel

- Mauszeiger über der Liste, manuelles Scrollen nach oben oder Fokus innerhalb der Liste frieren die Ansicht ein. Neue Nachrichten gelangen weiterhin in einen begrenzten Puffer.
- **Pause** fügt eine manuelle Pause hinzu. **Live** hebt die Pausen auf und springt ans Ende. Bleibt der Mauszeiger innerhalb der Liste, pausiert Hover erst nach Verlassen und erneutem Betreten wieder.
- Scrollen bis zum Ende hebt die Scrollpause auf; Mauszeiger-, Fokus- oder manuelle Pause können weiterhin aktiv sein.
- Der Schaltflächenzähler zeigt während der Pause empfangene Nachrichten, keinen unbegrenzt wiederherstellbaren Rückstand. Nach Fortsetzung erscheint der zuletzt erhaltene Verlauf; ältere Nachrichten können bereits verworfen worden sein.
- Zeilen zeigen höchstens zwei Textzeilen. Anklicken oder Enter auf einer fokussierten Zeile öffnet den vollständig empfangenen Text. HTML aus Chatnachrichten wird als Text dargestellt, niemals ausgeführt.

| Tastenkürzel in Multichat | Aktion |
| --- | --- |
| Leertaste | Pause/Live für den Kanal unter dem Mauszeiger, mit Fokus oder den ersten Kanal umschalten |
| Ende | Diesen Kanal auf Live setzen |
| S | Einstellungen öffnen |
| N | Ein weiteres Rasterfenster öffnen |
| Esc | Offenen Dialog schließen |
| Tab, Enter | Steuerelemente auswählen/aktivieren; Enter öffnet eine Nachrichtenzeile |

Seitenweite Kürzel werden beim Schreiben in Feldern, auf Schaltflächen/Links, zusammen mit Strg/Alt/Meta oder bei geöffnetem Dialog nicht abgefangen. Es sind keine systemweiten Tastenkürzel.

### Leistung, Daten und Grenzen

Jeder Kanal hält höchstens 1.000 Nachrichten und 250 ausstehende Einträge je Stapel. Bei Überlauf bleiben die neuesten erhalten; **im Stapel ausgelassen** steigt. Der Spamfilter verfolgt maximal 5.000 Schlüssel je Kanal und entfernt bei Überschreitung ältere Schlüssel. Die Erkennung erfolgt daher nach bestem Bemühen. Auch die pausierte Kopie ist begrenzt. Im DOM werden nur sichtbare Zeilen plus ein kleiner Randbereich recycelt. Nachrichtentext ist auf 2.000 Zeichen begrenzt.

Die Kontoprüfung erlaubt 256 ausstehende beziehungsweise laufende Aufträge und vier gleichzeitige Aufträge. **Ungeprüft** zählt bei voller Warteschlange verworfene Nachrichten. Es darf nicht angenommen werden, dass alle Nutzer geprüft wurden. Ein geöffnetes Moderationspanel erhält gebündelten Zustand höchstens alle 500 ms. Das System ist kein vollständiges Auditprotokoll und garantiert keine feste FPS-Zahl für jede Hardware oder Last.

IRC `CLEARMSG` und `CLEARCHAT` entfernen Nachrichten aus dem laufenden und pausierten Multichat-Verlauf. Bereits im Moderationspanel gespeicherter Kontoverlauf wird dadurch nicht gelöscht. Multichat-Nachrichten und Zähler liegen im Arbeitsspeicher und gehen beim Worker-Neustart verloren. Twitch IRC liefert während einer Unterbrechung verpasste Nachrichten nicht nach. Heartbeats und Wiederverbindung mit wachsender Wartezeit sind vorhanden; unterbrechungsfreie Zustellung im Ruhezustand wird nicht garantiert.

Einstellungen liegen in `chrome.storage.local`, OAuth-Sitzungsdaten in `chrome.storage.session`. IndexedDB speichert Profile, Kontoverlauf und Notizen ohne automatische Ablaufzeit. **Twitch trennen** entfernt die Sitzung, nicht diese Daten. Zum vollständigen Löschen die Erweiterung entfernen oder ihren Speicher über die Erweiterungs-Entwicklertools leeren. Tokens und personenbezogene Chatdaten niemals veröffentlichen.

### Fehlerbehebung und GitHub

- OAuth-Fehler: exakte Weiterleitungs-URL und Client ID prüfen, neu laden und erneut anmelden. Keine Geheimnisse in Projektdateien eintragen.
- Kanal wartet: Existenz des Kanals, Verbindung des Hauptkanals und Netzwerkfreigabe für `wss://irc-ws.chat.twitch.tv:443` prüfen. Meldungen können englische Originalantworten von Twitch enthalten.
- Ausgelassene Stapelnachrichten: Intervall verkleinern, lokale Filter anpassen oder weniger Kanäle verwenden. Zähler sind im Speicher aufsummiert und allein kein Hinweis auf Verbindungsabbruch.
- Dienst nach Neuladen nicht erreichbar: alte Ansichten schließen und neu öffnen.
- UI-Test findet keinen Browser: Chrome/Edge installieren oder den obigen Chromium-Installationsbefehl verwenden.

Automatisierte Tests verwenden simulierten Verkehr. Echte OAuth-Anmeldung, Kanalrechte und tatsächliche Slow-Mode-Änderungen müssen mit einem berechtigten Konto manuell geprüft werden. Einen eigenen Kanal verwenden und anschließend dessen vorherige Slow-Mode-Einstellung wiederherstellen.

Die genauen Veröffentlichungsbefehle stehen unter [README: GitHub](../README.md#publicar-en-github). Ein leeres GitHub-Repository anlegen, den eigenen Kontonamen in der Remote-URL einsetzen und die dort gezeigten Befehle `git init -b main`, `git add .`, `git commit`, `git remote add origin` und `git push -u origin main` ausführen. Vorgemerkte Dateien vorher auf Geheimnisse prüfen. Die Veröffentlichung des Repositories veröffentlicht die Erweiterung nicht automatisch in Browser-Stores.