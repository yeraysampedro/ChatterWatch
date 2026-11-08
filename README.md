# Twitch Chatter Watch

## Versión 1.3.1

El panel y Ajustes utilizan el ancho disponible en ambos temas, sin la franja centrada de 960 px. Abrir Multichat, Separar y abrir el dashboard reutilizan la ventana correspondiente, incluso durante su carga o con clics simultáneos. Hay un máximo de doce ventanas independientes de la extensión, incluida la restauración de espacios; las ventanas ajenas y los duplicados ya existentes no se cierran automáticamente.

La chincheta abre o reutiliza una **pestaña fijada dentro del navegador**, no una ventana flotante. El popup del icono solicita 760 px de contenido sin limitarse circularmente a su ancho inicial; el navegador puede reservar espacio para barras de desplazamiento o limitar la altura. La pestaña y el panel lateral siguen adaptándose al espacio disponible. El inicio de sesión desde el popup también pasa a la pestaña fijada.

Un timeout ya no descarta automáticamente al chatter. **Por revisar** muestra pendientes; **Todos los chatters** y los filtros de cuentas nuevas, primeros mensajes, seguidores y aprobados consultan los registros locales del canal, con búsqueda y páginas de 25 personas. La ficha **Historial** muestra los últimos 50 mensajes, la nota actual y hasta 100 eventos de moderación/cambios de nota, con fecha, duración, motivo y origen. Se conserva lo observado entre emisiones, no un historial retrospectivo completo de Twitch. Los timeouts anteriores sin eventos detallados solo pueden mostrar el último estado que ya estuviera guardado.

Modo oscuro por defecto con contraste corregido, panel más amplio, Client ID ocultable, ventanas persistentes y geometría recordada. La configuración se comparte entre popup, panel lateral, página y ventanas. Se conserva Guardar y se muestra el estado del autoguardado.

La autoaprobación es configurable y viene desactivada: más de N mensajes, seguidor confirmado, suscriptor actual o antiguo suscriptor observado localmente. Las condiciones activas se combinan con OR. El contador N usa la sesión de revisión del canal; la inactividad (15 minutos por defecto) y los cambios de emisión verificados reinician esa sesión por persona. Las aprobaciones manuales permanecen. La pestaña Aprobados muestra el motivo sin retirar mensajes del directo.

Cada mensaje ofrece Borrar, Traducir y Fijar. Las sanciones manuales y `/srs 1s` requieren confirmación; el timeout automático continúa siendo una opción explícita independiente. Las notas admiten RAID con canal de origen y FRONT PAGE. Las alertas de revisión permiten sonido y atención de ventana/barra de tareas, sujetas al navegador y sistema operativo.

Para retirar un ban o un timeout todavía activo, busca al usuario en **Todos los chatters** y pulsa **Quitar ban/timeout**. La acción requiere confirmación, rol de moderador y el permiso existente `moderator:manage:banned_users`. Solo se registra tras la confirmación de Twitch; no aprueba la cuenta ni borra notas/mensajes. Evita otro timeout automático en el mismo ciclo de revisión, pero las reglas pueden actuar de nuevo después de inactividad o un cambio de emisión. Si la sanción ya no existe o Twitch rechaza la petición, se muestra el error sin inventar un éxito.

La traducción requiere configurar y autorizar un endpoint HTTPS compatible con LibreTranslate y confirmar cada envío. No hay un servidor externo predeterminado. Solo se envían el texto seleccionado y los parámetros de idioma, nunca el token de Twitch. Consulta [docs/PRIVACY.md](docs/PRIVACY.md), [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md), [docs/STORE_SUBMISSION.md](docs/STORE_SUBMISSION.md) y [docs/CHANGELOG.md](docs/CHANGELOG.md).

