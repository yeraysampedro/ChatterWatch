# Deutsch: Installation und Bedienung

[Zurück zum README](../README.md) | [Español](es.md) | [English](en.md)

## 1. Installationsanleitung

### Umgebung und Abhängigkeiten

- Chromium/Chrome/Edge 116+ oder Firefox 140+ auf einem Desktop-System. Unterstützung für mobile Browser wird nicht zugesichert.
- Twitch-Konto und eine registrierte Anwendung in der [Twitch Developer Console](https://dev.twitch.tv/console/apps). Twitch kann für die Registrierung eine Zwei-Faktor-Authentifizierung verlangen.
- Git für Versionsverwaltung und Veröffentlichung. Deno 2 wird nur zum Erstellen der Pakete und für Tests benötigt, nicht zur Installation oder Nutzung der Pakete.
- Weder Node.js noch npm, Backend, Framework oder Kompilierung sind erforderlich. Chromium kann `src/` direkt laden, nicht das Repository-Hauptverzeichnis; Firefox benötigt das erzeugte Manifest in `dist/firefox/`. Werkzeuge liegen in `build/`, Deno-Aufgaben laufen vom Projekt-Hauptverzeichnis. `fflate@0.8.2` wird nur zum Verpacken verwendet, nicht in der Erweiterung.
- Tests laden `@std/assert@1`, `fake-indexeddb@6.2.2` und `playwright@1.56.1`. Diese Pakete gehören nicht zu den Laufzeitabhängigkeiten der Erweiterung; das Lockfile hält die aufgelösten Versionen fest.

### Entpackte Erweiterung in Chromium laden

1. Chromium-ZIP entpacken, nach `deno task build` den Ordner `dist/chromium` verwenden oder das Repository in ein dauerhaftes Verzeichnis klonen.
2. `chrome://extensions` oder `edge://extensions` öffnen und **Entwicklermodus** aktivieren.
3. **Entpackte Erweiterung laden / Load unpacked** auswählen und den Ordner mit `manifest.json` öffnen, nicht `tests` oder `docs`.
4. ChatterWatch an die Symbolleiste anheften und das Panel öffnen. Vor der Twitch-Einrichtung **Datennutzung prüfen** wählen: **Offline bleiben** lehnt ab; das anfangs leere Zustimmungsfeld aktivieren und **Datennutzung erlauben** wählen, um Twitch freizugeben. Danach **Einstellungen** öffnen.
5. Die angezeigte OAuth-URL kopieren: `https://<ERWEITERUNGS-ID>.chromiumapp.org/twitch`.
6. Diese exakte URL als OAuth Redirect URL in der Twitch-Anwendung registrieren. Die **Client ID**, kein Client Secret, in der Erweiterung eintragen und speichern.
7. Den Namen des Hauptkanals ohne vollständige URL eingeben, mit **Verbinden** anmelden und die angeforderten Berechtigungen bestätigen.
8. Den Verbindungsstatus prüfen und **Multichat** über die Schaltfläche in der oberen Symbolleiste öffnen.

Erweiterungs-ID und Weiterleitungs-URL können sich durch einen anderen Browser, Computer, Pfad oder Installationsweg ändern. Bei Anmeldeproblemen die aktuelle URL erneut aus den Einstellungen kopieren. Sitzungstokens überstehen kein vollständiges Beenden des Browsers; bei Bedarf erneut anmelden.

### Firefox

1. Firefox-ZIP entpacken oder mit `deno task build` den Ordner `dist/firefox` erzeugen.
2. `about:debugging#/runtime/this-firefox` öffnen, **Temporäres Add-on laden** wählen und `manifest.json` aus `dist/firefox/` oder dem entpackten Firefox-ZIP auswählen, nicht aus `src/`.
3. In Einstellungen die von Firefox angezeigte OAuth-URL kopieren und ebenfalls bei Twitch registrieren. Die `chromiumapp.org`-URL von Chromium nicht wiederverwenden. Client ID speichern und wie oben verbinden.

Popup, Seitenleiste und Multichat-Fenster sind in beiden Browsern verfügbar. Firefox verwendet Hintergrundskripte und `sidebarAction`, Chromium einen Service Worker und `sidePanel`. Verweise auf `chrome.storage` entsprechen in Firefox `browser.storage`.

Die temporäre Installation endet beim Schließen von Firefox. Für dauerhafte Verteilung das Firefox-ZIP bei [Mozilla Add-ons](https://addons.mozilla.org/developers/) als gelistet oder ungelistet einreichen und die von Mozilla signierte XPI-Datei verteilen. Das Verpacken signiert und veröffentlicht nichts. Die ID `twitch-chatter-watch@extensions.local` für Updates beibehalten; eine Änderung erzeugt eine andere Identität und kann OAuth ändern.

### Berechtigungen

| Scope | Zweck |
| --- | --- |
| `chat:read` | Nachrichten über IRC lesen |
| `moderator:manage:banned_users` | Bans/Timeouts setzen und aufheben sowie Multichat-Schaltfläche `/srs 1s` |
| `moderator:manage:warnings` | Nutzer verwarnen |
| `moderator:read:followers` | Signal für kürzlich gefolgte Nutzer |
| `moderator:manage:chat_settings` | Tatsächlichen Twitch Slow Mode ändern |
| `moderator:manage:chat_messages` | Einzelne Nachricht aus Multichat löschen |

Das Lesen zusätzlicher Kanäle erfordert keine Moderatorrolle. Für Helix-Moderationsaktionen sind der passende Scope und Moderator- beziehungsweise Broadcaster-Rechte im Zielkanal erforderlich. Die aktuelle Tokenprüfung verlangt `chat:read` und `moderator:manage:banned_users`; bei aktivierter Follower-Prüfung auch den entsprechenden Follower-Scope. Ältere Tokens können ohne den neuen Einstellungs-Scope weiterhin lesen. Vor einem Slow-Mode-Wechsel Twitch trennen und erneut anmelden, um die Berechtigung zu erteilen.

Beide Varianten verwenden `storage`, `identity` und `alarms`; nur Chromium zusätzlich `sidePanel`. Erforderlicher Hostzugriff gilt Twitch; Übersetzung erlaubt optionalen HTTPS-Zugriff auf den ausgewählten Ursprung. Es werden weder Webseitenskripte noch entfernter Code geladen. Firefox deklariert erforderliche `authenticationInfo`/`personallyIdentifyingInfo` für Twitch und optionale `personalCommunications` für Übersetzung. Keine Telemetrie und kein eigenes Backend. Nachrichtentext wird nur nach Einrichtung/Freigabe des Servers und Bestätigung der Nachricht übertragen. Siehe [Datenschutz](PRIVACY.md).

### Entwicklung, Tests und Build

Die erste öffentliche Version wird als **ChatterWatch 1.0.0** mit dem vorgesehenen Tag `v1.0.0` vorbereitet. Zusätzlich zu den Chromium- und Firefox-ZIPs erzeugt `deno task build` die Datei `dist/packages/chatter-watch-1.0.0-firefox-unsigned.xpi`. Sie ist unsignierte Entwicklungs-/Signierungseingabe, keine dauerhafte Firefox-Installation. Das [englische README](../README.md) erklärt GitHub Releases und den Bezug einer von Mozilla signierten XPI.

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

`deno task build` erzeugt `dist/packages/chatter-watch-<Version>-chromium.zip`, `dist/packages/chatter-watch-<Version>-firefox.zip` und die Ordner `dist/chromium`/`dist/firefox`. Die erlaubten Dateien enthalten lokale Ressourcen, die Lizenz der Lucide-0.468.0-Icons und Marken-PNGs mit 16/32/48/64/96/128 Pixeln, keine Tests, Zugangsdaten oder Nutzerdaten. Die 512-Pixel-Grafik in `src/assets/icons/` ist nicht in Laufzeit-ZIPs enthalten. Bilder/Metadaten liegen in `dist/store/`, Store-Kits in `dist/store-kits/` und Quellarchive in `dist/source/`. Erzeugte Dateien nicht direkt bearbeiten. Wurde bisher das Repository-Hauptverzeichnis geladen, jetzt `src/` wählen und die OAuth-URL prüfen; `dist/chromium` und `dist/firefox` behalten ihre Pfade. Store-Verteilung erfordert gesonderte Prüfung und Signierung.

## 2. Bedienungsanleitung

### Sprache und automatisches Speichern

Ohne gespeicherte Sprachwahl verwendet die Erweiterung die Sprache der Browseroberfläche. Regionale Varianten werden einer unterstützten Sprache zugeordnet: `es-MX` verwendet Spanisch, `de-AT` Deutsch. Für nicht unterstützte Sprachen wird Englisch verwendet. Unter **Einstellungen > Sprache** kann die Auswahl geändert werden; sie wird automatisch gespeichert und hat bei späteren Aufrufen Vorrang, auch in Multichat. Das Twitch-Profil wird zur Spracherkennung nicht abgefragt.

Paneleinstellungen, Hauptkanal und Multichat-Einstellungen werden beim Bestätigen eines Feldes oder 350 ms nach der letzten Eingabe automatisch gespeichert. **Speichern** bleibt verfügbar; beim Schließen der Einstellungen wird versucht, ausstehende Änderungen zu speichern. Unvollständige oder ungültige Felder ersetzen die gespeicherte Konfiguration nicht. Werte und angezeigte Fehler korrigieren. Hat ein anderes Fenster Multichat geändert, Einstellungen schließen und vor weiteren Änderungen erneut öffnen. Benannte Arbeitsbereiche und echte Twitch-Aktionen benötigen weiterhin ihre Schaltflächen; der tatsächliche Slow Mode behält seine Bestätigung.

Gültige Änderungen gelten nach dem Speichern: Eine andere Client ID kann die Anmeldung aufheben, ein geänderter verbundener Hauptkanal kann eine Wiederverbindung auslösen, und das Aktivieren automatischer Timeouts schaltet deren Moderationsregeln ein. Bei abruptem Beenden des Browsers oder Computers vor Abschluss des Schreibvorgangs ist das Speichern nicht garantiert.

### Dashboard und Moderationsfunktionen

**Daten und Datenschutz:** Twitch-Anmeldung/API/IRC, neue Kontoverläufe und externe Avatare beginnen erst nach aktueller ausdrücklicher Einwilligung. Der Hinweis erklärt Kategorien, Empfänger, lokale Aufbewahrung und Widerruf; er ersetzt weder OAuth noch die einzelne Übersetzungsbestätigung. In Einstellungen oder den Erweiterungsoptionen des Browsers entfernt **Einwilligung widerrufen und trennen** Sitzungstoken und stoppt neue Aktivität. Bestehender Verlauf bleibt offline schreibgeschützt lesbar. Zum Löschen den Browserspeicher leeren oder deinstallieren; Exporte separat entfernen. Lokale Anzeige-/Fenstereinstellungen bleiben verfügbar; frühere Übertragungen oder Twitch-Aktionen lassen sich nicht zurückrufen.

Der anfängliche Modus ist dunkel; eine gespeicherte helle Auswahl bleibt erhalten. Dashboard und Einstellungen nutzen die verfügbare Breite mit gleicher Geometrie in beiden Designs. Nur die Zahl ausstehender Prüfungen wird hervorgehoben; das Verzeichnis hat Seiten mit 25 Personen. **Freigegeben** zeigt Freigabegründe, ohne Nachrichten im Live-Chat auszublenden.

Das bereitgestellte Augen-Symbol bestimmt die violette Gestaltung: tagsüber weiße/lavendelfarbene Flächen mit dem ursprünglichen dunklen Violett, nachts dunkelviolette Flächen mit hellem Lavendelakzent. Die schwarzen Konturen behalten einen hellen Hintergrund in den erzeugten Icons. Warnungen und Fehler bleiben gelb/rot und damit vom Markenakzent unterscheidbar.

Die Anheften-Schaltfläche öffnet oder verwendet einen **angehefteten Tab im Browser**, kein unabhängiges Fenster. Auch ladende Tabs werden wiederverwendet und minimierte Browserfenster wiederhergestellt, ohne andere Ansichten zu schließen. Das native Popup fordert 760 x 580 Inhaltsgröße an, begrenzt durch den Browser und den Platz für Scrollleisten; bei Fokusverlust schließt es weiterhin. Für dauerhaftes Öffnen den angehefteten Tab oder die Seitenleiste verwenden. OAuth aus dem Popup wechselt zuerst zum angehefteten Tab; dort die Anmeldung fortsetzen. Die Client ID ist verdeckt und kann angezeigt werden; sie ist kein Client Secret. **Alle Einstellungen** in Multichat öffnet die gemeinsame Konfiguration im Dashboard-Tab.

Unabhängige Fenster speichern geänderte Position/Größe alle zwei Sekunden, bei Fokusverlust und beim Schließen. Erneutes Öffnen verwendet gespeicherte Werte; ein Ein-Kanal-Fenster beginnt ohne frühere Geometrie bei 520 x 760. Beim Browserstart werden keine Fenster automatisch geöffnet. Arbeitsbereiche behalten die ausdrückliche Wiederherstellung. Das Betriebssystem kann Koordinaten fehlender Monitore anpassen; physische Positionierung muss manuell geprüft werden.

Unter **Automatische Freigabe** OR-Regeln einzeln aktivieren: mehr als N Nachrichten, bestätigter Follower, aktueller Abonnent oder lokal beobachteter früherer Abonnent. Anfangs sind alle aus; N beträgt 10 und erlaubt 1-10.000. Bei N=10 reichen zehn Nachrichten nicht, elf dagegen schon. Frühere Abonnements umfassen nur Beobachtungen dieser Installation, nicht die vollständige Twitch-Historie. Unbekannte Daten und Abfragefehler führen nicht zur Freigabe.

Inaktivität beträgt standardmäßig 15 Minuten, einstellbar von 1-1.440. Bei der nächsten Nachricht werden Zähler, Verwerfungen und automatische Freigabe nach Ablauf oder bestätigtem Streamwechsel zurückgesetzt. Der Streamstatus wird minütlich abgefragt; Netzwerkfehler sind kein Streamende. Manuelle Freigaben und Notizen bleiben erhalten. Eine weiterhin gültige OR-Bedingung kann sofort erneut freigeben. Automatischer Timeout bleibt unabhängig und anfangs aus: Bei kleinerem Schwellenwert als N kann er vor der automatischen Freigabe wirken.

Prüfhinweise bieten Ton, Lautstärke 0-100 und Fenster-/Taskleistenaufmerksamkeit, anfangs deaktiviert. **Ton testen** in einer geöffneten Ansicht nach Interaktion verwenden. Eine Prüfung ertönt nicht in allen Fenstern; höchstens ein Hinweis alle zehn Sekunden. Blinken hängt von Browser/Betriebssystem ab; der Fokus wird nicht erzwungen. Ohne audiofähige offene Ansicht ist Ton nicht garantiert; die Erweiterungsmarkierung zeigt den Zustand visuell.

Jede Zeile bietet **Nachricht löschen**, **Übersetzen** und **Nachricht anheften**. Löschen erfordert Bestätigung, Kanalrechte und `moderator:manage:chat_messages`; Twitch dafür erneut autorisieren. Manuelle Sanktionen zeigen das Ziel und benötigen Bestätigung, auch `/srs 1s`. Timeout erlaubt 1-1.209.600 Sekunden mit Vorschlägen; Ban bleibt dauerhaft. Schnellnotizen hängen `RAID quellkanal` oder `FRONT PAGE` an bestehenden Text an, innerhalb von 500 Zeichen.

Für Übersetzung einen HTTPS-Endpunkt mit LibreTranslate-Kompatibilität (meist `/translate`) und einen zweistelligen Zielsprachencode konfigurieren, dann **Übersetzungsserver erlauben** wählen. Kein Server/API-Schlüssel ist voreingestellt; der Endpunkt muss JSON-Anfragen ohne einen in der Erweiterung gespeicherten Schlüssel akzeptieren. Jede Übersetzung verlangt Einwilligung mit Ursprung und Text; Original und Ergebnis erscheinen in der Erweiterung. Twitch-Tokens, Cookies und Autoren-/Kanalmetadaten werden nicht weitergeleitet. Datenschutz des Anbieters prüfen: Er erhält Verbindung/Text und kann sie speichern. Berechtigung entziehen oder URL leeren verhindert weitere Übersetzungen.

### Multichat und Fenster

**Multichat öffnen** und **Abtrennen** verwenden das passende Fenster erneut und fokussieren es, auch während des Ladens oder bei mehrfachen Klicks. Der Dashboard-Tab wird ebenfalls wiederverwendet. Höchstens zwölf unabhängige Erweiterungs-Popupfenster sind erlaubt, einschließlich älterer abgetrennter Dashboards und Arbeitsbereich-Wiederherstellung; angeheftete Browser-Tabs zählen nicht dazu. Fremde Fenster und alte Duplikate werden nicht geschlossen; bestehende Duplikate manuell schließen. Reicht die Kapazität für einen Arbeitsbereich nicht, wird teilweise Wiederherstellung gemeldet.

### Alle Chatter und lokaler Verlauf

**Zur Prüfung** bleibt die Warteschlange. **Alle Chatter** durchsucht lokal erfasste Personen des Hauptkanals, einschließlich freigegebener, verworfener und von automatischen Sanktionen ausgenommener Nutzer. Filter für neue Konten, erste Nachrichten und Follower verwenden dieses vollständige lokale Verzeichnis. Nach Login/Anzeigename suchen und Seiten mit 25 Personen durchblättern. Dies ist keine vollständige Twitch-Zuschauerliste; nicht empfangene Nachrichten oder überlastete Prüfwarteschlangen können Lücken verursachen.

Ein bestätigter Timeout verwirft die Person nicht mehr automatisch. Ein Ban löst den ausstehenden Eintrag auf; der Datensatz bleibt in Alle Chatter und passenden Filtern verfügbar. Bestehende Freigaben behalten ihre Bedeutung; Sanktionen löschen weder Notizen noch gespeicherte Nachrichten.

Zum Aufheben eines aktiven Bans oder Timeouts die Person unter **Alle Chatter** suchen, **Ban/Timeout aufheben** wählen und den angezeigten Nutzer/Kanal bestätigen. Dafür gelten der vorhandene Scope `moderator:manage:banned_users` und die Kanalrechte. Erst eine erfolgreiche Twitch-Antwort protokolliert die Aufhebung und entfernt die lokale Verwerfung; das Konto wird nicht freigegeben und sein Verlauf bleibt erhalten. Ein weiterer automatischer Timeout wird im selben Prüfzyklus unterdrückt; Inaktivität oder Streamwechsel können einen neuen Zyklus beginnen. Eine abgelaufene/nicht vorhandene Sanktion, fehlende Rechte oder gleichzeitige Twitch-Änderungen zeigen einen Fehler statt eines Erfolgseintrags.

**Verlauf** öffnet Nachrichten, Notizen und Moderation. Bis zu 50 aktuelle Nachrichten je Person/Kanal bleiben über Sitzungen erhalten, dazu höchstens 100 gemeinsame lokale Ereignisse: manuelle/automatische Timeouts und `/srs 1s`, Bans, aufgehobene Bans/Timeouts, Warnungen, Löschungen, manuelle Freigaben und Notizänderungen. Ereignisse enthalten Datum, Grund, Dauer, Herkunft und handelnde Person, soweit bekannt. Fehler gelten nicht als erfolgreiche Sanktionen. Die aktuelle Notiz bleibt auch nach Verdrängung älterer Ereignisse erhalten.

Der Verlauf stammt ausschließlich aus lokalem Speicher; frühere, nie erfasste Twitch-Timeouts lassen sich nicht rekonstruieren. Alte Datensätze können nur den letzten Zustand ohne genaue Datumsangabe enthalten. Nach einmaligem Verbinden eines Kanals mit dieser Version bleiben lokale Daten nach dem Trennen lesbar. Deinstallation oder Löschen des Erweiterungsspeichers entfernt sie; keine automatische zeitbasierte Bereinigung. Siehe [Datenschutz](PRIVACY.md).

### Kanalorganisation

Follower-basierte Freigabe verwendet höchstens fünf Minuten alte Abfragen und erneuert sie bei späteren Nachrichten nach Bedarf. Änderungen desselben Kontos werden geordnet verarbeitet, damit eine verzögerte Aktualisierung keine manuelle Freigabe oder Notiz überschreibt.

1. Den Hauptkanal im Moderationspanel verbinden.
2. **Multichat** und dann **Einstellungen** öffnen. Zusätzliche Kanalnamen durch Kommas trennen, etwa `kanal_zwei, kanal_drei`; keine URLs eingeben.
3. Speichern. Es sind höchstens sechs eindeutige Kanäle einschließlich Hauptkanal möglich. Namen dürfen Buchstaben, Ziffern und Unterstriche enthalten; ein führendes `#` oder `@` ist optional.
4. Eine, zwei oder drei Spalten auswählen. Bei schmalen Fenstern wird die Spaltenanzahl automatisch reduziert.
5. **Abtrennen** öffnet oder fokussiert das unabhängige Kanalfenster. **Multichat öffnen** öffnet oder fokussiert das vorhandene Raster. Fenster mit dem Betriebssystem verschieben oder vergrößern.
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

Die Schaltfläche **`/srs 1s`** an jedem Pin verlangt Bestätigung für genau eine Sekunde Timeout mit Grund `/srs` und zeigt Autor und Kanal. Abbrechen sendet keine Sanktion. Benötigt werden `moderator:manage:banned_users` und Moderator-/Broadcaster-Rechte. Empfangener Text `/srs` löst nichts automatisch aus. Der Worker bestimmt den Nutzer aus einer behaltenen Nachricht, nicht aus einer beliebigen ID der Ansicht. Ist die Nachricht bereits verworfen, wird die Anfrage abgelehnt; Fehler werden nicht als Erfolg dargestellt.

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
| N | Multichat-Raster öffnen oder fokussieren |
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

Die genauen Veröffentlichungsbefehle stehen unter [README: GitHub](../README.md#github-repository-and-release-commands). Sie verwenden das Repository `ChatterWatch`, den Branch `main` und den Tag `v1.0.0`. Das Pushen des Tags startet den Release-Workflow; alternativ veröffentlichen `deno task release --dry-run` und danach `deno task release` das GitHub-Release lokal. `deno task store:submission --client-id <ID>` bereitet die Ordner für Chrome Web Store und AMO in `dist/store-submission/` vor, einschließlich einer privaten, von Git ignorierten Prüfernotiz, die nur in die privaten Prüferfelder der Stores eingefügt werden darf. Lokale `.bat`/`.cmd`-Starter, `*.local.*`-Einstellungen und `PRIVATE-*`-Notizen werden von Git ignoriert. Vorgemerkte Dateien vor dem Commit auf Geheimnisse prüfen. Die Veröffentlichung des Repositories veröffentlicht die Erweiterung nicht automatisch in Browser-Stores.