// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * `onOpen` compartido de las tools de EDICIÓN de archivos.
 *
 * `write_file`, `append_file` y `replace_in_file` hacen el MISMO gesto al
 * clickearse: abrir el diff del cambio que hicieron. El handler vive acá y no
 * triplicado en cada carpeta — si el gesto cambia, cambia en un lugar.
 *
 * No importa `ToolOpenContext` a propósito: recibe la forma estructural, así la
 * dependencia va de los tools hacia el diff y nunca al revés.
 */

import { CONTENT_DIFF_PROVIDER, openDiffTab } from './index'

export function openEditToolDiff(context: {
  args: Record<string, unknown>
  originalContent?: string
  modifiedContent?: string
}): void {
  const path = typeof context.args.path === 'string' ? context.args.path : ''
  const before = context.originalContent
  const after = context.modifiedContent
  // Sin path o sin el par de contenidos no hay diff que mostrar: no se abre una
  // tab vacía (diría que hubo un cambio que no se puede pintar).
  if (!path || typeof before !== 'string' || typeof after !== 'string') return
  void openDiffTab({ path, before, after, provider: CONTENT_DIFF_PROVIDER })
}
