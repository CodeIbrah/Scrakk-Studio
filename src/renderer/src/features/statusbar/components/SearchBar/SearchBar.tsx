// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * SearchBar — trigger de la Command Palette en la statusbar.
 *
 * Click (o mod+shift+p) abre la paleta. El input real vive en el overlay.
 */

import { ProductIcon } from '@services/productIcons/components'
import type { JSX } from 'react'
import { openCommandPalette } from '@services/commands'
import styles from './SearchBar.module.css'

import { t } from '@core/i18n'
export function SearchBar(): JSX.Element {
  return (
    <button
      type="button"
      className={styles.wrapper}
      onClick={() => openCommandPalette()}
      title={t('statusbar.paleta.de.comandos.mod.shift')}
      aria-label={t('statusbar.abrir.paleta.de.comandos')}
    >
      <ProductIcon id="search" size={12} className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{t('statusbar.comandos')}</span>
    </button>
  )
}
