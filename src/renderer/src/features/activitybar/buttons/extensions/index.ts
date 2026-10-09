// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ActivityBarButton } from '../../types'
import { productIcon } from '@services/productIcons/components'

import { t } from '@core/i18n'
/** Botón de extensiones — barra izquierda, slot izquierdo. */
const extensions: ActivityBarButton = {
  id: 'extensions',
  get label() {
    return t('layout.panel.extensions')
  },
  icon: productIcon('extensions'),
  side: 'left',
  target: 'left',
  panelId: 'extensions',
  order: 60
}

export default extensions
