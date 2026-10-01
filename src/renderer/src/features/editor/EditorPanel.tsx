// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { useEffect, useRef, useState, type JSX } from 'react'
import { getOrCreateInnertaEngine, getStoredEngine, type EditorEngineId } from './engine'
import { getEditorFiles, subscribeToEditorFiles } from './editorBus'
import { canToggleMode } from '@features/fileHandlers'
import { useFileViewDispatcher } from './FileViewDispatcher'
import styles from './EditorPanel.module.css'

/**
 * Panel `editor` (el clásico de una sola vista).
 *
 * El contenido de las tabs de archivo lo renderiza `FileTabView`; este panel
 * sigue montando el motor para el path activo y usa el MISMO dispatcher
 * (`useFileViewDispatcher`) para mostrar el visor del formato cuando
 * corresponde. La decisión sale del `fileHandlerRegistry`, nunca de acá.
 */
export function EditorPanel(): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const [engineId] = useState<EditorEngineId>(() => getStoredEngine())
  const [activePath, setActivePath] = useState<string | null>(() => getEditorFiles().activePath)

  const { viewing, handler, node } = useFileViewDispatcher(activePath)

  // Monta el motor en el host (una sola vez).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const engine = getOrCreateInnertaEngine()
    engine.attach(host)
    return () => {
      engine.dispose()
    }
  }, [])

  // El bus de archivos alimenta el path activo.
  useEffect(() => {
    setActivePath(getEditorFiles().activePath)
    return subscribeToEditorFiles(({ activePath: next }) => setActivePath(next))
  }, [])

  // `data-mode` lo lee el header de la tab para ofrecer el ojo.
  const modeLabel = handler && canToggleMode(handler) ? (viewing ? 'view' : 'text') : 'text'

  return (
    <div className={styles.panel} data-engine={engineId} data-mode={modeLabel}>
      {/* El engine vive siempre acá; se oculta cuando manda el visor. */}
      <div ref={hostRef} className={styles.host} hidden={viewing} />
      {viewing ? node : null}
    </div>
  )
}