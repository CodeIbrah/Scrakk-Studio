// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff de líneas — el cálculo, sin UI y sin motor.
 *
 * Es LCS clásico (programación dinámica + backtrack) sobre las líneas de dos
 * textos. Devuelve HUNKS referidos al texto "después" (el que muestra la tab),
 * porque es el único lado que el buffer del editor tiene: el motor pinta
 * fondos de línea sobre el contenido que ya está en pantalla.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO SE PINTA UN BORRADO COMO TAL
 *
 * Una línea borrada NO EXISTE en el texto "después", así que no hay línea que
 * teñir. El hunk `removed` se ancla a la línea que ocupa su lugar (el "seam").
 * Es la misma concesión que hace cualquier diff de un solo buffer: el texto
 * borrado se puede CONTAR, no mostrar. Está dicho acá y no disimulado.
 */

export type DiffHunkKind = 'added' | 'removed' | 'modified'

/** Un tramo de líneas sobre el texto "después". `endLine` es INCLUSIVO. */
export interface DiffHunk {
  startLine: number
  endLine: number
  kind: DiffHunkKind
}

export interface DiffSummary {
  added: number
  removed: number
  modified: number
}

type Op = 'equal' | 'insert' | 'delete'

/**
 * Presupuesto de celdas de la tabla de LCS.
 *
 * La tabla es `(n+1) × (m+1)` ints. Con dos archivos sin nada en común el
 * "medio" es el archivo entero y la matriz se come la memoria: un diff no
 * puede colgar el IDE. Pasado el tope se cae a "todo el medio modificado", que
 * es peor de precisión pero no se cuelga.
 */
const LCS_CELL_BUDGET = 4_000_000

/**
 * Texto → líneas.
 *
 * `split('\n')` deja un último elemento vacío cuando el texto termina en salto
 * (`"a\nb\n"` → `['a','b','']`). Ese vacío NO es una línea del buffer, así que
 * se descarta: si no, todo archivo con salto final contaría una línea fantasma.
 */
export function splitLines(text: string): string[] {
  const lines = text.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** Ops de LCS (DP + backtrack). Llamar sólo con `midA`/`midB` dentro del presupuesto. */
function lcsOps(a: readonly string[], b: readonly string[]): Op[] {
  const n = a.length
  const m = b.length
  const width = m + 1
  const table = new Int32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + (j + 1)] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + (j + 1)])
    }
  }

  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push('equal')
      i += 1
      j += 1
    } else if (table[(i + 1) * width + j] >= table[i * width + (j + 1)]) {
      ops.push('delete')
      i += 1
    } else {
      ops.push('insert')
      j += 1
    }
  }
  while (i < n) {
    ops.push('delete')
    i += 1
  }
  while (j < m) {
    ops.push('insert')
    j += 1
  }
  return ops
}

/**
 * Ops → hunks sobre el texto "después".
 *
 * Un run de no-iguales consecutivos es UN cambio: si tiene inserciones se pinta
 * su tramo (`modified` si además borró algo, `added` si sólo insertó); si es un
 * borrado puro, se ancla en el seam.
 */
function opsToHunks(ops: readonly Op[], prefix: number, afterCount: number): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let afterIndex = prefix
  let i = 0
  while (i < ops.length) {
    if (ops[i] === 'equal') {
      afterIndex += 1
      i += 1
      continue
    }

    const startAfter = afterIndex
    let inserts = 0
    let deletes = 0
    while (i < ops.length && ops[i] !== 'equal') {
      if (ops[i] === 'insert') {
        afterIndex += 1
        inserts += 1
      } else {
        deletes += 1
      }
      i += 1
    }

    if (inserts > 0) {
      hunks.push({
        startLine: startAfter,
        endLine: afterIndex - 1,
        kind: deletes > 0 ? 'modified' : 'added'
      })
    } else if (deletes > 0 && afterCount > 0) {
      // Borrado puro: se ancla en la línea que ocupa el lugar. Si el borrado
      // fue al final del archivo, el "lugar" es la última línea.
      const anchor = Math.max(0, Math.min(afterIndex, afterCount - 1))
      hunks.push({ startLine: anchor, endLine: anchor, kind: 'removed' })
    }
  }
  return hunks
}

/**
 * Diff de líneas entre dos textos.
 *
 * Se recortan el prefijo y el sufijo comunes ANTES de la tabla: el caso normal
 * (unos pocos cambios en un archivo grande) deja un "medio" chico y el LCS es
 * trivial, en vez de armar una matriz del tamaño del archivo.
 */
export function diffLines(before: string, after: string): DiffHunk[] {
  const a = splitLines(before)
  const b = splitLines(after)

  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1

  let suffix = 0
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const midA = a.slice(prefix, a.length - suffix)
  const midB = b.slice(prefix, b.length - suffix)

  if ((midA.length + 1) * (midB.length + 1) > LCS_CELL_BUDGET) {
    if (midB.length === 0) return []
    return [{ startLine: prefix, endLine: prefix + midB.length - 1, kind: 'modified' }]
  }

  return opsToHunks(lcsOps(midA, midB), prefix, b.length)
}

/** Cuenta por tipo (lo que un “+N / −M” muestra). */
export function summarizeDiff(hunks: readonly DiffHunk[]): DiffSummary {
  const out: DiffSummary = { added: 0, removed: 0, modified: 0 }
  for (const hunk of hunks) {
    out[hunk.kind] += hunk.endLine - hunk.startLine + 1
  }
  return out
}
