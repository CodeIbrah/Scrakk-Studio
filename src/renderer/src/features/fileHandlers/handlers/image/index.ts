// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { FileHandler } from '../../types'

/**
 * Imágenes: pieza pura (`view`). El editor no tiene nada que hacer acá, así que
 * no hay modo texto — y por eso la tab NO ofrece el ojo para estos formatos.
 */
export const imageHandler: FileHandler = {
  id: 'image',
  match: { extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico'] },
  mode: 'view',
  priority: 30,
  load: () => import('./ImageViewer'),
  actions: [
    {
      id: 'reveal',
      label: 'explorer.abrir.en.explorador',
      icon: 'folder',
      run: (ctx) => void window.api.fs.openInFolder(ctx.path)
    }
  ]
}
