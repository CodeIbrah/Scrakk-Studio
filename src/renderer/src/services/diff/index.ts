// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Diff de archivos — la API con la que la app ABRE una tab de diff.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 *
 * `openDiffTab()` es la única puerta para "mostrame este cambio": calcula (o
 * pide) el diff, lo registra en el store de decoraciones como FONDO DE LÍNEA y
 * abre una tab de archivo en SÓLO LECTURA.
 *
 * Una tab de diff NO es un tipo de tab nuevo: es una tab de archivo con path
 * sintético (`scrakk-diff://<id>/<archivo>`), así que reusa el editor, el
 * resaltado de sintaxis y el strip tal como están. El contenido no sale del
 * disco —saldría vacío— sino del registro de contenido provisto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUIÉN DA LAS ÓRDENES
 *
 * El diff no lo decide este módulo: lo decide un PROVEEDOR. `openDiffTab` recibe
 * un id de proveedor y le pasa el pedido. Hoy:
 *
 *   'content'  pares de texto en memoria (los tools de edición de la IA, que ya
 *              traen `originalContent`/`modifiedContent` en su resultado)
 *
 * Un proveedor de git entra sin tocar nada más: se registra y se pide. Para eso
 * existe el registro — que sumar una fuente sea una línea.
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
import { diffLines, summarizeDiff, type DiffHunk, type DiffSummary } from './lineDiff'

export type { DiffHunk, DiffHunkKind, DiffSummary } from './lineDiff'
export { diffLines, summarizeDiff } from './lineDiff'

/** Esquema de las tabs de diff (nunca colisiona con un path real). */
export const DIFF_SCHEME = 'scrakk-diff'

/**
 * Colores por tipo de cambio, como cadena CSS (`#rrggbbaa`, `rgba(…)`).
 *
 * Ganan sobre el tema. Son TINTES: conviene que lleven alfa, porque el texto se
 * dibuja encima y un color opaco lo tapa.
 */
export type DiffColors = Partial<Record<Exclude<DiffLineKind, 'context'>, string>>

/** Lo que un proveedor devuelve: el texto a mostrar + los cambios. */
export interface DiffPayload {
  /** Contenido "después" — el que muestra la tab. */
  content: string
  hunks: DiffHunk[]
  /** Resumen del “+N / −M”. Si falta se calcula de `hunks`. */
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

// El proveedor `content` es el caso de los tools de edición de la IA: el
// resultado de `write_file`/`replace_in_file` ya trae el texto de antes y el de
// después, así que el diff no necesita git ni disco.
registerDiffProvider(CONTENT_DIFF_PROVIDER, (request) => {
  const before = request.before ?? ''
  const after = request.after ?? ''
  return { content: after, hunks: diffLines(before, after) }
})

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

function toEditorLines(hunks: readonly DiffHunk[], colors?: DiffColors): EditorDiffLine[] {
  return hunks
    .filter((hunk) => hunk.endLine >= hunk.startLine)
    .map((hunk) => ({
      startLine: hunk.startLine,
      endLine: hunk.endLine,
      kind: hunk.kind,
      color: diffLineColor(hunk.kind, colors?.[hunk.kind])
    }))
}

/**
 * Abre (o vuelve a abrir) la tab de diff de un cambio.
 *
 * Es asíncrona porque un proveedor puede tener que ir a buscar el diff (git),
 * pero el cálculo local (`content`) resuelve en el mismo tick.
 */
export function openDiffTab(options: OpenDiffTabOptions): Promise<void> {
  const providerId = options.provider ?? CONTENT_DIFF_PROVIDER
  const provider = providers.get(providerId)
  if (!provider) {
    notify({
      title: 'No hay proveedor de diff',
      message: `No existe el proveedor "${providerId}" (registrados: ${listDiffProviders().join(', ') || 'ninguno'}).`
    })
    return Promise.resolve()
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

    setProvidedContent(syntheticPath, { text: payload.content, readOnly: true })
    const sourceId = `diff:${providerId}:${id}`
    sourceByPath.set(syntheticPath, sourceId)
    setDiffDecorations(sourceId, syntheticPath, toEditorLines(payload.hunks, options.colors))

    const summary = payload.summary ?? summarizeDiff(payload.hunks)
    const title = options.title ?? `${name} (diff)`
    openFileInEditor(syntheticPath, title)
    notify({
      title: title,
      message: `+${summary.added} / −${summary.removed} · ${summary.modified} modificadas`
    })
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
  registerDiffProvider(CONTENT_DIFF_PROVIDER, (request) => {
    const before = request.before ?? ''
    const after = request.after ?? ''
    return { content: after, hunks: diffLines(before, after) }
  })
}
