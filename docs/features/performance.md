---
title: "Performance"
group: features
order: 310
summary: "Performance tooling: the perf flags and env switches, Settings → Performance, panel profiling with data-panel-slow, and the baseline harness."
---
# Performance

Performance work has two layers. A **user layer** (`@services/perf` and
Settings → Performance) exposes toggles and live memory readings. A **developer
layer** (`@shared/perf`, `core/perf`, `main/perf` and `tools/perf`) provides
flags, timing, panel profiling and a baseline harness.

## The user toggles

`@services/perf` is a small persisted store:

| Toggle | Storage key | Default |
|---|---|---|
| Modo PC mala (low-end) | `scrakk:low-end-mode` | off |
| Animación gelatinosa de nodos | `scrakk:term-nodes-jelly` | on |

`isLowEndMode()` / `setLowEndMode()` / `subscribeLowEndMode()` handle the first;
`isNodeJellyEnabled()` / `setNodeJellyEnabled()` / `subscribeNodeJelly()` handle
the second. `TerminalNodesView` reads the jelly flag to animate (or not)
terminal node groups.

## Settings → Performance

The section is registered in `features/settings/sections/index.ts` as
`section('performance', 'settings.nav.performance', 'chart', PerformanceSection)`.
`PerformanceSection` renders two `ToggleSwitch` controls (low-end and jelly) and
a read-only memory row that refreshes every 2000 ms with:

- `totalEditorHeapBytes()` — the sum of the live panel engines' real WASM heaps
  (`engine.heapBytes()`).
- `backgroundModuleCount()` — how many panel engines are alive
  (`listPaneEngines().length`). With one engine per panel, "background modules"
  no longer applies and this is the closest metric.

Toggling low-end also calls `applyBackgroundCapNow()`.

## Panel profiling

Every panel mounted by `PanelHost` is wrapped in `PanelProfiler`
(`core/perf/panelHealth.tsx`), which uses React's `<Profiler>`:

- It keeps a moving window of `WINDOW = 6` render durations per panel.
- A panel is marked **slow** when the window average exceeds `SLOW_AVG_MS = 50`,
  and recovers below `RECOVER_AVG_MS = 20`.
- Marking sets the `data-panel-slow` attribute **directly on the DOM** (not via
  `setState`, so measuring does not trigger the render it is measuring).
  `panelHealth.module.css` pauses the panel's animations under that attribute.
- `getPanelHealth()` exposes the metrics for a dev overlay.

In dev, a render over 50 ms also logs `[panelPerf] <id>: render <ms>`.

## Developer flags

`@shared/perf` is the single contract product code imports. `PerfFlags` has safe
defaults; each flag is overridable from the environment as
`SCRAKK_PERF_<NAME>` (`logStartup` → `SCRAKK_PERF_LOG_STARTUP`), accepting
`1`/`true`/`yes`/`on`. `resolvePerfProfile()` returns `dev` or `prod`.

Some `PERF_DEFAULTS`:

```ts
dropConsoleInProd: true, deferUpdatesCheck: true, coalesceWatchEvents: true,
sefIoWorker: true, wasmStreamingCompile: true, compressWasm: true,
lazyModals: true, manualChunks: true, cssContain: true,
dynamicWindowBackground: true, v8CodeCache: true,
logStartup: false, logTiming: false, logLongTasks: false, wdyr: false,
fsSearchWorker: false, capMainHeap: false
```

`recordTiming` fills a ring buffer (limit 500); `measure` / `measureAsync` record
entries. In the renderer, `core/perf/measure.ts` adds `mark`, `measureBetween`,
`getLocalTimings`, `observeLongTasks` (gated by `SCRAKK_PERF_LOG_LONG_TASKS`) and
a memory sampler. In the main, `main/perf/startup.ts` marks boot phases, applies
Chromium GPU switches (`SCRAKK_GPU=auto|gl|swiftshader|vulkan`,
`SCRAKK_PERF_FORCE_GL`), registers automatic GPU fallback relaunch, samples main
memory, and registers `perf:getReport` plus `perf:mark` IPC handlers.

## The baseline harness

`tools/perf/baseline.mjs` runs without Electron, after `npm run build`. It
measures the sizes of `out/renderer` assets (with the top 30 chunks and JS/CSS
totals), `out/main`, `out/preload`, `innerta.wasm` + `innerta.js` and
`node_modules`, and greps anti-patterns (`console.log`/`debug`, `debugger`,
`TODO … perf`). It writes a stable JSON to
`.perf/baseline-<git-sha>-<timestamp>.json` and prints a summary. With `--runtime`
it also reads the newest `.perf/runtime-*.json`.

```bash
npm run build
node tools/perf/baseline.mjs           # baseline of the current build
node tools/perf/baseline.mjs --runtime # also read .perf/runtime-*.json
```

## Limits

- The **low-end toggle is not consumed by runtime code today.** `isLowEndMode` /
  `subscribeLowEndMode` have no importers besides the Settings section; the
  consumers named in the `perf.ts` comment (file sessions, semantic tokens, hover)
  do not read the flag. It persists and renders, but changes no behaviour.
- `applyBackgroundCapNow()` is an empty no-op; sessions already live in the panel
  engine, so there is nothing to evict.
- `perf:getReport` has no renderer caller and no preload exposure, so the report
  cannot be fetched from the UI. `getPanelHealth()` has no shipped overlay, and
  the palette command `Diagnosticar arranque` mentioned in `baseline.mjs` does not
  exist in the renderer.
- `capMainHeap` and `v8CodeCache` are experimental/opt-in; `capMainHeap` is off by
  default because `--js-flags` propagates to the renderer and a low cap caused V8
  OOM with several files open.

## Next steps

- [Settings](settings.md) — where the Performance section lives.
- [Terminal](terminal.md) — the node-jelly toggle applies there.
- [Status bar](status-bar.md) — the encoding chip and other indicators.
- [The editor](../editor/editor.md) — panel engines and file sessions.
