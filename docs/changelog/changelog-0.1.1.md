---
title: "Changelog 0.1.1"
group: changelog
order: 10
summary: "Relevant changes in Scrakk Studio. The welcome screen shows the first entry (the newest) in the Announcements section, so the newest goes on top."
---
# Changelog

Relevant changes in Scrakk Studio. The **welcome screen** shows the first entry
(the newest) in the **Announcements** section, so the newest goes on top.

Format: `## <version> — <title>` and bullets per area. Entries already published
are not edited. The file goes per version: `docs/changelog/changelog-<x.y.z>.md`.

---

## 0.1.1 — AI chat: more control

### Slash commands (`/command`)
- **Global command API** (`services/slash-commands`): registers, lists and runs
  commands from any input; each command carries its logic in its own folder.
- The AI chat has its command folder (`features/chat/commands/`), with the
  functionality separated into `logic.ts` (the same pattern as the tools).
- **`/variants`**: chooses the reasoning effort/variant of the active model. With
  no argument it opens a picker; with an argument it applies directly; `auto`
  clears it.
- A command can show **its own UI** (modal/menu) and ask the chat not to add a text
  message.
- **Autocomplete**: typing `/` shows a floating panel above the input with the
  available commands.

### Skills (Agent Skills standard)
- Skill system: folders with a `SKILL.md` (frontmatter `name` + `description`) in
  `.scrakk/skills` (project and user).
