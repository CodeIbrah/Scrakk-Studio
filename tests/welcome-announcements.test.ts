// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Anuncios de la bienvenida: qué changelog se muestra.
 *
 * Regresión del bug "la bienvenida muestra 0.1.1 teniendo 0.1.2 en el repo":
 * el release remoto ganaba SIEMPRE que trajera body, sin comparar versiones,
 * así que hasta publicar la release el panel enseñaba la versión vieja.
 */

import { describe, it, expect } from 'vitest'
import {
  parseLatestEntry,
  pickAnnouncement,
  versionFromPath,
  type WelcomeAnnouncement
} from '../src/renderer/src/features/layout/panels/WelcomePanel/changelog'

const ann = (version: string): WelcomeAnnouncement => ({
  version,
  title: `T ${version}`,
  summary: `S ${version}`,
  body: `B ${version}`
})

describe('pickAnnouncement', () => {
  it('el changelog local más nuevo gana sobre un release remoto viejo', () => {
    expect(pickAnnouncement(ann('0.1.2'), ann('0.1.1'))?.version).toBe('0.1.2')
  })

  it('el release remoto más nuevo gana sobre un changelog local viejo', () => {
    expect(pickAnnouncement(ann('0.1.1'), ann('0.2.0'))?.version).toBe('0.2.0')
  })

  it('el remoto gana a igualdad (trae notas oficiales de esa versión)', () => {
    expect(pickAnnouncement(ann('0.1.2'), ann('0.1.2'))?.version).toBe('0.1.2')
  })

  it('si falta uno de los dos, devuelve el otro', () => {
    expect(pickAnnouncement(ann('0.1.2'), null)?.version).toBe('0.1.2')
    expect(pickAnnouncement(null, ann('0.1.1'))?.version).toBe('0.1.1')
    expect(pickAnnouncement(null, null)).toBeNull()
  })

  it('compara por segmentos, no por texto (0.1.10 > 0.1.9)', () => {
    expect(pickAnnouncement(ann('0.1.10'), ann('0.1.9'))?.version).toBe('0.1.10')
  })
})

describe('parseLatestEntry', () => {
  it('separa versión, título, resumen y cuerpo de la primera entrada', () => {
    const md = [
      '# Changelog',
      '',
      '## 0.1.2 — Memoria, terminal y chat',
      '',
      '- **Primera** nota con `código`.',
      '',
      'Detalle de la nota.',
      '',
      '## 0.1.1 —vieja',
      '',
      '- No debe aparecer.'
    ].join('\n')
    const parsed = parseLatestEntry(md)
    expect(parsed?.version).toBe('0.1.2')
    expect(parsed?.title).toBe('Memoria, terminal y chat')
    expect(parsed?.summary).toBe('Primera nota con código.')
    expect(parsed?.body).toContain('Detalle de la nota.')
    expect(parsed?.body).not.toContain('No debe aparecer')
  })

  it('devuelve null si no hay entradas', () => {
    expect(parseLatestEntry('# Changelog\n\nsin entradas')).toBeNull()
  })
})

describe('versionFromPath', () => {
  it('extrae la versión del nombre del archivo', () => {
    expect(versionFromPath('docs/changelog/changelog-0.1.2.md')).toEqual([0, 1, 2])
    expect(versionFromPath('changelog-1.2.3.md')).toEqual([1, 2, 3])
    expect(versionFromPath('docs/otro.md')).toBeNull()
  })
})