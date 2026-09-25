// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Sección "Rendimiento" — modo PC mala y estado de memoria del editor.
 *
 * - Toggle de bajo consumo: menos trabajo de fondo (tokens semánticos y
 *   hover), para PCs modestas.
 * - Lectura de heaps WASM reales (HEAP8) sumados por motor de panel.
 */

import { useCallback, useEffect, useState, type JSX } from 'react'
import { ToggleSwitch } from '@ui'
import {
  isLowEndMode,
  setLowEndMode,
  subscribeLowEndMode
} from '@services/perf'
import {
  applyBackgroundCapNow,
  backgroundModuleCount,
  totalEditorHeapBytes
} from '@features/editor/fileSession'
import styles from './PerformanceSection.module.css'

import { t } from '@core/i18n'
function formatMB(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`
}

export function PerformanceSection(): JSX.Element {
  const [lowEnd, setLowEnd] = useState<boolean>(() => isLowEndMode())
  const [heap, setHeap] = useState<number>(0)
  const [background, setBackground] = useState<number>(0)

  const refresh = useCallback((): void => {
    setLowEnd(isLowEndMode())
    setHeap(totalEditorHeapBytes())
    setBackground(backgroundModuleCount())
  }, [])

  useEffect(() => {
    refresh()
    const offPerf = subscribeLowEndMode(refresh)
    const timer = setInterval(refresh, 2000)
    return () => {
      offPerf()
      clearInterval(timer)
    }
  }, [refresh])

  const handleToggle = useCallback(
    (next: boolean) => {
      setLowEndMode(next)
      if (next) applyBackgroundCapNow()
      refresh()
    },
    [refresh]
  )

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3>{t('settings.rendimiento')}</h3>
          <p>
            {t('settings.el.editor.usa.un.motor')} <strong>panel</strong>: cada archivo
            abierto es una sesión dentro de él, con su undo, cursor y scroll.
          </p>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <span className={styles.rowName}>{t('settings.modo.pc.mala')}</span>
          <span className={styles.rowMeta}>
            Menos trabajo de fondo (tokens semánticos y hover) para PCs
            modestas. Editar no pierde nada.
          </span>
        </div>
        <ToggleSwitch
          checked={lowEnd}
          label={lowEnd ? 'Desactivar modo PC mala' : 'Activar modo PC mala'}
          onChange={(next) => handleToggle(next)}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.rowInfo}>
          <span className={styles.rowName}>{t('settings.memoria.del.editor')}</span>
          <span className={styles.rowMeta}>
            {formatMB(heap)} {t('settings.en.heaps.wasm')} {background} {t('settings.motor.es.de.panel')}
          </span>
        </div>
      </div>
    </div>
  )
}