Extensión Manifest V3 para Chromium y Firefox, para moderación de Twitch y lectura simultánea de hasta seis chats. Incluye ventanas independientes, cuadrícula responsive, filtros de spam y control del slow mode de Twitch. No requiere servidor propio ni compilación; Deno genera los paquetes específicos de cada navegador.

## Documentación / Documentation / Dokumentation

- [Español: instalación y uso](docs/es.md)
- [English: installation and usage](docs/en.md)
- [Deutsch: Installation und Bedienung](docs/de.md)

## Funcionalidades

- Una conexión IRC/WebSocket compartida por el panel y todas las ventanas. Una ventana puede mostrar la cuadrícula completa o un solo canal.
- Cuadrícula de 1, 2 o 3 columnas, adaptada a pantallas estrechas. Configuración compartida mediante `chrome.storage.local` y puertos de `chrome.runtime`.
- Lotes configurables, historial circular, filas DOM recicladas y pausa por hover, scroll, foco o botón. Al reanudar se muestran los mensajes recientes retenidos.
- Filtro local por repetición normalizada, frecuencia por usuario y regex restringida para evitar retroceso catastrófico. No genera sanciones.
- Slow mode local y slow mode real de Twitch separados. El segundo requiere confirmación, rol de moderador y `moderator:manage:chat_settings`.
- Revisión de cuentas y acciones de moderación existentes para el canal principal. Contador explícito de revisiones omitidas bajo saturación.
- Interfaz y guías en español, inglés y alemán. Sin idioma guardado, se usa el idioma del navegador (incluidas variantes regionales); los idiomas no disponibles usan inglés. Una elección manual guardada tiene prioridad.
- Autoguardado de los ajustes del panel y de Multichat: 350 ms tras dejar de escribir y guardado inmediato al confirmar un campo. Se mantienen los botones Guardar, la validación y la detección de conflictos entre ventanas.
- Botón `/srs 1s` en mensajes fijados: timeout de un segundo al autor, con permisos Twitch y confirmación explícita.
- Mensajes borrados conservados localmente con una capa roja, hasta que salgan del historial acotado.
- Hasta 8 espacios guardados, con configuración y posición/tamaño de hasta 12 ventanas por espacio; restauración explícita desde Multichat.
- Hasta 12 reglas de resaltado regex con colores personalizados y 3 mensajes fijados por ventana, independientes del scroll.
- Feed unificado cronológico con etiquetas de canal y bloqueo de scroll al subir un píxel. Solo volver al fondo o pedir directo reanuda el scroll bloqueado.
- Exportación TXT del buffer local actual, incluyendo canales, fechas y marcas de borrado; sin subida a servidores.

## Instalación rápida

