---
title: "Changelog 0.1.2"
group: changelog
order: 20
summary: "Cambios relevantes de Scrakk Studio. La bienvenida muestra la primera entrada (la más nueva) en el apartado Anuncios, así que lo nuevo va arriba."
---
# Changelog

Cambios relevantes de Scrakk Studio. La **bienvenida** muestra la primera
entrada (la más nueva) en el apartado **Anuncios**, así que lo nuevo va arriba.

Formato: `## <versión> — <título>` y bullets por área. Las entradas ya
publicadas no se editan. El archivo va por versión:
`docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.2 — Memoria, terminal y chat

### Rendimiento (memoria del editor)
- El editor pasó de **un módulo WASM por archivo** a **uno por panel**: cada
  archivo abierto es una **sesión** dentro del mismo motor, con su estado
  completo (texto, **undo**, cursor, scroll y plegado). Cambiar de pestaña es
  instantáneo y **ya no se pierde el undo** (antes, al superar el tope de
  módulos en segundo plano, se descartaban). El motor ahora guarda ese estado
  por sesión.
- El renderer estaba **capeado a 256 MB** (`--js-flags` del perfil de
  producción, que se propaga a **todos** los procesos). Al abrir varios archivos
  V8 moría con *"Ineffective mark-compacts near heap limit"*. El tope queda
  **opt-in** y apagado por defecto (`SCRAKK_PERF_CAP_MAIN_HEAP=1` lo activa).
- Los cachés por archivo (símbolos del LSP, resaltado, encoding) ahora tienen
  **tope y descarte del más viejo**: antes crecían con cada archivo abierto
  hasta cerrar la tab.
- Cada panel tiene su **propio módulo** (aislado): se pueden tener **varios
  editores a la vez** (splits) sin que compartan canvas.

### Lenguajes (un solo camino)
- El **motor ya no trae gramáticas embebidas**: su wasm pasó de **~50 MB a ~3 MB**
  y queda como renderer (recibe tokens, plegado y selección del host).
- Cada lenguaje vive en **`langs/<id>/`** (su propio `.wasm` + queries + manifest)
  y el IDE los carga **on-demand**. Agregar o actualizar un lenguaje es regenerar
  su carpeta (`node tools/build-langs.mjs`), **sin recompilar el motor**.
- El pack `langs/` se registra como **una extensión** más, así que los lenguajes
  siguen funcionando sin instalar nada.
- **Queries por el sistema híbrido**: cada categoría se completa desde el catálogo
  que la publica mejor, no desde uno solo — **nvim-treesitter** (Apache-2.0) para
  `highlights`, `injections`, `locals`, `folds` e `indents`; **Helix** (MPL-2.0)
  para `tags` y `rainbows` (los únicos que los traen), y
  **nvim-treesitter-textobjects** (Apache-2.0) para `textobjects`. Cuando el repo
  del parser ya publica una categoría, esa manda. Cada catálogo va **fijado por
  commit** y su licencia queda grabada en el `grammar.json` del paquete.

### Editor — edición
- **Auto-pairing por lenguaje**: los pares de cierre los declara el lenguaje (su
  `language-configuration` o su tabla real); el motor ya no tiene una tabla fija
  ni heurísticas (se fue el caso especial del apóstrofe). Sin pares declarados no
  hay auto-cierre.
- **Auto-indent real**: la sangría de la línea nueva sale del `indents.scm` del
  lenguaje (`@indent.begin/@indent.end/@indent.dedent`) más la unidad del
  lenguaje. Se fue la heurística (sangría previa + `{`); sin dato del lenguaje se
  conserva la sangría actual.
- **Multi-cursor**: carets extra con `Ctrl+Alt+↑/↓`, `Alt+Click` (caret donde
  clickeás) y `Ctrl+D` (agrega la siguiente ocurrencia de la palabra, con
  envolvimiento); tipear, borrar y Enter se aplican en **todos**, las flechas los
  mueven juntos y `Esc` (o un click simple) vuelve a uno solo.

### Búsqueda (KolarGrep)
- La búsqueda en archivos ahora puede usar el **servidor de KolarGrep**
  (`kolargrep serve`) como **sidecar**: índice de trigramas **vivo** (watcher +
  overlay incremental), caché y resultados con **`spans`/`columns`** — que es lo
  que el editor necesita para resaltar el match exacto. El binario se lanza una
  vez por workspace, con el índice **fuera del proyecto**
  (`~/.cache/scrakk-search-serve`), y se apaga al cerrar la app.
- Se mantiene el **fallback** al addon nativo y, si no está, al scan en TS: sin
  sidecar la búsqueda sigue funcionando (solo pierde los detalles finos).

### Editor — sugerencias (LSP)
- **Lista de sugerencias en tiempo real** anclada al caret, como VS Code: al
  tipear se pide `textDocument/completion` al server del archivo y aparece el
  menú (DOM puro, igual que el tooltip del hover y el menú contextual). `↑`/`↓`
  eligen, `Enter`/`Tab` aceptan, `Esc` cierra, `Ctrl+Space` la abre a mano y el
  click también acepta.
- Filtra por el **prefijo tipeado**, ordena por `sortText` y **deduplica** el
  mismo símbolo cuando lo proponen dos servers. Cada ítem lleva **badge por
  tipo**, `detail` y panel de **documentación**.
- El commit **conserva el undo**: en vez de reescribir el buffer, manda los
  Backspace del prefijo y los caracteres por el camino de teclado del motor (así
  además respetan los auto-pairs del lenguaje).
- El **ancla del caret** se calcula del lado del host (hit-test inverso sobre el
  motor), así que no hizo falta ningún canal nuevo en Innerta.
- Límites de esta primera versión: sin **snippets** ni **auto-import**
  (`additionalTextEdits`), filtro por prefijo (no fuzzy) y el commit con
  **multi-cursor** activo todavía toca todos los carets.

### Terminal
- Al **cambiar de workspace**, las terminales abiertas se reubican en el
  proyecto nuevo (`cd`) y las nuevas nacen en la carpeta correcta. Antes
  quedaban en la carpeta del proyecto anterior.

### Chat de IA
- Se quitó el **tope de rondas de tools** por turno (era 12): el ciclo se cortaba
  en silencio después de varias herramientas. Ahora solo lo corta el usuario con
  **Detener**.
- **Subagentes (`task`) ya no quedan "clavados en Thinking"**: mientras la tool
  corre, la card del subagente ahora se dibuja (antes el bubble se ocultaba hasta
  que hubiera texto, así que no se veía ni la card ni el progreso hasta terminar
  la ronda o apretar **Detener**).
- **Se acabaron las cards duplicadas**: un proveedor que repite el `id` del tool
  call con el `index` incrementado en cada chunk generaba **varias cards
  idénticas** para un solo spawn. Ahora la acumulación del stream identifica por
  `id`, deduplica al emitir y descarta los chunks que llegan con un `id` nuevo
  pero **sin nombre** (cards fantasma, no ejecutables ni clickeables).
- **Progreso en vivo en el chat**: la card del subagente muestra la última línea
  con contenido mientras corre, sin abrir el modal.
- **Sin burbujas vacías por ronda** en el transcript del subagente y **sin tool
  result vacío** que hiciera al modelo padre volver a llamar `task`.

### Panel de Git (UI)
- **Rediseño del panel**: la rama y los botones **Fetch / Pull / Push** ahora
  viven en un **solo bloque sin bordes**, solo con fondo; antes eran dos filas
  con caja. Si hay varios repos, el activo aparece como etiqueta.
- **Jerarquía reordenada**: el **mensaje de commit sube arriba de los cambios**
  (antes quedaba escondido al final) y las secciones se agrupan por zonas:
  **Repositorio** (ramas, historial, stash, tags, remotos), **Integración**
  (cuenta, pull requests) y **Workspace** (árbol de solo lectura, que pasa al
  final por no ser git).
- **Historial con línea de tiempo**: un raíl continuo conecta los puntos de cada
  commit.
- **Tipografía más calmada**: fuera las MAYÚSCULAS de los títulos y pesos
  bajados a 400/500, con números tabulares.
- **Botones cuadrados** con esquinas redondeadas (ya no cápsula), también en el
  commit.
- El **input de commit** queda idéntico al del chat de IA: sin resize, con el
  borde que aparece al enfocar y los botones alineados a la derecha.
- **Hover directo**, sin transiciones, para que el cursor responda al instante.

### Layout (splits)
- Los paneles ahora se **parten de verdad**: al soltar una tab en un borde
  (arriba / abajo / izquierda / derecha) se crea un **grupo nuevo** con su
  propia barra de tabs, como en VS Code. Se pueden **anidar** sin límite.
- El separador entre grupos muestra **dos bordes** (uno por hoja, mismo estilo
  que el resto de paneles) con el handle de resize en el medio, igual que la
  separación entre slots.
- Cada split guarda su **ratio**: el tamaño se conserva al recargar la app.
- Los splits viejos de **contenido dividido** (`splitDir`) se migran solos a
  grupos reales al abrir la app.
- Un grupo **vacío** muestra un botón **Cerrar slot** que lo cierra (colapsa
  el split al grupo hermano o cierra el slot entero).

### Barra de estado (UI)
- Se **unificó el hover** de todos los botones/chips: cuadrado con esquinas
  redondeadas (radio chico, no cápsula), mismo alto y color `--color-hover`,
  tanto en los de la izquierda (LSP, problemas, git, encoding, extensiones)
  como en los de la derecha (toggles de paneles, notificaciones y ajustes).

### Cuenta (UI)
- El **código de verificación por email** ahora se escribe en un input con
  **slots animados** (`CodeSlots`, de React Bits): los dígitos aterrizan uno a
  uno, el error **drena y limpia** los slots y el acierto los funde con un
  check. Verifica solo al completar los 6 dígitos.

### Chat de IA (UI)
- El selector de **esfuerzo de pensamiento** abre una **barra slideable**
  (extraída del componente PromptBar) en un menú custom, en vez del menú
  contextual de opciones. Al llegar al **paso máximo**, el input se enciende con
  un wash de acento y **chispas** que suben (más intensas al tipear).

### Chat de IA — Skills (UI)
- Las **vistas de skills e historial** dejaron de ser un toggle: son vistas
  propias dentro del panel de chat, cada una con su **botón de volver** (animado)
  en el header y su título propio (**Skills** / **Historial**). Abrir una cierra
  la otra desde cualquier vía (header, comando o menú).
- **La pestaña sigue el título del panel**: al mover el chat a otra zona, la tab
  toma el título dinámico que el panel publica (p. ej. **Skills**) en vez de un
  label fijo.
- **Rediseño del panel de Skills**: barra de acciones arriba (**Nueva** con
  icono y **Recargar**, que pasa a **Cerrar** al abrir el formulario); el
  formulario aparece debajo al pulsar **Nueva** y la lista queda abajo. El
  formulario y el log se **colapsan/expanden animando la altura**, así el
  contenido se mueve suave y sin saltos; la entrada de los campos es
  **escalonada (350ms)** y la salida inversa de **150ms**.
- **Filas estilo explorador**: píldora de origen más grande (envuelve si el
  texto es largo) y hover de fila que contiene los botones de acción. Los inputs
  viven sobre un container con la **superficie del tema** y usan el **bg del
  tema** (nada hardcodeado), sin bordes y sin resize en las instrucciones.
- **Contador** en lenguaje natural ("Tienes N skills") y **confirmación al
  borrar** mediante el **sistema global de modales**.

### Herramientas (tipos)
- Las tools se agrupan por **Familias → Tipos** en Ajustes → Chat →
  Herramientas: **Entorno** (Archivos, Código, Sistema, Navegador, Skills,
  Utilidades) y **Agénticos** (Subagentes).
- Cada tool declara su `type`; ya **no hay un union hardcodeado**. El catálogo
  es **extensible**: una extensión `.sef` puede aportar su propio
  **pack/familia** y sus tipos (`family`/`type` en el manifest).
- Toggle por **grupo** (encender/apagar todo un tipo) además del toggle por tool.
- La **guía propia de cada tool** (`prompt.ts`) ahora se inyecta al system prompt
  (`Guidance:` por tool). Antes estaba muerta: solo se usaba la `description`.

### Agentes (UI)
- Se **unificaron modos y subagentes** en un solo concepto: **Agentes**, con
  dos tabs en Ajustes → Chat → **Agentes**: **Primarios** (los que antes eran
  "modos", el agente activo del chat) y **Subagentes** (reusables).
- Cada agente tiene **prompt, permisos, herramientas y modelo** propios; el
  modelo **hereda el del chat** por defecto (`inherit`, como el CLI).
- Los subagentes se invocan con la tool **`task`** o escribiendo
  **`@nombre <tarea>`** en el input del chat. Los primarios declaran qué
  subagentes pueden usar (los modos integrados ven todos).
- Se guardan en `.scrakk/agents/primary.json` y `.scrakk/agents/subagents.json`
  (usuario y proyecto). Al primer arranque se crea un primario **Asistente** y
  un subagente **Explorador** (read-only) usando el propio sistema, no builtins.
- `modes.json` se migra solo a `primary.json`.
- **El subagente se ve en un modal**: `@nombre <tarea>` (y el click en la card
  de `task`) abre un **modal sin overlay** (variante `plain` del sistema global
  de modales) montado **dentro del panel de chat**, con el **transcript en vivo**
  del subagente (contenido, razonamiento y tool calls) reusando los componentes
  de chat, **sin input** (un subagente no recibe mensajes). Mientras está
  abierto, el input del chat principal queda **bloqueado** (estado `locked`).
- Las **tool calls** llegan **en vivo**: el proceso main las emite mientras el
  modelo las escribe (antes solo al terminar el stream), así la card aparece en
  tiempo real y no recién al cortar la respuesta.
- La tool `task` tiene **card custom** (shimmer mientras corre): al terminar,
  **click en la card** abre ese modal; solo hay uno a la vez.

### Servidores (LSP)
- **Progreso de instalación en vivo**: al instalar un language server desde
  Ajustes, el botón que dispara la acción se envuelve con un **borde animado**
  que recorre sus cuatro lados mientras corre, y el **tooltip** muestra la fase
  (preparando, descargando, instalando, extrayendo). Cuando el release publica
  `content-length`, además se ve el **porcentaje real** (`Descargando… 42%`).
- La descarga de releases de GitHub se **transmite por chunks** y reporta
  bytes/porcentaje desde el proceso main; antes se bajaba el buffer completo en
  memoria y sin aviso. Los instaladores por **npm/go/gem/dotnet** muestran su
  última línea de salida, sin inventar un porcentaje que no conocen.
- **Feedback unificado en la zona**: reiniciar, encender/apagar e instalar usan
  el mismo botón de carga; la carga inicial de la lista usa la barra de la zona.
  Cada operación permanece visible **al menos 250 ms** aunque responda al
  instante (evita el parpadeo) y el aviso del resultado sale después de ese
  mínimo.
- El botón de carga queda como **pieza reutilizable del UI kit**
  (`LoadingButton`, con variantes y tamaños como `IconButton`), disponible para
  cualquier botón de la app y con el color del tema.

### Ajustes (UI)
- **Ajustes → Servidores (LSP)**: las filas de cada server dejaron la forma de
  *card con cápsulas* (estado, origen y extensiones iban en píldoras) por una
  **superficie única con filas planas**, al estilo de Apariencia y Skills: el
  **estado es un punto de color + texto**, el origen y las extensiones van en
  **texto tenue** (sin fondo) y las filas tienen **hover** en vez de borde por
  card. Los botones pasan de cápsula a **radio de input** y **conservan el
  loader animado** (`LoadingButton`), ahora con radio configurable por contexto
  (`--loading-border-radius`).
- **Nav de Ajustes**: **Servidores** y **Resaltado** pasan a ser **hijos de
  Editor** (antes Servidores era de primer nivel y Resaltado colgaba de
  Servidores), para que la jerarquía refleje que son ajustes del editor.
- **Editor → Resaltado (Fuente)**: el cambio ahora **aplica al instante** sobre
  el archivo abierto. El ajuste existía y se guardaba, pero el motor Innerta
  **no escuchaba** su evento (`highlight-source-changed`): recién se notaba al
  reabrir el archivo. Además la sección muestra un **estado en vivo** (modo
  efectivo + tokens de LSP / tree-sitter / TextMate) para poder **verificar**
  quién está pintando, junto al inspector de tokens.
- **Botón "volver arriba"** en el contenido de Ajustes: aparece al bajar con una
  animación de **150ms** (fade + deslizamiento) y sube el contenido de forma
  **suave**; respeta `prefers-reduced-motion` (salto directo) y al cambiar de
  sección el contenido vuelve arriba.

### i18n — Internacionalización (UI)
- **Motor propio y tipado**: `t()` con interpolación (`{nombre}`), plurales
  (`count` → `.one`/`.other`) y caída al idioma base. Sin traducción en runtime:
  las claves se resuelven contra catálogos estáticos y un typo en `t('...')` no
  compila (la unión `MessageKey` se deriva del catálogo base).
- **El español es la base** (`es`) y el **inglés** se traduce una sola vez y se
  guarda. Cada clave recuerda el **hash del texto base**: si el `es` no cambió
  nunca se re-traduce; si cambió, queda `stale`.
- **Selector de idioma** en Ajustes → Apariencia (`Sistema` / `Español` /
  `English`), persistido y aplicado al instante (incluido el `<html lang>`).
  Al cambiarlo, el **IDE entero** se vuelve a renderizar con el idioma nuevo
  (sin remontar paneles: no se pierde estado).
- **Interfaz migrada al catálogo**: menú superior, barra de estado, activity
  bar, títulos de paneles y pestañas, Ajustes (nav + secciones), paneles
  (Explorador, Git, Problemas, Notas, Social, Chat…), onboarding y diálogos.
  Los títulos de panel y los labels de los registries se resuelven con
  *getters* (`get title() { return t(...) }`), así siguen al idioma sin tocar
  a los consumidores.
- **`tools/i18n.mjs`** (`npm run i18n`): `--status`, `--extract`, `--sync`,
  `--translate <lang>` (motor **DeepL** por defecto; `argos` local como
  alternativa), `--review`, `--approve`, `--check [--strict]` y `--doctor`.
  Incluye **glosario curado** (coincidencia exacta) para las strings cortas que
  el motor no desambigua sin contexto, y **protección de `{placeholders}`** con
  verificación posterior.
- **Flujo de release**: `release.yml` corre `--check --strict` y **bloquea** el
  paquete si hay claves faltantes, desactualizadas o sin revisar; `ci.yml` avisa
  sin bloquear mientras la migración avanza.

### Chat Social — archivos compartidos
- **Compartir archivos como contenido, no como adjunto**: un archivo va como un
  mensaje de tipo `codefile` (columna nueva `kind` en `messages`); el `body`
  lleva un **sobre JSON de una línea** con los metadatos (`name`, `lang`,
  `lines`, `size`, `sha`, `key`, `expiresAt`) y el contenido vive en **R2**
  (bucket privado `scrakk-chat-files`). Los mensajes normales quedan intactos
  (4000 chars, mismo CHECK).
- **Gatekeeper**: las credenciales de R2 **no viajan en la app**. Todo pasa por
  la Edge Function `social-file`, que valida JWT, amistad, **límites** (10.000
  líneas / 512 KB), **cupo** y recién ahí sube o firma una **URL de vida corta**
  para el receptor (con verificación `sha256` al bajar).
- **Cupo borrable + caducidad**: 15 archivos vivos por conversación; borrar un
  archivo libera cupo al instante y a los **60 días** el lifecycle de R2 los
  elimina solo (la card pasa a "expirado").
- **El INSERT lo hace el gatekeeper**: la Edge Function valida, sube a R2 **y
  crea el mensaje**, así la cuota cuenta archivos reales y el **rate limit de la
  DB** aplica aunque el cliente esté modificado (antes se podía subir sin
  mensaje → objetos huérfanos sin tope de tasa). Si el INSERT falla, borra el
  objeto. El `sha256` y las líneas los calcula el **servidor**, no el cliente.
- **Sobre validado en la DB**: un CHECK exige que un mensaje `codefile` traiga un
  sobre JSON válido (`v`, `kind`, `name`, `key`) — ni con SQL directo se cuela
  un archivo basura. El `body` de los mensajes normales sigue capado en 4000.
- **Card en el mensaje**: header con el **ícono del tema de fileIcons activo**
  (nada hardcodeado), nombre, líneas, tamaño y vencimiento; el body baja el
  contenido bajo demanda y lo pinta resaltado.
- **Rate limit real**: se aplicó el trigger `messages_rate_limit` (7 en 5 s),
  que hasta ahora estaba escrito pero **sin aplicar** (el `msg_ratelimited` del
  cliente era código muerto).
- **Compositor**: contador de caracteres estilo Discord (muestra lo que resta y
  avisa al pasarse del tope, bloqueando el envío) y el botón de emojis ahora usa
  un `ProductIcon` (`emoji`) en vez del glifo hardcodeado.
- **Compartir desde el menú contextual**: opción "Compartir en Social" en el
  **Explorer** y en el **click derecho de las tabs** de archivo, vía la API
  global de context menu.
- **Drag & drop al input**: arrastrá una **tab** o un **archivo del Explorer**
  directo al compositor del panel Social. Se agrega como **archivo linkeado**
  con su mini-card (ícono del pack + nombre) junto al input, como los adjuntos;
  al enviar, cada uno se comparte como mensaje `codefile`. La tab usa el drag por
  pointer del layout (nuevo *drop sink*, sin tocar el resolver de tabs) y el
  Explorer el drag nativo de recursos.

### Chat Social — rendimiento (lag con conversaciones largas)
- **El `memo` de cada mensaje volvió a funcionar**: el perfil del remitente se
  armaba como **objeto nuevo en cada render**, así que la comparación de `memo`
  fallaba siempre y **todos** los mensajes se re-renderizaban aunque solo
  hubiera cambiado la presencia de un amigo. Ahora el perfil se cachea **por
  remitente** y conserva su identidad mientras sus datos no cambien.
- **La lista de mensajes está memoizada** y todo lo derivado se calcula en una
  sola pasada: los `Map` de nombre/avatar ya no se reconstruyen en cada render.
- **Formateadores de fecha cacheados**: `toLocaleTimeString` /
  `toLocaleDateString` construyen un `Intl.DateTimeFormat` nuevo en cada llamada,
  y se llamaban una o dos veces **por mensaje y por render** (con `new Date()`
  extra para detectar "hoy"/"ayer"). Ahora el formateador y el resultado se
  cachean por locale y por timestamp.
- **Realtime es la fuente de verdad, no el refetch**: cada evento de presencia
  llegaba **sin datos** y el renderer respondía con un refetch completo (amigos +
  solicitudes + presencia). Ahora el evento **trae la fila** y se actualiza solo
  esa entrada: un latido ya no son 3 queries ni un render del panel entero.
- **La suscripción de Realtime no se re-engancha sola**: dependía de `friends`,
  que cambiaba de identidad en cada poll, así que los 7 canales se desuscribían y
  se volvían a suscribir cada 15s (con una ventana ciega donde se perdían
  eventos). Ahora se engancha una vez y lee siempre lo fresco por ref.
- **El estado no cambia de identidad si no cambia**: `friends`, `requests` y el
  mapa de presencia comparan contenido antes de reemplazarse, así que un poll
  que no trae diferencias ya no invalida los `memo` de la lista.
- **Menos polling**: los refrescos de seguridad bajaron de **3s a 20s**
  (mensajes), **10s a 60s** (presencia) y **15s a 120s** (amigos/solicitudes).
  El canal ya cubre INSERT, UPDATE y DELETE de `messages`, así que la red de
  seguridad sigue existiendo pero sin pagarse seis veces por minuto.
- **Publicar presencia solo si cambia**: abrir o cambiar de archivo en el editor
  republicaba presencia aunque el contenido fuera idéntico (una escritura y un
  evento Realtime para todos los amigos por cada archivo tocado). Ahora se
  compara antes de escribir; el latido de 45s sigue refrescando la presencia.
- **El propio latido se ignora**: la propia presencia vuelve por el mismo canal
  (uno también cumple la política de "amigos") y provocaba un re-render cada
  45s. El estado local ya es la fuente de verdad, así que se descarta.
- **Tipado funcionando**: el indicador de "está escribiendo" usaba un canal
  `broadcast` (`typing:<uid>`) y **no tenía políticas** en `realtime.messages`,
  así que con la autorización de Realtime el `.subscribe()` connectaba pero el
  evento **nunca llegaba, sin error visible**. Se aplicaron las dos políticas que
  faltaban (enviar sólo al canal de un amigo, leer sólo el propio).

### Editor — visores por formato (fileHandlers)
- **Registry de excepciones por formato**: cada uno vive en **su propia carpeta**
  (como los tools de la IA) y declara qué agarra + cómo se muestra:
  `match` (extensión/glob/languageId/esquema) y `mode` (`view` = pieza,
  `text` = editor, `both` = intermedio). **Nada hardcodeado en el editor**: el
  área central consulta el registry y, si no hay match, abre con Innerta.
- **Visores incluidos**: **imagen** (`view`), **SVG** (`both`) y **markdown**
  (`both`). El markdown es el caso intermedio: se ve renderizado o se edita.
  Los formatos `both` abren **directo en modo visor**.
- **Alternar visor ⇄ editor**: en el **menú de click derecho de la pestaña**
  ("Ver como texto" / "Ver como visor", con el icono del ojo), junto a
  "Compartir en Social". Solo aparece en los formatos que admiten los dos modos;
  la preferencia se guarda **por archivo**.
- **Toolbar del visor**: cada handler puede declarar sus **acciones** (`actions[]`)
  y se dibujan arriba del contenido (con los iconos del pack, nunca glifos).
  Ninguno de los tres visores incluidos las usa: la barra no aparece.
- **Registro en el arranque**: los handlers built-in quedan listos antes del
  primer render (`main.tsx`), así no dependen del orden de montaje de paneles.
- **Lectura binaria** (`fs:read-binary`): los visores de imagen reciben
  `base64` + mime y se pintan como `data:` (la CSP del renderer no permite
  `file:`). El motor Innerta queda montado y oculto mientras manda el visor,
  así no se pierden undo/scroll al volver.
- **Fondo del visor**: usa la variable **`surface`** del theme (no `bg`), así
  se ve como el resto de superficies del chrome y no como el fondo de la app.
- **Tabs virtuales** (`scrakk-view://<handlerId>/<payload>`): el mismo visor
  sirve como tab sobre contenido que no es un archivo (por ejemplo la card de
  un `codefile` del chat). Se resuelve **por id**, viaja por el mismo bus de
  archivos y no toca el disco.
- **`contributes.fileHandlers`**: una extensión aporta sus propios formatos al
  **mismo registry** que los built-in (segunda puerta al mismo store), con
  ownership para desinstalar limpio. El visor se resuelve por import dinámico
  del paquete, nunca con un `ComponentType` directo.

### Correcciones
- **Los visores de formato no se montaban**: el dispatcher estaba en el panel
  `editor` (el clásico de una sola vista), pero el contenido de una tab de
  archivo lo monta otro componente. Resultado: un PNG siempre caía en Innerta
  aunque el registry, los handlers y el bundle estuvieran perfectos — y el
  toggle visor⇄editor no aparecía en el menú (para un formato `view` no hay
  modo texto que alternar, así que solo salía "Compartir en Social"). Ahora
  **`FileTabView`** consulta el registry, y para un formato con visor ni
  siquiera se adjunta la sesión de Innerta (leería bytes como texto).
- **Crash del WASM al abrir un visor**: ocultar el host del engine lo dejaba
  midiendo 0×0, y el módulo **aborta** ante cualquier dimensión cero (está
  compilado sin exception catching, así que no lanza una excepción capturable:
  tumba la tab entera). Ahora el motor **saltea** el `setBounds` mientras el host
  no tenga área y el `ResizeObserver` lo reaplica cuando vuelve.
- **Visor markdown sin aire**: `.view` y la columna del documento iban en el
  mismo elemento, así que el padding competía con el centrado y el texto
  quedaba pegado a los bordes. Ahora el scroller y la columna están separados.
- **Emoji: ancho de 2 celdas y nítidos**: el layout era `x = columna × ancho`
  puro, así que un emoji avanzaba **una** celda y se pisaba con el vecino (y el
  caret quedaba mal). Ahora el layout es **consciente del ancho** (emoji del
  plano suplementario y CJK ancho = 2 celdas; ZWJ/selectores/combinantes = 0) y
  el caret, el hit-test, los rangos y el ancho de la línea lo respetan. Además
  el bitmap de color se carga a **3× y se baja con filtro lineal**: se acabó el
  emoji borroso.
- **Emojis en color (los del sistema)**: el motor no puede sacarlos de FreeType
  en WASM (los emoji del sistema son bitmaps de color y su strike es de 136 px),
  así que los **rasteriza el host** con el navegador (Noto Color Emoji / Apple
  Color Emoji / Segoe UI Emoji) y el motor los pinta como un glifo provisto por
  el host — el mismo reparto que tokens, subrayados o indentación. Si el canvas
  no dibuja nada, no se empuja: queda el respaldo monocromo embebido.
- **Emojis y símbolos no se veían**: la cadena de fuentes de respaldo del motor
  apuntaba a rutas del sistema, que **no existen en el build web**, así que
  quedaba vacía y todo lo que la fuente del editor no tiene (símbolos, emoji del
  plano suplementario) se dibujaba con avance 0. Ahora se **embeben** dos fuentes
  recortadas (símbolos BMP y emoji astral) y el atlas las usa como respaldo:
  `😀 🚀 👍 ❤ ✔ ⚠` y los dibujos de caja se ven.
- **Editor en varios paneles**: al abrir un archivo en un segundo panel, el
  editor quedaba **vacío** porque los paneles compartían un único módulo WASM y
  canvas. Ahora **cada panel monta su motor aislado**.
- **Mover una tab de archivo entre paneles**: el motor podía quedarse **sin
  cargar** (la espera del módulo no se resolvía nunca y el panel de origen
  acumulaba motores). Ahora la espera termina siempre y el panel que queda
  **vacío libera su motor** (WASM + contexto GL).
- **Bienvenida → Consejos**: el indicador de puntos (que marca en qué consejo
  vas) se aplastaba y quedaba **superpuesto** cuando el panel no tenía ancho.
  Ahora no se encoge, baja de línea si hace falta y, si sigue sin caber, se
  **resume a `n/total`**.
- **Bienvenida → Acciones**: en paneles muy angostos, las 3 tarjetas de arriba
  (*Nuevo archivo*, *Abrir archivo*, *Abrir carpeta*) pasan a **texto simple**,
  sin ícono ni tarjeta, con el atajo alineado a la derecha.
- **Chat de IA**: los **iconos de las tools** ahora usan el mismo color que el
  texto de la tool (`--color-text-muted`); antes heredaban el color del chat y
  se veían más brillantes.
- **Explorer**: el input de **renombrar/crear** archivo ya no usa el borde de
  acento ni un radio grande; ahora **no tiene borde** (solo fondo), radio chico
  y sin contorno. Su texto (y el placeholder) usa el tamaño de las filas
  (`--text-xs`, 12px); antes el de crear heredaba un tamaño mayor.
- **Breadcrumb, tab activa y editor (Innerta)**: los tres usan el mismo fondo
  que las activity bars (`--activitybar-bg`/surface): el breadcrumb dejó de ser
  transparente, la tab activa dejó el tinte de hover y el buffer del editor
  ahora matchea el chrome.
- **Bienvenida → Anuncios**: el punto de "novedades" ahora también detecta el
  **changelog local**: si el `changelog-x.x.x.md` más nuevo supera la versión de
  la app, aparece el badge (sin depender del release remoto), y al abrir
  Anuncios queda como visto.
- **Tabs**: el strip scrollea en horizontal con la **rueda** del mouse cuando
  las tabs desbordan (antes solo con trackpad o Shift+rueda).
- **Tabs / layout**: se corrigió un loop de updates (*"Maximum update depth
  exceeded"*) al montar **muchos paneles**: el ref combinado del strip cambiaba
  de identidad en cada render y React hacía detach/attach llamando `setState`
  en bucle. Ahora es estable.
- **Desarrollo — hot reload (Vite HMR)**: en casos aislados, un *full reload* del
  dev server (por ejemplo al reconstruirse el preload o al re-optimizar
  dependencias) abría el proyecto en el **navegador del sistema** con
  `localhost` y dejaba la ventana de la app **congelada**. El handler global de
  `will-navigate` mandaba a `openExternal` hasta la URL del propio dev server;
  ahora las navegaciones al dev server (reload de HMR y links internos) se
  resuelven **dentro** de la ventana y solo las URLs externas salen al navegador.
- **Ajustes → Chat → Proveedores**: los iconos de la lista quedaban **pegados
  arriba** (más aire abajo que arriba); ahora van **centrados**. Además los
  **logos de models.dev** se pintan como **silueta con el color del tema**
  (antes el `<img>` no heredaba el color y salían negros), con el mismo patrón
  de máscara que el logo de la bienvenida.
