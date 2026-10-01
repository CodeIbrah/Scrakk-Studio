// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { FileHandler } from '../../types'

/** SVG: se ve como imagen o se edita como texto (es XML). */
export const svgHandler: FileHandler = {
  id: 'svg',
  match: { extensions: ['svg'] },
  mode: 'both',
  priority: 20,
  load: () => import('./SvgViewer')
}
