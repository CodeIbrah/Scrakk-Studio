// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * FileHandlers — detección por formato (extensión/glob/languageId/esquema),
 * prioridad entre handlers y modo efectivo (view ⇄ text).
 */

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
