// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tabs de diff — la API con la que la app abre "mostrame este cambio".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * La tab muestra un **diff unificado** (contexto + quitadas arriba + agregadas
 * abajo) en un editor de sólo lectura, con cada línea teñida. Lo que se rompe
 * en silencio es:
 *
 *   1. el contenido — si no queda registrado, `fileSession` lee el disco con un
 *      path que no existe y la tab sale VACÍA sin ningún error,
 *   2. el sólo lectura — una tab de diff que se puede editar miente,
 *   3. las decoraciones — sus índices son los del BUFFER renderizado, no los
 *      del archivo: correrse una línea pinta el renglón de al lado, y
 *   4. el color por llamada — el motor pinta lo que le llega, así que un
 *      override que no viaja es un color que ignora la API.
 *
 * Además: el proveedor es lo que decide quién da las órdenes del diff, así que
 * un id desconocido no puede abrir una tab vacía ni romper en silencio.
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

describe('openDiffTab: el buffer ES el diff unificado', () => {
  it('muestra contexto, quitadas arriba y agregadas abajo', async () => {
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

    // 1. El contenido provisto: el DIFF, con prefijos. Si no, la tab sale vacía.
    expect(getProvidedContent(tabPath)).toEqual({
      text: ' a\n-b\n+B\n c',
      readOnly: true
    })

    // 2. Las decoraciones apuntan a las líneas del BUFFER (1 = `-b`, 2 = `+B`).
    const lines = getDiffDecorations(tabPath)
    expect(lines).toEqual([
      expect.objectContaining({ startLine: 1, endLine: 1, kind: 'removed' }),
      expect.objectContaining({ startLine: 2, endLine: 2, kind: 'added' })
    ])
    // Y no al path real.
    expect(getDiffDecorations('/w/a.ts')).toEqual([])

    closeFile(tabPath)
  })

  it('varias agregadas seguidas son UN rango (no una decoración por línea)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/b.ts', before: 'a\nc\n', after: 'a\nX\nY\nc\n' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe(' a\n+X\n+Y\n c')
    expect(getDiffDecorations(tabPath)).toEqual([
      expect.objectContaining({ startLine: 1, endLine: 2, kind: 'added' })
    ])

    closeFile(tabPath)
  })

  it('sin par de contenidos la tab es un único renglón de contexto', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/c.ts' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.readOnly).toBe(true)
    expect(getDiffDecorations(tabPath)).toEqual([])

    closeFile(tabPath)
  })

  it('un archivo nuevo muestra todo agregado (sin renglón fantasma)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/nuevo.ts', before: '', after: 'x\ny\n' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe('+x\n+y')
    expect(getDiffDecorations(tabPath)).toHaveLength(1)

    closeFile(tabPath)
  })

  it('una eliminación muestra lo que HABÍA, todo marcado como quitado', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    // `delete_file` manda el "después" vacío: no hay lado nuevo que mostrar.
    await openDiffTab({ path: '/w/borrado.ts', before: 'a\nb\nc\n', after: '' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe('-a\n-b\n-c')
    expect(getDiffDecorations(tabPath)).toEqual([
      expect.objectContaining({ startLine: 0, endLine: 2, kind: 'removed' })
    ])
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

  it('un proveedor propio decide las filas (no se usa el LCS local)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()
    registerDiffProvider('git', () => ({
      rows: [{ kind: 'added', text: 'línea única' }]
    }))

    await openDiffTab({ path: '/w/e.ts', provider: 'git' })
    const tabPath = lastTabPath()
    expect(getProvidedContent(tabPath)?.text).toBe('+línea única')
    expect(getDiffDecorations(tabPath)[0]).toMatchObject({ kind: 'added', startLine: 0 })
    expect(getDiffSources(tabPath)).toEqual(['diff:git:d1'])

    closeFile(tabPath)
    unregisterDiffProvider('git')
  })

  it('el registro se puede enumerar (diagnóstico de las fuentes disponibles)', () => {
    _resetDiffForTests()
    expect(listDiffProviders()).toEqual([CONTENT_DIFF_PROVIDER])
    registerDiffProvider('zzz', () => ({ rows: [] }))
    expect(listDiffProviders()).toEqual([CONTENT_DIFF_PROVIDER, 'zzz'])
    unregisterDiffProvider('zzz')
  })
})

describe('openDiffTab: el color y el resumen', () => {
  it('un override por tipo viaja al store (el motor pinta lo que llega)', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({
      path: '/w/f.ts',
      before: 'a\n',
      after: 'a\nZ\n',
      colors: { added: '#12345678' }
    })
    expect(getDiffDecorations(lastTabPath())[0].color).toBe(colorToRgba('#12345678'))

    closeFile(lastTabPath())
  })

  it('devuelve el resumen `+N / −M` para que el caller lo muestre donde quiera', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    const summary = await openDiffTab({ path: '/w/g.ts', before: 'a\nb\nc\n', after: 'a\nB\nZ\nc\n' })
    expect(summary).toEqual({ added: 2, removed: 1 })

    closeFile(lastTabPath())
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

describe('initDiffViews: la tab cerrada no deja basura', () => {
  it('al cerrar la tab se baja su fondo de línea', async () => {
    _resetDecorationsStoreForTests()
    _resetDiffForTests()

    await openDiffTab({ path: '/w/h.ts', before: 'a\n', after: 'a\nb\n' })
    const tabPath = lastTabPath()
    expect(getDiffSources(tabPath)).not.toEqual([])

    closeFile(tabPath)
    // El bus emite al cerrar y el suscriptor limpia esa fuente.
    expect(getDiffSources(tabPath)).toEqual([])
  })
})
