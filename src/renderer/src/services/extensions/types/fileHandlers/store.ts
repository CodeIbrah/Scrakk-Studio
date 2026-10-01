// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tipo 'fileHandlers' — store: re-exporta la preferencia visor/texto por
 * archivo (el único estado persistido de este tipo).
 */

export {
  getPreferredMode,
  setPreferredMode,
  subscribeToPreferredModes
} from '@features/fileHandlers/preferences'
