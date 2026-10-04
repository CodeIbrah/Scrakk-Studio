// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

export const TERMINAL_IPC = {
  create: 'terminal:create',
  write: 'terminal:write',
  resize: 'terminal:resize',
  destroy: 'terminal:destroy',
  onData: 'terminal:on-data',
  onExit: 'terminal:on-exit',
  getMonoFont: 'terminal:get-mono-font',
  /**
   * Cadena de fuentes de la terminal: la primaria y sus reemplazos, EN ORDEN,
   * tal como los resolvería la terminal del sistema.
   */
  getFontStack: 'terminal:get-font-stack'
} as const

export type TerminalCreateRequest = {
  id: string
  shell?: string
  cwd?: string
  cols?: number
  rows?: number
}

export type TerminalWriteRequest = { id: string; data: string }
export type TerminalResizeRequest = { id: string; cols: number; rows: number }
export type TerminalDestroyRequest = { id: string }

export type TerminalDataPayload = { id: string; data: string }
export type TerminalExitPayload = { id: string; exitCode: number }

/** Una fuente de la cadena de la terminal, con sus bytes ya leídos. */
export type TerminalFontFile = {
  /** Familia de la fuente (sólo diagnóstico; el motor usa los bytes). */
  family: string
  /** Ruta del archivo en el sistema (diagnóstico). */
  file: string
  /** Bytes del archivo, para escribirlo en el FS virtual del motor. */
  data: Uint8Array
}

export interface TerminalApi {
  create: (req: TerminalCreateRequest) => Promise<{ success: boolean; error?: string }>
  write: (req: TerminalWriteRequest) => Promise<void>
  resize: (req: TerminalResizeRequest) => Promise<void>
  destroy: (req: TerminalDestroyRequest) => Promise<void>
  onData: (callback: (payload: TerminalDataPayload) => void) => () => void
  onExit: (callback: (payload: TerminalExitPayload) => void) => () => void
  /** Detecta la fuente monospace del sistema y devuelve sus bytes. */
  getMonoFont: () => Promise<{ data: number[] } | null>
  /**
   * Cadena de fuentes de la terminal: `[0]` es la primaria y el resto son los
   * reemplazos, EN ORDEN — la misma cadena que resolvería la terminal del
   * sistema (fontconfig en Linux).
   *
   * Se resuelve EN CALIENTE en cada llamada: no se guarda en disco ni se
   * empaqueta, así lo que se ve es siempre la fuente del sistema del usuario.
   * `null` si no se pudo resolver ninguna.
   */
  getFontStack: () => Promise<TerminalFontFile[] | null>
}
