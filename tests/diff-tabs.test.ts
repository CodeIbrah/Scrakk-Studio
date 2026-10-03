// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tabs de diff — la API con la que la app abre "mostrame este cambio".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * Una tab de diff es una tab de archivo con path sintético, contenido provisto
 * y fondo de línea. Las cuatro cosas que se rompen en silencio son:
 *
 *   1. el contenido — si no queda registrado, `fileSession` lee el disco con un
 *      path que no existe y la tab sale VACÍA sin ningún error,
 *   2. el sólo lectura — una tab de diff que se puede editar miente,
 *   3. el fondo de línea — los hunks tienen que llegar al store del archivo
 *      sintético (no al real), y
 *   4. el color por llamada — el motor pinta lo que le llega, así que un
 *      override que no viaja es un color que ignora la API.
 *
 * Además: el proveedor es lo que decide quién da las órdenes del diff, así que
 * un id desconocido no puede abrir una tab vacía.
 */

import { describe, expect, it, vi } from 'vitest'

// `fileSession`/`editorBus`/`themeColor` tocan el DOM: sin stub, el import cae.
vi.stubGlobal('window', {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  localStorage: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    key: () => null,
    length: 0
  }
})
vi.stubGlobal('document', { documentElement: {} })

import {
  _resetDiffForTests,
  CONTENT_DIFF_PROVIDER,
  DIFF_SCHEME,
  hasDiffProvider,
  initDiffViews,
  listDiffProviders,
  openDiffTab,
  registerDiffProvider,
  unregisterDiffProvider
} from '../src/renderer/src/services/diff'
import { closeFile, getEditorFiles } from '../src/renderer/src/features/editor/editorBus'
import {
  fileHandlerRegistry,
  registerBuiltinFileHandlers
} from '../src/renderer/src/features/fileHandlers'
import { getProvidedContent } from '../src/renderer/src/features/editor/providedContent'
import { dismissNotification, listNotifications } from '../src/renderer/src/services/notifications'
import {
  _resetDecorationsStoreForTests,
  diffLineColor,
  getDiffDecorations,
  getDiffSources,
  packDiffDecorations,
  setDiffDecorations
} from '../src/renderer/src/services/decorations'
import { colorToRgba } from '../src/renderer/src/features/editor/engines/innerta/innertaTheme'

/** El último path de tab que abrió una API de diff. */
function lastTabPath(): string {
  const files = getEditorFiles().openFiles
  return files[files.length - 1]?.path ?? ''
}

// La limpieza al cerrar se engancha UNA vez (como en `main.tsx`).
initDiffViews()

describe('openDiffTab: abre una tab de archivo con el cambio', () => {
  it('registra el contenido (sólo lectura), el fondo de línea y la tab', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({
      path: '/w/a.ts',
      before: 'a\nb\nc\n',
      after: 'a\nB\nc\n',
      provider: CONTENT_DIFF_PROVIDER
    })

    const tabPath = lastTabPath()
    // Path sintético: nunca colisiona con un archivo real.
    expect(tabPath.startsWith(`${DIFF_SCHEME}://`)).toBe(true)
    // El basename va al final para que el strip de tabs muestre el nombre real.
    expect(tabPath.endsWith('/a.ts')).toBe(true)

    // 1. El contenido provisto: si no, la tab saldría vacía.
    expect(getProvidedContent(tabPath)).toEqual({ text: 'a\nB\nc\n', readOnly: true })

    // 2. El fondo de línea va al path SINTÉTICO, no al real.
    const lines = getDiffDecorations(tabPath)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ startLine: 1, endLine: 1, kind: 'modified' })
    expect(getDiffDecorations('/w/a.ts')).toEqual([])

    closeFile(tabPath)
  })

  it('el hunk agregado se pinta en su línea del DESPUÉS', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/b.ts', before: 'a\nc\n', after: 'a\nX\nY\nc\n' })
    const lines = getDiffDecorations(lastTabPath())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ startLine: 1, endLine: 2, kind: 'added' })

    closeFile(lastTabPath())
  })

  it('sin par de contenidos igual abre la tab (el diff sale del texto vacío)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/c.ts' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.readOnly).toBe(true)
    expect(getDiffDecorations(tabPath)).toEqual([])

    closeFile(tabPath)
  })

  it('una eliminación muestra lo que HABÍA, todo marcado como quitado', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    // `delete_file` manda el "después" vacío. El buffer sólo puede mostrar un
    // lado, así que la tab muestra el contenido borrado, entero en rojo.
    await openDiffTab({ path: '/w/borrado.ts', before: 'a\nb\nc\n', after: '' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe('a\nb\nc\n')
    expect(getDiffDecorations(tabPath)).toEqual([
      expect.objectContaining({ startLine: 0, endLine: 2, kind: 'removed' })
    ])
    // Y sigue siendo de sólo lectura: un archivo borrado no se edita.
    expect(getProvidedContent(tabPath)?.readOnly).toBe(true)

    closeFile(tabPath)
  })
})

