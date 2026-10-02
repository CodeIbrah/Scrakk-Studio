// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Regresión de UX del panel de Git.
 *
 * Los dos botones tienen semántica distinta y correcta:
 *   - **Commit**: commitea sólo lo que está en el índice (`staged`), así que se
 *     deshabilita con `state.staged.length === 0`.
 *   - **Todo**: `git add -A` + commit en un paso.
 *
 * El problema era que el único camino para preparar archivos era
 * **seleccionarlos primero** para que apareciera la barra bulk: sin eso, el
 * botón Commit quedaba muerto sin explicar por qué (el usuario escribía el
 * mensaje y no pasaba nada).
 *
 * La solución es la acción de staging **por fila al hover** (como el `+` de VS
 * Code). Estos tests verifican que el cableado siga existiendo: sin entorno DOM,
 * se comprueba sobre el código, que es justo lo que se rompió.
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const src = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const ROW = 'src/renderer/src/features/explorer/components/ExplorerRow.tsx'
const PANEL = 'src/renderer/src/features/explorer/ExplorerPanel.tsx'
const VIEW = 'src/renderer/src/features/explorer/ExplorerView.tsx'
const GIT = 'src/renderer/src/features/layout/panels/GitPanel/GitPanel.tsx'

describe('acciones por fila en el árbol', () => {
  it('la fila dibuja las acciones declaradas, con su propio estilo', () => {
    const row = src(ROW)
    expect(row).toContain('export interface RowAction')
    // Declarativas: el consumidor no trae CSS ni DOM.
    expect(row).toMatch(/rowActions\?:\s*\(node: FileNode\) => RowAction\[\]/)
    // Se dibujan con la MISMA clase que el "…", que ya aparece en hover.
    expect(row).toMatch(/rowActions\(node\)\.map/)
    expect(row).toContain('className={styles.dots}')
  })

  it('la prop llega desde el panel hasta la fila (sin cortarse en el medio)', () => {
    for (const file of [VIEW, PANEL, ROW]) {
      const code = src(file)
      expect(code, `${file} no declara ni usa rowActions`).toContain('rowActions')
    }
    // ExplorerView la reenvía al panel, y el panel a cada fila.
    expect(src(VIEW)).toContain('rowActions={rowActions}')
    expect(src(PANEL)).toContain('rowActions={rowActions}')
  })

  it('el panel de Git ofrece stage/unstage por archivo', () => {
    const git = src(GIT)
    // La acción depende de si ESE path ya está en el índice.
    expect(git).toMatch(/stagedSet\.has\(node\.path\)/)
    expect(git).toContain('onStage([toRel(node.path)])')
    expect(git).toContain('onUnstage([toRel(node.path)])')
    // No se ofrece en carpetas.
    expect(git).toMatch(/node\.isDirectory/)
  })

  it('la API es pública y tipada', () => {
    // El consumidor puede tipar sus props sin reimportar internals.
    const view = src(VIEW)
    expect(view).toContain('export interface ExplorerViewProps')
    const barrel = src('src/renderer/src/features/explorer/index.ts')
    expect(barrel).toMatch(/type ExplorerViewProps/)
    expect(barrel).toMatch(/type RowAction/)
    expect(barrel).toMatch(/export type \{ FileNode \}/)
  })

  it('el recuadro de selección ejecuta la acción del consumidor', () => {
    const panel = src(PANEL)
    // Default: seleccionar. Con `onLasso`, decide el consumidor.
    expect(panel).toMatch(/if \(onLasso\) onLasso\(paths, select\)/)
    expect(panel).toMatch(/else select\(paths\)/)
    // Y el contrato expone `select` para poder COMPONER.
    expect(panel).toMatch(
      /onLasso\?:\s*\(paths: string\[\], select: \(paths: string\[\]\) => void\) => void/
    )
    expect(src(VIEW)).toMatch(/onLasso\?:\s*\(paths: string\[\], select/)
  })

  it('Git usa el recuadro para preparar en lote (selecciona + stagea)', () => {
    const git = src(GIT)
    expect(git).toContain('onLasso={')
    // Compone: primero selecciona, después stagea lo que no estaba.
    expect(git).toMatch(/select\(paths\)/)
    expect(git).toMatch(/filter\(\(p\) => !stagedSet\.has\(p\)\)/)
    expect(git).toMatch(/onStage\(pending\)/)
  })

  it('Commit sigue exigiendo índice y Todo sigue siendo stage-all', () => {
    const git = src(GIT)
    // Si alguien "arregla" Commit relajando esto, se pierde la semántica de git.
    expect(git).toMatch(/state\.staged\.length === 0/)
    expect(git).toMatch(/doCommit\(false\)/)
    expect(git).toMatch(/doCommit\(true\)/)
  })
})