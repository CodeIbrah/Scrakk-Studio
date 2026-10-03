// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cableado de la tab de diff (sin DOM: se verifica el CÓDIGO, como el resto de
 * los tests de integración del repo).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ASÍ
 *
 * No hay jsdom, y montar el WASM en un test no es viable. Lo que SÍ se puede
 * verificar —y es donde se rompe— es que cada eslabón esté conectado:
 *
 *   tools de edición → ToolCallShell (pasa el par viejo/nuevo) → diff → store
 *   → InnertaEngine (push) → puente (malloc + HEAP32) → export del binario
 *
 * Un eslabón cortado no falla en un test de lógica: falla como una tab en
 * blanco o un diff que nunca se pinta. Por eso cada pieza tiene su assert.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const ENGINE = 'src/renderer/src/features/editor/engines/innerta/InnertaEngine.ts'
const LOADER = 'src/renderer/src/features/editor/engines/innerta/innertaLoader.ts'
const SESSION = 'src/renderer/src/features/editor/fileSession.ts'
const SHELL = 'src/renderer/src/services/ai/tool-shell/ToolCallShell.tsx'
const GLUE = 'src/renderer/public/innerta/innerta.js'

describe('el binario del motor expone el canal', () => {
  it('los tres exports nuevos están en el WASM cargado', () => {
    const glue = read(GLUE)
    expect(glue).toContain("createExportWrapper('SetInnertaDiffDecorations'")
    expect(glue).toContain("createExportWrapper('GetInnertaDiffDecorationCount'")
    expect(glue).toContain("createExportWrapper('SetInnertaReadOnly'")
    expect(glue).toContain("createExportWrapper('GetInnertaReadOnly'")
  })
})

describe('el puente TS envuelve las dos capas en las DOS instancias', () => {
  const loader = read(LOADER)

  it('el marshalling del diff comparte una sola función (como los subrayados)', () => {
    // Una copia por wrap es cómo una de las dos se queda con el bug.
    expect(loader).toContain('function pushDiffDecorations(')
    expect(loader).toContain('function applyReadOnly(')
    const calls = loader.match(/pushDiffDecorations\(_raw, data\)/g) ?? []
    expect(calls).toHaveLength(2) // wrap + wrapIsolated
    const readOnlyCalls = loader.match(/applyReadOnly\(_raw, readOnly\)/g) ?? []
    expect(readOnlyCalls).toHaveLength(2)
  })

  it('el export C del diff se llama con puntero + count (no con un array de JS)', () => {
    // Emscripten coerciona un array de JS a número (0 = NULL): sin malloc +
    // HEAP32 el motor leería de la dirección 0.
    expect(loader).toMatch(/_SetInnertaDiffDecorations/)
    expect(loader).toMatch(/HEAP32/)
  })
})

