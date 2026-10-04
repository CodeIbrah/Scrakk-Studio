// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Fuentes de la TERMINAL resueltas desde el sistema.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ
 *
 * El motor resolvía los glifos que la primaria no tiene (box-drawing `─`,
 * bloques, braille `⠋`, powerline, flechas) con una lista FIJA de fuentes
 * empaquetadas. Eso hace que el mismo carácter se vea distinto que en la
 * terminal del usuario, que los resuelve con **fontconfig**.
 *
 * Acá se resuelve lo mismo que resolvería esa terminal: por cada code point que
 * una terminal usa se le pregunta a fontconfig QUÉ fuente elegiría, y se arma la
 * cadena con esas fuentes, ordenadas por cuántos code points les tocan (el motor
 * resuelve por orden, así coincide con fontconfig).
 *
 * Este archivo NO importa Electron a propósito: así se puede testear (ver
 * `tests/terminal-font-stack.test.ts`) y no depende de la ventana.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { TerminalFontFile } from '@shared/terminal'

/**
 * Presupuesto de la cadena.
 *
 * Las fuentes del sistema son GRANDES y cada módulo WASM (una terminal) carga su
 * propia copia: sin tope, un Noto CJK de ~20 MB por terminal se come la memoria.
 * Con esto entran las de símbolos, box-drawing, braille y powerline (las que se
 * veían distintas) y se saltean las gigantes.
 */
export const FONT_STACK_MAX_FONTS = 10
export const FONT_STACK_MAX_FONT_BYTES = 6 * 1024 * 1024
export const FONT_STACK_MAX_TOTAL_BYTES = 24 * 1024 * 1024

/**
 * Code points que una TERMINAL necesita y que la monoespaciada casi nunca trae.
 *
 * Uno por bloque alcanza: lo que importa es QUÉ fuente elige fontconfig para
 * cada caso. Si se agrega un bloque nuevo, se agrega un code point acá.
 */
export const TERMINAL_SAMPLE_CODEPOINTS: readonly number[] = [
  0x2500, // box drawing: ─
  0x2502, // box drawing: │
  0x2588, // block elements: █
  0x2591, // block elements: ░
  0x2800, // braille: ⠀
  0x21b5, // flechas: ↵
  0x2192, // flechas: →
  0x25cf, // formas geométricas: ●
  0x2713, // dingbats: ✓
  0x2261, // matemática: ≡
  0xe0b0, // powerline (área privada): 
  0x1f600 // emoji astral: 😀
]

/** Ejecuta `fc-match` (vacío si no hay fontconfig o falla). */
function fcMatch(args: string): string {
  try {
    return execSync(`fc-match ${args}`, { encoding: 'utf-8', timeout: 4000 }).trim()
  } catch {
    return ''
  }
}

/**
 * Fuente que fontconfig usaría para ESE code point (la verdad del sistema).
 *
 * Es la misma pregunta que responde una terminal de verdad cuando se topa con
 * un carácter que su fuente primaria no tiene.
 */
export function systemFontForCodepoint(codepoint: number, family = 'monospace'): string | null {
  if (process.platform === 'win32') return null
  const out = fcMatch(`--format=%{file} ':charset=${codepoint.toString(16)}' ${family}`)
  return out && fs.existsSync(out) ? out : null
}

/** La monoespaciada primaria del sistema. */
export function systemPrimaryFont(family = 'monospace'): string | null {
  if (process.platform === 'win32') return null
  const out = fcMatch(`--format=%{file} ${family}`)
  return out && fs.existsSync(out) ? out : null
}

/** Las candidatas ORDENADAS de fontconfig (`fc-match -s`), sin repetir. */
export function systemFallbackList(family = 'monospace'): string[] {
  if (process.platform === 'win32') return []
  const out = fcMatch(`-s --format=%{file}\\n ${family}`)
  const list: string[] = []
  for (const line of out.split('\n')) {
    const file = line.trim()
    if (file && fs.existsSync(file) && !list.includes(file)) list.push(file)
  }
  return list
}

/**
 * La lista de Windows: no hay fontconfig, así que van las fuentes que Windows
 * usa para las consolas — mono primero y después las de símbolos, emoji y CJK.
 */
export function windowsFontCandidates(): string[] {
  const dir = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
  return [
    'consola.ttf', // Consolas: la mono por defecto de las consolas
    'lucon.ttf', // Lucida Console
    'seguisym.ttf', // Segoe UI Symbol: box-drawing, flechas, dingbats
    'seguiemj.ttf', // Segoe UI Emoji
    'arial.ttf',
    'msgothic.ttc', // CJK (japonés)
    'malgun.ttf', // CJK (coreano)
    'msyh.ttc', // CJK (simplificado)
    'simsun.ttc'
  ]
    .map((name) => path.join(dir, name))
    .filter((file) => fs.existsSync(file))
}

/**
 * Rutas de las fuentes de la terminal, EN ORDEN (primaria primero).
 *
 * Linux: la primaria es la mono del sistema y los REEMPLAZOS son las fuentes que
 * fontconfig elegiría para los code points de `TERMINAL_SAMPLE_CODEPOINTS`,
 * ordenadas por CUÁNTOS le tocan. El motor resuelve por orden, así que eso lo
 * hace coincidir con el sistema en vez de con las fuentes empaquetadas.
 *
 * Se resuelve EN CALIENTE (nada se guarda en disco).
 */
export function resolveFontCandidates(family = 'monospace'): string[] {
  if (process.platform === 'win32') return windowsFontCandidates()

  const primary = systemPrimaryFont(family)
  const assigned: string[] = []
  const counts = new Map<string, number>()
  for (const codepoint of TERMINAL_SAMPLE_CODEPOINTS) {
    const file = systemFontForCodepoint(codepoint, family)
    if (!file) continue
    counts.set(file, (counts.get(file) ?? 0) + 1)
    if (!assigned.includes(file)) assigned.push(file)
  }

  // Más code points asignados = más relevante = más arriba. Empate: el orden en
  // que fontconfig los fue devolviendo (estable).
  const ordered = [...assigned].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))

  const out: string[] = []
  const push = (file: string | null): void => {
    if (file && !out.includes(file)) out.push(file)
  }
  push(primary)
  for (const file of ordered) push(file)
  // Red de seguridad: si las consultas por code point no dieron nada (fontconfig
  // raro), queda la lista ordenada completa.
  for (const file of systemFallbackList(family)) push(file)
  return out
}

/** Lee los archivos de la cadena (con sus topes) y les pone un nombre legible. */
export function readFontStack(candidates: readonly string[]): TerminalFontFile[] | null {
  const out: TerminalFontFile[] = []
  let total = 0
  for (const file of candidates) {
    if (out.length >= FONT_STACK_MAX_FONTS) break
    try {
      const stat = fs.statSync(file)
      if (stat.size > FONT_STACK_MAX_FONT_BYTES) continue
      if (total + stat.size > FONT_STACK_MAX_TOTAL_BYTES) continue
      const data = fs.readFileSync(file)
      total += data.byteLength
      out.push({
        family: path.basename(file).replace(/\.[^.]+$/, ''),
        file,
        data: new Uint8Array(data)
      })
    } catch {
      // Archivo ilegible: se saltea en vez de tirar abajo la cadena.
    }
  }
  return out.length > 0 ? out : null
}
