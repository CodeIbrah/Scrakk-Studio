// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Codec del sobre `codefile`: metadatos + key de R2 en UNA línea JSON.
 *
 * Cubre los límites (líneas/caracteres), el round-trip y el rechazo de sobres
 * corruptos (un sobre inválido NO debe romper el render: cae a null).
 */

import { describe, it, expect } from 'vitest'
import {
  CODE_FILE_LIMITS,
  checkCodeFileContent,
  codeFileDaysLeft,
  countLines,
  decodeCodeFile,
  encodeCodeFile,
  formatFileSize,
  isCodeFileExpired,
  type SocialCodeFile
} from '../src/shared/socialCodeFile'

const SHA = 'a'.repeat(64)

function meta(overrides: Partial<SocialCodeFile> = {}): SocialCodeFile {
  return {
    v: 1,
    kind: 'codefile',
    name: 'server.ts',
    lang: 'typescript',
    lines: 42,
    size: 1234,
    sha: SHA,
    key: 'code/11111111-2222-3333-4444-555555555555',
    expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    ...overrides
  }
}

describe('countLines', () => {
  it('cuenta saltos de línea', () => {
    expect(countLines('')).toBe(0)
    expect(countLines('a')).toBe(1)
    expect(countLines('a\nb\nc')).toBe(3)
    expect(countLines('a\n')).toBe(2)
  })
})

describe('checkCodeFileContent', () => {
  it('acepta dentro de los límites', () => {
    const result = checkCodeFileContent('linea 1\nlinea 2')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.lines).toBe(2)
  })

  it('rechaza vacío', () => {
    expect(checkCodeFileContent('').ok).toBe(false)
  })

  it('rechaza más líneas que el tope', () => {
    const content = new Array(CODE_FILE_LIMITS.lines + 1).fill('x').join('\n')
    const result = checkCodeFileContent(content)
    expect(result.ok).toBe(false)
  })

  it('rechaza más caracteres que el tope', () => {
    const result = checkCodeFileContent('x'.repeat(CODE_FILE_LIMITS.chars + 1))
    expect(result.ok).toBe(false)
  })
})

describe('encode / decode', () => {
  it('round-trip exacto', () => {
    const original = meta()
    const decoded = decodeCodeFile(encodeCodeFile(original))
    expect(decoded).toEqual(original)
  })

  it('el sobre entra cómodo en el cap de mensajes (4000)', () => {
    const encoded = encodeCodeFile(meta({ name: 'un-nombre-de-archivo-largo.ts' }))
    expect(encoded.length).toBeLessThan(4000)
    expect(encoded.includes('\n')).toBe(false)
  })

  it('rechaza basura, versión desconocida y kind equivocado', () => {
    expect(decodeCodeFile('no es json')).toBeNull()
    expect(decodeCodeFile('[]')).toBeNull()
    expect(decodeCodeFile(JSON.stringify({ ...meta(), v: 2 }))).toBeNull()
    expect(decodeCodeFile(JSON.stringify({ ...meta(), kind: 'normal' }))).toBeNull()
  })

  it('rechaza sha inválido y key con path traversal', () => {
    expect(decodeCodeFile(JSON.stringify({ ...meta(), sha: 'corto' }))).toBeNull()
    expect(decodeCodeFile(JSON.stringify({ ...meta(), key: '../../etc/passwd' }))).toBeNull()
  })

  it('un body normal (texto) devuelve null', () => {
    expect(decodeCodeFile('hola, ¿cómo va?')).toBeNull()
  })
})

describe('vencimiento', () => {
  it('detecta expirado y cuenta los días restantes', () => {
    const past = meta({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(isCodeFileExpired(past)).toBe(true)
    expect(codeFileDaysLeft(past)).toBe(0)

    const future = meta({ expiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString() })
    expect(isCodeFileExpired(future)).toBe(false)
    expect(codeFileDaysLeft(future)).toBe(3)
  })
})

describe('formatFileSize', () => {
  it('formatea bytes, KB y MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