describe('openDiffTab: sin notificaciones al abrir', () => {
  it('abrir un diff NO muestra un toast (era ruido en cada click)', async () => {
    for (const notice of listNotifications()) dismissNotification(notice.id)
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/n1.ts', before: 'a\n', after: 'a\nb\n' })

    expect(listNotifications()).toHaveLength(0)
    closeFile(lastTabPath())
  })

  it('un proveedor desconocido SÍ avisa (eso es un error, no un diff)', async () => {
    for (const notice of listNotifications()) dismissNotification(notice.id)
    _resetDiffForTests()

    await openDiffTab({ path: '/w/n2.ts', provider: 'nope' })

    expect(listNotifications().length).toBeGreaterThan(0)
    for (const notice of listNotifications()) dismissNotification(notice.id)
  })
})

describe('openDiffTab: quién da las órdenes', () => {
  it('un proveedor desconocido NO abre una tab vacía', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()
    const before = getEditorFiles().openFiles.length

    await openDiffTab({ path: '/w/d.ts', provider: 'no-existe' })

    expect(getEditorFiles().openFiles).toHaveLength(before)
    expect(hasDiffProvider('no-existe')).toBe(false)
  })

  it('un proveedor propio decide los hunks (no se usa el LCS local)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()
    registerDiffProvider('git', () => ({
      content: 'línea única\n',
      hunks: [{ startLine: 0, endLine: 0, kind: 'added' }]
    }))

    await openDiffTab({ path: '/w/e.ts', provider: 'git' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe('línea única\n')
    expect(getDiffDecorations(tabPath)[0]).toMatchObject({ kind: 'added' })
    expect(getDiffSources(tabPath)).toEqual(['diff:git:d1'])

    closeFile(tabPath)
    unregisterDiffProvider('git')
  })

  it('el registro se puede enumerar (diagnóstico de las fuentes disponibles)', () => {
    _resetDiffForTests()
    expect(listDiffProviders()).toEqual([CONTENT_DIFF_PROVIDER])
    registerDiffProvider('zzz', () => ({ content: '', hunks: [] }))
    expect(listDiffProviders()).toEqual([CONTENT_DIFF_PROVIDER, 'zzz'])
    unregisterDiffProvider('zzz')
  })
})

describe('openDiffTab: el color lo elige quien pide el diff', () => {
  it('un override por tipo de cambio viaja al store (el motor pinta lo que llega)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({
      path: '/w/f.ts',
      before: 'a\n',
      after: 'a\nZ\n',
      colors: { added: '#12345678' }
    })
    const lines = getDiffDecorations(lastTabPath())
    expect(lines[0].color).toBe(colorToRgba('#12345678'))

    closeFile(lastTabPath())
  })
})

describe('initDiffViews: la tab cerrada no deja basura', () => {
  it('al cerrar la tab se baja su fondo de línea', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/g.ts', before: 'a\n', after: 'a\nb\n' })
    const tabPath = lastTabPath()
    expect(getDiffSources(tabPath)).not.toEqual([])

    closeFile(tabPath)
    // El bus emite al cerrar y el suscriptor limpia esa fuente.
    expect(getDiffSources(tabPath)).toEqual([])
  })
})

describe('el path sintético no lo roba un visor de formato', () => {
  it('un diff de markdown NO abre el visor de markdown (va al editor)', () => {
    registerBuiltinFileHandlers()
    // Sin el fix de `matches`, el handler de markdown ganaba por EXTENSIÓN y la
    // tab de diff salía como visor en vez de editor.
    expect(fileHandlerRegistry.resolve(`${DIFF_SCHEME}://d1/readme.md`)).toBeNull()
    // El archivo real sigue resolviéndose: no se rompió el matcheo normal.
    expect(fileHandlerRegistry.resolve('/w/readme.md')?.id).toBe('markdown')
  })
})

describe('store: la capa de fondo de línea (hermana del subrayado)', () => {
  it('varias fuentes se agregan y se pueden bajar por separado', () => {
    _resetDecorationsStoreForTests()
    setDiffDecorations('diff:a', '/w/x.ts', [
      { startLine: 0, endLine: 2, kind: 'added', color: 0x3fb95033 }
    ])
    setDiffDecorations('diff:b', '/w/x.ts', [
      { startLine: 5, endLine: 5, kind: 'removed', color: 0xf8514933 }
    ])
    expect(getDiffDecorations('/w/x.ts')).toHaveLength(2)
    expect(getDiffSources('/w/x.ts')).toEqual(['diff:a', 'diff:b'])
  })

  it('un rango invertido o fuera de rango no entra', () => {
    _resetDecorationsStoreForTests()
    setDiffDecorations('diff:a', '/w/y.ts', [
      { startLine: 4, endLine: 1, kind: 'modified', color: 1 },
      { startLine: -1, endLine: 2, kind: 'added', color: 1 }
    ])
    expect(getDiffDecorations('/w/y.ts')).toEqual([])
  })

  it('el cuarteto es `(startLine, endLine, kind, rgba)`', () => {
    expect(
      packDiffDecorations([{ startLine: 2, endLine: 4, kind: 'removed', color: 0xaabbccdd | 0 }])
    ).toEqual([2, 4, 2, 0xaabbccdd | 0])
  })

  it('`diffLineColor` con override no consulta el tema', () => {
    expect(diffLineColor('added', 'rgba(1,2,3,0.5)')).toBe(colorToRgba('rgba(1,2,3,0.5)'))
  })
})
