// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff de archivos — la API con la que la app ABRE una tab de diff.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 *
 * `openDiffTab()` es la única puerta para "mostrame este cambio": pide el diff
 * a un proveedor, arma con él un **diff unificado** (contexto + líneas quitadas
 * arriba + agregadas abajo), lo registra en el store de decoraciones como FONDO
 * DE LÍNEA y abre una tab de archivo en SÓLO LECTURA.
 *
 * Una tab de diff NO es un tipo de tab nuevo: es una tab de archivo con path
 * sintético (`scrakk-diff://<id>/<archivo>`), así que reusa el editor, el
 * resaltado de sintaxis y el strip tal como están. El contenido no sale del
 * disco —saldría vacío— sino del registro de contenido provisto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EL BUFFER ES UN DIFF UNIFICADO Y NO EL ARCHIVO
 *
 * El editor pinta fondos de línea sobre UN buffer. Si la tab mostrara sólo el
 * "después", el texto eliminado no existiría en ningún lado y no se podría
 * mostrar — que es justo lo que el usuario quiere ver. Un buffer unificado con
 * las quitadas (`-`) arriba y las agregadas (`+`) abajo muestra LAS DOS
 * versiones y cada línea se tiñe según lo que es. Es la misma concesión que
 * hace el diff inline de VS Code, con prefijos para que no haya que adivinar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUIÉN DA LAS ÓRDENES
 *
 * El diff no lo decide este módulo: lo decide un PROVEEDOR, que devuelve las
 * filas. Hoy:
 *
 *   'content'  pares de texto en memoria (los tools de edición de la IA, que ya
 *              traen `originalContent`/`modifiedContent` en su resultado)
 *
 * Un proveedor de git entra sin tocar nada más: `git diff` ya produce filas
 * unificadas, así que se registra y se pide.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LOS COLORES
 *
 * El motor pinta EXACTAMENTE el color que le llega (no tiene paleta). El
 * default sale del tema (`--color-diff-added`…, con fallback) y `colors` lo pisa
 * por llamada: es el gancho por el que quien pide el diff elige su color.
 */

import { openFileInEditor, subscribeToEditorFiles } from '@features/editor/editorBus'
import { setProvidedContent } from '@features/editor/providedContent'
import { baseNameOf } from '@features/fileHandlers'
import {
  clearDiffDecorations,
  diffLineColor,
  setDiffDecorations,
  type DiffLineKind,
  type EditorDiffLine
} from '@services/decorations'
import { notify } from '@services/notifications'
import {
  diffRows,
  renderDiffRows,
  splitLines,
  summarizeRows,
  type DiffRow,
  type DiffSummary
} from './lineDiff'

export type { DiffRow, DiffRowKind, DiffSummary } from './lineDiff'
export { DIFF_ROW_PREFIX, diffRows, renderDiffRows, splitLines, summarizeRows } from './lineDiff'

/** Esquema de las tabs de diff (nunca colisiona con un path real). */
export const DIFF_SCHEME = 'scrakk-diff'

/**
 * Colores por tipo de línea, como cadena CSS (`#rrggbbaa`, `rgba(…)`).
 *
 * Ganan sobre el tema. Son TINTES: conviene que lleven alfa, porque el texto se
 * dibuja encima y un color opaco lo tapa.
 */
export type DiffColors = Partial<Record<Exclude<DiffLineKind, 'context'>, string>>

/** Lo que un proveedor devuelve: las filas del diff, en orden de lectura. */
export interface DiffPayload {
  rows: DiffRow[]
  /** Resumen del “+N / −M”. Si falta se calcula de `rows`. */
  summary?: DiffSummary
}

/** Pedido que recibe un proveedor. */
export interface DiffRequest {
  /** Path REAL del archivo (para el título, el lenguaje y el diff contra git). */
  path: string
  /** Texto "antes" (lo usa el proveedor `content`). */
  before?: string
  /** Texto "después" (lo usa el proveedor `content`). */
  after?: string
  /** Referencia del repo (lo usa un proveedor de git). */
  ref?: string
}

export type DiffProvider = (request: DiffRequest) => DiffPayload | Promise<DiffPayload>

const providers = new Map<string, DiffProvider>()

/** Da de alta (o reemplaza) un proveedor de diff. */
export function registerDiffProvider(id: string, provider: DiffProvider): void {
  providers.set(id, provider)
}

/** Baja un proveedor. */
export function unregisterDiffProvider(id: string): void {
  providers.delete(id)
}

/** ¿Hay proveedor con ese id? (diagnóstico y chequeo antes de abrir). */
export function hasDiffProvider(id: string): boolean {
  return providers.has(id)
}

/** Ids de los proveedores registrados (diagnóstico). */
export function listDiffProviders(): string[] {
  return [...providers.keys()].sort()
}

/** Proveedor por defecto: pares de texto en memoria. */
export const CONTENT_DIFF_PROVIDER = 'content'

/**
 * Diff de un par de textos en memoria.
 *
 * Es el caso de los tools de edición de la IA: el resultado de
 * `write_file`/`replace_in_file` ya trae el texto de antes y el de después, así
 * que no hace falta git ni disco.
 *
 * Es una función con nombre (y no un closure suelto) para que el registro
 * inicial y el reset de tests usen LA MISMA implementación: dos copias es cómo
 * una de las dos se queda sin los casos de archivo nuevo/borrado.
 */
