// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { useEffect, type JSX } from 'react'
import { usePanelTitle } from '@features/layout'
import styles from './ExtensionsPanel.module.css'

import { t } from '@core/i18n'
/**
 * Panel de extensiones — VACÍO por ahora: solo el cascarón, con su título.
 * Sigue el mismo contrato que el resto de los paneles: aporta únicamente su
 * contenido; el frame, el header y el redimensionado los maneja el sistema de
 * layouts.
 */
export function ExtensionsPanel(): JSX.Element {
  const { setTitle } = usePanelTitle()

  useEffect(() => {
    setTitle(t('layout.panel.extensions'))
  }, [setTitle])

  return <div className={styles.panel} />
}
