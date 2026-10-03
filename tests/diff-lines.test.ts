// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff unificado — el cálculo y el render.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * Las filas son lo que el visor pinta como líneas del buffer, y lo que se rompe
 * en silencio es:
 *
 *   1. el ORDEN — un reemplazo tiene que salir quitado arriba y agregado abajo;
 *      al revés el diff se lee como si el código nuevo fuera el viejo,
 *   2. el salto final — `"a\nb\n"` NO son 3 líneas, y la fantasma corre todas
 *      las filas una posición (y el prefijo va a la línea equivocada), y
 *   3. los prefijos — son el único modo de distinguir una quitada de una
 *      agregada cuando el tinte es suave; si faltan, el visor miente.
 */

import { describe, expect, it } from 'vitest'
import {
  DIFF_ROW_PREFIX,
  diffRows,
  renderDiffRows,
  splitLines,
  summarizeRows,
  type DiffRow
} from '../src/renderer/src/services/diff/lineDiff'

/** Atajo: el tipo de cada fila, en orden. */
const kinds = (rows: DiffRow[]): string[] => rows.map((row) => row.kind)

describe('diffRows: qué líneas van, y dónde', () => {
  it('dos textos iguales son todo contexto', () => {
    const rows = diffRows('a\nb\nc\n', 'a\nb\nc\n')
    expect(kinds(rows)).toEqual(['context', 'context', 'context'])
    expect(summarizeRows(rows)).toEqual({ added: 0, removed: 0 })
  })

  it('una línea insertada sale como `added` en su lugar', () => {
    const rows = diffRows('a\nb\nc\n', 'a\nb\nX\nc\n')
    expect(rows).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'context', text: 'b' },
      { kind: 'added', text: 'X' },
      { kind: 'context', text: 'c' }
    ])
  })

  it('un reemplazo sale QUITADO ARRIBA y AGREGADO ABAJO (el orden de git diff)', () => {
    const rows = diffRows('a\nb\nc\n', 'a\nB\nc\n')
    expect(rows).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'added', text: 'B' },
      { kind: 'context', text: 'c' }
    ])
  })

  it('varias líneas insertadas van juntas', () => {
    const rows = diffRows('a\nc\n', 'a\nX\nY\nZ\nc\n')
    expect(rows).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'added', text: 'X' },
      { kind: 'added', text: 'Y' },
      { kind: 'added', text: 'Z' },
      { kind: 'context', text: 'c' }
    ])
  })

  it('una línea borrada TIENE su fila (es lo que el visor muestra en rojo)', () => {
    // Sin el buffer unificado, una línea borrada no existía en ningún lado y no
    // se podía mostrar. Acá está, con su texto.
    const rows = diffRows('a\nb\nc\n', 'a\nc\n')
    expect(rows).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'removed', text: 'b' },
      { kind: 'context', text: 'c' }
    ])
  })

  it('el recorte de prefijo/sufijo deja las filas SOLO donde cambió', () => {
    const before = ['x0', 'x1', 'x2', 'A', 'x4', 'x5', 'x6'].join('\n')
    const after = ['x0', 'x1', 'x2', 'B', 'x4', 'x5', 'x6'].join('\n')
    expect(kinds(diffRows(before, after))).toEqual([
      'context',
      'context',
      'context',
      'removed',
      'added',
      'context',
      'context',
      'context'
    ])
  })

  it('el tope de la tabla no cuelga: cae a "todo viejo, después todo nuevo"', () => {
    const before = Array.from({ length: 2100 }, (_, i) => `a${i}`).join('\n')
    const after = Array.from({ length: 2100 }, (_, i) => `b${i}`).join('\n')
    const rows = diffRows(before, after)
    expect(rows).toHaveLength(4200)
    expect(kinds(rows).slice(0, 2100).every((kind) => kind === 'removed')).toBe(true)
    expect(kinds(rows).slice(2100).every((kind) => kind === 'added')).toBe(true)
  })
})

describe('renderDiffRows: el texto del buffer', () => {
  it('cada fila lleva su prefijo (` `, `+`, `-`)', () => {
    expect(DIFF_ROW_PREFIX).toEqual({ context: ' ', added: '+', removed: '-' })
    expect(renderDiffRows(diffRows('a\nb\nc\n', 'a\nB\nc\n'))).toBe(' a\n-b\n+B\n c')
  })

  it('el prefijo es lo que distingue una quitada de una agregada', () => {
    const text = renderDiffRows(diffRows('x\n', 'y\n'))
    expect(text.split('\n')).toEqual(['-x', '+y'])
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

describe('summarizeRows: el "+N / −M"', () => {
  it('cuenta por tipo (y no inventa "modificadas")', () => {
    const rows: DiffRow[] = [
      { kind: 'context', text: 'a' },
      { kind: 'added', text: 'b' },
      { kind: 'added', text: 'c' },
      { kind: 'removed', text: 'd' }
    ]
    expect(summarizeRows(rows)).toEqual({ added: 2, removed: 1 })
  })
})
