// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tablas del markdown — las dos reglas que las mantienen legibles.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE TEST (y por qué mira CSS)
 *
 * La tabla se veía aplastada aunque el panel estuviera ancho, y no había un
 * error: era geometría. Las dos causas son de CSS y las dos se revierten
 * "limpiando" una regla que parece obvia, así que se fijan acá:
 *
 *   1. la burbuja de la IA era shrink-to-fit (`flex-basis: auto`), así que una
 *      tabla adentro se medía contra el ancho del CONTENIDO: con celdas cortas
 *      la tabla salía angosta y el resto del panel quedaba vacío, y
 *   2. `.tbl { width: 100% }` impide que la tabla EXCEDA el contenedor, así que
 *      en vez de scrollear se aplasta (columnas partidas al medio).
 *
 * El render del `<table>` real con su wrapper de scroll lo arma `Markdown.tsx`.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const MD_CSS = 'src/renderer/src/features/chat/components/Markdown/Markdown.module.css'
const BUBBLE_CSS =
  'src/renderer/src/features/chat/components/MessageBubble/MessageBubble.module.css'
const MD_TSX = 'src/renderer/src/features/chat/components/Markdown/Markdown.tsx'

describe('tablas de markdown', () => {
  it('la tabla usa su ancho natural y crece hasta el 100% (no se aplasta)', () => {
    const css = read(MD_CSS)
    const block = css.slice(css.indexOf('.tbl {'), css.indexOf('}', css.indexOf('.tbl {')))
    expect(block).toContain('width: max-content')
    expect(block).toContain('min-width: 100%')
    // `width: 100%` es el bug: nunca puede exceder el contenedor → aplasta.
    expect(block).not.toMatch(/^\s*width: 100%/m)
  })

  it('el wrapper scrollea en vez de comprimir', () => {
    const css = read(MD_CSS)
    expect(css).toMatch(/\.tblWrap\s*\{[^}]*overflow-x: auto/)
  })

  it('la burbuja de la IA ocupa todo el ancho (no shrink-to-fit)', () => {
    const css = read(BUBBLE_CSS)
    // El ancho lo aporta la PILA (burbuja + acciones), que es el ítem de la fila.
    const stack = css.slice(
      css.indexOf('.stackAssistant {'),
      css.indexOf('}', css.indexOf('.stackAssistant {'))
    )
    expect(stack).toContain('flex: 1 1 auto')
    // Y la burbuja se estira a lo ancho de esa pila.
    const block = css.slice(
      css.indexOf('.bubbleAssistant {'),
      css.indexOf('}', css.indexOf('.bubbleAssistant {'))
    )
    expect(block).toContain('align-self: stretch')
    // Deja que el wrapper con scroll se encoja en vez de desbordar la fila.
    expect(block).toContain('min-width: 0')
  })

  it('el mensaje del usuario también llena el ancho (no una cajita a la derecha)', () => {
    const css = read(BUBBLE_CSS)
    const stack = css.slice(
      css.indexOf('.stackUser {'),
      css.indexOf('}', css.indexOf('.stackUser {'))
    )
    expect(stack).toContain('flex: 1 1 auto')
    // El tope del 60% que lo dejaba como una cajita pegada al borde derecho.
    expect(stack).not.toContain('60%')
    const bubble = css.slice(
      css.indexOf('.bubbleUser {'),
      css.indexOf('}', css.indexOf('.bubbleUser {'))
    )
    expect(bubble).not.toContain('60%')
  })

  it('el usuario tiene las acciones DENTRO de la burbuja; la IA debajo', () => {
    const bubble = read('src/renderer/src/features/chat/components/MessageBubble/MessageBubble.tsx')
    // El usuario las coloca antes del cierre de su burbuja; la IA, después.
    expect(bubble).toMatch(
      /\{isUser \? actions : null\}\s*<\/div>\s*\{\/\* IA[\s\S]*?\{isUser \? null : actions\}/
    )
  })

  it('los botones de las acciones son el IconButton del input (mismo nudge)', () => {
    const actions = read(
      'src/renderer/src/features/chat/components/MessageActions/MessageActions.tsx'
    )
    // Mismo primitivo y misma forma que el botón de enviar del composer.
    expect(actions).toContain("from '@ui'")
    expect(actions).toContain('<IconButton')
    expect(actions).toContain('shape="rounded"')
    expect(actions).toContain('size="sm"')
    // Y su nudge óptico (el "más a la derecha y un poco más abajo").
    expect(actions).toContain('className={styles.nudge}')
    const actionsCss = read(
      'src/renderer/src/features/chat/components/MessageActions/MessageActions.module.css'
    )
    expect(actionsCss).toMatch(/\.nudge\s*\{[^}]*transform: translate\(2px, 3px\)/)
    // La barra sigue alineándose por variable (el usuario, a la derecha).
    const bubble = read(BUBBLE_CSS)
    const block = bubble.slice(
      bubble.indexOf('.bubbleUser {'),
      bubble.indexOf('}', bubble.indexOf('.bubbleUser {'))
    )
    expect(block).toContain('--msg-actions-justify: flex-end')
  })

  it('la tabla es un <table> real dentro del contenedor con scroll', () => {
    const tsx = read(MD_TSX)
    expect(tsx).toMatch(/<div className=\{styles\.tblWrap\}>[\s\S]*<table className=\{styles\.tbl\}>/)
  })
})
