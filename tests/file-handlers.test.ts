// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * FileHandlers — detección por formato (extensión/glob/languageId/esquema),
 * prioridad entre handlers y modo efectivo (view ⇄ text).
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  baseNameOf,
  extensionOf,
  matches,
  matchesGlob,
  pickHandler,
  schemeOf
} from '../src/renderer/src/features/fileHandlers/detect'
import {
  canToggleMode,
  effectiveMode
} from '../src/renderer/src/features/fileHandlers/preferences'
import {
  VIRTUAL_SCHEME,
  virtualIdOf,
  virtualPathOf
} from '../src/renderer/src/features/fileHandlers/detect'
import { fileHandlerRegistry } from '../src/renderer/src/features/fileHandlers/registry'
import type { FileHandler } from '../src/renderer/src/features/fileHandlers/types'

const image: FileHandler = {
  id: 'image',
  match: { extensions: ['png', 'jpg'] },
  mode: 'view',
  priority: 30
}
const markdown: FileHandler = {
  id: 'markdown',
  match: { extensions: ['md'] },
  mode: 'both',
  priority: 10
}
const dockerfile: FileHandler = {
  id: 'dockerfile',
  match: { globs: ['Dockerfile*'] },
  mode: 'text',
  priority: 5
}

describe('helpers de path', () => {
  it('extensionOf / baseNameOf', () => {
    expect(extensionOf('/a/b/Foo.TS')).toBe('ts')
    expect(extensionOf('Makefile')).toBe('')
    expect(extensionOf('/a/.env')).toBe('') // dotfile: no es extensión
    expect(baseNameOf('/a/b/Foo.ts')).toBe('Foo.ts')
  })

  it('schemeOf distingue esquema de letra de disco', () => {
    expect(schemeOf('/home/x/a.md')).toBe('file')
    expect(schemeOf('C:\\tmp\\a.md')).toBe('file')
    expect(schemeOf('scrakk-view://md/1')).toBe('scrakk-view')
  })

  it('matchesGlob', () => {
    expect(matchesGlob('Dockerfile', 'Dockerfile*')).toBe(true)
    expect(matchesGlob('Dockerfile.dev', 'Dockerfile*')).toBe(true)
    expect(matchesGlob('docker-compose.yml', 'Dockerfile*')).toBe(false)
  })
})

describe('matches', () => {
  it('por extensión', () => {
    expect(matches(image, '/x/a.png')).toBe(true)
    expect(matches(image, '/x/a.ts')).toBe(false)
  })

  it('por glob de basename', () => {
    expect(matches(dockerfile, '/x/Dockerfile')).toBe(true)
    expect(matches(dockerfile, '/x/Dockerfile.dev')).toBe(true)
    expect(matches(dockerfile, '/x/otro')).toBe(false)
  })

  it('por esquema', () => {
    const virtual: FileHandler = {
      id: 'virtual',
      match: { scheme: 'scrakk-view' },
      mode: 'view'
    }
    expect(matches(virtual, 'scrakk-view://x/1')).toBe(true)
    expect(matches(virtual, '/tmp/1.x')).toBe(false)
  })
})

describe('pickHandler', () => {
  const handlers = [markdown, image, dockerfile]

  it('gana el de mayor prioridad', () => {
    expect(pickHandler(handlers, '/x/a.png')?.id).toBe('image')
    expect(pickHandler(handlers, '/x/a.md')?.id).toBe('markdown')
    expect(pickHandler(handlers, '/x/Dockerfile')?.id).toBe('dockerfile')
  })

  it('sin match devuelve null (lo abre el editor)', () => {
    expect(pickHandler(handlers, '/x/a.ts')).toBeNull()
  })
})

describe('modo efectivo', () => {
  it('sin handler → texto; con view → view; con text → text', () => {
    expect(effectiveMode(null, '/x/a.ts')).toBe('text')
    expect(effectiveMode(image, '/x/a.png')).toBe('view')
    expect(effectiveMode(dockerfile, '/x/Dockerfile')).toBe('text')
  })

  it('both → visor por default y el ojo puede alternar', () => {
    expect(effectiveMode(markdown, '/x/a.md')).toBe('view')
    expect(canToggleMode(markdown)).toBe(true)
    expect(canToggleMode(image)).toBe(false)
  })
})

