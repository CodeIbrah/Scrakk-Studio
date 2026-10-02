// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * ExplorerView — la API spawneable del explorer.
 *
 * `import { ExplorerView } from '@features/explorer'` y
 * `<ExplorerView root={absPath} />` monta EL MISMO árbol del panel
 * (virtualización, lasso, iconos por tema, decoraciones) sobre una raíz
 * arbitraria, con contexto de título aislado (no toca el header ajeno).
 *
 * El árbol no sabe de ningún dominio: lo que puede hacer de más lo declara el
 * consumidor —
 *   - `visiblePaths`: mostrar solo estos archivos (+ sus ancestros).
 *   - `rowActions`: botones por fila al hover (el `+`/`×` de Git, por ejemplo).
 *   - `onLasso`: qué hace el recuadro de selección al soltar.
 *
 * Ver `ExplorerViewProps` para el detalle de cada una.
 */

import type { JSX } from 'react'
import { PanelTitleProvider } from '@features/layout'
import { ExplorerPanel } from './ExplorerPanel'
import type { RowAction } from './components/ExplorerRow'
import type { FileNode } from './hooks/useWorkspaceState'
import { baseNameOf } from './utils/fileUtils'

import { t } from '@core/i18n'

/**
 * API pública del árbol del explorer.
 *
 * El MISMO árbol que usa el panel (virtualización, lasso, iconos del tema
 * activo, decoraciones) sobre una raíz arbitraria. Todo lo que el árbol puede
 * hacer de más lo declara el consumidor: acciones por fila y acción del
 * recuadro de selección. Nada de Git acá adentro.
 */
export interface ExplorerViewProps {
  /** Raíz absoluta a mostrar (o `null` para el estado vacío). */
  root: string | null
  /**
   * `true` = explorer completo: menús, drag & drop, crear/renombrar/eliminar,
   * botones de header y atajos de mutación. Con `false` (default) queda de
   * solo lectura: la selección, el lasso y abrir archivos siguen funcionando.
   */
  interactive?: boolean
  /** Título del contexto aislado (default: el nombre de la carpeta). */
  title?: string
  /**
   * Subset de paths a mostrar (default: todo el árbol). Los ancestros de los
   * paths indicados se auto-expanden, así que sirve para pintar "solo estos
   * archivos" sin construir una lista plana.
   */
  visiblePaths?: Set<string> | null
  /** Selección actual, para que el consumidor ofrezca acciones bulk. */
  onSelectionChange?: (paths: string[]) => void
  /** Hook extra al abrir un archivo (después del open normal). */
  onOpenFile?: (path: string, name: string) => void
  /** Acciones por fila que aparecen al hacer hover (ver `RowAction`). */
  rowActions?: (node: FileNode) => RowAction[]
  /**
   * Acción del recuadro de selección al soltar. Recibe los paths barridos y
   * `select` para componer con la selección normal. Ver `ExplorerPanel`.
   */
  onLasso?: (paths: string[], select: (paths: string[]) => void) => void
}

export function ExplorerView({
  root,
  interactive = false,
  title,
  visiblePaths = null,
  onSelectionChange,
  onOpenFile,
  rowActions,
  onLasso
}: ExplorerViewProps): JSX.Element {
  return (
    <PanelTitleProvider initialTitle={title ?? (root ? baseNameOf(root) : t('explorer.explorador'))}>
      <ExplorerPanel
        rootOverride={root ?? undefined}
        interactive={interactive}
        visiblePaths={visiblePaths}
        onSelectionChange={onSelectionChange}
        onOpenFile={onOpenFile}
        rowActions={rowActions}
        onLasso={onLasso}
      />
    </PanelTitleProvider>
  )
}