describe('el engine empuja el diff de SU archivo', () => {
  const engine = read(ENGINE)

  it('push de fondo de línea, con la store filtrada por path', () => {
    expect(engine).toContain('packDiffDecorations(getDiffDecorations(this.currentPath))')
    expect(engine).toContain('module.setDiffDecorations([])')
  })

  it('el subscribe re-empuja las DOS capas', () => {
    expect(engine).toMatch(/subscribeToDecorations\(\(\) => \{[\s\S]*this\.pushUnderlines\(\)[\s\S]*this\.pushDiffDecorations\(\)/)
  })

  it('lo empujan donde se empujan los subrayados: al ACTIVAR la sesión', () => {
    // El bug que esto fija: la tab de diff se abría con el nombre "(diff)" pero
    // SIN pintar, porque el push no estaba en el camino de activación de la
    // sesión (el diff aparecía recién cuando otra tab disparaba el siguiente).
    const start = engine.indexOf('private startHighlightPipelines')
    expect(start).toBeGreaterThan(-1)
    const end = engine.indexOf('\n  private ', start + 10)
    const body = engine.slice(start, end === -1 ? undefined : end)

    expect(body).toContain('this.pushDiffDecorations()')
    // Y va DESPUÉS de limpiar lo del archivo anterior: si no, el diff viejo
    // quedaría pintado sobre el nuevo hasta el próximo push.
    expect(body.indexOf('resetHostTokens')).toBeLessThan(body.indexOf('this.pushDiffDecorations()'))
  })

  it('lo empuja al abrir el archivo (si no, queda con el diff del anterior)', () => {
    const pushes = engine.match(/this\.pushDiffDecorations\(\)/g) ?? []
    // subscribe + startHighlightPipelines
    expect(pushes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('la tab de diff es de archivo: contenido provisto + sólo lectura', () => {
  const session = read(SESSION)

  it('usa el contenido provisto antes de leer el disco', () => {
    expect(session).toContain('getProvidedContent(this.path)')
    expect(session).toMatch(/if \(text === null && provided\)/)
  })

  it('aplica el modo sólo lectura del motor al activar la sesión', () => {
    expect(session).toContain('engine.setReadOnly(provided?.readOnly === true)')
    // Y lo baja al cerrar la tab (si no, se acumula memoria por diff).
    expect(session).toContain('clearProvidedContent(path)')
  })
})

describe('las tools de edición abren el diff al clickearse', () => {
  it('las cuatro comparten el mismo handler (no triplicado)', () => {
    for (const tool of ['write_file', 'append_file', 'replace_in_file', 'delete_file']) {
      const src = read(`src/renderer/src/services/ai/tools/${tool}/index.tsx`)
      expect(src).toContain('onOpen: openEditToolDiff')
      expect(src).toContain("from '@services/diff/toolOpen'")
    }
  })

  it('delete_file captura el contenido ANTES de borrar (si no, no hay diff)', () => {
    const src = read('src/renderer/src/services/ai/tools/delete_file/executor.ts')
    expect(src).toMatch(/fs\.readFile\(fullPath\)/)
    expect(src).toContain('originalContent')
    expect(src).toContain('modifiedContent:')
    // La lectura tiene que ir antes del borrado.
    expect(src.indexOf('readFile')).toBeLessThan(src.indexOf('deleteFile'))
  })

  it('el shell le pasa el par viejo/nuevo al `onOpen` de la tool', () => {
    const shell = read(SHELL)
    expect(shell).toContain('originalContent: execution.originalContent')
    expect(shell).toContain('modifiedContent: execution.modifiedContent')
  })

  it('los DOS caminos del chat reenvían el par viejo/nuevo (no sólo la card)', () => {
    // El chat principal y el subagente tienen runners distintos. Si uno descarta
    // los campos, el `onOpen` recibe `undefined` y el click NO hace nada — que
    // es exactamente lo que pasaba antes de este arreglo.
    const service = read('src/renderer/src/services/chat/chat.service.ts')
    expect(service).toContain('originalContent: execution.originalContent')
    expect(service).toContain('modifiedContent: execution.modifiedContent')

    const runner = read('src/renderer/src/services/ai/agents/runner.ts')
    expect(runner).toContain('originalContent: execution.originalContent')
    expect(runner).toContain('modifiedContent: execution.modifiedContent')
  })
})

describe('el tema puede pintar el diff (y no miente con los avisos)', () => {
  it('se emiten los tints del diff y el `success` que el schema prometía', () => {
    const logic = read('src/renderer/src/services/extensions/types/themes/logic.ts')
    expect(logic).toContain("'--color-diff-added'")
    expect(logic).toContain("'--color-diff-removed'")
    expect(logic).toContain("'--color-diff-modified'")
    // Estaba en el schema y no se emitía: 11 call sites caían a un verde fijo.
    expect(logic).toContain("push(c.success, '--color-success')")
  })

  it('una clave de color desconocida NO se reporta como "color inválido"', () => {
    const schema = read('src/renderer/src/services/extensions/types/themes/schema.ts')
    expect(schema).toContain('THEME_COLOR_KEYS')
    expect(schema).toContain('if (!THEME_COLOR_KEYS.has(key)) continue')
  })
})

describe('el visor arma un diff unificado (quitadas arriba, agregadas abajo)', () => {
  it('el buffer se renderiza desde las filas y las decoraciones salen de ellas', () => {
    const src = read('src/renderer/src/services/diff/index.ts')
    expect(src).toContain('renderDiffRows(rows)')
    expect(src).toContain('diffRows(before, after)')
    expect(src).toContain('rowsToLines(rows, options.colors)')
    // Los índices son del BUFFER renderizado, no del archivo: si se calcularan
    // sobre el original, el tinte caería una línea corrido.
    expect(src).toContain('Filas → rangos de línea del BUFFER')
  })
})

describe('la limpieza del diff arranca con la app', () => {
  it('main.tsx llama a initDiffViews', () => {
    expect(read('src/renderer/src/main.tsx')).toContain('initDiffViews()')
  })
})
