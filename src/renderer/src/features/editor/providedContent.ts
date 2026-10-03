// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Contenido PROVISTO por la app para una tab que no es un archivo en disco.
 *
 * Hay tabs de archivo cuyo texto no sale de `readEncoded`: hoy la tab de diff,
 * que muestra el "después" de un cambio que quizá nunca se guardó. Sin esta
 * puerta, `fileSession` leería el disco con un path sintético, fallaría y
 * dejaría la sesión vacía (una tab en blanco, sin error visible).
 *
 * Es genérico A PROPÓSITO: no sabe de diffs. Cualquier feature que necesite
 * abrir una tab con contenido en memoria registra su path acá y `fileSession`
 * lo respeta. El contenido vive mientras la tab viva; se baja al cerrarla.
 */

export interface ProvidedContent {
  /** Texto inicial de la sesión (lo que el editor muestra). */
  text: string
  /**
   * La tab NO se edita. El motor lo aplica de verdad (bloquea tipeo, borrado,
   * pegado, cortado y undo/redo); ver `EditorEngine.setReadOnly`.
   */
  readOnly?: boolean
}

const provided = new Map<string, ProvidedContent>()

/** Registra (o reemplaza) el contenido de un path sintético. */
export function setProvidedContent(path: string, content: ProvidedContent): void {
  provided.set(path, content)
}

/** Contenido provisto de un path, si lo hay. */
export function getProvidedContent(path: string): ProvidedContent | undefined {
  return provided.get(path)
}

/** ¿Este path tiene contenido provisto (y por lo tanto no se lee del disco)? */
export function hasProvidedContent(path: string): boolean {
  return provided.has(path)
}

/** Baja el contenido (se llama al cerrar la tab). */
export function clearProvidedContent(path: string): void {
  provided.delete(path)
}
