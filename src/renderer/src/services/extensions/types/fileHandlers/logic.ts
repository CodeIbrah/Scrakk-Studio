// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tipo 'fileHandlers' — lógica.
 *
 * Construye el `FileHandler` del registry global a partir de la contribución.
 * El visor se resuelve con `panelComponentLoader` (import dinámico del paquete):
 * nunca se mete un `ComponentType` directo, así el código del visor no engorda
 * el bundle principal.
 */

import type { ComponentType } from 'react'
import {
  fileHandlerRegistry,
  type FileHandler,
  type FileHandlerViewProps
} from '@features/fileHandlers'
import { panelComponentLoader, type ComponentResolver } from '../../manifest'
import type { FileHandlerContribution } from './schema'

export function buildFileHandler(
  contribution: FileHandlerContribution,
  resolver: ComponentResolver
): FileHandler | null {
  const componentPath = contribution.component
  if (contribution.mode !== 'text' && !componentPath) {
    console.warn(
      `[extensions/fileHandlers] "${contribution.id}" es '${contribution.mode}' pero no trae component`
    )
    return null
  }

  let load: FileHandler['load']
  if (componentPath) {
    const loader = panelComponentLoader(resolver, componentPath)
    load = async () => ({
      default: (await loader()) as unknown as ComponentType<FileHandlerViewProps>
    })
  }

  return {
    id: contribution.id,
    match: contribution.match,
    mode: contribution.mode,
    priority: contribution.priority,
    load
  }
}

export function registerFileHandlerEntry(handler: FileHandler): void {
  fileHandlerRegistry.register(handler)
}

export function unregisterFileHandlerEntry(id: string): void {
  fileHandlerRegistry.unregister(id)
}
