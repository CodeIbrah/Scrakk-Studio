// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ActivityBarButton } from '../../types'
import { productIcon } from '@services/productIcons/components'

import { t } from '@core/i18n'
/** Botón del explorador de archivos — barra izquierda, slot izquierdo. */
const explorer: ActivityBarButton = {
  id: 'explorer',
  get label() {
    return t('layout.panel.explorer')
  },
  icon: productIcon('files'),
  side: 'left',
  target: 'left',
  panelId: 'explorer',
  order: 10
}

export default explorer