describe('tabs virtuales (scrakk-view://)', () => {
  it('arma y parsea el path', () => {
    expect(virtualPathOf('markdown')).toBe('scrakk-view://markdown')
    expect(virtualPathOf('markdown', 'a/b')).toBe('scrakk-view://markdown/a/b')
    expect(schemeOf(virtualPathOf('image', 'x'))).toBe(VIRTUAL_SCHEME)
    expect(virtualIdOf('scrakk-view://image/payload')).toBe('image')
    expect(virtualIdOf('/tmp/a.md')).toBe('')
  })

  it('el registry resuelve POR ID y siempre en modo visor', () => {
    const unregister = fileHandlerRegistry.register(markdown)
    try {
      expect(fileHandlerRegistry.resolve('scrakk-view://markdown/x')?.id).toBe('markdown')
      expect(fileHandlerRegistry.resolve('scrakk-view://nope/x')).toBeNull()
      // Un virtual no puede caer al editor: no hay archivo en disco.
      expect(effectiveMode(markdown, 'scrakk-view://markdown/x')).toBe('view')
      expect(canToggleMode(markdown, 'scrakk-view://markdown/x')).toBe(false)
    } finally {
      unregister()
    }
  })
})

/**
 * Regresión del cableado: el visor por formato tiene que estar en el punto de
 * MONTAJE real de una tab de archivo (`FileTabView`, que es lo que renderiza
 * `TabContentView`). Antes vivía sólo en `EditorPanel` —el panel `editor`
 * legacy— así que un PNG siempre caía en Innerta aunque el registry, los
 * handlers y el bundle estuvieran perfectos.
 *
 * Sin entorno DOM en los tests, se verifica el contrato por fuente: es
 * exactamente lo que se rompió.
 */
/** Lee un archivo del repo desde el test (no hay entorno DOM para renderizar). */
const read = (rel: string): string => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

describe('cableado del visor (regresión)', () => {
  it('FileTabView (la tab de archivo) monta el dispatcher', () => {
    const src = read('src/renderer/src/features/editor/FileTabView.tsx')
    expect(src).toContain('useFileViewDispatcher')
    // Si el formato tiene visor, NO se adjunta la sesión de Innerta.
    expect(src).toMatch(/if \(!host \|\| viewing\) return/)
    expect(src).toContain('node')
  })

  it('el dispatcher consulta el registry y usa import dinámico del visor', () => {
    const src = read('src/renderer/src/features/editor/FileViewDispatcher.tsx')
    expect(src).toContain('fileHandlerRegistry.resolve')
    expect(src).toContain('effectiveMode')
    expect(src).toContain('handler.load()')
    expect(src).toContain('registerBuiltinFileHandlers')
  })

  it('ningún otro punto de montaje del editor se saltea el dispatcher', () => {
    // El panel `editor` legacy también debe pasar por el dispatcher compartido.
    const panel = read('src/renderer/src/features/editor/EditorPanel.tsx')
    expect(panel).toContain('useFileViewDispatcher')
    expect(panel).not.toContain('fileHandlerRegistry.resolve')
  })
})

/**
 * El visor oculta el host del engine con `display:none`, y un host oculto
 * mide 0×0. El módulo WASM ABORTA si se le pasan dimensiones cero
 * ("Exception thrown, but exception catching is not enabled"), lo que tumbaba
 * la tab entera. El engine tiene que saltear el setBounds y dejar que el
 * ResizeObserver lo reaplique cuando el host vuelve a tener área.
 */
describe('bounds del engine con el host oculto (regresión)', () => {
  it('applyBounds nunca manda 0×0 al módulo', () => {
    const src = read('src/renderer/src/features/editor/engines/innerta/InnertaEngine.ts')
    const fn = src.slice(src.indexOf('const applyBounds'))
    expect(fn).toMatch(/if \(w <= 0 \|\| h <= 0\) return/)
    expect(fn).toMatch(/Math\.max\(this\.host\.clientWidth, 1\)|this\.module\.setBounds\(0, 0, w, h\)/)
  })

  it('el host del engine se oculta en vez de desmontarse (display, no hidden)', () => {
    const src = read('src/renderer/src/features/editor/FileTabView.tsx')
    // `hidden` como atributo no sirve: el `display:flex` inline lo pisa y el
    // host queda midiendo 0×0. Tiene que ser el `display` explícito.
    const jsx = src.slice(src.indexOf('return ('))
    expect(jsx).not.toMatch(/hidden=\{viewing\}/)
    expect(jsx).toMatch(/display: viewing \? 'none' : 'flex'/)
  })
})
