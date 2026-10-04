// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cadena de fuentes de la terminal — el invariante que la hace FIEL.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ SE PRUEBA Y POR QUÉ
 *
 * La terminal resuelve los glifos que su primaria no tiene (box-drawing `─`,
 * bloques, braille `⠋`, flechas, powerline) recorriendo la cadena EN ORDEN. Que
 * eso se vea igual que en la terminal del usuario depende de un solo invariante:
 *
 *   > para cada code point, la PRIMERA fuente de nuestra cadena que lo cubre
 *   > tiene que ser la MISMA que elegiría fontconfig.
 *
 * Si alguien reordena la cadena, cambia los topes o agrega un bloque sin su code
 * point de muestra, esto falla — que es justo lo que no se ve hasta que el
 * usuario compara con su terminal.
 *
 * Sólo corre donde hay fontconfig (`fc-match`): en Windows o en un CI sin él se
 * saltea, no se finge.
 */

import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import {
  FONT_STACK_MAX_FONTS,
  TERMINAL_SAMPLE_CODEPOINTS,
  readFontStack,
  resolveFontCandidates,
  systemFontForCodepoint,
  systemPrimaryFont
} from '../src/main/fonts/systemFonts'

function hasFontconfig(): boolean {
  try {
    execSync('fc-match --version', { stdio: 'ignore', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

/** Los archivos que CUBREN ese code point (una consulta por code point). */
function coveringFiles(codepoint: number): Set<string> {
  try {
    const out = execSync(`fc-list --format=%{file}\\n ':charset=${codepoint.toString(16)}'`, {
      encoding: 'utf-8',
      timeout: 4000
    })
    return new Set(
      out
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    )
  } catch {
    return new Set()
  }
}

describe.skipIf(!hasFontconfig())('cadena de fuentes de la terminal', () => {
  const chain = resolveFontCandidates()

  it('la primaria es la monoespaciada del sistema', () => {
    expect(chain.length).toBeGreaterThan(0)
    expect(chain[0]).toBe(systemPrimaryFont())
  })

  it('no repite fuentes', () => {
    expect(new Set(chain).size).toBe(chain.length)
  })

  it('para cada code point gana LA MISMA fuente que fontconfig', () => {
    // El corazón: la primera que cubre, en el orden de nuestra cadena.
    for (const codepoint of TERMINAL_SAMPLE_CODEPOINTS) {
      const expected = systemFontForCodepoint(codepoint)
      if (!expected) continue
      const covering = coveringFiles(codepoint)
      const ours = chain.find((file) => covering.has(file))
      expect(
        ours,
        `U+${codepoint.toString(16).toUpperCase()}: fontconfig usa ${expected}`
      ).toBe(expected)
    }
  })

  it('los topes se respetan al leer los archivos', () => {
    const stack = readFontStack(chain)
    if (!stack) return
    expect(stack.length).toBeLessThanOrEqual(FONT_STACK_MAX_FONTS)
    expect(stack[0].family.length).toBeGreaterThan(0)
  })

  it('sin candidatas no hay cadena (no se inventa una)', () => {
    expect(readFontStack([])).toBeNull()
  })
})
