// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ActivityBarButton } from '../../types'
import { productIcon } from '@services/productIcons/components'

import { t } from '@core/i18n'
/** Botón de búsqueda — barra izquierda, slot izquierdo. */
const search: ActivityBarButton = {
  id: 'search',
  get label() {
    return t('layout.panel.search')
  },
  icon: productIcon('search'),
  side: 'left',
  target: 'left',
  panelId: 'search',
  order: 20
}

export default search