1. Chromium: descomprime el ZIP Chromium y carga su carpeta desde `chrome://extensions` o `edge://extensions`, con el modo desarrollador activado. También puedes cargar `src/` o la carpeta generada `dist/chromium`, no la raíz del repositorio.
2. Firefox: descomprime el ZIP Firefox, abre `about:debugging#/runtime/this-firefox`, pulsa **Cargar complemento temporal** y selecciona su `manifest.json`. Esta carga dura hasta cerrar Firefox; la instalación permanente requiere un XPI firmado por Mozilla.
3. En Ajustes del panel copia la URL OAuth y regístrala exactamente en tu aplicación de [Twitch Developers](https://dev.twitch.tv/console/apps). Registra la URL de cada navegador; no reutilices la de Chromium en Firefox.
4. Guarda el Client ID, introduce el canal principal e inicia sesión. No uses ni publiques un client secret.
5. Pulsa el botón Multichat de la barra superior. En sus Ajustes añade canales separados por comas. Usa Separar para abrir uno en otra ventana.

Requiere Chromium/Chrome/Edge de escritorio 116+ o Firefox de escritorio 140+. No se declara soporte móvil. Chromium usa un service worker y `sidePanel`; Firefox usa scripts de fondo y `sidebarAction`. Ambos conservan el popup, el panel lateral y las ventanas Multichat. Consulta las guías para permisos, reinstalación, límites y resolución de problemas.

## Generar los dos entregables

Para preparar la ficha de tienda, permisos, instrucciones de revisión y recursos gráficos, consulta [docs/STORE_LISTING.md](docs/STORE_LISTING.md), [docs/STORE_PERMISSIONS.md](docs/STORE_PERMISSIONS.md), [docs/STORE_TESTING.md](docs/STORE_TESTING.md) y [docs/SUPPORT.md](docs/SUPPORT.md). La URL de soporte pública es https://github.com/yeraysampedro/Twtich-Moderatr/issues .

`deno task store:assets` crea cinco capturas 1280×800 por navegador con datos ficticios, iconos de tienda, promociones opcionales, metadatos y kits independientes en `dist`. El informe [docs/STORE_VALIDATION.md](docs/STORE_VALIDATION.md) registra el contenido real de los ZIP, hashes y bloqueos pendientes. Extrae cada kit: las capturas se suben a la ficha y solo el ZIP de `packages/` se entrega como extensión. El kit no contiene credenciales de prueba reales ni constituye aprobación de las tiendas.

```powershell
deno task build
```

Genera `dist/packages/chatter-watch-<versión>-chromium.zip` y `dist/packages/chatter-watch-<versión>-firefox.zip`, además de las carpetas `dist/chromium` y `dist/firefox` para carga local. La versión procede de [src/manifest.json](src/manifest.json). Los ZIP contienen solo archivos de ejecución, con el manifiesto en la raíz; no incluyen tokens, exportaciones, pruebas ni dependencias. `dist` no se versiona y las carpetas generadas se reemplazan en cada ejecución. Los kits están en `dist/store-kits/`, el ZIP de fuentes en `dist/source/` y las capturas/metadatos en `dist/store/`.

El ZIP Chromium sirve para enviar a Chrome Web Store/Edge Add-ons o extraer y cargar localmente. El ZIP Firefox sirve para enviar a Mozilla Add-ons (AMO), con distribución pública o no listada. AMO devuelve el XPI firmado para instalación permanente. Generar los ZIP no firma ni publica la extensión; no se generan CRX ni XPI sin firmar presentados como instalables. Conserva el ID Firefox `twitch-chatter-watch@extensions.local` al actualizar una publicación existente.

## Estructura

```text
src/                Extensión: manifiesto, JS, HTML, CSS e iconos
build/              Herramientas de empaquetado y materiales de tienda
tests/              Pruebas automáticas
docs/               Guías, privacidad, soporte, changelog y publicación
dist/               Salidas generadas e ignoradas por Git
	chromium/         Extensión Chromium sin empaquetar
	firefox/          Extensión Firefox para carga temporal
	packages/         ZIP instalables de la versión final
	store/            Capturas, imágenes, metadatos e informes JSON
	store-kits/       Kits de publicación de la versión final
	source/           ZIP de fuentes reproducibles
```

La limpieza conserva únicamente los entregables finales 1.3.1; los ZIP antiguos y borradores v0.1 se han retirado. La documentación funcional vigente está en [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md). El archivo local de cuentas permanece privado e ignorado: no se lee ni se incluye en ninguna salida. Cambiar la carpeta de una instalación sin empaquetar puede cambiar su ID; si ya cargas `dist/chromium`, su ubicación se mantiene.

| Archivo | Responsabilidad |
| --- | --- |
| [src/manifest.json](src/manifest.json) | Manifest V3, permisos y CSP local |
| [build/build.js](build/build.js) | ZIP reproducibles, lista de archivos de ejecución y adaptación del manifiesto Firefox |
| [build/store-assets.js](build/store-assets.js) | Capturas, metadatos, validación y kits de publicación |
| [src/view-tools.js](src/view-tools.js), [src/view-tools.css](src/view-tools.css) | Diálogos accesibles, idioma de controles nuevos, sonido y geometría compartidos |
| [src/icons.js](src/icons.js), [src/LICENSE.lucide](src/LICENSE.lucide) | Seis iconos locales extraídos de Lucide 0.468.0 y su licencia |
| [src/assets/icons/chatter-watch-128.png](src/assets/icons/chatter-watch-128.png), [src/assets/icons/chatter-watch-512.png](src/assets/icons/chatter-watch-512.png) | Icono original de la extensión: seis tamaños de ejecución y arte de 512 px para material de tienda |
| [src/worker.js](src/worker.js) | OAuth validado, IRC compartido, JOIN/PART, ventanas, puertos, Helix, IndexedDB y contrapresión |
| [src/core.js](src/core.js) | Parser IRC y reglas de revisión de cuentas |
| [src/chat-flow.js](src/chat-flow.js) | Configuración validada, buffers circulares, filtros por canal, lotes y borrados |
| [src/virtual-chat.js](src/virtual-chat.js) | Renderizado virtual, reciclaje DOM y estado de pausa por vista |
| [src/chat.html](src/chat.html), [src/chat.css](src/chat.css), [src/chat.js](src/chat.js) | Cuadrícula y vista detached, controles, traducciones y sincronización |
| [src/dashboard.html](src/dashboard.html), [src/dashboard.css](src/dashboard.css), [src/dashboard.js](src/dashboard.js) | Panel de moderación y acceso a Multichat |
| [tests/core_test.js](tests/core_test.js) | Reglas, filtros, aislamiento y ráfaga de 20.000 mensajes |
| [tests/worker_test.js](tests/worker_test.js) | Worker con APIs Chromium/Firefox, red e IndexedDB simulados |
| [tests/ui_test.js](tests/ui_test.js) | Motores Chromium/Firefox headless, APIs simuladas, panel y chat en tres tamaños e idiomas |
| [tests/example_accounts_test.js](tests/example_accounts_test.js) | Cuentas ficticias: señales de revisión, límite N+1, roles exentos, aislamiento y errores de moderación |
| [tests/example_accounts_ui_test.js](tests/example_accounts_ui_test.js) | Panel y chat conectados al worker real con Twitch simulado: notas, historial, aprobación, confirmaciones y mensajes borrados |
| [tests/native_popup_test.js](tests/native_popup_test.js) | Extensión cargada en Chromium: tamaño real del popup en tres idiomas/ambos temas y pestaña fijada sin ventanas adicionales |
| [tests/build_test.js](tests/build_test.js) | Manifiestos, contenido exacto de los ZIP y reproducibilidad |

Flujo: `Twitch IRC -> worker -> chat-flow -> lotes por runtime.Port -> VirtualChat`.
La revisión del canal principal se deriva antes del filtro visual, con su propia cola acotada. Las ventanas no almacenan tokens en URLs ni abren conexiones IRC adicionales.

## Desarrollo y pruebas

JavaScript/CSS/HTML nativos, sin dependencias de ejecución, CDN ni compilación. Deno 2 ejecuta pruebas y empaquetado; se verificó con Deno 2.9.4 en Windows. `fflate@0.8.2` se usa solo para generar ZIP y no se incluye en la extensión. Las dependencias se descargan en la primera ejecución y quedan fijadas en el lockfile.

```powershell
deno task test
deno task test:build
deno task test:ui
```

Las pruebas UI necesitan Chrome instalado y ejecutan Playwright sin ventanas visibles. Para Edge:

```powershell
$env:CHATTER_BROWSER = 'msedge'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

Para verificar también el motor Firefox:

```powershell
deno run -A npm:playwright@1.56.1 install firefox
deno task test:ui:firefox
```

En Windows, haz doble clic en [build/run-example-account-tests.bat](build/run-example-account-tests.bat) para ejecutar solo las pruebas con cuentas ficticias: worker, Chrome/Edge y Firefox. Requiere Deno 2 en PATH y los navegadores indicados arriba; respeta `CHATTER_BROWSER`, se detiene si falla una prueba y mantiene los resultados visibles. Usa `--no-pause` para ejecutarlo sin pausa desde una terminal o un proceso automatizado.

`deno task test:native` comprueba además el popup real con la extensión cargada en un perfil temporal vacío, sin iniciar sesión en Twitch. Necesita el Chromium completo de Playwright, no `headless-shell`; Chrome comercial puede impedir la carga por argumentos. Si ya tienes otro Chromium compatible instalado, indica su ejecutable con `$env:CHATTER_CHROMIUM_EXECUTABLE = 'C:\ruta\a\chromium\chrome.exe'`. Esta prueba no está incluida en el BAT de cuentas ficticias.

Las pruebas headless guardan capturas en una carpeta temporal del sistema, no en el repositorio. La API y el tráfico Twitch se simulan: no se ha verificado aquí un inicio de sesión real ni una sanción o cambio real de configuración en Twitch. No se afirma una tasa de FPS garantizada en todos los equipos.

## Límites y privacidad

Máximo 6 canales, 1.000 mensajes retenidos y 250 pendientes por canal; los lotes saturados conservan los más recientes. Se muestran contadores de mensajes filtrados, omitidos por lote y no revisados. La revisión de cuentas admite 256 trabajos pendientes/en curso y 4 concurrentes. Son límites deliberados, no un registro completo para auditoría.

Los chats en memoria se pierden al reiniciar el worker. Los ajustes y espacios persisten localmente; las pausas y hasta tres pines son independientes por ventana. El feed unificado también se limita a 1.000 mensajes. Las exportaciones incluyen mensajes fantasma y pueden contener datos personales: revisa el destino y no las publiques sin autorización. Las notas y cuentas revisadas persisten en IndexedDB, sin purga automática. Los tokens viven en `chrome.storage.session`, no se sincronizan entre dispositivos ni se escriben en el repo. Desconectar detiene todos los chats compartidos; cerrar una ventana no los desconecta. Véanse las guías para borrar datos.

En Firefox se usa el namespace `browser`, incluido `browser.storage.session`. Su manifiesto declara `authenticationInfo` y `personallyIdentifyingInfo` para Twitch y `personalCommunications` como consentimiento opcional para traducción. No hay telemetría ni backend propio. El acceso HTTPS adicional se solicita solo para el dominio de traducción elegido; la CSP permite esas conexiones, pero no código remoto. Revocar ese permiso impide nuevas traducciones. Los textos solo se transmiten al servidor elegido tras confirmar cada traducción.

## Publicar en GitHub

Crea primero un repositorio vacío en GitHub, sin README, licencia ni `.gitignore` iniciales. Sustituye `TU_USUARIO` por tu usuario u organización y ejecuta desde esta carpeta. No se han ejecutado estos comandos automáticamente.

```powershell
git init -b main
git add .
git diff --cached --stat
git commit -m "Add detached multichat, influx controls and multilingual docs"
git remote add origin https://github.com/TU_USUARIO/twitch-chatter-watch.git
git push -u origin main
```

Antes de confirmar, revisa que no hay credenciales, exportaciones de chat ni datos personales en lo añadido. Git puede pedir `user.name` y `user.email` si no están configurados. Autentícate mediante Git Credential Manager o SSH; nunca incrustes un token en la URL del remoto.

Si el repositorio ya existe, omite `git init` y comprueba su rama con `git branch --show-current`. Si `origin` ya existe, comprueba `git remote -v` y, solo si procede, usa `git remote set-url origin https://github.com/TU_USUARIO/twitch-chatter-watch.git`. No uses un push forzado para resolver divergencias. Publicar código en GitHub no publica automáticamente la extensión en Chrome Web Store o Edge Add-ons.