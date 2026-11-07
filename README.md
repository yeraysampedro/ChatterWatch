# Twitch Chatter Watch

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
- Interfaz y guías en español, inglés y alemán.
- Botón `/srs 1s` en mensajes fijados: timeout inmediato de un segundo al autor, con permisos Twitch y sin confirmación adicional.
- Mensajes borrados conservados localmente con una capa roja, hasta que salgan del historial acotado.
- Hasta 8 espacios guardados, con configuración y posición/tamaño de hasta 12 ventanas por espacio; restauración explícita desde Multichat.
- Hasta 12 reglas de resaltado regex con colores personalizados y 3 mensajes fijados por ventana, independientes del scroll.
- Feed unificado cronológico con etiquetas de canal y bloqueo de scroll al subir un píxel. Solo volver al fondo o pedir directo reanuda el scroll bloqueado.
- Exportación TXT del buffer local actual, incluyendo canales, fechas y marcas de borrado; sin subida a servidores.

## Instalación rápida

1. Chromium: descomprime el ZIP Chromium y carga su carpeta desde `chrome://extensions` o `edge://extensions`, con el modo desarrollador activado. También puedes cargar directamente la raíz del repositorio.
2. Firefox: descomprime el ZIP Firefox, abre `about:debugging#/runtime/this-firefox`, pulsa **Cargar complemento temporal** y selecciona su `manifest.json`. Esta carga dura hasta cerrar Firefox; la instalación permanente requiere un XPI firmado por Mozilla.
3. En Ajustes del panel copia la URL OAuth y regístrala exactamente en tu aplicación de [Twitch Developers](https://dev.twitch.tv/console/apps). Registra la URL de cada navegador; no reutilices la de Chromium en Firefox.
4. Guarda el Client ID, introduce el canal principal e inicia sesión. No uses ni publiques un client secret.
5. Pulsa el botón Multichat de la barra superior. En sus Ajustes añade canales separados por comas. Usa Separar para abrir uno en otra ventana.

Requiere Chromium/Chrome/Edge de escritorio 116+ o Firefox de escritorio 140+. No se declara soporte móvil. Chromium usa un service worker y `sidePanel`; Firefox usa scripts de fondo y `sidebarAction`. Ambos conservan el popup, el panel lateral y las ventanas Multichat. Consulta las guías para permisos, reinstalación, límites y resolución de problemas.

## Generar los dos entregables

```powershell
deno task build
```

Genera `dist/chatter-watch-<versión>-chromium.zip` y `dist/chatter-watch-<versión>-firefox.zip`, además de las carpetas `dist/chromium` y `dist/firefox` para carga local. La versión procede de `manifest.json`. Los ZIP contienen solo archivos de ejecución, con el manifiesto en la raíz; no incluyen tokens, exportaciones, pruebas ni dependencias. `dist` no se versiona y las carpetas generadas se reemplazan en cada ejecución.

El ZIP Chromium sirve para enviar a Chrome Web Store/Edge Add-ons o extraer y cargar localmente. El ZIP Firefox sirve para enviar a Mozilla Add-ons (AMO), con distribución pública o no listada. AMO devuelve el XPI firmado para instalación permanente. Generar los ZIP no firma ni publica la extensión; no se generan CRX ni XPI sin firmar presentados como instalables. Conserva el ID Firefox `twitch-chatter-watch@extensions.local` al actualizar una publicación existente.

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| [manifest.json](manifest.json) | Manifest V3, permisos y CSP local |
| [build.js](build.js) | ZIP reproducibles, lista de archivos de ejecución y adaptación del manifiesto Firefox |
| [worker.js](worker.js) | OAuth validado, IRC compartido, JOIN/PART, ventanas, puertos, Helix, IndexedDB y contrapresión |
| [core.js](core.js) | Parser IRC y reglas de revisión de cuentas |
| [chat-flow.js](chat-flow.js) | Configuración validada, buffers circulares, filtros por canal, lotes y borrados |
| [virtual-chat.js](virtual-chat.js) | Renderizado virtual, reciclaje DOM y estado de pausa por vista |
| [chat.html](chat.html), [chat.css](chat.css), [chat.js](chat.js) | Cuadrícula y vista detached, controles, traducciones y sincronización |
| [dashboard.html](dashboard.html), [dashboard.css](dashboard.css), [dashboard.js](dashboard.js) | Panel de moderación y acceso a Multichat |
| [tests/core_test.js](tests/core_test.js) | Reglas, filtros, aislamiento y ráfaga de 20.000 mensajes |
| [tests/worker_test.js](tests/worker_test.js) | Worker con APIs Chromium/Firefox, red e IndexedDB simulados |
| [tests/ui_test.js](tests/ui_test.js) | Motores Chromium/Firefox headless, APIs simuladas, panel y chat en tres tamaños e idiomas |
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

Las pruebas headless guardan capturas en una carpeta temporal del sistema, no en el repositorio. La API y el tráfico Twitch se simulan: no se ha verificado aquí un inicio de sesión real ni una sanción o cambio real de configuración en Twitch. No se afirma una tasa de FPS garantizada en todos los equipos.

## Límites y privacidad

Máximo 6 canales, 1.000 mensajes retenidos y 250 pendientes por canal; los lotes saturados conservan los más recientes. Se muestran contadores de mensajes filtrados, omitidos por lote y no revisados. La revisión de cuentas admite 256 trabajos pendientes/en curso y 4 concurrentes. Son límites deliberados, no un registro completo para auditoría.

Los chats en memoria se pierden al reiniciar el worker. Los ajustes y espacios persisten localmente; las pausas y hasta tres pines son independientes por ventana. El feed unificado también se limita a 1.000 mensajes. Las exportaciones incluyen mensajes fantasma y pueden contener datos personales: revisa el destino y no las publiques sin autorización. Las notas y cuentas revisadas persisten en IndexedDB, sin purga automática. Los tokens viven en `chrome.storage.session`, no se sincronizan entre dispositivos ni se escriben en el repo. Desconectar detiene todos los chats compartidos; cerrar una ventana no los desconecta. Véanse las guías para borrar datos.

En Firefox se usa el namespace `browser`, incluido `browser.storage.session`. Su manifiesto declara `authenticationInfo` y `personallyIdentifyingInfo` para la autenticación y los identificadores enviados a Twitch. No hay telemetría ni backend propio, y los textos del chat no se reenvían a terceros. Firefox presenta el consentimiento de datos integrado durante la instalación normal.

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