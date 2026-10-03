// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { Tool } from '../types'
import { definition } from './definition'
import { execute } from './executor'
import { permissions } from './permissions'
import { prompt } from './prompt'
import { ReplaceInFileCard } from './visual'
import displayCss from './visual/ReplaceInFileCard.css?inline'
import { openEditToolDiff } from '@services/diff/toolOpen'

export const replaceInFileTool: Tool = {
  name: 'replace_in_file',
  definition,
  permissions,
  prompt,
  meta: {
    name: 'replace_in_file',
    label: 'Edit',
    description: 'Replace text in a file',
    type: 'file',
    dangerLevel: 'medium',
    enabledByDefault: true,
        icon: 'refresh',
    headerArgKey: 'path',
    expandable: true,
    displayCss,
    renderBody: (args, result, status) => <ReplaceInFileCard args={args} result={result} status={status} />,
    // Click en la fila → tab de diff del cambio (sólo lectura).
    onOpen: openEditToolDiff,
  },
  execute,
}