- Real install/delete from the app (writes `SKILL.md` to disk).
- **Two new tools**: `list_skills` (lists the available ones) and `skill` (loads
  one's body by name, with progressive disclosure).
- The `SKILL.md` parser resolves **YAML block scalars** (`>` folded and `|`
  literal, with `-`/`+` chomping), so multi-line descriptions are read well and the
  skills self-trigger.
- **Skills view inside the chat** (replaces the content, like history) and a
  **`skills: N`** button below the input.
- **Public chat API** to insert content/skills from any panel or extension.
- `.sef` packages can bundle skills (the `skills` extension kind).

### New tools
- **`web_search`**: searches the web (query + allowed domains) and returns title,
  URL and snippet.
- **`web_fetch`**: fetches a URL and returns it as markdown, with SSRF protection
  (blocks private, link-local and metadata ranges) and truncation of long pages.
- They run in the main process (no CORS).

### Settings → Chat
- New **Chat section**, with children:
  - **Providers** (replaces the providers modal).
  - **Tools**: turn each tool on/off.
  - **Skills**: turn each skill on/off.
  - **Modes**: create your own modes and choose which tools each one has.
  - **Permissions**: allow/ask/deny rules, on all modes or specific ones.
- Disabled tools **do not reach the model**: they appear neither in the prompt nor
  in the request.
- The section pickers use the app's **global context menu** (no native `<select>`)
  with the proicons chevron.

### Providers (models.dev)
- The hardcoded provider list was removed and the catalogue now comes from
  **models.dev**, with a refresh **on every open** and a disk cache.
- It includes real models, **logos**, costs/limits and reasoning metadata.
- The model field suggests the catalogue ids.
- DeepSeek fix: default model `deepseek-flash` and valid variants.

### AI chat (UI)
- The **model picker** and the **mode** moved below the input, next to the
  `skills: N` button.
- **Reasoning variant button** next to the model picker (same look and chevron);
  it opens a menu with the model variants provided by models.dev.
- **Tool confirmation** is no longer a centered modal: it is now a panel anchored
  **above the input**, without the arguments JSON (only reason, risk and details).
  Esc or clicking outside rejects.
- **Command picker** (`/`): floating panel above the input, wider and with each
  command on one line.
- Tool calls are shown **after** the text (the real stream order).
- Messages with **tool calls** no longer show the **copy** / **regenerate** bar: it
  only appears on the final text reply.
- Panel title **`Chat: <name>`**, updated by the title tool.
- The tool cards' text **cannot be selected**.
- Tool icons centered.
- **Responsive** control row: narrowing the panel hides **skills**, **thought** and
  **model** from the center outward, leaving them in a **3-dot button** (⋯); the
  mode stays visible.
- The **mode** label is clickable and opens the menu with all the modes (built-in
  and custom).

### Notifications
- The close button uses the **X proicon** with a **rounded-square hover** (not
  circular).
- The **bottom line** is dynamic by severity (red error, amber warning, green
  success, accent info) and **empties according to the time left** before it closes
  on its own.
- **Custom time** per notification (`timeoutMs`; `0` = persistent) with defaults by
  severity (info/success 6s, warn 8s, error 10s). **LSP** notifications now carry
  their explicit time.

### Permissions
- **CLI modes**: `default`, `plan`, `acceptEdits`, `auto`, `dontAsk` and
  `bypassPermissions` (with the `auto_edit`/`all_allow` aliases), each with its
  effects: `acceptEdits` auto-approves edits, `bypassPermissions` approves
  everything, `dontAsk` denies instead of asking and `plan` is read-only.
- **Custom modes**: created from Settings → Chat → Modes starting from a built-in
  mode and adjusting edits, shell, confirmations and **which tools stay enabled in
  each mode**. They are stored in `.scrakk/modes.json`.
- **Mode-scoped rules**: a rule can apply only to certain modes (e.g. deny
  `git push` only in Plan), on top of the global ones.
- **Permission rules** with the CLI/Claude DSL: `Bash(npm run *)`, `Bash(git
  push:*)`, `Read(src/**)`, `Edit(**)`, `Grep(**/.env)`,
  `WebFetch(domain:example.com)`, `WebSearch`, `MCPTool(...)` and a tool without
  parentheses.
- Precedence **deny > ask > allow**, path globs (`*` does not cross `/`, `**`
  does), domain matching and `Read` rules that also govern `Grep`.
- They are loaded from **`.scrakk/permissions.json`** (project and user, the
  project wins) with `permissions.allow/ask/deny/defaultMode`.
- **Permissions screen** in Settings → Chat: edits the allow / ask / deny lists with
  their mode scope and the initial mode, and applies it instantly.
- The **`auto`** mode runs with deterministic fast-paths (reads and edits are
  approved, routine shell commands like `ls`, `git status`, `npm test`; doubtful
  ones ask for confirmation). The LLM classifier is still pending.

### Streaming
- The **total** 3-minute timeout (which cut long generations) was replaced by a
  2-minute **inactivity** timeout + a connection one.
- Specific error messages: inactivity, connection, or user interruption.

### Performance (so a slow panel does not stall everything)
- **Stream grouped per frame**: the chat stops re-rendering per token; the deltas
  are gathered and applied at most once per frame.
- **No markdown during the stream**: while the AI writes, plain text is shown and
  the markdown is parsed once when the round closes (the Prism parsing was the most
  expensive part).
- **Message list** with `content-visibility`: off-screen messages are not painted.
- **Idle persistence**: the history is serialized when the thread is free, not
  during the stream.
- **Panel profile**: each panel is measured (React Profiler); if it stays slow, its
  animations are paused (`data-panel-slow`) and it recovers on its own.
- **Switching chats** is a transition: the click responds instantly even if the
  session's history is large.

### Direct messages (social chat)
- **Load on scroll**: opening a chat fetches the last page, and earlier ones are
  requested **only when you scroll up manually** (before they were chained until
  the whole history was exhausted).
- **Position on open**: it goes to the **last message**; if you left recently and
  were reading further up, it returns to that area (scroll memory per conversation,
  10 minutes).
- **Off-screen messages are not painted** (`content-visibility`).
- Opening a chat clears the previous one instantly and shows the loading
  placeholder, instead of leaving the previous friend's messages.

### Dragging files and folders to tabs
- The **explorer**'s files and folders can be dropped on any tab area (the tab drag
  system and the explorer's native one now coexist): a file opens as a **tab in the
  area where it is dropped**, and a folder creates an **explorer tab** over that
  folder.
- It uses the **same indicator** (the little line) as the tab drag.
- The explorer's internal drag (moving files to a folder) stays the same.

### Social chat — emojis, slowmode and counter
- **Emoji picker** in the composer (search, categories and recents); a message that
  is **only emojis** is enlarged.
- **Slowmode** Discord style: 5 messages / 5 s with a friendly phrase when you go
  over; a looser backstop stays in the database
  (`docs/backend/0018_message_rate_limit.sql`).
- **Counter** on the ActivityBar's Social button (unread + requests).

### Editor — go to definition
- **Ctrl/Cmd + hover** underlines the symbol with a flat line (the same decorations
  system) **instantly** (no timers); **Ctrl/Cmd + click** goes to the definition.
- Layered resolution: `locals.scm` → `tags.scm` (classes/functions) → **LSP symbols**
  (prefetched once per file, so the underline is synchronous) →
  `textDocument/definition` (only if needed, and for the click).
- Editor **cursor**: **I-beam** over the text and **arrow** over the gutter (numbers,
  chevrons, bookmark); with Ctrl over a resolvable symbol it becomes a **hand**. The
  engine exposes `GetInnertaTextXOffset()` (a new WASM export) to know where the text
  starts.
- **"Go to definition"** was removed from the editor's context menu; **F12** stays.

### Editor — new languages
- **New grammars embedded in the engine**: **Prisma**, **HCL**, **Terraform** (its
  own dialect, not HCL's), **CMake**, **Svelte**, **SCSS** and **Less**, each with its
  queries (highlighting, folding, indentation and injections; Svelte also with
  `locals`).
- File detection no longer sends `.scss` and `.less` to the generic CSS: each one
  uses its grammar.
- The already-existing LSP servers keep applying (Terraform, CMake, Svelte, Prisma;
  the CSS one covers SCSS/LESS).

### Updates
- The IDE detects releases **live**: the workflow registers them in Supabase and the
  app receives them over **Realtime** (WebSocket), no polling.
- A global notice when there is a new version, with **automatic download** and a
  button to **restart and update** (it closes and reopens on its own).
- **Settings → About**: version, build, a **Check for updates** button and download
  progress.
- The **welcome** shows the latest version's announcement (the release's real notes)
  with a dot in **Announcements** when there is unseen news.
- The release notes come from `docs/changelog/changelog-<version>.md`, so GitHub and
  the IDE show the same.

### Welcome
- The **Announcements** section reads the repo's changelog: it shows the latest
  version with a summary and, on click, expands with the full notes.
- A **news** dot on the Announcements button when there is a new unseen version; it
  is marked as seen when opened.
- The **About** version comes from `package.json` (no longer written by hand).
- The changelog becomes **per version**: `docs/changelog/changelog-<x.y.z>.md`.

### Extensions
- **`tools`** kind: AI tools contributed by a `.sef`, with their `visual/` folder and
  execution by command in the Extension Host.
- **`skills`** kind: skill packs inside a `.sef`.
- Documentation: `docs/chat/slash-commands.md`, `docs/chat/permissions.md`,
  `docs/extensions/tools.md`, `docs/extensions/skills.md`.

### `.scrakk` API
- Global API for the `.scrakk` folder (user and project): list, read, write, delete,
  create and watch files, jailed to the root.
- The skills use it and it stays available for whatever comes.

### Disabled
- The old web tools were retired (`open_browser`, `view_web`, `list_browser_tabs`,
  `navigate_web`): they did not work well.

### Fixes
- **Deleting files**: the confirmation modal stayed at "Deleting…" when deleting a
  second file (the `busy` state survived between opens) and would not let it close.
  Now it mounts per open and delete errors are shown in the modal.
- **Social chat**: the message text could not be selected. Now it can be selected
  and copied (the rest of the UI stays unselectable).
- **Social / Realtime**: with an expired token (for example, after leaving the app
  open for hours), the channel reconnected every 3s with no backoff: the terminal
  filled with JWT errors and the panel flickered. Now it reconnects with **backoff**
  (2s → 30s), cleans the channels on recreate, drops the client with an invalid
  session to rebuild it, and the panel groups Realtime refreshes instead of
  reloading on every event.
- **Old Intel GPU on Linux**: the app detects it on its own (the generation is read
  from `/sys`) and, on Gen7 or earlier, uses the correct VA-API driver (**i965**) and
  avoids **Vulkan** (which does not exist on that generation). On modern GPUs nothing
  changes (no performance is lost).
- **Content that flickers or freezes on KDE Wayland**: it is a **KWin** bug (buffer
  ring / explicit sync; KDE #506731 and #510747) that affects **every**
  Chromium/Electron app (not Firefox). On KDE + Wayland the app runs through
  **XWayland** (`--ozone-platform=x11`) to dodge it; it is disabled with
  `SCRAKK_PERF_KDE_X11=0`.
- **Editor zoom** (`Ctrl +`, `Ctrl -`, `Ctrl + wheel`): it did not change the text
  size — only the "space dots" grew. The handler modified the theme before passing
  it to the engine, which saw it as "no changes" and dropped the new font size. Now
  it scales text, gutter, minimap and dots together.
- **Development**: the **About** section threw `ReferenceError: __BUILD_ID__ is not
  defined` when opening it in dev mode (the build stamp was only defined in the
  production profile). Now it is defined in both profiles.
- **Packaged app on Linux**: the package came out without the `node-pty` binary
  (`pty.node`) and the app would not start ("Failed to load native module:
  pty.node"). The build now compiles `node-pty` on Linux and fails if the binary is
  not there.
- **Terminal**: when mounting the terminal a 0×0 resize was sent and node-pty threw
  "resizing must be done using positive cols and rows". Now it is ignored and the
  PTY starts at 80×24 if there are no measurements yet.
- **GPU on Linux (AMD or restricted sandbox)**: the GPU process crashed (SIGSEGV,
  "GPU process exited unexpectedly") and the window went blank. Now it starts
  without the GPU sandbox and with **SwiftShader** as a WebGL fallback; manual
  escape: `SCRAKK_GPU=auto|gl|swiftshader|vulkan`.

### Misc
- A pass of texts and comments to **neutral Spanish** across the whole repo.
