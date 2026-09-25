// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { ActivityBarButton } from '../../types'
import { productIcon } from '@services/productIcons/components'

import { t } from '@core/i18n'
/** Botón de git — barra derecha, slot derecho. */
const git: ActivityBarButton = {
  id: 'git',
  get label() {
    return t('layout.panel.git')
  },
  icon: productIcon('source-control'),
  side: 'right',
  target: 'right',
  panelId: 'git',
  order: 30
}

export default git
