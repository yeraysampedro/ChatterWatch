# Deutsch: Installation und Bedienung

[Zurück zum README](../README.md) | [Español](es.md) | [English](en.md)

## 1. Installationsanleitung

### Umgebung und Abhängigkeiten

- Chromium/Chrome/Edge 116+ oder Firefox 140+ auf einem Desktop-System. Unterstützung für mobile Browser wird nicht zugesichert.
- Twitch-Konto und eine registrierte Anwendung in der [Twitch Developer Console](https://dev.twitch.tv/console/apps). Twitch kann für die Registrierung eine Zwei-Faktor-Authentifizierung verlangen.
- Git für Versionsverwaltung und Veröffentlichung. Deno 2 wird nur zum Erstellen der Pakete und für Tests benötigt, nicht zur Installation oder Nutzung der Pakete.
- Weder Node.js noch npm, Backend, Framework oder Kompilierung sind erforderlich. Chromium kann das Hauptverzeichnis direkt laden; Firefox benötigt sein erzeugtes Manifest. `fflate@0.8.2` wird nur zum Verpacken verwendet, nicht in der Erweiterung.
- Tests laden `@std/assert@1`, `fake-indexeddb@6.2.2` und `playwright@1.56.1`. Diese Pakete gehören nicht zu den Laufzeitabhängigkeiten der Erweiterung; das Lockfile hält die aufgelösten Versionen fest.

### Entpackte Erweiterung in Chromium laden

1. Chromium-ZIP entpacken, nach `deno task build` den Ordner `dist/chromium` verwenden oder das Repository in ein dauerhaftes Verzeichnis klonen.
2. `chrome://extensions` oder `edge://extensions` öffnen und **Entwicklermodus** aktivieren.
3. **Entpackte Erweiterung laden / Load unpacked** auswählen und den Ordner mit `manifest.json` öffnen, nicht `tests` oder `docs`.
4. Chatter Watch an die Symbolleiste anheften, das Panel öffnen und **Einstellungen** auswählen.
5. Die angezeigte OAuth-URL kopieren: `https://<ERWEITERUNGS-ID>.chromiumapp.org/twitch`.
6. Diese exakte URL als OAuth Redirect URL in der Twitch-Anwendung registrieren. Die **Client ID**, kein Client Secret, in der Erweiterung eintragen und speichern.
7. Den Namen des Hauptkanals ohne vollständige URL eingeben, mit **Verbinden** anmelden und die angeforderten Berechtigungen bestätigen.
8. Den Verbindungsstatus prüfen und **Multichat** über die Schaltfläche in der oberen Symbolleiste öffnen.

Erweiterungs-ID und Weiterleitungs-URL können sich durch einen anderen Browser, Computer, Pfad oder Installationsweg ändern. Bei Anmeldeproblemen die aktuelle URL erneut aus den Einstellungen kopieren. Sitzungstokens überstehen kein vollständiges Beenden des Browsers; bei Bedarf erneut anmelden.

### Firefox

1. Firefox-ZIP entpacken oder mit `deno task build` den Ordner `dist/firefox` erzeugen.
2. `about:debugging#/runtime/this-firefox` öffnen, **Temporäres Add-on laden** wählen und die `manifest.json` dieses Ordners auswählen, nicht die im Repository-Hauptverzeichnis.
3. In Einstellungen die von Firefox angezeigte OAuth-URL kopieren und ebenfalls bei Twitch registrieren. Die `chromiumapp.org`-URL von Chromium nicht wiederverwenden. Client ID speichern und wie oben verbinden.

Popup, Seitenleiste und Multichat-Fenster sind in beiden Browsern verfügbar. Firefox verwendet Hintergrundskripte und `sidebarAction`, Chromium einen Service Worker und `sidePanel`. Verweise auf `chrome.storage` entsprechen in Firefox `browser.storage`.

Die temporäre Installation endet beim Schließen von Firefox. Für dauerhafte Verteilung das Firefox-ZIP bei [Mozilla Add-ons](https://addons.mozilla.org/developers/) als gelistet oder ungelistet einreichen und die von Mozilla signierte XPI-Datei verteilen. Das Verpacken signiert und veröffentlicht nichts. Die ID `twitch-chatter-watch@extensions.local` für Updates beibehalten; eine Änderung erzeugt eine andere Identität und kann OAuth ändern.

### Berechtigungen

| Scope | Zweck |
| --- | --- |
| `chat:read` | Nachrichten über IRC lesen |
| `moderator:manage:banned_users` | Ban/Timeout im Panel und Multichat-Schaltfläche `/srs 1s` |
| `moderator:manage:warnings` | Nutzer verwarnen |
| `moderator:read:followers` | Signal für kürzlich gefolgte Nutzer |
| `moderator:manage:chat_settings` | Tatsächlichen Twitch Slow Mode ändern |

Das Lesen zusätzlicher Kanäle erfordert keine Moderatorrolle. Für Helix-Moderationsaktionen sind der passende Scope und Moderator- beziehungsweise Broadcaster-Rechte im Zielkanal erforderlich. Die aktuelle Tokenprüfung verlangt `chat:read` und `moderator:manage:banned_users`; bei aktivierter Follower-Prüfung auch den entsprechenden Follower-Scope. Ältere Tokens können ohne den neuen Einstellungs-Scope weiterhin lesen. Vor einem Slow-Mode-Wechsel Twitch trennen und erneut anmelden, um die Berechtigung zu erteilen.

Beide Varianten verwenden `storage`, `identity` und `alarms`; nur Chromium benötigt zusätzlich `sidePanel`. Hostzugriffe sind auf Twitch-API und Anmeldung begrenzt; TLS-IRC ist in der CSP erlaubt. Es werden keine Skripte in Webseiten injiziert und kein eigenes Backend verwendet. Firefox deklariert `authenticationInfo` und `personallyIdentifyingInfo` für Anmeldung und an Twitch gesendete Kennungen, mit der integrierten Einwilligung ab Firefox 140. Es gibt keine Telemetrie und keine Weiterleitung von Chattext an Dritte.

### Entwicklung, Tests und Build

[Deno 2 installieren](https://docs.deno.com/runtime/getting_started/installation/) und im Hauptverzeichnis ausführen:

```powershell
deno task test
deno task test:build
deno task test:ui
```

Die Aufgaben prüfen Regeln und simulierten Worker, Pakete und Ansichten. UI-Tests benötigen installiertes Chrome und verwenden simulierte Erweiterungs-APIs und Twitch-Verkehr, ohne sichtbare Fenster oder Zugriff auf dein Konto. Für Edge vorher `$env:CHATTER_BROWSER = 'msedge'` setzen. Für das von Playwright heruntergeladene Chromium:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` erteilt dem Testprozess Berechtigungen, nicht der Erweiterung. Nur für vertrauenswürdigen Code verwenden. Screenshots werden im vom Test angezeigten temporären Verzeichnis gespeichert. Eine Kompilierung ist nicht erforderlich. Nach Änderungen auf der Erweiterungsseite **Neu laden** wählen und die Ansichten erneut öffnen. Der Chatverlauf im Arbeitsspeicher wird zurückgesetzt.

Dieselben Tests mit Firefox headless ausführen:

```powershell
deno run -A npm:playwright@1.56.1 install firefox
deno task test:ui:firefox
```

`deno task build` erzeugt beide Pakete: `dist/chatter-watch-<Version>-chromium.zip`, `dist/chatter-watch-<Version>-firefox.zip` sowie die Ordner `dist/chromium` und `dist/firefox`. Die Version stammt aus dem Manifest. Die ZIP-Dateien sind reproduzierbar und enthalten nur die elf Laufzeitdateien, keine Tests, Abhängigkeiten, Zugangsdaten oder Nutzerdaten. Erzeugte Ordner werden bei jedem Lauf ersetzt; nicht direkt bearbeiten. Lokale Installation verwendet die Ordner; Store-Verteilung erfordert gesonderte Prüfung und Signierung.

## 2. Bedienungsanleitung

### Multichat und Fenster

1. Den Hauptkanal im Moderationspanel verbinden.
2. **Multichat** und dann **Einstellungen** öffnen. Zusätzliche Kanalnamen durch Kommas trennen, etwa `kanal_zwei, kanal_drei`; keine URLs eingeben.
3. Speichern. Es sind höchstens sechs eindeutige Kanäle einschließlich Hauptkanal möglich. Namen dürfen Buchstaben, Ziffern und Unterstriche enthalten; ein führendes `#` oder `@` ist optional.
4. Eine, zwei oder drei Spalten auswählen. Bei schmalen Fenstern wird die Spaltenanzahl automatisch reduziert.
5. **Abtrennen** öffnet einen Kanal in einem eigenen nativen Fenster. **Neues Fenster** öffnet ein weiteres vollständiges Raster. Fenster mit den Mitteln des Betriebssystems verschieben oder vergrößern.
6. Einen zusätzlichen Kanal aus den Einstellungen entfernen, um ihn zu verlassen. Sein abgetrenntes Fenster wird leer. Den Hauptkanal im Moderationspanel ändern.

Alle Ansichten teilen Verbindung, Einstellungen, Sprache und Farbschema. Änderungen an Layout oder Filtern wirken auf alle Raster; Ein-Kanal-Fenster behalten eine Spalte. Pause und Scrollposition gelten nur für die jeweilige Ansicht. Gleichzeitige Änderungen werden anhand einer Revision geprüft: Bei abgelehntem Speichern Einstellungen schließen und erneut öffnen.

Das Schließen eines Fensters trennt IRC nicht. **Trennen** im Panel beendet alle geteilten Kanalverbindungen. Fenster werden ausdrücklich über **Arbeitsbereiche** wiederhergestellt, nie automatisch beim Browserstart. Kontoprüfung, Notizen, Freigaben und automatische Sanktionen des Panels bleiben auf den Hauptkanal beschränkt. In zusätzlichen Kanälen stehen Slow Mode und die manuelle Aktion `/srs 1s` bei entsprechenden Rechten zur Verfügung.

### Arbeitsbereiche und zusammengeführter Chat

Unter **Arbeitsbereiche** einen Namen eingeben und **Aktuelle Fenster speichern** wählen. Gespeichert werden Kanäle, Spalten, Filter, Hervorhebungen und Ansichtsmodus sowie Position, Größe und normaler/maximierter Zustand der Multichat-Popup-Fenster. Möglich sind 8 Arbeitsbereiche mit Namen von 1-40 Zeichen und 1-12 Fenstern pro Arbeitsbereich. Das Ersetzen eines bestehenden Namens erfordert Bestätigung; Arbeitsbereiche lassen sich auch löschen.

Einen Arbeitsbereich auswählen und **Wiederherstellen** wählen. Passende Kanal-/Rasterfenster werden wiederverwendet; fehlende Fenster werden ohne Fokusanforderung geöffnet. Fremde oder überzählige Fenster werden weder geschlossen noch verschoben. Browser oder Betriebssystem können Koordinaten bei geänderter Monitorkonfiguration anpassen. Negative Koordinaten für mehrere Monitore bleiben erhalten. Unterstützte Größen: 320-7.680 mal 300-4.320 Pixel. Die Positionierung auf physischen Monitoren muss noch manuell geprüft werden.

Arbeitsbereiche bleiben in `chrome.storage.local` nach Browserneustarts erhalten, speichern aber keine Zugangsdaten, Nachrichten, Pins oder Pausen. Wiederherstellen meldet nicht an und ändert den Hauptkanal der Moderation nicht. Gespeicherte Kanäle werden mit dem aktuellen Hauptkanal kombiniert; die Grenze von sechs gilt weiterhin. Bei Überschreitung zuerst Hauptkanal oder Konfiguration anpassen. Teilfehler werden angezeigt; erneutes Wiederherstellen dupliziert passende Fenster nicht.

**Raster / Zusammengeführt** ändert alle geteilten Rasteransichten. **Zusammengeführt** mischt die neuesten 1.000 verfügbaren Nachrichten nach Twitch-Zeitstempel, bei Gleichstand nach Kanal und Sequenz, mit `#Kanal`-Kennzeichnungen. Verspätete Nachrichten werden ohne unbegrenztes Warten nach ihrer Zeit eingeordnet, solange sie in den behaltenen Verlauf passen. Abgetrennte Ein-Kanal-Fenster bleiben einzeln. Slow-Mode-Regler bleiben in den Einzelansichten, damit das Ziel einer Aktion eindeutig ist.

### Hervorhebungen, Pins und Ein-Sekunden-Timeout

Unter **Einstellungen > Schlüsselwörter hervorheben** bis zu 12 Regeln hinzufügen. Jede Regel kombiniert Text oder eingeschränkte Regex mit einer Farbauswahl. Nur der passende Text wird eingefärbt. Es gelten dieselben Regex-Sicherheitsgrenzen wie beim Spamfilter. Beispiel: `\balarm\b|brauche hilfe`. Bei überlappenden Treffern hat die erste Regel Vorrang. Hervorhebungen sind unabhängig vom Spamfilter, werden zwischen Ansichten geteilt und gelten auch für geladenen Verlauf und Pins.

Eine Zeile anklicken oder mit Enter oben anheften. Pro Fenster sind 3 Pins möglich; ein vierter ersetzt den ältesten. Anheften schaltet die Liste auf Live, damit der restliche Chat weiterläuft. Pins sind lokal, überstehen den Wechsel zwischen Raster und zusammengeführter Ansicht im selben Fenster und verschwinden beim Schließen oder Neuladen. **Vollständig lesen** öffnet den ganzen Text; **Lösen** entfernt den Pin. Ein Pin kann Kontext erhalten, nachdem die Nachricht aus dem Live-Puffer gefallen ist.

Die Schaltfläche **`/srs 1s`** an jedem Pin fordert sofort einen Timeout von genau einer Sekunde mit dem Grund `/srs` an, ohne weitere Bestätigung. Dies ist eine echte Twitch-Aktion für den angezeigten Autor und Kanal: Identität vorher prüfen. Benötigt werden `moderator:manage:banned_users` und Moderator-/Broadcaster-Rechte. Empfangener Text `/srs` löst nichts automatisch aus; ein globales Tastenkürzel wird wegen versehentlicher Sanktionen nicht hinzugefügt. Der Worker bestimmt den Nutzer anhand einer behaltenen Nachricht, nicht anhand einer beliebigen Nutzer-ID aus der Ansicht. Ist sie bereits aus seinem Verlauf gefallen, wird die Anfrage abgelehnt. Twitch- und Berechtigungsfehler werden angezeigt, ohne Erfolg vorzutäuschen.

### Ghost-Nachrichten und lokaler Export

`CLEARMSG` markiert die Zielnachricht und `CLEARCHAT` die betroffenen Nutzer-/Kanalnachrichten als gelöscht. Sie bleiben mit einer roten Überlagerung im Live-Verlauf, der pausierten Kopie und in Pins sichtbar. Auf Twitch wird nichts wiederhergestellt. Nie empfangene oder bereits verworfene Nachrichten können nicht rekonstruiert werden. Die Virtualisierung recycelt weiterhin unsichtbare Zeilen und begrenzt den Verlauf; gelöschten Text zu behalten bedeutet nicht, jeden DOM-Knoten dauerhaft zu behalten.

Die Download-Schaltfläche jeder Kopfzeile (**TXT exportieren**) lädt den aktuellen Live-Puffer mit höchstens 1.000 Nachrichten herunter, auch während eine pausierte Kopie gelesen wird. Enthalten sind ISO-Zeit, Kanal, Autor, Text und `[deleted]` für Ghost-Nachrichten. Die zusammengeführte Ansicht exportiert ihre gemeinsame Chronologie; bereits aus dem Live-Puffer gefallene Pins sind nicht enthalten. Die UTF-8-Textdatei enthält keine Tokens und wird nicht auf einen Server hochgeladen. Die Browsereinstellungen bestimmen den Speicherort. Exporte können personenbezogene Daten und gelöschten Inhalt enthalten: lokal aufbewahren und Berechtigungen vor einer Weitergabe prüfen.

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

- Mauszeiger über der Liste, manuelles Scrollen nach oben um mindestens ein Pixel oder Fokus innerhalb der Liste frieren die Ansicht ein. Neue Nachrichten gelangen weiterhin in einen begrenzten Puffer.
- **Pause** fügt eine manuelle Pause hinzu. **Live** hebt die Pausen auf und springt ans Ende. Bleibt der Mauszeiger innerhalb der Liste, pausiert Hover erst nach Verlassen und erneutem Betreten wieder.
- Mauszeigerbewegung und neue Nachrichten lösen die Scrollsperre nicht: Dazu manuell das genaue Ende erreichen oder Live/Ende wählen. Am Ende wird die Scrollpause aufgehoben; Mauszeiger-, Fokus- oder manuelle Pause können weiterhin aktiv sein.
- Der Schaltflächenzähler zeigt während der Pause empfangene Nachrichten, keinen unbegrenzt wiederherstellbaren Rückstand. Nach Fortsetzung erscheint der zuletzt erhaltene Verlauf; ältere Nachrichten können bereits verworfen worden sein.
- Zeilen zeigen höchstens zwei Textzeilen. Anklicken oder Enter heftet eine Zeile an; Vollständig lesen am Pin öffnet den Text. HTML aus Chatnachrichten wird als Text dargestellt, niemals ausgeführt.

| Tastenkürzel in Multichat | Aktion |
| --- | --- |
| Leertaste | Pause/Live für den Kanal unter dem Mauszeiger, mit Fokus oder den ersten Kanal umschalten |
| Ende | Diesen Kanal auf Live setzen |
| S | Einstellungen öffnen |
| N | Ein weiteres Rasterfenster öffnen |
| Esc | Offenen Dialog schließen |
| Tab, Enter | Steuerelemente auswählen/aktivieren; Enter heftet eine Nachrichtenzeile an |

Seitenweite Kürzel werden beim Schreiben in Feldern, auf Schaltflächen/Links, zusammen mit Strg/Alt/Meta oder bei geöffnetem Dialog nicht abgefangen. Es sind keine systemweiten Tastenkürzel.

### Leistung, Daten und Grenzen

Jeder Kanal hält höchstens 1.000 Nachrichten und 250 ausstehende Einträge je Stapel. Bei Überlauf bleiben die neuesten erhalten; **im Stapel ausgelassen** steigt. Der Spamfilter verfolgt maximal 5.000 Schlüssel je Kanal und entfernt bei Überschreitung ältere Schlüssel. Die Erkennung erfolgt daher nach bestem Bemühen. Auch die pausierte Kopie ist begrenzt. Im DOM werden nur sichtbare Zeilen plus ein kleiner Randbereich recycelt. Nachrichtentext ist auf 2.000 Zeichen begrenzt.

Die Kontoprüfung erlaubt 256 ausstehende beziehungsweise laufende Aufträge und vier gleichzeitige Aufträge. **Ungeprüft** zählt bei voller Warteschlange verworfene Nachrichten. Es darf nicht angenommen werden, dass alle Nutzer geprüft wurden. Ein geöffnetes Moderationspanel erhält gebündelten Zustand höchstens alle 500 ms. Das System ist kein vollständiges Auditprotokoll und garantiert keine feste FPS-Zahl für jede Hardware oder Last.

IRC `CLEARMSG` und `CLEARCHAT` markieren Ghost-Nachrichten im Live-Verlauf, in pausierten Kopien und Pins. Bereits im Moderationspanel gespeicherter Kontoverlauf wird dadurch nicht gelöscht. Worker-Verlauf und Zähler liegen im Arbeitsspeicher und gehen beim Neustart verloren; eine offene Ansicht kann ihre lokale Kopie bis zur Wiederverbindung und Pins bis zum Schließen behalten. Twitch IRC liefert während einer Unterbrechung verpasste Nachrichten nicht nach. Heartbeats und Wiederverbindung mit wachsender Wartezeit sind vorhanden; unterbrechungsfreie Zustellung im Ruhezustand wird nicht garantiert.

Einstellungen liegen in `chrome.storage.local`, OAuth-Sitzungsdaten in `chrome.storage.session`. IndexedDB speichert Profile, Kontoverlauf und Notizen ohne automatische Ablaufzeit. **Twitch trennen** entfernt die Sitzung, nicht diese Daten. Zum vollständigen Löschen die Erweiterung entfernen oder ihren Speicher über die Erweiterungs-Entwicklertools leeren. Tokens und personenbezogene Chatdaten niemals veröffentlichen.

### Fehlerbehebung und GitHub

- OAuth-Fehler: exakte Weiterleitungs-URL und Client ID prüfen, neu laden und erneut anmelden. Keine Geheimnisse in Projektdateien eintragen.
- Kanal wartet: Existenz des Kanals, Verbindung des Hauptkanals und Netzwerkfreigabe für `wss://irc-ws.chat.twitch.tv:443` prüfen. Meldungen können englische Originalantworten von Twitch enthalten.
- Ausgelassene Stapelnachrichten: Intervall verkleinern, lokale Filter anpassen oder weniger Kanäle verwenden. Zähler sind im Speicher aufsummiert und allein kein Hinweis auf Verbindungsabbruch.
- Dienst nach Neuladen nicht erreichbar: alte Ansichten schließen und neu öffnen.
- UI-Test findet keinen Browser: Chrome/Edge installieren oder den obigen Chromium-Installationsbefehl verwenden.

Automatisierte Tests verwenden simulierten Verkehr. Echte OAuth-Anmeldung, Kanalrechte, Slow-Mode-Änderungen, Ein-Sekunden-Timeouts und Wiederherstellung auf physischen Monitoren müssen noch manuell geprüft werden. Ein berechtigtes Konto und einen eigenen Kanal verwenden; anschließend dessen vorherige Slow-Mode-Einstellung wiederherstellen.

Die genauen Veröffentlichungsbefehle stehen unter [README: GitHub](../README.md#publicar-en-github). Ein leeres GitHub-Repository anlegen, den eigenen Kontonamen in der Remote-URL einsetzen und die dort gezeigten Befehle `git init -b main`, `git add .`, `git commit`, `git remote add origin` und `git push -u origin main` ausführen. Vorgemerkte Dateien vorher auf Geheimnisse prüfen. Die Veröffentlichung des Repositories veröffentlicht die Erweiterung nicht automatisch in Browser-Stores.