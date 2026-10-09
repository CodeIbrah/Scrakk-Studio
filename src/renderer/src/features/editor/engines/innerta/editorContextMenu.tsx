// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Menú contextual del EDITOR — usa el ContextMenu GLOBAL de Scrakk (@ui).
 *
 * Acciones básicas: Copiar · Pegar · Seleccionar todo
 * Acción avanzada: Ir a definición (abre el archivo destino en tab).
 *
 * TODO es POR ENGINE: recibe el module (InnertaModule) del engine donde se
 * clickeó. Así cada instancia (archivo multi-editor) ejecuta sus acciones en SU
 * módulo — nada de singletons globales (`window.__scrakkInnerta` / activePath)
 * que con varios engines apuntaban al módulo/archivo equivocado.
 *
 * Las acciones viven en `editorActions` (las MISMAS que usa el menú Editar de la
 * titlebar); acá sólo se cablean a los ítems del menú.
 */

import type { ContextMenuItem } from '@ui'
import type { InnertaModule } from './InnertaEngine'
import { showContextMenu } from './menuHost'
import { copyFromEditor, pasteIntoEditor, selectAllInEditor } from './editorActions'

export function openEditorContextMenu(
  module: InnertaModule | null,
  clientX: number,
  clientY: number
): void {
  const items: ContextMenuItem[] = [
    {
      label: 'Copiar',
      disabled: !module,
      onClick: () => copyFromEditor(module)
    },
    {
      label: 'Pegar',
      disabled: !module,
      onClick: () => pasteIntoEditor(module)
    },
    {
      label: 'Seleccionar todo',
      separatorBefore: true,
      disabled: !module,
      onClick: () => selectAllInEditor(module)
    }
  ]

  showContextMenu(clientX, clientY, items)
}
