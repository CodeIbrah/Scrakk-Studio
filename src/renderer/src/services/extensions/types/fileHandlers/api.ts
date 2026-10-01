// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tipo 'fileHandlers' — API hacia la capa extensions.
 *
 * Una extensión declara `contributes.fileHandlers` y sus formatos entran al
 * MISMO registry que los built-in: el dispatcher del área central no distingue
 * de dónde vino el handler. Es la segunda puerta al mismo store.
 */

import type { AnyExtensionTypeHandler, ExtensionTypeContext } from '../handler'
import { parseFileHandlerContributions, type FileHandlerContribution } from './schema'
import { buildFileHandler, registerFileHandlerEntry, unregisterFileHandlerEntry } from './logic'

interface RegisteredFileHandlerRef {
  id: string
}

export const fileHandlersHandler: AnyExtensionTypeHandler = {
  kind: 'fileHandlers',

  parse(raw, ctx): FileHandlerContribution[] | null {
    return parseFileHandlerContributions(raw, ctx)
  },

  register(
    contribution: FileHandlerContribution,
    ctx: ExtensionTypeContext
  ): RegisteredFileHandlerRef | null {
    const handler = buildFileHandler(contribution, ctx.resolver)
    if (!handler) return null
    registerFileHandlerEntry(handler)
    return { id: handler.id }
  },

  unregister(owned) {
    for (const ref of owned) {
      unregisterFileHandlerEntry(ref.id)
    }
  }
}
