// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff de líneas — el cálculo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * Los hunks son lo que el motor pinta como fondo de línea, y las tres cosas que
 * se rompen en silencio son:
 *
 *   1. las líneas del hunk — un `endLine` exclusivo cuando el motor lo quiere
 *      INCLUSIVO pinta una línea de más (o de menos),
 *   2. el salto final — `"a\nb\n"` NO son 3 líneas, y contar la fantasma corre
 *      todos los hunks una línea, y
 *   3. el recorte de prefijo/sufijo — si está mal, el diff "ve" cambios donde
 *      no los hay, o se come los que sí.
 */

import { describe, expect, it } from 'vitest'
import { diffLines, splitLines, summarizeDiff } from '../src/renderer/src/services/diff/lineDiff'

describe('diffLines: qué cambió', () => {
  it('dos textos iguales no producen ningún hunk', () => {
    expect(diffLines('a\nb\nc\n', 'a\nb\nc\n')).toEqual([])
  })

  it('una línea insertada en el medio es `added`, en su línea del DESPUÉS', () => {
    expect(diffLines('a\nb\nc\n', 'a\nb\nX\nc\n')).toEqual([
      { startLine: 2, endLine: 2, kind: 'added' }
    ])
  })

  it('varias líneas insertadas son UN hunk (el rango completo)', () => {
    expect(diffLines('a\nc\n', 'a\nX\nY\nZ\nc\n')).toEqual([
      { startLine: 1, endLine: 3, kind: 'added' }
    ])
  })

  it('una línea reemplazada es `modified`', () => {
    expect(diffLines('a\nb\nc\n', 'a\nB\nc\n')).toEqual([
      { startLine: 1, endLine: 1, kind: 'modified' }
    ])
  })

  it('un borrado puro se ancla en la línea que ocupa su lugar', () => {
    // La línea borrada no existe en el "después": no hay línea que teñir, así
    // que el hunk queda en el seam (documentado en `lineDiff.ts`).
    expect(diffLines('a\nb\nc\n', 'a\nc\n')).toEqual([
      { startLine: 1, endLine: 1, kind: 'removed' }
    ])
  })

  it('un borrado al final del archivo se ancla en la última línea', () => {
    expect(diffLines('a\nb\nc\n', 'a\nb\n')).toEqual([
      { startLine: 1, endLine: 1, kind: 'removed' }
    ])
  })

  it('el recorte de prefijo/sufijo deja el hunk SOLO donde cambió', () => {
    const before = ['x0', 'x1', 'x2', 'A', 'x4', 'x5', 'x6'].join('\n')
    const after = ['x0', 'x1', 'x2', 'B', 'x4', 'x5', 'x6'].join('\n')
    // No un rango gigante: una sola línea, la 3 (0-based).
    expect(diffLines(before, after)).toEqual([{ startLine: 3, endLine: 3, kind: 'modified' }])
  })

  it('el tope de la tabla no cuelga: dos archivos sin nada en común caen a "todo modificado"', () => {
    const before = Array.from({ length: 2100 }, (_, i) => `a${i}`).join('\n')
    const after = Array.from({ length: 2100 }, (_, i) => `b${i}`).join('\n')
    expect(diffLines(before, after)).toEqual([
      { startLine: 0, endLine: 2099, kind: 'modified' }
    ])
  })
})

describe('splitLines: el salto final no inventa una línea', () => {
  it('"a\\nb\\n" son 2 líneas, no 3', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b'])
  })

  it('sin salto final son las mismas 2 líneas', () => {
    expect(splitLines('a\nb')).toEqual(['a', 'b'])
  })

  it('un texto vacío es UNA línea vacía (como el buffer del editor)', () => {
    expect(splitLines('')).toEqual([''])
  })
})

describe('summarizeDiff: el "+N / −M"', () => {
  it('cuenta líneas por tipo', () => {
    const hunks = [
      { startLine: 0, endLine: 2, kind: 'added' as const },
      { startLine: 5, endLine: 5, kind: 'removed' as const },
      { startLine: 9, endLine: 11, kind: 'modified' as const }
    ]
    expect(summarizeDiff(hunks)).toEqual({ added: 3, removed: 1, modified: 3 })
  })
})
