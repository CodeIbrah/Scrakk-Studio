// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import type { Tool } from '../types'
import { definition } from './definition'
import { execute } from './executor'
import { permissions } from './permissions'
import { prompt } from './prompt'
import { TaskCard } from './visual'
import displayCss from './visual/TaskCard.css?inline'

export const taskTool: Tool = {
  name: 'task',
  definition,
  permissions,
  prompt,
  meta: {
    name: 'task',
    label: 'Task',
    description: 'Launch a subagent',
    type: 'subagent',
    dangerLevel: 'safe',
    enabledByDefault: true,
    icon: 'people',
    headerArgKey: 'subagent_type',
    expandable: true,
    displayCss,
    // El subagente ya es clickeable por su cuenta: abre su chat en un modal.
    // Se declara ACÁ, en la carpeta de la tool, no en el bloque del chat.
    onOpen: 'self',
    renderBody: (args, result, status, execution) => (
      <TaskCard args={args} result={result} status={status} execution={execution} />
    )
  },
  execute
}
