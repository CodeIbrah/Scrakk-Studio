---
title: "Changelog 0.1.2"
group: changelog
order: 20
summary: "Relevant changes in Scrakk Studio. The welcome screen shows the first entry (the newest) in the Announcements section, so the newest goes on top."
---
# Changelog

Relevant changes in Scrakk Studio. The **welcome screen** shows the first
entry (the newest) in the **Announcements** section, so the newest goes on top.

Format: `## <version> — <title>` and bullets per area. Entries already
published are not edited. The file goes per version:
`docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.2 — Memory, terminal, and chat

### Performance (editor memory)
- The editor went from **one WASM module per file** to **one per panel**: each
  open file is a **session** inside the same engine, with its full state
  (text, **undo**, cursor, scroll, and folding). Switching tabs is
  instant and **the undo is no longer lost** (before, when the cap of
  background modules was exceeded, they were discarded). The engine now keeps that state
  per session.
- The renderer was **capped at 256 MB** (`--js-flags` of the
  production profile, which propagates to **all** processes). When opening several files
  V8 died with *"Ineffective mark-compacts near heap limit"*. The cap is now
  **opt-in** and off by default (`SCRAKK_PERF_CAP_MAIN_HEAP=1` enables it).
- Per-file caches (LSP symbols, highlighting, encoding) now have
  **a cap and oldest-first eviction**: before they grew with every open file
  until the tab was closed.
- Each panel has its **own module** (isolated): you can have **several
  editors at once** (splits) without them sharing a canvas.

### Languages (a single path)
- The **engine no longer ships embedded grammars**: its wasm went from **~50 MB to ~3 MB**
  and remains a renderer (it receives tokens, folding, and selection from the host).
- Each language lives in **`langs/<id>/`** (its own `.wasm` + queries + manifest)
  and the IDE loads them **on-demand**. Adding or updating a language means regenerating
  its folder (`node tools/build-langs.mjs`), **without recompiling the engine**.
- The `langs/` pack is registered as **one more extension**, so languages
  keep working without installing anything.
- **Queries via the hybrid system**: each category is completed from the catalog
  that publishes it best, not from just one — **nvim-treesitter** (Apache-2.0) for
  `highlights`, `injections`, `locals`, `folds`, and `indents`; **Helix** (MPL-2.0)
  for `tags` and `rainbows` (the only ones that ship them), and
  **nvim-treesitter-textobjects** (Apache-2.0) for `textobjects`. When the parser
  repo already publishes a category, that one wins. Each catalog is **pinned by
  commit** and its license is recorded in the package's `grammar.json`.

### Editor — editing
- **Per-language auto-pairing**: closing pairs are declared by the language (its
  `language-configuration` or its real table); the engine no longer has a fixed table
  or heuristics (the apostrophe special case is gone). Without declared pairs there is
  no auto-close.
- **Real auto-indent**: the new line's indent comes from the language's `indents.scm`
  (`@indent.begin/@indent.end/@indent.dedent`) plus the language's
  unit. The heuristic is gone (previous indent + `{`); without data from the language
  the current indent is kept.
- **Multi-cursor**: extra carets with `Ctrl+Alt+↑/↓`, `Alt+Click` (caret where
  you click), and `Ctrl+D` (adds the next occurrence of the word, with
  wrapping); typing, deleting, and Enter apply to **all**, the arrows
  move them together, and `Esc` (or a simple click) goes back to just one.

### Search (KolarGrep)
- File search can now use the **KolarGrep server**
  (`kolargrep serve`) as a **sidecar**: a **live** trigram index (watcher +
  incremental overlay), cache, and results with **`spans`/`columns`** — which is what
  the editor needs to highlight the exact match. The binary is launched once
  per workspace, with the index **outside the project**
  (`~/.cache/scrakk-search-serve`), and it shuts down when the app closes.
- The **fallback** to the native addon and, if it is not available, to the TS scan is kept:
  without a sidecar, search keeps working (it only loses the fine details).

### Editor — suggestions (LSP)
- **Real-time suggestion list** anchored to the caret, like VS Code: as you
  type, `textDocument/completion` is requested from the file's server and the
  menu appears (pure DOM, just like the hover tooltip and the context menu). `↑`/`↓`
  select, `Enter`/`Tab` accept, `Esc` closes, `Ctrl+Space` opens it manually, and
  a click also accepts.
- It filters by the **typed prefix**, sorts by `sortText`, and **deduplicates** the
  same symbol when two servers propose it. Each item carries a **per-type badge**,
  `detail`, and a **documentation** panel.
- The commit **preserves undo**: instead of rewriting the buffer, it sends the
  prefix's Backspaces and the characters through the engine's keyboard path (so
  they also respect the language's auto-pairs).
- The **caret anchor** is computed on the host side (reverse hit-test on the
  engine), so no new channel was needed in Innerta.
- Limitations of this first version: no **snippets** or **auto-import**
  (`additionalTextEdits`), prefix filtering (not fuzzy), and the commit with
  **multi-cursor** active still touches all carets.

### Terminal
- When **switching workspace**, open terminals are relocated to the
  new project (`cd`) and new ones are born in the correct folder. Before
  they stayed in the previous project's folder.

### AI chat
- The **per-turn tool round cap** was removed (it was 12): the loop was cut off
  silently after several tools. Now only the user stops it with
  **Stop**.
- **Subagents (`task`) no longer get "stuck on Thinking"**: while the tool
  runs, the subagent card is now drawn (before the bubble was hidden until
  there was text, so neither the card nor the progress was visible until the round
  finished or **Stop** was pressed).
- **Duplicate cards are gone**: a provider that repeats the tool call's `id`
  with the `index` incremented on each chunk generated **several identical
  cards** for a single spawn. Now stream accumulation identifies by
  `id`, deduplicates on emit, and discards chunks that arrive with a new `id`
  but **no name** (ghost cards, not executable or clickable).
- **Live progress in the chat**: the subagent card shows the last line
  with content while it runs, without opening the modal.
- **No empty bubbles per round** in the subagent transcript and **no empty tool
  result** that would make the parent model call `task` again.

### Git panel (UI)
- **Panel redesign**: the branch and the **Fetch / Pull / Push** buttons now
  live in a **single borderless block**, with just a background; before they were two rows
  with a box. If there are several repos, the active one appears as a label.
- **Reordered hierarchy**: the **commit message moves above the changes**
  (before it was hidden at the end) and the sections are grouped by zones:
  **Repository** (branches, history, stash, tags, remotes), **Integration**
  (account, pull requests), and **Workspace** (read-only tree, which moves to
  the end for not being git).
- **History with a timeline**: a continuous rail connects the dots of each
  commit.
- **Calmer typography**: no more UPPERCASE titles and weights
  lowered to 400/500, with tabular numbers.
- **Square buttons** with rounded corners (no more pill), also in the
  commit.
- The **commit input** is identical to the AI chat's: no resize, with the
  border that appears on focus and the buttons aligned to the right.
- **Direct hover**, no transitions, so the cursor responds instantly.

### Layout (splits)
- Panels now **truly split**: when you drop a tab on an edge
  (top / bottom / left / right) a **new group** is created with its
  own tab bar, like in VS Code. They can be **nested** without limit.
- The separator between groups shows **two borders** (one per leaf, same style
  as the rest of the panels) with the resize handle in the middle, just like the
  separation between slots.
- Each split saves its **ratio**: the size is preserved when reloading the app.
- Old **split-content** splits (`splitDir`) migrate on their own to
  real groups when the app opens.
- An **empty** group shows a **Close slot** button that closes it (collapses
  the split into the sibling group or closes the whole slot).

### Status bar (UI)
- The **hover** of all buttons/chips was **unified**: square with rounded
  corners (small radius, not a pill), same height, and `--color-hover` color,
  both for the left ones (LSP, problems, git, encoding, extensions)
  and the right ones (panel toggles, notifications, and settings).

### Account (UI)
- The **email verification code** is now entered in an input with
  **animated slots** (`CodeSlots`, from React Bits): the digits land one by
  one, an error **drains and clears** the slots, and success merges them with a
  check. It verifies only when the 6 digits are complete.

### AI chat (UI)
- The **thinking effort** selector opens a **slideable bar**
  (extracted from the PromptBar component) in a custom menu, instead of the
  contextual options menu. On reaching the **maximum step**, the input lights up with
  an accent wash and **sparks** that rise (more intense while typing).

### AI chat — Skills (UI)
- The **skills and history views** are no longer a toggle: they are their
  own views inside the chat panel, each with its **back button** (animated)
  in the header and its own title (**Skills** / **History**). Opening one closes
  the other from any path (header, command, or menu).
- **The tab follows the panel title**: when moving the chat to another zone, the tab
  takes the dynamic title that the panel publishes (e.g. **Skills**) instead of a
  fixed label.
- **Skills panel redesign**: action bar on top (**New** with
  icon and **Reload**, which becomes **Close** when the form opens); the
  form appears below when pressing **New** and the list stays at the bottom. The
  form and the log **collapse/expand by animating the height**, so the
  content moves smoothly and without jumps; the fields' entry is
  **staggered (350ms)** and the reverse exit is **150ms**.
- **Explorer-style rows**: a larger origin pill (it wraps if the
  text is long) and row hover that contains the action buttons. The inputs
  live on a container with the **theme surface** and use the **theme
  bg** (nothing hardcoded), with no borders and no resize on the instructions.
- **Counter** in natural language ("You have N skills") and **confirmation
  when deleting** through the **global modal system**.

### Tools (types)
- Tools are grouped by **Families → Types** in Settings → Chat →
  Tools: **Environment** (Files, Code, System, Browser, Skills,
  Utilities) and **Agentic** (Subagents).
- Each tool declares its `type`; there is **no hardcoded union** anymore. The catalog
  is **extensible**: a `.sef` extension can contribute its own
  **pack/family** and its types (`family`/`type` in the manifest).
- Toggle per **group** (turn a whole type on/off) in addition to the per-tool toggle.
- Each tool's **own guidance** (`prompt.ts`) is now injected into the system prompt
  (`Guidance:` per tool). Before it was dead: only the `description` was used.

### Agents (UI)
- **Modes and subagents were unified** into a single concept: **Agents**, with
  two tabs in Settings → Chat → **Agents**: **Primary** (what used to be
  "modes", the chat's active agent) and **Subagents** (reusable).
- Each agent has its own **prompt, permissions, tools, and model**; the
  model **inherits the chat's** by default (`inherit`, like the CLI).
- Subagents are invoked with the **`task`** tool or by typing
  **`@name <task>`** in the chat input. Primary agents declare which
  subagents they can use (the built-in modes see all).
- They are stored in `.scrakk/agents/primary.json` and `.scrakk/agents/subagents.json`
  (user and project). On first launch a primary **Wizard** and
  an **Explorer** subagent (read-only) are created using the system itself, not builtins.
- `modes.json` migrates on its own to `primary.json`.
- **The subagent is seen in a modal**: `@name <task>` (and clicking the `task`
  card) opens an **overlay-less modal** (`plain` variant of the global
  modal system) mounted **inside the chat panel**, with the subagent's **live
  transcript** (content, reasoning, and tool calls) reusing the chat
  components, **with no input** (a subagent receives no messages). While it is
  open, the main chat input is **locked** (state `locked`).
- **Tool calls** arrive **live**: the main process emits them while the
  model is writing them (before, only when the stream ended), so the card appears in
  real time and not only when the response is cut off.
- The `task` tool has a **custom card** (shimmer while it runs): when it finishes,
  **clicking the card** opens that modal; there is only one at a time.

### Servers (LSP)
- **Live installation progress**: when installing a language server from
  Settings, the button that triggers the action is wrapped with an **animated border**
  that travels along its four sides while it runs, and the **tooltip** shows the phase
  (preparing, downloading, installing, extracting). When the release publishes
  `content-length`, the **real percentage** is also shown (`Downloading… 42%`).
- GitHub release downloads are **streamed in chunks** and report
  bytes/percentage from the main process; before the whole buffer was downloaded into
  memory and with no notice. Installs via **npm/go/gem/dotnet** show their
  last output line, without inventing a percentage they do not know.
- **Unified feedback in the zone**: restarting, toggling, and installing use
  the same loading button; the list's initial load uses the zone's bar.
  Each operation stays visible for **at least 250 ms** even if it responds
  instantly (avoids flicker) and the result notice appears after that
  minimum.
- The loading button becomes a **reusable UI kit piece**
  (`LoadingButton`, with variants and sizes like `IconButton`), available for
  any button in the app and with the theme color.

### Settings (UI)
- **Settings → Servers (LSP)**: each server's rows dropped the
  *card with pills* shape (status, origin, and extensions were in pills) for a
  **single surface with flat rows**, in the style of Appearance and Skills: the
  **status is a colored dot + text**, the origin and extensions are in
  **muted text** (no background), and the rows have **hover** instead of a per-card
  border. The buttons go from pill to **input radius** and **keep the
  animated loader** (`LoadingButton`), now with a radius configurable per context
  (`--loading-border-radius`).
- **Settings nav**: **Servers** and **Highlighting** become **children of
  Editor** (before, Servers was top-level and Highlighting hung from
  Servers), so the hierarchy reflects that they are editor settings.
- **Editor → Highlighting (Source)**: the change now **applies instantly** to
  the open file. The setting existed and was saved, but the Innerta engine
  **did not listen** to its event (`highlight-source-changed`): it was only noticed
  when the file was reopened. The section also shows a **live state** (effective
  mode + LSP / tree-sitter / TextMate tokens) to be able to **verify**
  who is painting, next to the token inspector.
- **"Back to top" button** in the Settings content: it appears when scrolling down with a
  **150ms** animation (fade + slide) and scrolls the content **smoothly**;
  it respects `prefers-reduced-motion` (direct jump) and when changing
  section the content returns to the top.

### i18n — Internationalization (UI)
- **Own typed engine**: `t()` with interpolation (`{name}`), plurals
  (`count` → `.one`/`.other`), and fallback to the base language. No runtime
  translation: keys are resolved against static catalogs and a typo in `t('...')` does not
  compile (the `MessageKey` union is derived from the base catalog).
- **Spanish is the base** (`es`) and **English** is translated once and
  stored. Each key remembers the **hash of the base text**: if the `es` did not
  change it is never re-translated; if it changed, it becomes `stale`.
- **Language selector** in Settings → Appearance (`System` / `Spanish` /
  `English`), persisted and applied instantly (including `<html lang>`).
  When changed, the **entire IDE** re-renders with the new language
  (without remounting panels: no state is lost).
- **Interface migrated to the catalog**: top menu, status bar, activity
  bar, panel and tab titles, Settings (nav + sections), panels
  (Explorer, Git, Problems, Notes, Social, Chat…), onboarding, and dialogs.
  Panel titles and registry labels are resolved with
  *getters* (`get title() { return t(...) }`), so they follow the language without touching
  the consumers.
- **`tools/i18n.mjs`** (`npm run i18n`): `--status`, `--extract`, `--sync`,
  `--translate <lang>` (**DeepL** engine by default; local `argos` as an
  alternative), `--review`, `--approve`, `--check [--strict]`, and `--doctor`.
  It includes a **curated glossary** (exact match) for short strings that
  the engine cannot disambiguate without context, and **`{placeholders}` protection** with
  a later check.
- **Release flow**: `release.yml` runs `--check --strict` and **blocks** the
  package if there are missing, outdated, or unreviewed keys; `ci.yml` warns
  without blocking while the migration progresses.

### Social Chat — shared files
- **Share files as content, not as an attachment**: a file goes as a
  `codefile` type message (new `kind` column in `messages`); the `body`
  carries a **one-line JSON envelope** with the metadata (`name`, `lang`,
  `lines`, `size`, `sha`, `key`, `expiresAt`) and the content lives in **R2**
  (private bucket `scrakk-chat-files`). Normal messages stay intact
  (4000 chars, same CHECK).
- **Gatekeeper**: the R2 credentials **do not travel in the app**. Everything goes through
  the `social-file` Edge Function, which validates JWT, friendship, **limits** (10,000
  lines / 512 KB), **quota**, and only then uploads or signs a **short-lived URL**
  for the receiver (with `sha256` verification on download).
- **Deletable quota + expiry**: 15 live files per conversation; deleting a
  file frees quota instantly and after **60 days** the R2 lifecycle
  deletes them on its own (the card becomes "expired").
- **The gatekeeper does the INSERT**: the Edge Function validates, uploads to R2, **and
  creates the message**, so the quota counts real files and the **DB rate
  limit** applies even if the client is modified (before you could upload without a
  message → orphan objects with no rate cap). If the INSERT fails, it deletes the
  object. The `sha256` and the lines are computed by the **server**, not the client.
- **Envelope validated in the DB**: a CHECK requires that a `codefile` message carries a
  valid JSON envelope (`v`, `kind`, `name`, `key`) — not even with direct SQL can
  a junk file slip through. The `body` of normal messages stays capped at 4000.
- **Card in the message**: header with the **icon of the active fileIcons theme**
  (nothing hardcoded), name, lines, size, and expiry; the body downloads the
  content on demand and paints it highlighted.
- **Real rate limit**: the `messages_rate_limit` trigger was applied (7 in 5 s),
  which until now was written but **not applied** (the client's `msg_ratelimited`
  was dead code).
- **Composer**: Discord-style character counter (it shows what is left and
  warns when going over the cap, blocking send) and the emoji button now uses
  a `ProductIcon` (`emoji`) instead of the hardcoded glyph.
- **Share from the context menu**: "Share to Social" option in the
  **Explorer** and in the **right-click of file tabs**, via the
  global context menu API.
- **Drag & drop to the input**: drag a **tab** or an **Explorer file**
  straight to the Social panel composer. It is added as a **linked file**
  with its mini-card (pack icon + name) next to the input, like attachments;
  on send, each one is shared as a `codefile` message. The tab uses the layout's
  pointer drag (new *drop sink*, without touching the tab resolver) and the
  Explorer the native resource drag.

### Social Chat — performance (lag with long conversations)
- **Each message's `memo` works again**: the sender's profile was
  built as a **new object on every render**, so the `memo` comparison
  always failed and **all** messages re-rendered even if only
  a friend's presence had changed. Now the profile is cached **per
  sender** and keeps its identity as long as its data does not change.
- **The message list is memoized** and everything derived is computed in a
  single pass: the name/avatar `Map`s are no longer rebuilt on every render.
- **Cached date formatters**: `toLocaleTimeString` /
  `toLocaleDateString` build a new `Intl.DateTimeFormat` on every call,
  and they were called once or twice **per message and per render** (with an extra
  `new Date()` to detect "today"/"yesterday"). Now the formatter and the result are
  cached per locale and per timestamp.
- **Realtime is the source of truth, not the refetch**: each presence event
  arrived **with no data** and the renderer responded with a full refetch (friends +
  requests + presence). Now the event **brings the row** and only
  that entry is updated: a heartbeat is no longer 3 queries or a render of the whole panel.
- **The Realtime subscription does not re-attach on its own**: it depended on `friends`,
  which changed identity on every poll, so the 7 channels unsubscribed and
  resubscribed every 15s (with a blind window where events were lost).
  Now it attaches once and always reads the fresh value via ref.
- **State does not change identity if it does not change**: `friends`, `requests`, and the
  presence map compare content before being replaced, so a poll
  that brings no differences no longer invalidates the list's `memo`s.
- **Less polling**: safety refreshes dropped from **3s to 20s**
  (messages), **10s to 60s** (presence), and **15s to 120s** (friends/requests).
  The channel already covers INSERT, UPDATE, and DELETE of `messages`, so the safety
  net still exists but without paying six times a minute.
- **Publish presence only if it changes**: opening or switching files in the editor
  republished presence even if the content was identical (a write and a
  Realtime event for all friends for every file touched). Now it
  compares before writing; the 45s heartbeat still refreshes presence.
- **The heartbeat itself is ignored**: one's own presence comes back through the same channel
  (you also match the "friends" policy) and caused a re-render every
  45s. The local state is already the source of truth, so it is discarded.
- **Typing working**: the "is typing" indicator used a
  `broadcast` channel (`typing:<uid>`) and **had no policies** in `realtime.messages`,
  so with Realtime authorization the `.subscribe()` connected but the
  event **never arrived, with no visible error**. The two missing policies were
  applied (send only to a friend's channel, read only your own).

### Editor — per-format viewers (fileHandlers)
- **Per-format exception registry**: each one lives in **its own folder**
  (like the AI tools) and declares what it catches + how it is shown:
  `match` (extension/glob/languageId/scheme) and `mode` (`view` = piece,
  `text` = editor, `both` = intermediate). **Nothing hardcoded in the editor**: the
  central area queries the registry and, if there is no match, opens with Innerta.
- **Included viewers**: **image** (`view`), **SVG** (`both`), and **markdown**
  (`both`). Markdown is the intermediate case: it is shown rendered or edited.
  `both` formats open **straight in viewer mode**.
- **Toggle viewer ⇄ editor**: in the **tab's right-click menu**
  ("View as text" / "View as viewer", with the eye icon), next to
  "Share to Social". It only appears on formats that support both modes;
  the preference is saved **per file**.
- **Viewer toolbar**: each handler can declare its **actions** (`actions[]`)
  and they are drawn above the content (with the pack icons, never glyphs).
  None of the three included viewers use them: the bar does not appear.
- **Registration at startup**: the built-in handlers are ready before the
  first render (`main.tsx`), so they do not depend on the panel mount order.
- **Binary read** (`fs:read-binary`): the image viewers receive
  `base64` + mime and are painted as `data:` (the renderer's CSP does not allow
  `file:`). The Innerta engine stays mounted and hidden while the viewer is in charge,
  so undo/scroll is not lost when coming back.
- **Viewer background**: it uses the theme's **`surface`** variable (not `bg`), so
  it looks like the rest of the chrome's surfaces and not like the app's background.
- **Virtual tabs** (`scrakk-view://<handlerId>/<payload>`): the same viewer
  serves as a tab over content that is not a file (for example the card of
  a chat `codefile`). It is resolved **by id**, travels through the same file
  bus, and does not touch the disk.
- **`contributes.fileHandlers`**: an extension contributes its own formats to the
  **same registry** as the built-ins (a second door to the same store), with
  ownership for a clean uninstall. The viewer is resolved by dynamic import
  of the package, never with a direct `ComponentType`.

### Fixes
- **The welcome screen showed an old version in Announcements**: the remote release
  won **always** as long as it brought notes, without comparing versions, so while
  the published release was still the previous one, the panel showed that one even if
  the repo already had the new changelog. Now **the newest** of the
  two is chosen (comparing by segments: `0.1.10` > `0.1.9`), and "seen" is marked
  on the announcement that was actually shown. Useful side effect: it is no longer
  necessary to publish the release to see the announcements of a new version.
- **Text messages could not be sent in the Social chat**: migration
  `0022` added the `messages_codefile_body_check` CHECK, which calls
  `is_codefile_body(body)`, and right after **revoked EXECUTE** from
  `authenticated`. PostgreSQL requires EXECUTE on the functions referenced
  by a CHECK **for the role doing the INSERT, even if the branch is not evaluated**,
  so **every** text message died with
  `42501 permission denied for function is_codefile_body`. **Shared
  files kept working** because the Edge Function inserts them with
  `service_role`, which did have the permission — hence the failure seemed
  arbitrary. EXECUTE was granted to `authenticated` (migration
  `0024_codefile_body_execute.sql`); the function is `IMMUTABLE` and is not
  `SECURITY DEFINER`, so the CHECK still prevents invalid envelopes.
- **The send error blamed the user for a server failure**:
  `42501` is the generic permission-denied code, and the mapping showed
  *"You can only write to your friends"* in any case. A database
  privilege problem looked like *"you're not friends"* (and logging back in
  changed nothing, because the session was valid). Now infrastructure
  failures have their own message ("Internal server error") and are
  logged with the raw text, a missing session is distinguished, and the
  friendship message only appears if the error talks about policies.
- **A Supabase client could end up with no session and still be used**: `setSession`
  does not reject when it fails, it returns `{ error }`, and it was ignored; login
  saved new tokens without invalidating the per-account cached client. Now
  login invalidates it, and `getClientFor` never returns a client with no session
  (it injects the saved tokens into the same client so as not to lose the Realtime
  channels, and if there is no session it returns `null` so the UI asks you to sign in
  instead of pretending you are inside).
- **Format viewers were not mounting**: the dispatcher was in the
  `editor` panel (the classic single-view one), but the content of a file
  tab is mounted by another component. Result: a PNG always fell back to Innerta
  even if the registry, the handlers, and the bundle were perfect — and the
  viewer⇄editor toggle did not appear in the menu (for a `view` format there is no
  text mode to toggle, so only "Share to Social" showed). Now
  **`FileTabView`** queries the registry, and for a format with a viewer the
  Innerta session is not even attached (it would read bytes as text).
- **WASM crash when opening a viewer**: hiding the engine host left it
  measuring 0×0, and the module **aborts** on any zero dimension (it is
  compiled without exception catching, so it does not throw a catchable exception:
  it takes down the whole tab). Now the engine **skips** `setBounds` while the host
  has no area and the `ResizeObserver` reapplies it when it comes back.
- **Markdown viewer without breathing room**: `.view` and the document column were in the
  same element, so the padding competed with the centering and the text
  stuck to the edges. Now the scroller and the column are separate.
- **Emoji: 2-cell width and sharp**: the layout was `x = column × width`
  pure, so an emoji advanced **one** cell and overlapped with its neighbor (and the
  caret was wrong). Now the layout is **width-aware** (supplementary-plane
  emoji and wide CJK = 2 cells; ZWJ/selectors/combining = 0) and
  the caret, the hit-test, the ranges, and the line width respect it. Also
  the color bitmap is loaded at **3× and downscaled with a linear filter**: blurry
  emoji are gone.
- **Color emoji (system ones)**: the engine cannot get them out of FreeType
  in WASM (system emoji are color bitmaps and their strike is 136 px),
  so the **host rasterizes them** with the browser (Noto Color Emoji / Apple
  Color Emoji / Segoe UI Emoji) and the engine paints them as a glyph provided by
  the host — the same split as tokens, underlines, or indentation. If the canvas
  draws nothing, nothing is pushed: the embedded monochrome fallback remains.
- **Emoji and symbols were not visible**: the engine's fallback font
  chain pointed to system paths, which **do not exist in the web build**, so it
  was empty and everything the editor font does not have (symbols, supplementary-plane
  emoji) was drawn with 0 advance. Now two trimmed fonts are **embedded**
  (BMP symbols and astral emoji) and the atlas uses them as fallback:
  `😀 🚀 👍 ❤ ✔ ⚠` and the box drawings show up.
- **Editor in several panels**: when opening a file in a second panel, the
  editor was **empty** because the panels shared a single WASM module and
  canvas. Now **each panel mounts its own isolated engine**.
- **Moving a file tab between panels**: the engine could stay **not
  loaded** (the module wait never resolved and the source panel
  accumulated engines). Now the wait always ends and the panel that is left
  **empty frees its engine** (WASM + GL context).
- **Welcome → Tips**: the dot indicator (which marks which tip
  you are on) was squashed and ended up **overlapping** when the panel had no width.
  Now it does not shrink, it wraps if needed and, if it still does not fit, it
  **collapses to `n/total`**.
- **Welcome → Actions**: in very narrow panels, the 3 top cards
  (*New file*, *Open file*, *Open folder*) become **plain text**,
  with no icon or card, with the shortcut aligned to the right.
- **AI chat**: the **tool icons** now use the same color as the
  tool text (`--color-text-muted`); before they inherited the chat color and
  looked brighter.
- **Explorer**: the **rename/create** file input no longer uses the accent
  border or a large radius; now it **has no border** (just background), a small radius
  and no outline. Its text (and the placeholder) uses the row size
  (`--text-xs`, 12px); before the create one inherited a larger size.
- **Breadcrumb, active tab, and editor (Innerta)**: all three use the same background
  as the activity bars (`--activitybar-bg`/surface): the breadcrumb stopped being
  transparent, the active tab dropped the hover tint and the editor buffer
  now matches the chrome.
- **Welcome → Announcements**: the "what's new" dot now also detects the
  **local changelog**: if the newest `changelog-x.x.x.md` exceeds the app
  version, the badge appears (without depending on the remote release), and when opening
  Announcements it is marked as seen.
- **Tabs**: the strip scrolls horizontally with the mouse **wheel** when
  the tabs overflow (before only with a trackpad or Shift+wheel).
- **Tabs / layout**: an update loop (*"Maximum update depth
  exceeded"*) when mounting **many panels** was fixed: the strip's combined ref changed
  identity on every render and React did detach/attach calling `setState`
  in a loop. Now it is stable.
- **Development — hot reload (Vite HMR)**: in isolated cases, a *full reload* of the
  dev server (for example when the preload is rebuilt or dependencies are
  re-optimized) opened the project in the **system browser** with
  `localhost` and left the app window **frozen**. The global `will-navigate`
  handler sent even the dev server's own URL to `openExternal`;
  now navigations to the dev server (HMR reload and internal links) are
  resolved **inside** the window and only external URLs go out to the browser.
- **Settings → Chat → Providers**: the list icons were **stuck
  at the top** (more air below than above); now they are **centered**. Also the
  **models.dev logos** are painted as a **silhouette with the theme color**
  (before the `<img>` did not inherit the color and they came out black), with the same
  mask pattern as the welcome logo.
