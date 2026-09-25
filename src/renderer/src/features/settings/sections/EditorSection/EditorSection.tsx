// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Sección "Editor" — opciones del editor Innerta (WASM).
 *
 * Los valores viven en sus APIs correspondientes (nada hardcodeado aquí):
 * - Minimapa: getMinimapVisible / setMinimapVisibleEverywhere (InnertaEngine),
 *   que persiste en localStorage y aplica en vivo a todos los engines vivos.
 */

import { useCallback, useEffect, useState, type JSX } from 'react'
import { ToggleSwitch } from '@ui'
import {
  getMinimapVisible,
  setMinimapVisibleEverywhere,
  MINIMAP_SETTING_KEY
} from '@features/editor/engines/innerta/InnertaEngine'
import styles from './EditorSection.module.css'

import { t } from '@core/i18n'
/** Evento de broadcast del toggle (mismo canal que el engine). */
const MINIMAP_EVENT = 'innerta-minimap-changed'

export function EditorSection(): JSX.Element {
  const [minimap, setMinimap] = useState<boolean>(() => getMinimapVisible())

  useEffect(() => {
    const sync = (): void => setMinimap(getMinimapVisible())
    window.addEventListener(MINIMAP_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(MINIMAP_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const handleMinimap = useCallback((next: boolean) => {
    setMinimap(next)
    setMinimapVisibleEverywhere(next)
  }, [])

  return (
    <div className={styles.section}>
      <div className={styles.headerText}>
        <h3>{t('settings.editor')}</h3>
        <p>
          {t('settings.opciones.del.editor.de.codigo')}
        </p>
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <span className={styles.rowName}>{t('settings.minimapa')}</span>
          <span className={styles.rowMeta}>
            {t('settings.vista.previa.del.archivo.a')}
          </span>
        </div>
        <ToggleSwitch
          checked={minimap}
          label={minimap ? t('settings.desactivar.minimapa') : t('settings.activar.minimapa')}
          onChange={handleMinimap}
        />
      </div>
    </div>
  )
}

// Re-export para que el key de settings y el engine no diverjan.
export { MINIMAP_SETTING_KEY as EDITOR_MINIMAP_SETTING_KEY }
