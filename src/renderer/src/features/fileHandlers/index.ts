// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * FileHandlers — API pública.
 *
 * El editor (área central) consulta el registry para decidir si un archivo se
 * muestra como PIEZA (viewer registrado) o como TEXTO (editor Innerta), y el
 * header de la tab ofrece el ojo para alternar cuando el formato lo permite.
 */

export { fileHandlerRegistry } from './registry'
export { registerBuiltinFileHandlers } from './builtins'
export {
  baseNameOf,
  extensionOf,
  matches,
  matchesGlob,
  pickHandler,
  schemeOf
} from './detect'
export {
  canToggleMode,
  effectiveMode,
  getPreferredMode,
  setPreferredMode,
  subscribeToPreferredModes,
  type FileViewMode
} from './preferences'
export type {
  FileAction,
  FileActionContext,
  FileHandler,
  FileHandlerMatch,
  FileHandlerMode,
  FileHandlerViewProps
} from './types'
