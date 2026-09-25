// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ActivityBarButton } from '../../types'
import { productIcon } from '@services/productIcons/components'

import { t } from '@core/i18n'
/** Botón del browser — barra izquierda, slot izquierdo. */
const browser: ActivityBarButton = {
  id: 'browser',
  get label() {
    return t('layout.panel.browser')
  },
  icon: productIcon('browser'),
  side: 'left',
  target: 'left',
  panelId: 'browser',
  order: 30
}

export default browser
