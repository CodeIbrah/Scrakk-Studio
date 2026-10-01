// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * FileViewHeaderBridge — publica el OJO en la tab del archivo activo.
 *
 * Usa la API global de headers (`setTabHeader`): el TabStrip dibuja las
 * acciones de la tab activa al lado del ⋮ y `extractHeaderMenuItems` las
 * convierte en items del menú. NADA hardcodeado por formato: la decisión sale
 * del `fileHandlerRegistry` — el ojo sólo aparece si el handler declara
 * `mode: 'both'` (markdown, svg…), no en imágenes.
 */

import { useEffect, type JSX } from 'react'
import { setTabHeader, tabHeaderKey, tabsStore } from '@features/tabs'
import { getEditorFiles, subscribeToEditorFiles } from '@features/editor/editorBus'
import { ProductIcon } from '@services/productIcons/components'
import { t } from '@core/i18n'
import { registerBuiltinFileHandlers } from './builtins'
import {
  canToggleMode,
  effectiveMode,
  setPreferredMode,
  subscribeToPreferredModes
} from './preferences'
import { fileHandlerRegistry } from './registry'
import styles from './FileViewHeaderBridge.module.css'

/** Alterna visor ⇄ editor para un archivo (persistido por path). */
function toggleMode(path: string): void {
  const handler = fileHandlerRegistry.resolve(path)
  const next = effectiveMode(handler, path) === 'view' ? 'text' : 'view'
  setPreferredMode(path, next)
  publish()
}

function EyeButton({ viewing, path }: { viewing: boolean; path: string }): JSX.Element {
  const label = viewing ? t('features.ver.como.texto') : t('features.ver.como.visor')
  return (
    <button
      type="button"
      className={styles.eye}
      aria-label={label}
      title={label}
      onClick={() => toggleMode(path)}
    >
      <ProductIcon id={viewing ? 'eye-off' : 'eye'} size={14} aria-hidden="true" />
    </button>
  )
}

function publish(): void {
  const path = getEditorFiles().activePath
  if (!path) return
  const tabId = `file:${path}`
  const found = tabsStore.findTab(tabId)
  if (!found) return

  const key = tabHeaderKey(found.stripId, tabId)
  const handler = fileHandlerRegistry.resolve(path)
  if (!canToggleMode(handler)) {
    setTabHeader(key, null)
    return
  }
  const viewing = effectiveMode(handler, path) === 'view'
  setTabHeader(key, {
    title: path.split(/[/\\]/).pop() ?? path,
    actions: () => <EyeButton viewing={viewing} path={path} />
  })
}

export function FileViewHeaderBridge(): JSX.Element | null {
  useEffect(() => {
    registerBuiltinFileHandlers()
    publish()
    const unsubBus = subscribeToEditorFiles(() => publish())
    const unsubHandlers = fileHandlerRegistry.subscribe(() => publish())
    const unsubModes = subscribeToPreferredModes(() => publish())
    const unsubTabs = tabsStore.subscribe(() => publish())
    return () => {
      unsubBus()
      unsubHandlers()
      unsubModes()
      unsubTabs()
    }
  }, [])

  return null
}
