# Español: instalación y uso

[Volver al README](../README.md) | [English](en.md) | [Deutsch](de.md)

## 1. Guía de instalación

### Entorno y dependencias

- Chrome o Edge de escritorio actualizado, con soporte de las APIs de Chrome 116+. Firefox y navegadores móviles no están soportados.
- Cuenta Twitch y una aplicación registrada en [Twitch Developers](https://dev.twitch.tv/console/apps). Twitch puede exigir 2FA para registrar aplicaciones.
- Git para versionar/publicar. Deno 2 solo para desarrollo y pruebas; no es necesario para instalar o usar la extensión.
- No se necesita Node.js, npm, servidor, framework, WebSocket propio ni build. El navegador ejecuta los archivos de la raíz directamente.
- Las pruebas descargan `@std/assert@1`, `fake-indexeddb@6.2.2` y `playwright@1.56.1`; no se incluyen en la extensión. El lockfile fija las resoluciones.

### Carga sin empaquetar

1. Descarga o clona el repositorio en una carpeta estable.
2. Abre `chrome://extensions` o `edge://extensions` y activa **Modo desarrollador**.
3. Pulsa **Cargar descomprimida / Load unpacked** y elige la carpeta que contiene `manifest.json`, no `tests` ni `docs`.
4. Fija Chatter Watch a la barra del navegador. Abre su panel y después **Ajustes**.
5. Copia la URL OAuth mostrada. Tiene la forma `https://<ID-DE-EXTENSION>.chromiumapp.org/twitch`.
6. Registra esa URL exacta como OAuth Redirect URL en tu aplicación Twitch. Copia el **Client ID**, no el client secret, en Ajustes y guarda.
7. Introduce el nombre del canal principal, sin URL completa, e inicia sesión mediante **Conectar**. Autoriza los permisos solicitados.
8. Comprueba el estado conectado y abre **Multichat** desde el botón de la barra superior.

El ID y la URL de redirección pueden cambiar al cambiar de navegador, equipo, ruta o método de instalación. Vuelve a copiar la URL desde Ajustes y actualiza la aplicación Twitch si la autenticación deja de funcionar. Los tokens de sesión no sobreviven al cierre completo del navegador; inicia sesión otra vez cuando sea necesario.

### Permisos

| Permiso | Uso |
| --- | --- |
| `chat:read` | Lectura IRC de los canales |
| `moderator:manage:banned_users` | Ban y timeout en el panel existente |
| `moderator:manage:warnings` | Avisos a usuarios |
| `moderator:read:followers` | Señal de seguidores recientes |
| `moderator:manage:chat_settings` | Slow mode real de Twitch |

Leer un canal adicional no exige moderarlo. Las acciones Helix sí requieren ser moderador o broadcaster del canal afectado, además del scope. La validación actual de la extensión exige `chat:read` y `moderator:manage:banned_users`; exige seguidores si esa señal está activada. Un token antiguo puede seguir leyendo chat sin el nuevo scope de ajustes: desconecta Twitch e inicia sesión de nuevo para concederlo antes de usar el slow mode real.

La extensión solicita `storage`, `identity`, `sidePanel` y `alarms`. Solo declara hosts de API/autenticación Twitch y conexión IRC TLS en la CSP. No inyecta scripts en páginas web ni usa servidores de terceros para el chat.

### Desarrollo, pruebas y build

Desde la raíz, con [Deno 2](https://docs.deno.com/runtime/getting_started/installation/) instalado:

```powershell
deno task test
deno task test:ui
```

La primera tarea cubre reglas, ráfagas y worker simulado. La segunda necesita Chrome instalado y ejecuta un navegador headless, sin ventanas visibles. Usa API Chrome y mensajes simulados; no contacta con tu cuenta Twitch. Para Edge, define `$env:CHATTER_BROWSER = 'msedge'` antes de ejecutarla. Para usar Chromium descargado por Playwright:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` concede permisos al proceso de pruebas, no a la extensión. Úsalo solo sobre código de confianza. Las capturas se guardan en la carpeta temporal que muestra la prueba. No se requiere compilación. Tras editar, pulsa **Recargar** en la página de extensiones y vuelve a abrir las vistas; el historial de chat en memoria se reinicia.

Para preparar un ZIP de distribución desde PowerShell:

```powershell
Compress-Archive -Path manifest.json,core.js,worker.js,dashboard.html,dashboard.css,dashboard.js,chat.html,chat.css,chat.js,chat-flow.js,virtual-chat.js -DestinationPath chatter-watch.zip -Force
```

Ese ZIP contiene solo los archivos de ejecución. La instalación sin empaquetar usa la carpeta, no el ZIP. Subirlo a una tienda requiere su proceso de revisión y publicación independiente.

## 2. Guía de uso

### Multichat y ventanas

1. Conecta el canal principal desde el panel de moderación.
2. Abre **Multichat**. En **Ajustes**, introduce canales adicionales separados por comas, por ejemplo `canal_dos, canal_tres`. No pegues URLs.
3. Guarda. El máximo es seis canales únicos contando el principal. Se admiten nombres alfanuméricos y guiones bajos; `#` y `@` iniciales son opcionales.
4. Elige 1, 2 o 3 columnas. En pantallas menores se reducen automáticamente para mantener legibilidad.
5. Pulsa **Separar** en un canal para abrirlo en una ventana nativa independiente. **Nueva ventana** abre otra cuadrícula completa. Mueve y redimensiona las ventanas con el sistema operativo.
6. Elimina un canal adicional del campo de Ajustes para dejar de recibirlo. Si estaba separado, su ventana queda vacía. Cambia el principal desde el panel de moderación.

Todas las vistas comparten conexión, configuración, idioma y tema. Cambiar columnas o filtros afecta a todas las cuadrículas; las ventanas de un solo canal conservan una columna. La pausa y el scroll son locales a cada vista. Si dos ventanas editan ajustes simultáneamente, se rechaza el guardado obsoleto: cierra y vuelve a abrir Ajustes antes de guardar de nuevo.

Cerrar una ventana no desconecta IRC. **Desconectar** en el panel detiene todos los canales. No se restauran automáticamente las posiciones ni las ventanas después de cerrar el navegador. La revisión de cuentas, notas, aprobaciones y sanciones del panel siguen asociadas únicamente al canal principal; los chats adicionales son de lectura, salvo su control de slow mode.

### Ajustes de influx y spam

| Ajuste | Predeterminado | Valores y comportamiento |
| --- | --- | --- |
| Intervalo entre lotes | 200 ms | 100-1.000 ms. Menor intervalo reduce latencia, mayor reduce actualizaciones |
| Slow mode local | 0 s | 0-120 s por usuario y canal; 0 lo desactiva |
| Filtro de spam | Activado | Activa repetición, frecuencia y patrón |
| Repetición | 3 | 2-20; oculta desde la enésima repetición del mismo texto, incluso entre autores distintos |
| Frecuencia | 6 | 2-50; admite hasta ese número de mensajes de un usuario por ventana |
| Ventana de detección | 10 s | 1-120 s, ventana fija desde el primer evento de cada clave |
| Patrón | Vacío | Regex restringida, máximo 240 caracteres y 12 alternativas |
| Pausa por hover | Activada | Congela la lectura mientras el puntero esté dentro de la lista |

La repetición usa NFKC, minúsculas y espacios compactados. Los contadores son por canal; los mensajes filtrados también cuentan en la ventana de detección. El slow mode local sigue funcionando aunque se desactive el spam. Cambiar ajustes reinicia los contadores internos del filtro, pero no los totales visibles ni el historial ya retenido; las nuevas reglas solo se aplican a mensajes nuevos.

Patrón válido de ejemplo: `\bpromo\b|buy now|https://`. Se permiten texto literal, alternativas `|`, anclas `^`/`$`, límites `\b` y escapes de puntuación admitidos por el validador. No se usan delimitadores `/.../`; la búsqueda es Unicode y no distingue mayúsculas. Se rechazan grupos, clases, comodines y cuantificadores como `(a+)+`, `[a-z]`, `.*`, `?`, `{3}`. Esta restricción evita bloquear el worker con expresiones costosas. `\b` conserva la semántica de JavaScript, no segmentación lingüística completa.

Los filtros ocultan mensajes en la vista, no los eliminan de Twitch ni disparan avisos, bans o timeouts. La revisión del canal principal recibe los mensajes antes de filtrarlos, salvo saturación de su propia cola. Mantén el timeout automático del panel desactivado hasta entender sus reglas; es independiente de los filtros de Multichat.

### Slow mode real de Twitch

En la parte inferior de cada chat, indica **0** para desactivar o un entero de **3 a 120 segundos** para activar. Pulsa **Aplicar** y confirma el cambio. Esto llama a Helix `PATCH /chat/settings` y afecta a los participantes reales del canal, sujeto a las reglas y excepciones de Twitch. No es un throttle visual. El estado de la sala muestra el valor recibido de Twitch. Un error 403 indica normalmente rol insuficiente; un scope ausente requiere volver a autorizar.

### Pausa, lectura y atajos

- Hover, desplazamiento manual hacia arriba o foco dentro de la lista congelan la vista. Los mensajes siguen llegando al buffer acotado.
- **Pausar** añade una pausa manual. **En directo** elimina las pausas y salta al final; si el puntero sigue dentro, el hover no vuelve a pausar hasta salir y entrar de nuevo.
- Volver al fondo elimina la pausa por scroll, pero puede quedar otra pausa activa, como hover, foco o pausa manual.
- El contador del botón indica entradas recibidas durante la pausa, no mensajes recuperables ilimitadamente. Al reanudar se muestran los más recientes retenidos; el historial antiguo puede haberse descartado.
- Cada fila muestra hasta dos líneas. Haz clic o pulsa Enter sobre una fila para leer el texto completo recibido. Los mensajes se insertan como texto, sin ejecutar HTML.

| Atajo en Multichat | Acción |
| --- | --- |
| Espacio | Alternar pausa/directo en el canal bajo el puntero, enfocado o el primero |
| End / Fin | Volver al directo en ese canal |
| S | Abrir Ajustes |
| N | Abrir otra cuadrícula |
| Esc | Cerrar el diálogo abierto |
| Tab, Enter | Navegación y activación de controles; Enter abre una fila |

Los atajos globales de página no se interceptan al escribir en campos, sobre botones/enlaces, con Ctrl/Alt/Meta ni con un diálogo abierto. Son atajos de la vista, no globales del sistema operativo.

### Rendimiento, datos y límites

Cada canal conserva como máximo 1.000 mensajes y 250 pendientes por lote. Si entran más, se conservan los más recientes y aumenta **omitidos en lotes**. El filtro conserva hasta 5.000 claves por canal; expulsa las antiguas si se supera ese límite, por lo que la detección es de mejor esfuerzo. El historial pausado es una copia acotada. La lista recicla solo las filas visibles más un pequeño margen; el texto recibido se limita a 2.000 caracteres por mensaje.

La revisión de cuentas permite 256 trabajos y 4 concurrentes. **Sin revisar** cuenta mensajes descartados por saturación de esa cola: no presupongas que se examinaron todos los usuarios. El panel publica estado agrupado, como máximo una vez cada 500 ms mientras está abierto. El sistema no es un registro de auditoría ni garantiza FPS para cualquier carga/hardware.

Los borrados `CLEARMSG` y `CLEARCHAT` se aplican al historial vivo y a la copia pausada de Multichat. No borran el historial de cuentas ya guardado en el panel de moderación. Los mensajes y estadísticas de Multichat viven en memoria y se pierden si el worker termina; Twitch IRC no reenvía lo ocurrido durante una desconexión. Hay reconexión con espera progresiva y heartbeat, pero no garantía de continuidad durante suspensión del equipo.

Los ajustes se guardan en `chrome.storage.local`; la sesión OAuth, en `chrome.storage.session`. IndexedDB guarda perfiles, notas y cuentas del panel sin caducidad automática. **Desconectar Twitch** elimina la sesión, no esos datos. Para borrar todo, elimina la extensión o limpia su almacenamiento desde las herramientas de desarrollo de la extensión. No exportes ni publiques datos personales o tokens.

### Resolución de problemas y publicación

- OAuth falla: comprueba Client ID y URL exacta; recarga la extensión y vuelve a iniciar sesión. No introduzcas secretos en archivos.
- Canal en espera: verifica que existe, que el principal está conectado y que la red permite `wss://irc-ws.chat.twitch.tv:443`. Los avisos y errores pueden incluir texto original de Twitch en inglés.
- Pérdidas en lotes: reduce el intervalo, ajusta spam/slow local o reduce canales. Los contadores son acumulados en memoria, no una alarma de pérdida de conexión.
- Servicio no disponible después de recargar: cierra y vuelve a abrir las vistas antiguas.
- Pruebas UI sin navegador: instala Chrome/Edge o usa el comando de instalación Chromium indicado arriba.

Las pruebas automáticas usan tráfico simulado. OAuth real, cambios reales de slow mode y permisos por canal requieren validación manual con una cuenta autorizada. Prueba primero en un canal propio y restaura el valor previo de slow mode al terminar.

Los comandos exactos `git init`, `git add`, `git commit`, `git remote` y `git push` están en [Publicar en GitHub](../README.md#publicar-en-github). Publicar el repositorio no publica la extensión en las tiendas.