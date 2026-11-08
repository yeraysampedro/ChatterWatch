# Español: instalación y uso

[Volver al README](../README.md) | [English](en.md) | [Deutsch](de.md)

## 1. Guía de instalación

### Entorno y dependencias

- Chromium/Chrome/Edge de escritorio 116+ o Firefox de escritorio 140+. No se declara soporte para navegadores móviles.
- Cuenta Twitch y una aplicación registrada en [Twitch Developers](https://dev.twitch.tv/console/apps). Twitch puede exigir 2FA para registrar aplicaciones.
- Git para versionar/publicar. Deno 2 solo para generar paquetes y ejecutar pruebas; no es necesario para instalar o usar los paquetes.
- No se necesita Node.js, npm, servidor, framework ni compilación. Chromium puede cargar `src/` directamente, no la raíz del repositorio; Firefox necesita el manifiesto generado en `dist/firefox/`. Las herramientas están en `build/` y se ejecutan desde la raíz con Deno. `fflate@0.8.2` solo se usa al empaquetar, nunca en la extensión.
- Las pruebas descargan `@std/assert@1`, `fake-indexeddb@6.2.2` y `playwright@1.56.1`; no se incluyen en la extensión. El lockfile fija las resoluciones.

### Carga sin empaquetar en Chromium

1. Extrae el ZIP Chromium, usa `dist/chromium` después de ejecutar `deno task build`, o clona el repositorio en una carpeta estable.
2. Abre `chrome://extensions` o `edge://extensions` y activa **Modo desarrollador**.
3. Pulsa **Cargar descomprimida / Load unpacked** y elige la carpeta que contiene `manifest.json`, no `tests` ni `docs`.
4. Fija ChatterWatch a la barra del navegador y abre su panel. Antes de configurar Twitch, pulsa **Revisar uso de datos**: **Seguir sin conexión** rechaza el uso; marcar la casilla inicialmente vacía y pulsar **Permitir uso de datos** habilita Twitch. Después abre **Ajustes**.
5. Copia la URL OAuth mostrada. Tiene la forma `https://<ID-DE-EXTENSION>.chromiumapp.org/twitch`.
6. Registra esa URL exacta como OAuth Redirect URL en tu aplicación Twitch. Copia el **Client ID**, no el client secret, en Ajustes y guarda.
7. Introduce el nombre del canal principal, sin URL completa, e inicia sesión mediante **Conectar**. Autoriza los permisos solicitados.
8. Comprueba el estado conectado y abre **Multichat** desde el botón de la barra superior.

El ID y la URL de redirección pueden cambiar al cambiar de navegador, equipo, ruta o método de instalación. Vuelve a copiar la URL desde Ajustes y actualiza la aplicación Twitch si la autenticación deja de funcionar. Los tokens de sesión no sobreviven al cierre completo del navegador; inicia sesión otra vez cuando sea necesario.

### Firefox

1. Extrae el ZIP Firefox o ejecuta `deno task build` para obtener `dist/firefox`.
2. Abre `about:debugging#/runtime/this-firefox`, pulsa **Cargar complemento temporal** y selecciona el `manifest.json` de `dist/firefox/` o del ZIP Firefox extraído, no el de `src/`.
3. Abre Ajustes, copia la URL OAuth que muestra Firefox y regístrala también en Twitch. No uses la URL `chromiumapp.org` de Chromium. Guarda el Client ID y conecta como se indica arriba.

El popup, panel lateral y Multichat están disponibles en ambos navegadores. Firefox usa scripts de fondo y `sidebarAction`, mientras Chromium usa service worker y `sidePanel`. Las menciones a `chrome.storage` en esta guía corresponden a `browser.storage` en Firefox.

La carga temporal se elimina al cerrar Firefox. Para distribuir una instalación permanente, envía el ZIP Firefox a [Mozilla Add-ons](https://addons.mozilla.org/developers/) como listado o no listado y distribuye el XPI firmado que devuelva Mozilla. El empaquetador no firma ni publica. Mantén el ID `twitch-chatter-watch@extensions.local` en futuras actualizaciones; cambiarlo crea otra identidad y puede cambiar OAuth.

### Permisos

| Permiso | Uso |
| --- | --- |
| `chat:read` | Lectura IRC de los canales |
| `moderator:manage:banned_users` | Aplicar/retirar bans y timeouts, y botón `/srs 1s` de Multichat |
| `moderator:manage:warnings` | Avisos a usuarios |
| `moderator:read:followers` | Señal de seguidores recientes |
| `moderator:manage:chat_settings` | Slow mode real de Twitch |
| `moderator:manage:chat_messages` | Borrar un mensaje concreto desde Multichat |

Leer un canal adicional no exige moderarlo. Las acciones Helix sí requieren ser moderador o broadcaster del canal afectado, además del scope. La validación actual de la extensión exige `chat:read` y `moderator:manage:banned_users`; exige seguidores si esa señal está activada. Un token antiguo puede seguir leyendo chat sin el nuevo scope de ajustes: desconecta Twitch e inicia sesión de nuevo para concederlo antes de usar el slow mode real.

Ambas variantes solicitan `storage`, `identity` y `alarms`; solo Chromium añade `sidePanel`. El acceso obligatorio corresponde a Twitch; la traducción añade acceso HTTPS opcional al dominio elegido. No se inyectan scripts ni se carga código remoto. Firefox declara `authenticationInfo` y `personallyIdentifyingInfo` para Twitch y `personalCommunications` opcional para traducción. No hay telemetría ni backend propio. Solo se envía texto a un traductor después de configurar/autorizar el servidor y confirmar el mensaje. Consulta [Privacidad](PRIVACY.md).

### Desarrollo, pruebas y build

Se prepara el primer lanzamiento público como **ChatterWatch 1.0.0**, con etiqueta prevista `v1.0.0`. Además de los ZIP Chromium y Firefox, `deno task build` crea `dist/packages/chatter-watch-1.0.0-firefox-unsigned.xpi`. Es un paquete sin firmar para desarrollo/envío a Mozilla, no una instalación permanente de Firefox. Consulta el [README en inglés](../README.md) para configurar GitHub Releases y obtener el XPI firmado por Mozilla.

Desde la raíz, con [Deno 2](https://docs.deno.com/runtime/getting_started/installation/) instalado:

```powershell
deno task test
deno task test:build
deno task test:ui
```

Las tareas cubren reglas y worker simulado, empaquetado y vistas. La UI necesita Chrome instalado y usa APIs de extensión y mensajes simulados, sin ventanas visibles ni acceso a tu cuenta Twitch. Para Edge, define `$env:CHATTER_BROWSER = 'msedge'` antes de ejecutarla. Para usar Chromium descargado por Playwright:

```powershell
deno run -A npm:playwright@1.56.1 install chromium
$env:CHATTER_BROWSER = 'chromium'
deno task test:ui
Remove-Item Env:CHATTER_BROWSER
```

`-A` concede permisos al proceso de pruebas, no a la extensión. Úsalo solo sobre código de confianza. Las capturas se guardan en la carpeta temporal que muestra la prueba. No se requiere compilación. Tras editar, pulsa **Recargar** en la página de extensiones y vuelve a abrir las vistas; el historial de chat en memoria se reinicia.

Para ejecutar las mismas pruebas con Firefox headless:

```powershell
deno run -A npm:playwright@1.56.1 install firefox
deno task test:ui:firefox
```

Para generar ambos entregables, ejecuta `deno task build`. Crea `dist/packages/chatter-watch-<versión>-chromium.zip`, `dist/packages/chatter-watch-<versión>-firefox.zip` y las carpetas `dist/chromium` y `dist/firefox`. La lista permitida incluye los recursos locales, la licencia de los iconos Lucide 0.468.0 y los PNG de marca de 16/32/48/64/96/128 px, sin pruebas, credenciales ni datos de usuario. El arte de 512 px en `src/assets/icons/` queda fuera del ZIP de ejecución. Las capturas/metadatos se generan en `dist/store/`, los kits en `dist/store-kits/` y las fuentes empaquetadas en `dist/source/`. No edites las salidas generadas. Si antes cargabas la raíz del repositorio, selecciona ahora `src/` y comprueba su URL OAuth; `dist/chromium` y `dist/firefox` mantienen su ubicación. La distribución por tienda requiere revisión y firma por separado.

## 2. Guía de uso

### Idioma y autoguardado

Sin una preferencia guardada, la extensión usa el idioma de la interfaz del navegador. Las variantes regionales se reducen al idioma disponible: `es-MX` usa español y `de-AT`, alemán. Si el idioma no está disponible, se usa inglés. Puedes cambiarlo en **Ajustes > Idioma**; la selección se guarda automáticamente y tiene prioridad en futuras aperturas, también en Multichat. No se consulta el perfil de Twitch para determinar el idioma.

Los ajustes del panel, el canal principal y los ajustes de Multichat se guardan automáticamente al confirmar un campo o 350 ms después de dejar de escribir. Los botones **Guardar** siguen disponibles y cerrar los ajustes intenta guardar los cambios pendientes. Los campos incompletos o inválidos no reemplazan la configuración guardada; corrige los valores y los errores mostrados. Si otra ventana cambió Multichat, cierra y vuelve a abrir Ajustes antes de editar de nuevo. Los espacios con nombre y las acciones reales de Twitch siguen requiriendo sus botones; el slow mode real conserva su confirmación.

Los cambios válidos se aplican al guardarse: cambiar el Client ID puede cerrar la sesión, cambiar el canal principal conectado puede reconectar y activar el timeout automático habilita sus reglas de moderación. No se garantiza guardar una edición si el navegador o el equipo termina abruptamente antes de completar la escritura.

### Panel y funciones de moderación

**Datos y privacidad:** no se inicia autenticación/API/IRC de Twitch, nuevos registros de cuentas ni avatares remotos sin consentimiento afirmativo vigente. El aviso explica datos, destinos, conservación local y retirada; no sustituye OAuth ni la confirmación de cada traducción. En Ajustes o en las opciones de la extensión del navegador, **Retirar consentimiento y desconectar** elimina credenciales de sesión y detiene nueva actividad. El historial existente queda en solo lectura sin conexión. Bórralo aparte desde el almacenamiento del navegador o desinstalando; elimina los TXT por separado. Las preferencias locales de pantalla/ventana siguen disponibles y no se pueden recuperar transmisiones anteriores ni deshacer acciones de Twitch.

El tema inicial es oscuro; una elección clara guardada se conserva. El panel y Ajustes ocupan el ancho disponible y mantienen la geometría al cambiar de tema. Solo se destaca el total pendiente de revisión; el listado dispone de navegación por páginas de 25 personas. **Aprobados** permite consultar aprobaciones y motivos sin ocultar mensajes del chat.

El icono del ojo define la identidad violeta: superficies blancas/lavanda con el violeta oscuro original de día, y fondos violeta carbón con acento lavanda claro de noche. Los trazos negros conservan una base clara en los iconos generados. Avisos y errores mantienen ámbar/rojo para distinguirlos del acento de marca.

La chincheta abre o reutiliza una **pestaña fijada dentro del navegador**, no una ventana independiente. También reutiliza pestañas que están cargando y restaura navegadores minimizados sin cerrar otras vistas. El popup nativo solicita 760 × 580 de contenido, sujeto al espacio para barras de desplazamiento y a los límites del navegador; sigue cerrándose al perder foco. Usa la pestaña fijada o el panel lateral para mantener la extensión abierta. OAuth desde el popup pasa primero a la pestaña fijada; continúa allí el inicio de sesión. El Client ID se muestra oculto con opción de revelarlo; no es un Client Secret. **Todos los ajustes** en Multichat abre la configuración común en la pestaña del dashboard.

Las ventanas independientes recuerdan su posición/tamaño cada dos segundos si cambian, al perder foco y al cerrarse. La siguiente apertura usa la geometría guardada; un canal separado comienza en 520 × 760 si no hay una previa. No se abren ventanas automáticamente al iniciar el navegador. Los espacios guardados mantienen su restauración explícita. El sistema operativo puede ajustar posiciones de monitores ausentes; la geometría física aún requiere comprobación manual.

En **Aprobación automática**, activa por separado las reglas OR: más de N mensajes, seguidor confirmado, suscriptor actual o antiguo suscriptor observado localmente. Todas vienen desactivadas; N empieza en 10 y admite 1-10.000. Con N=10, 10 mensajes no aprueban por cantidad y 11 sí. El historial de suscripciones solo cubre lo observado por esta instalación, no todo el historial de Twitch. Datos desconocidos o errores de consulta no aprueban a nadie.

La inactividad empieza en 15 minutos y admite 1-1.440. Al volver a escribir se reinician el conteo, descartes y aprobación automática si se alcanzó ese plazo o cambió la emisión verificada. Se consulta el estado de emisión cada minuto; un fallo de red no equivale a fin de stream. Las aprobaciones manuales y notas se conservan. Una condición OR aún válida puede volver a aprobar inmediatamente. El timeout automático es independiente y sigue desactivado por defecto: si su umbral es menor que N, puede actuar antes de que se alcance la autoaprobación.

Las alertas de revisión permiten sonido, volumen 0-100 y atención de ventana/barra de tareas, desactivados inicialmente. Usa **Probar sonido** en una vista abierta con interacción permitida. Una revisión no suena en todas las ventanas y hay un máximo de una alerta cada diez segundos. El parpadeo depende del navegador/sistema; no se roba foco. Sin una vista capaz de reproducir audio no se garantiza sonido; la insignia ofrece un indicador visual.

Cada fila tiene **Borrar mensaje**, **Traducir** y **Fijar mensaje**. Borrar requiere confirmación, rol y `moderator:manage:chat_messages`; vuelve a autorizar Twitch para obtenerlo. Las sanciones manuales muestran el objetivo y piden confirmación, también `/srs 1s`. El timeout permite 1-1.209.600 segundos y sugerencias de duración; el ban es permanente. Las notas rápidas añaden `RAID canal_origen` o `FRONT PAGE` sin reemplazar el texto previo, dentro del límite de 500 caracteres.

Para traducir, configura un endpoint HTTPS compatible con LibreTranslate (habitualmente `/translate`), un código de idioma de dos letras y pulsa **Autorizar servidor de traducción**. No hay servidor ni clave API preconfigurados: el endpoint debe aceptar la petición JSON sin una clave almacenada por la extensión. Cada traducción pide consentimiento mostrando el origen y texto; el original se conserva y el resultado aparece en la extensión. No se envían tokens Twitch, cookies ni metadatos de autor/canal. Revisa la política del servidor: su operador recibe la conexión y el texto y puede conservarlos. Revocar su permiso o borrar la URL deshabilita nuevas traducciones.

### Multichat y ventanas

**Abrir Multichat** y **Separar** reutilizan y enfocan la ventana equivalente, incluso si aún carga o recibe varios clics. La pestaña del dashboard también se reutiliza. Hay un máximo de doce ventanas popup independientes de la extensión, incluyendo dashboards independientes antiguos y las restauradas por espacios; las pestañas fijadas no cuentan para ese límite. No se cierran ventanas ajenas ni duplicados antiguos: cierra manualmente los que ya existan. Los espacios guardados que excedan la capacidad disponible indican restauración parcial.

### Todos los chatters e historial local

**Por revisar** mantiene la cola de pendientes. **Todos los chatters** busca entre los usuarios registrados localmente en el canal principal, incluidos aprobados, descartados y usuarios exentos de sanciones automáticas. Los filtros de cuentas nuevas, primeros mensajes y seguidores usan ese registro completo, no solo los pendientes. Busca por login o nombre visible y navega en páginas de 25; no se trata de la lista completa de espectadores de Twitch y pueden faltar mensajes no recibidos o no procesados por saturación.

Un timeout confirmado ya no descarta automáticamente a la persona. Un ban resuelve la entrada pendiente, pero el registro sigue accesible en Todos y los filtros que correspondan. Una aprobación previa conserva su significado; las sanciones no borran notas ni mensajes guardados.

Para retirar un ban o timeout activo, busca a la persona en **Todos los chatters**, pulsa **Quitar ban/timeout** y confirma el usuario/canal mostrado. Usa el permiso existente `moderator:manage:banned_users` y exige privilegios en ese canal. Solo una respuesta correcta de Twitch registra la retirada y elimina el descarte local; no aprueba la cuenta ni borra su historial. No se repite el timeout automático en el mismo ciclo de revisión, pero la inactividad o un cambio de emisión pueden iniciar otro ciclo. Una sanción ya caducada/inexistente, un permiso denegado o un cambio simultáneo en Twitch muestran un error, sin registrar un éxito.

**Historial** abre Mensajes, Notas y Moderación. Se conservan hasta 50 mensajes recientes por persona/canal entre sesiones y hasta 100 eventos locales combinados: timeouts manuales/automáticos y `/srs 1s`, bans, retiradas de ban/timeout, avisos, borrados, aprobaciones manuales y cambios de nota. Los eventos incluyen fecha, motivo, duración, origen y actor cuando están disponibles. Los errores no se registran como sanciones realizadas. La nota actual permanece aunque eventos antiguos salgan del límite.

El historial se obtiene solo del almacenamiento local: no recupera timeouts anteriores de Twitch que nunca registró la extensión. Los registros antiguos pueden mostrar únicamente el último estado sin fecha detallada. Después de conectar una vez el canal con esta versión, sus datos locales se pueden consultar al desconectar. Desinstalar o borrar el almacenamiento de la extensión elimina estos registros; no hay purga automática por fecha. Consulta también [Privacidad](PRIVACY.md).

### Organización de canales

La autoaprobación por seguimiento utiliza consultas de como máximo cinco minutos de antigüedad y las renueva al recibir mensajes cuando hace falta. Los cambios de una misma cuenta se procesan en orden para que una actualización retrasada no sobrescriba una aprobación o nota manual.

1. Conecta el canal principal desde el panel de moderación.
2. Abre **Multichat**. En **Ajustes**, introduce canales adicionales separados por comas, por ejemplo `canal_dos, canal_tres`. No pegues URLs.
3. Guarda. El máximo es seis canales únicos contando el principal. Se admiten nombres alfanuméricos y guiones bajos; `#` y `@` iniciales son opcionales.
4. Elige 1, 2 o 3 columnas. En pantallas menores se reducen automáticamente para mantener legibilidad.
5. Pulsa **Separar** en un canal para abrir o enfocar su ventana independiente. **Abrir Multichat** abre o enfoca la cuadrícula existente. Mueve y redimensiona las ventanas con el sistema operativo.
6. Elimina un canal adicional del campo de Ajustes para dejar de recibirlo. Si estaba separado, su ventana queda vacía. Cambia el principal desde el panel de moderación.

Todas las vistas comparten conexión, configuración, idioma y tema. Cambiar columnas o filtros afecta a todas las cuadrículas; las ventanas de un solo canal conservan una columna. La pausa y el scroll son locales a cada vista. Si dos ventanas editan ajustes simultáneamente, se rechaza el guardado obsoleto: cierra y vuelve a abrir Ajustes antes de guardar de nuevo.

Cerrar una ventana no desconecta IRC. **Desconectar** en el panel detiene todos los canales. La restauración de ventanas es explícita desde **Espacios**, nunca automática al iniciar el navegador. La revisión de cuentas, notas, aprobaciones y sanciones automáticas del panel sigue asociada únicamente al canal principal. En canales adicionales puedes usar slow mode y el botón manual `/srs 1s` si tienes permisos allí.

### Espacios guardados y feed unificado

En **Espacios**, introduce un nombre y pulsa **Guardar ventanas actuales**. Se guardan los canales, columnas, filtros, resaltados y modo de vista, junto con posición, tamaño y estado normal/maximizado de las ventanas emergentes de Multichat. Puedes guardar 8 espacios, con nombres de 1-40 caracteres y entre 1 y 12 ventanas por espacio. Guardar un nombre existente pide confirmación para reemplazarlo; también puedes eliminarlo.

Selecciona un espacio y pulsa **Restaurar**. Se reutilizan las ventanas que coincidan por canal o cuadrícula y se abren las que falten sin solicitar foco. No se cierran ni se mueven ventanas ajenas o sobrantes. El navegador o el sistema operativo pueden ajustar las coordenadas si cambió el monitor; se conservan coordenadas negativas para configuraciones multipantalla. Los tamaños admitidos son 320-7.680 por 300-4.320 píxeles. La geometría física multipantalla todavía requiere una prueba manual.

Los espacios persisten en `chrome.storage.local` después de reiniciar el navegador, pero no guardan credenciales, mensajes, pines ni pausas. Restaurarlos no inicia sesión ni cambia el canal principal de moderación. Los canales guardados se combinan con el principal actual, siempre dentro del máximo de seis; si se supera, ajusta primero el canal principal o la configuración. Los errores parciales de restauración se muestran y puedes reintentarlo sin duplicar ventanas coincidentes.

El selector **Cuadrícula / Unificado** cambia todas las cuadrículas compartidas. **Unificado** mezcla los últimos 1.000 mensajes disponibles ordenados por timestamp de Twitch, con desempate por canal y secuencia, y muestra etiquetas `#canal`. No espera indefinidamente mensajes retrasados: al llegar, se colocan según su hora mientras sigan dentro del historial retenido. Las ventanas separadas de un canal mantienen su vista individual. El slow mode permanece en las vistas individuales, evitando un control ambiguo para varios canales.

### Resaltados, pines y timeout de un segundo

En **Ajustes > Resaltado de palabras**, añade hasta 12 reglas. Cada regla combina texto o regex restringida con un selector de color; se colorea la coincidencia, no todo el mensaje. Rigen las mismas restricciones de seguridad del filtro de spam. Por ejemplo, `\balerta\b|necesito ayuda` identifica dos expresiones. La primera regla tiene prioridad si se solapan. Los resaltados son independientes del filtro de spam, se comparten entre vistas y se aplican también al historial cargado y a los pines.

Haz clic o pulsa Enter en una fila para fijarla arriba. Hay hasta 3 pines por ventana; un cuarto reemplaza el más antiguo. La acción vuelve al directo para que el resto del chat continúe avanzando. Los pines son locales, sobreviven al cambio de cuadrícula/unificado dentro de esa ventana y se pierden al cerrarla o recargarla. **Leer completo** abre el texto y **Desfijar** lo libera. Un pin puede conservar contexto aunque el mensaje haya salido del buffer vivo.

En cada pin, **`/srs 1s`** solicita confirmar un timeout de exactamente un segundo con motivo `/srs`, mostrando autor y canal. Cancelar no envía la sanción. Requiere `moderator:manage:banned_users` y ser moderador/broadcaster allí. No se activa automáticamente al detectar `/srs`. El worker obtiene el usuario del mensaje retenido, no de un identificador arbitrario enviado por la vista. Si el mensaje ya salió del historial, se rechaza la acción; los errores no se presentan como éxito.

### Mensajes fantasma y exportación local

`CLEARMSG` marca el mensaje y `CLEARCHAT` los mensajes afectados del usuario/canal como eliminados. Permanecen visibles con fondo rojo, tanto en el directo como en la copia pausada y los pines; no se restauran en Twitch. No puedes recuperar mensajes que nunca se recibieron o que ya salieron del buffer. La virtualización sigue reciclando filas fuera de pantalla y el historial sigue acotado: conservar un borrado no significa mantener cada nodo DOM para siempre.

El botón de descarga de cada cabecera (**Exportar TXT**) descarga su buffer vivo actual, hasta 1.000 mensajes, incluso si estás leyendo una copia pausada. Incluye hora ISO, canal, autor, texto y `[deleted]` para mensajes fantasma. En Unificado exporta la cronología combinada; no incluye pines que ya salieron del buffer. Es texto UTF-8 sin tokens ni subida a servidores. El navegador decide el destino según sus ajustes de descarga. El archivo puede contener datos personales y contenido borrado: guárdalo localmente y revisa permisos antes de compartirlo.

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

- Hover, desplazamiento manual hacia arriba de al menos un píxel o foco dentro de la lista congelan la vista. Los mensajes siguen llegando al buffer acotado.
- **Pausar** añade una pausa manual. **En directo** elimina las pausas y salta al final; si el puntero sigue dentro, el hover no vuelve a pausar hasta salir y entrar de nuevo.
- La pausa por scroll no se libera al mover el puntero ni al recibir mensajes: debes llegar manualmente al fondo exacto o pulsar En directo/Fin. Llegar al fondo elimina la pausa por scroll, pero puede quedar otra pausa activa, como hover, foco o pausa manual.
- El contador del botón indica entradas recibidas durante la pausa, no mensajes recuperables ilimitadamente. Al reanudar se muestran los más recientes retenidos; el historial antiguo puede haberse descartado.
- Cada fila muestra hasta dos líneas. Haz clic o pulsa Enter para fijarla y usa Leer completo en el pin para inspeccionarla. Los mensajes se insertan como texto, sin ejecutar HTML.

| Atajo en Multichat | Acción |
| --- | --- |
| Espacio | Alternar pausa/directo en el canal bajo el puntero, enfocado o el primero |
| End / Fin | Volver al directo en ese canal |
| S | Abrir Ajustes |
| N | Abrir o enfocar la cuadrícula Multichat |
| Esc | Cerrar el diálogo abierto |
| Tab, Enter | Navegación y activación de controles; Enter fija una fila |

Los atajos globales de página no se interceptan al escribir en campos, sobre botones/enlaces, con Ctrl/Alt/Meta ni con un diálogo abierto. Son atajos de la vista, no globales del sistema operativo.

### Rendimiento, datos y límites

Cada canal conserva como máximo 1.000 mensajes y 250 pendientes por lote. Si entran más, se conservan los más recientes y aumenta **omitidos en lotes**. El filtro conserva hasta 5.000 claves por canal; expulsa las antiguas si se supera ese límite, por lo que la detección es de mejor esfuerzo. El historial pausado es una copia acotada. La lista recicla solo las filas visibles más un pequeño margen; el texto recibido se limita a 2.000 caracteres por mensaje.

La revisión de cuentas permite 256 trabajos y 4 concurrentes. **Sin revisar** cuenta mensajes descartados por saturación de esa cola: no presupongas que se examinaron todos los usuarios. El panel publica estado agrupado, como máximo una vez cada 500 ms mientras está abierto. El sistema no es un registro de auditoría ni garantiza FPS para cualquier carga/hardware.

Los borrados `CLEARMSG` y `CLEARCHAT` marcan mensajes fantasma en el historial vivo, copia pausada y pines. No borran el historial de cuentas ya guardado en el panel de moderación. El historial y estadísticas del worker viven en memoria y se pierden si termina; una vista abierta puede conservar su copia local hasta reconectarse, y sus pines hasta cerrarse. Twitch IRC no reenvía lo ocurrido durante una desconexión. Hay reconexión con espera progresiva y heartbeat, pero no garantía de continuidad durante suspensión del equipo.

Los ajustes se guardan en `chrome.storage.local`; la sesión OAuth, en `chrome.storage.session`. IndexedDB guarda perfiles, notas y cuentas del panel sin caducidad automática. **Desconectar Twitch** elimina la sesión, no esos datos. Para borrar todo, elimina la extensión o limpia su almacenamiento desde las herramientas de desarrollo de la extensión. No exportes ni publiques datos personales o tokens.

### Resolución de problemas y publicación

- OAuth falla: comprueba Client ID y URL exacta; recarga la extensión y vuelve a iniciar sesión. No introduzcas secretos en archivos.
- Canal en espera: verifica que existe, que el principal está conectado y que la red permite `wss://irc-ws.chat.twitch.tv:443`. Los avisos y errores pueden incluir texto original de Twitch en inglés.
- Pérdidas en lotes: reduce el intervalo, ajusta spam/slow local o reduce canales. Los contadores son acumulados en memoria, no una alarma de pérdida de conexión.
- Servicio no disponible después de recargar: cierra y vuelve a abrir las vistas antiguas.
- Pruebas UI sin navegador: instala Chrome/Edge o usa el comando de instalación Chromium indicado arriba.

Las pruebas automáticas usan tráfico simulado. OAuth real, cambios reales de slow mode, timeout de un segundo, permisos por canal y restauración en monitores físicos requieren validación manual. Prueba primero con una cuenta autorizada en un canal propio y restaura el valor previo de slow mode al terminar.

Los comandos exactos para el repositorio `ChatterWatch`, la rama `main` y la etiqueta `v1.0.0` están en [Publicar en GitHub](../README.md#github-repository-and-release-commands). Subir la etiqueta ejecuta el workflow de release; como alternativa, `deno task release --dry-run` y después `deno task release` publican la release de GitHub desde tu equipo. `deno task store:submission --client-id <ID>` prepara las carpetas de Chrome Web Store y AMO en `dist/store-submission/`, incluida una nota privada para revisores que Git ignora y que solo debe pegarse en los campos privados de revisión de cada tienda. Los lanzadores locales `.bat`/`.cmd`, los ajustes `*.local.*` y las notas `PRIVATE-*` están en `.gitignore`. Revisa los archivos preparados antes del commit. Publicar el repositorio no publica la extensión en las tiendas.