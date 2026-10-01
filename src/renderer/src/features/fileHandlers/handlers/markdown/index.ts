// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { FileHandler } from '../../types'

/**
 * Markdown: el caso INTERMEDIO por excelencia — se ve renderizado (`view`) o
 * se edita como texto (`text`). El ojo de la tab alterna los dos modos.
 */
export const markdownHandler: FileHandler = {
  id: 'markdown',
  match: { extensions: ['md', 'markdown', 'mdown', 'mkd'] },
  mode: 'both',
  priority: 10,
  load: () => import('./MarkdownViewer')
}
