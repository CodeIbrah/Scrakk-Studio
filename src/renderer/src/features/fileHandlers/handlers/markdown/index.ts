// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { FileHandler } from '../../types'
import { msg } from '@core/i18n'

/**
 * Markdown: el caso INTERMEDIO por excelencia — se ve renderizado (`view`) o
 * se edita como texto (`text`). El ojo de la tab alterna los dos modos.
 */
export const markdownHandler: FileHandler = {
  id: 'markdown',
  match: { extensions: ['md', 'markdown', 'mdown', 'mkd'] },
  mode: 'both',
  priority: 10,
  load: () => import('./MarkdownViewer'),
  actions: [
    {
      id: 'copy',
      label: 'common.copiar',
      icon: 'copy',
      run: (ctx) => {
        void navigator.clipboard.writeText(ctx.content ?? '')
        ctx.notify({ title: msg('common.copiar') })
      }
    }
  ]
}
