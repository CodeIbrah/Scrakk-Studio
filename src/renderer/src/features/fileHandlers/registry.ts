// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Registry de excepciones por formato.
 *
 * Mismo patrón que el `ExtensionRegistry` (store único + `subscribe`): los
 * consumidores (el dispatcher del área central, el botón del ojo en la tab)
 * leen de acá y se re-renderizan al registrarse/quitarse handlers.
 *
 * Los handlers first-party se registran con `registerBuiltinFileHandlers()`
 * (barrel, como `tools/index.ts`). Una extensión puede aportar los suyos
 * después por el mismo camino.
 */

import { pickHandler } from './detect'
import type { FileHandler } from './types'

type Listener = () => void

class FileHandlerRegistry {
  private handlers = new Map<string, FileHandler>()
  private listeners = new Set<Listener>()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch {
        // Un suscriptor roto no debe tumbar a los demás.
      }
    }
  }

  /** Registra (o reemplaza) un handler. Devuelve el desregistro. */
  register(handler: FileHandler): () => void {
    this.handlers.set(handler.id, handler)
    this.emit()
    return () => this.unregister(handler.id)
  }

  unregister(id: string): void {
    if (this.handlers.delete(id)) this.emit()
  }

  get(id: string): FileHandler | null {
    return this.handlers.get(id) ?? null
  }

  list(): FileHandler[] {
    return [...this.handlers.values()]
  }

  /** El handler que corresponde a este archivo (o null → editor). */
  resolve(path: string): FileHandler | null {
    return pickHandler(this.list(), path)
  }
}

export const fileHandlerRegistry = new FileHandlerRegistry()
