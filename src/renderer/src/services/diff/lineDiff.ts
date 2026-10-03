// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff de líneas — el cálculo, sin UI y sin motor.
 *
 * Es LCS clásico (programación dinámica + backtrack) sobre las líneas de dos
 * textos, y devuelve **filas de un diff unificado** en orden de lectura: el
 * contexto tal cual, las líneas quitadas (arriba) y las agregadas (abajo). Ese
 * orden es el de `git diff` y es el único que deja VER las dos versiones: un
 * reemplazo sale como su bloque viejo y su bloque nuevo, uno debajo del otro.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO COLAPSA EL CONTEXTO
 *
 * `git diff` recorta el contexto y pone un separador; acá no. Un separador
 * "⋯" sería una fila que NO existe en el archivo, y el visor pinta líneas de
 * un buffer real: mentiría sobre qué hay entre medio. El caso real —el diff de
 * una edición— es un archivo que ya vive en el editor, así que mostrarlo
 * entero no cuesta nada.
 */

export type DiffRowKind = 'context' | 'added' | 'removed'

/** Una fila del diff unificado. */
export interface DiffRow {
  kind: DiffRowKind
  /** Texto de la línea, SIN prefijo (el prefijo lo agrega `renderDiffRows`). */
  text: string
}

/** Resumen de un diff (`+N / −M`). */
export interface DiffSummary {
  added: number
  removed: number
}

/**
 * Prefijo de cada tipo: la convención de todo diff.
 *
 * Van en el TEXTO del buffer, no en un pseudo-elemento CSS: el visor es un
 * editor de verdad, así que el único lugar donde el prefijo puede existir es la
 * línea. Sin él, una línea quitada y una agregada se ven idénticas salvo por el
 * color — que con un tinte suave no alcanza para saber cuál es cuál.
 */
export const DIFF_ROW_PREFIX: Record<DiffRowKind, string> = {
  context: ' ',
  added: '+',
  removed: '-'
}

type Op = 'equal' | 'insert' | 'delete'

/**
 * Presupuesto de celdas de la tabla de LCS.
 *
 * La tabla es `(n+1) × (m+1)` ints. Con dos archivos sin nada en común el
 * "medio" es el archivo entero y la matriz se come la memoria: un diff no
 * puede colgar el IDE. Pasado el tope se cae a "todo el viejo, después todo el
 * nuevo", que es peor de precisión pero no se cuelga.
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

/** Ops de LCS (DP + backtrack). Llamar sólo con `a`/`b` dentro del presupuesto. */
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
      // El desempate va al `delete`: así un reemplazo sale quitado-arriba y
      // agregado-abajo, que es el orden que el ojo espera leer.
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
 * Diff unificado entre dos textos.
 *
 * Se recortan el prefijo y el sufijo comunes ANTES de la tabla: el caso normal
 * (unos pocos cambios en un archivo grande) deja un "medio" chico y el LCS es
 * trivial, en vez de armar una matriz del tamaño del archivo.
 */
export function diffRows(before: string, after: string): DiffRow[] {
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

  const rows: DiffRow[] = []
  for (let i = 0; i < prefix; i += 1) rows.push({ kind: 'context', text: a[i] })

  const midA = a.slice(prefix, a.length - suffix)
  const midB = b.slice(prefix, b.length - suffix)

  if ((midA.length + 1) * (midB.length + 1) > LCS_CELL_BUDGET) {
    for (const text of midA) rows.push({ kind: 'removed', text })
    for (const text of midB) rows.push({ kind: 'added', text })
  } else {
    const ops = lcsOps(midA, midB)
    let ai = 0
    let bi = 0
    for (const op of ops) {
      if (op === 'equal') {
        rows.push({ kind: 'context', text: midB[bi] })
        ai += 1
        bi += 1
      } else if (op === 'delete') {
        rows.push({ kind: 'removed', text: midA[ai] })
        ai += 1
      } else {
        rows.push({ kind: 'added', text: midB[bi] })
        bi += 1
      }
    }
  }

  for (let i = a.length - suffix; i < a.length; i += 1) rows.push({ kind: 'context', text: a[i] })
  return rows
}

/** Filas → texto del buffer (una fila por línea, con su prefijo). */
export function renderDiffRows(rows: readonly DiffRow[]): string {
  return rows.map((row) => DIFF_ROW_PREFIX[row.kind] + row.text).join('\n')
}

/**
 * Cuenta por tipo (lo que un “+N / −M” muestra).
 *
 * No hay "modificadas": un diff unificado sólo tiene agregadas y quitadas — un
 * reemplazo es una quitada y una agregada. Inventar un tercer número sería
 * contar algo que el visor no marca.
 */
export function summarizeRows(rows: readonly DiffRow[]): DiffSummary {
  const out: DiffSummary = { added: 0, removed: 0 }
  for (const row of rows) {
    if (row.kind === 'added') out.added += 1
    else if (row.kind === 'removed') out.removed += 1
  }
  return out
}
