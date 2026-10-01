// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { useEffect, useRef, useState, type ComponentType, type JSX } from 'react'
import {
  getOrCreateInnertaEngine,
  getStoredEngine,
  type EditorEngine,
  type EditorEngineId
} from './engine'
import { getEditorFiles, subscribeToEditorFiles } from './editorBus'
import { lspNotifyFileChanged } from '@services/lsp'
import { readEncoded, setDetected } from '@services/encodings'
import {
  canToggleMode,
  effectiveMode,
  fileHandlerRegistry,
  registerBuiltinFileHandlers,
  subscribeToPreferredModes,
  type FileHandler,
  type FileHandlerViewProps,
  type FileViewMode
} from '@features/fileHandlers'
import { ProductIcon } from '@services/productIcons/components'
import { notify } from '@services/notifications'
import { msg } from '@core/i18n'
import styles from './EditorPanel.module.css'

/**
 * Área central — DISPATCHER de contenido.
 *
 * Cada archivo activo se resuelve contra el `fileHandlerRegistry`:
 *
 *  - si gana un handler con modo `view` → se monta SU visor (import dinámico);
 *  - si el modo es `text` (o no hay handler) → se carga en el editor Innerta,
 *    como siempre.
 *
 * El engine queda SIEMPRE montado (oculto mientras se ve una pieza): sus
 * sesiones por archivo viven en el módulo y desmontarlo perdería undo/scroll.
 * El ojo del header de la tab alterna `view` ⇄ `text` en los formatos `both`.
 */
export function EditorPanel(): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<EditorEngine | null>(null)
  const [engineId] = useState<EditorEngineId>(() => getStoredEngine())

  const [activePath, setActivePath] = useState<string | null>(() => getEditorFiles().activePath)
  const [handler, setHandler] = useState<FileHandler | null>(null)
  const [mode, setMode] = useState<FileViewMode>('text')
  const [View, setView] = useState<ComponentType<FileHandlerViewProps> | null>(null)
  const [viewContent, setViewContent] = useState<string | undefined>(undefined)

  // Los handlers built-in se registran al montar (idempotente).
  useEffect(() => {
    registerBuiltinFileHandlers()
  }, [])

  // Monta el motor en el host (una sola vez).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const engine = getOrCreateInnertaEngine()
    engineRef.current = engine
    engine.attach(host)
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  // Archivo activo + handlers registrados → handler ganador y modo efectivo.
  // También reacciona al ojo de la tab (preferencia por archivo).
  useEffect(() => {
    const resolve = (): void => {
      const next = fileHandlerRegistry.resolve(activePath ?? '')
      setHandler(next)
      setMode(effectiveMode(next, activePath ?? ''))
    }
    resolve()
    const unsubHandlers = fileHandlerRegistry.subscribe(resolve)
    const unsubModes = subscribeToPreferredModes(resolve)
    return () => {
      unsubHandlers()
      unsubModes()
    }
  }, [activePath])

  // Carga del archivo: al editor (texto) o al visor (pieza).
  useEffect(() => {
    const path = activePath

    if (mode === 'view' && handler?.load) {
      setView(null)
      setViewContent(undefined)
      let alive = true
      void handler.load().then((module) => {
        if (alive) setView(() => module.default)
      })
      // Los formatos editables (markdown, svg) además reciben su texto.
      if (handler.mode !== 'view' && path) {
        void readEncoded(path).then((res) => {
          if (alive && res.success && typeof res.text === 'string') setViewContent(res.text)
        })
      }
      return () => {
        alive = false
      }
    }

    setView(null)
    if (!path) return

    let loadingPath: string | null = null
    const load = async (target: string | null): Promise<void> => {
      const engine = engineRef.current
      if (!engine || !target || target === loadingPath) return
      loadingPath = target
      try {
        // Lectura con detección de encoding (BOM/UTF-16/Latin-1 → texto).
        const res = await readEncoded(target)
        if (!res.success || typeof res.text !== 'string' || !res.detected) return
        setDetected(target, res.text, res.detected)
        engine.loadFile(target, res.text)
        void lspNotifyFileChanged(target, res.text)
      } catch {
        // Lectura fallida: Innerta queda con su buffer actual.
      } finally {
        loadingPath = null
      }
    }
    void load(path)
    return subscribeToEditorFiles(({ activePath: next }) => {
      void load(next)
    })
  }, [activePath, mode, handler])

  // El bus de archivos alimenta el path activo.
  useEffect(() => {
    setActivePath(getEditorFiles().activePath)
    return subscribeToEditorFiles(({ activePath: next }) => setActivePath(next))
  }, [])

  const viewing = mode === 'view' && View !== null
  // `data-mode` lo lee el header de la tab para ofrecer el ojo.
  const modeLabel = handler && canToggleMode(handler) ? (viewing ? 'view' : 'text') : 'text'

  return (
    <div className={styles.panel} data-engine={engineId} data-mode={modeLabel}>
      {/* El engine vive siempre acá; se oculta cuando manda el visor. */}
      <div ref={hostRef} className={styles.host} hidden={viewing} />
      {viewing && activePath ? (
        <div className={styles.viewer}>
          {/* Toolbar del visor: `actions[]` que declara el handler. */}
          {handler?.actions?.length ? (
            <div className={styles.viewerBar} role="toolbar">
              {handler.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={styles.viewerAction}
                  title={msg(action.label)}
                  onClick={() =>
                    void action.run({ path: activePath, content: viewContent, notify })
                  }
                >
                  {action.icon ? <ProductIcon id={action.icon} size={13} aria-hidden="true" /> : null}
                  <span>{msg(action.label)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <View path={activePath} content={viewContent} />
        </div>
      ) : null}
    </div>
  )
}