function contentDiffProvider(request: DiffRequest): DiffPayload {
  const before = request.before ?? ''
  const after = request.after ?? ''

  // ARCHIVO NUEVO: no hay "antes" que mostrar, y `splitLines('')` devuelve UNA
  // línea vacía — usarla de contexto agregaría un renglón fantasma al diff.
  if (before === '' && after !== '') {
    return { rows: splitLines(after).map((text) => ({ kind: 'added' as const, text })) }
  }
  // BORRADO TOTAL: el "después" vacío no tiene líneas; se muestra lo que HABÍA,
  // entero marcado como quitado (una eliminación no tiene lado nuevo).
  if (after === '' && before !== '') {
    return { rows: splitLines(before).map((text) => ({ kind: 'removed' as const, text })) }
  }
  return { rows: diffRows(before, after) }
}

registerDiffProvider(CONTENT_DIFF_PROVIDER, contentDiffProvider)

export interface OpenDiffTabOptions {
  /** Path real del archivo (el diff es "de este archivo"). */
  path: string
  /** Texto antes/después para el proveedor `content`. */
  before?: string
  after?: string
  /** Referencia para un proveedor de git. */
  ref?: string
  /** Quién calcula el diff. Default `CONTENT_DIFF_PROVIDER`. */
  provider?: string
  /** Título de la tab. Default `<archivo> (diff)`. */
  title?: string
  /** Colores por tipo de cambio (pisan el tema). */
  colors?: DiffColors
}

/** sourceId por path sintético: es lo que permite limpiar al cerrar la tab. */
const sourceByPath = new Map<string, string>()
let diffSeq = 0

/**
 * Filas → rangos de línea del BUFFER (no del archivo).
 *
 * Los índices son los del texto renderizado — es el buffer que el editor tiene
 * delante, y es donde el motor pinta. Se agrupan las filas consecutivas del
 * mismo tipo en un solo rango: pintar 200 líneas es una decoración, no 200.
 */
function rowsToLines(rows: readonly DiffRow[], colors?: DiffColors): EditorDiffLine[] {
  const out: EditorDiffLine[] = []
  let start = -1
  let kind: Exclude<DiffLineKind, 'context'> | null = null

  const flush = (endLine: number): void => {
    if (start >= 0 && kind && endLine >= start) {
      out.push({
        startLine: start,
        endLine,
        kind,
        color: diffLineColor(kind, colors?.[kind])
      })
    }
    start = -1
    kind = null
  }

  rows.forEach((row, index) => {
    if (row.kind === 'context') {
      flush(index - 1)
      return
    }
    if (row.kind !== kind) {
      flush(index - 1)
      start = index
      kind = row.kind
    }
  })
  flush(rows.length - 1)
  return out
}

/**
 * Abre (o vuelve a abrir) la tab de diff de un cambio.
 *
 * Es asíncrona porque un proveedor puede tener que ir a buscar el diff (git),
 * pero el cálculo local (`content`) resuelve en el mismo tick.
 *
 * Devuelve el resumen (el `+N / −M`) para que quien la llamó lo pueda mostrar
 * donde quiera, y NO notifica: abrir un diff está a un click de distancia, y un
 * toast por cada uno es ruido puro. `null` = no había proveedor con ese id (ahí
 * sí se notifica, porque es un error que nadie pidió).
 */
export function openDiffTab(options: OpenDiffTabOptions): Promise<DiffSummary | null> {
  const providerId = options.provider ?? CONTENT_DIFF_PROVIDER
  const provider = providers.get(providerId)
  if (!provider) {
    notify({
      title: 'No hay proveedor de diff',
      message: `No existe el proveedor "${providerId}" (registrados: ${listDiffProviders().join(', ') || 'ninguno'}).`
    })
    return Promise.resolve(null)
  }

  return Promise.resolve(
    provider({ path: options.path, before: options.before, after: options.after, ref: options.ref })
  ).then((payload) => {
    const id = `d${(diffSeq += 1)}`
    const name = baseNameOf(options.path) || 'cambio'
    // El basename va al final del path para que el strip de tabs muestre el
    // nombre real, y el esquema hace que NO matchee ningún fileHandler (`file`):
    // así la tab monta el editor y no un visor.
    const syntheticPath = `${DIFF_SCHEME}://${id}/${name}`

    // El buffer ES el diff unificado: contexto + quitadas + agregadas.
    const rows = payload.rows
    setProvidedContent(syntheticPath, { text: renderDiffRows(rows), readOnly: true })

    const sourceId = `diff:${providerId}:${id}`
    sourceByPath.set(syntheticPath, sourceId)
    setDiffDecorations(sourceId, syntheticPath, rowsToLines(rows, options.colors))

    openFileInEditor(syntheticPath, options.title ?? `${name} (diff)`)
    return payload.summary ?? summarizeRows(rows)
  })
}

/**
 * Baja el diff de una tab de diff cerrada.
 *
 * Sin esto cada tab de diff cerrada dejaba su entrada en el store para siempre
 * (memoria que nadie más iba a limpiar). Se engancha al bus de archivos en vez
 * de exigirle a cada caller que limpie: el que cierra la tab es el usuario, no
 * el que la abrió.
 */
export function initDiffViews(): void {
  let known = new Set<string>()
  subscribeToEditorFiles((state) => {
    const open = new Set(state.openFiles.map((file) => file.path))
    for (const path of known) {
      if (!open.has(path)) {
        const sourceId = sourceByPath.get(path)
        if (sourceId) {
          clearDiffDecorations(sourceId)
          sourceByPath.delete(path)
        }
      }
    }
    known = open
  })
}

/** Solo tests: resetea el registro de proveedores y el mapa de limpieza. */
export function _resetDiffForTests(): void {
  providers.clear()
  sourceByPath.clear()
  diffSeq = 0
  registerDiffProvider(CONTENT_DIFF_PROVIDER, contentDiffProvider)
}
