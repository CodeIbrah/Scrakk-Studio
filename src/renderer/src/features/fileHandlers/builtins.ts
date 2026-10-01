// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Registro de los handlers FIRST-PARTY.
 *
 * Barrel, igual que `tools/index.ts`: una lista explícita (nada de globs
 * mágicos) que se registra una sola vez al arrancar. Los handlers que deban
 * poder desactivarse o shipearse aparte pueden venir después por el mismo
 * registry (manifest de una extensión builtin/instalada).
 */

import { fileHandlerRegistry } from './registry'
import { imageHandler } from './handlers/image'
import { markdownHandler } from './handlers/markdown'
import { svgHandler } from './handlers/svg'

let registered = false

/** Registra los handlers built-in (idempotente). */
export function registerBuiltinFileHandlers(): void {
  if (registered) return
  registered = true
  for (const handler of [imageHandler, markdownHandler, svgHandler]) {
    fileHandlerRegistry.register(handler)
  }
}
