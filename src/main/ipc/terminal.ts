// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import { TERMINAL_IPC, type TerminalCreateRequest, type TerminalWriteRequest, type TerminalResizeRequest, type TerminalDestroyRequest, type TerminalFontFile } from '@shared/terminal'

import { t } from '@shared/i18n'
interface PtyProc {
  write: (d: string) => void
  resize: (cols: number, rows: number) => void
  kill: (sig?: string) => void
  onData: (cb: (data: string) => void) => void
  onExit: (cb: (code: number) => void) => void
}

const terms = new Map<string, PtyProc>()

/** Entero positivo o el fallback (node-pty rechaza 0/NaN al crear o resized). */
function positiveInt(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function getShell(shell?: string): string {
  if (shell && shell.startsWith('/')) return shell
  if (shell === 'zsh') return '/bin/zsh'
  if (shell === 'bash' || !shell) return process.env.SHELL || '/bin/bash'
  return shell
}

export function registerTerminalIpc(): void {
  ipcMain.handle(TERMINAL_IPC.create, async (event, req: TerminalCreateRequest) => {
    const { id, shell, cwd, cols, rows } = req
    if (!id) return { success: false, error: t('main.missing.id') }
    if (terms.has(id)) return { success: true }
    const sh = getShell(shell)
    const work = cwd || process.env.HOME || '/'
    // La vista puede medir 0×0 (canvas sin layout todavía): node-pty exige
    // positivos, así que se cae a 80×24.
    const initialCols = positiveInt(cols, 80)
    const initialRows = positiveInt(rows, 24)
    // PTY real con node-pty: convierte \n -> \r\n automáticamente, señales, resize.
    const { npm_config_prefix: _omit, ...cleanEnv } = process.env as Record<string, string | undefined>
    const proc = pty.spawn(sh, [], {
      name: 'xterm-256color',
      cwd: work,
      env: {
        ...cleanEnv,
        TERM: 'xterm-256color',
        COLUMNS: String(initialCols),
        LINES: String(initialRows)
      } as Record<string, string>,
      cols: initialCols,
      rows: initialRows
    }) as unknown as PtyProc

    terms.set(id, proc)
    const win = BrowserWindow.fromWebContents(event.sender)
    const sendData = (data: string): void => {
      win?.webContents.send(TERMINAL_IPC.onData, { id, data })
    }
    const sendExit = (code: number): void => {
      win?.webContents.send(TERMINAL_IPC.onExit, { id, exitCode: code })
    }

    proc.onData((data) => sendData(data))
    proc.onExit((code) => {
      sendExit(code)
      terms.delete(id)
    })
    return { success: true }
  })

  ipcMain.handle(TERMINAL_IPC.write, async (_event, req: TerminalWriteRequest) => {
    const proc = terms.get(req.id)
    if (proc) proc.write(req.data)
  })

  ipcMain.handle(TERMINAL_IPC.resize, async (_event, req: TerminalResizeRequest) => {
    const proc = terms.get(req.id)
    if (!proc) return
    // La vista emite resize antes de tener tamaño: node-pty tira
    // "resizing must be done using positive cols and rows". Se ignora.
    const cols = positiveInt(req.cols, 0)
    const rows = positiveInt(req.rows, 0)
    if (cols > 0 && rows > 0) proc.resize(cols, rows)
  })

  ipcMain.handle(TERMINAL_IPC.destroy, async (_event, req: TerminalDestroyRequest) => {
    const proc = terms.get(req.id)
    if (proc) {
      proc.kill()
      terms.delete(req.id)
    }
  })

  // Detect the system's default monospace font and return its bytes.
  // The renderer writes them to the WASM virtual FS so FreeType can load it.
  ipcMain.handle(TERMINAL_IPC.getMonoFont, async () => {
    try {
      const fontPath = detectSystemMonoFont()
      if (!fontPath) return null
      const data = fs.readFileSync(fontPath)
      return { data: Array.from(data) }
    } catch {
      return null
    }
  })

  // Cadena COMPLETA de la terminal (primaria + reemplazos), resuelta EN CALIENTE
  // desde el sistema. Ver `resolveFontStack`.
  ipcMain.handle(TERMINAL_IPC.getFontStack, async () => {
    try {
      return readFontStack(resolveFontCandidates())
    } catch {
      return null
    }
  })
}

/**
 * Presupuesto de la cadena: las fuentes del sistema son GRANDES y cada módulo
 * WASM (una terminal) carga su propia copia, así que sin tope un Noto CJK de
 * ~20 MB por terminal se come la memoria. Con esto entran las de símbolos,
 * box-drawing, braille y powerline (que son las que se veían distintas) y se
 * saltean las gigantes.
 */
const FONT_STACK_MAX_FONTS = 10
const FONT_STACK_MAX_FONT_BYTES = 6 * 1024 * 1024
const FONT_STACK_MAX_TOTAL_BYTES = 24 * 1024 * 1024

/**
 * Rutas de las fuentes de la terminal, EN ORDEN (primaria primero).
 *
 * Linux: **fontconfig**. `fc-match -s monospace` devuelve la lista ORDENADA tal
 * como la resolvería una terminal de verdad (es la misma fuente que usan
 * alacritty/wezterm), así un `─` o un `⠋` salen de la MISMA fuente que en la
 * terminal del usuario. Windows: no hay fontconfig; se usa la lista de fuentes
 * que Windows usa para consolas (Consolas + símbolos + emoji + CJK).
 *
 * No se cachea en disco: se resuelve al abrir y se descarta al cerrar.
 */
function resolveFontCandidates(): string[] {
  if (process.platform === 'win32') {
    const dir = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
    return [
      'consola.ttf', // Consolas: la mono por defecto de las consolas de Windows
      'lucon.ttf', // Lucida Console
      'seguisym.ttf', // Segoe UI Symbol: box-drawing, flechas, dingbats
      'seguiemj.ttf', // Segoe UI Emoji
      'arial.ttf',
      'msgothic.ttc', // CJK (japonés)
      'malgun.ttf', // CJK (coreano)
      'msyh.ttc', // CJK (chino simplificado)
      'simsun.ttc'
    ]
      .map((name) => path.join(dir, name))
      .filter((file) => fs.existsSync(file))
  }

  const out: string[] = []
  const push = (file: string): void => {
    if (file && fs.existsSync(file) && !out.includes(file)) out.push(file)
  }
  try {
    const list = execSync('fc-match -s --format=%{file}\\n monospace', {
      encoding: 'utf-8',
      timeout: 4000
    })
    for (const line of list.split('\n')) push(line.trim())
  } catch {
    // Sin fontconfig: al menos la mono detectada de siempre.
    const only = detectSystemMonoFont()
    if (only) push(only)
  }
  return out
}

/** Lee los archivos de la cadena (con sus topes) y les pone un nombre legible. */
function readFontStack(candidates: string[]): TerminalFontFile[] | null {
  const out: TerminalFontFile[] = []
  let total = 0
  for (const file of candidates) {
    if (out.length >= FONT_STACK_MAX_FONTS) break
    try {
      const stat = fs.statSync(file)
      if (stat.size > FONT_STACK_MAX_FONT_BYTES) continue
      if (total + stat.size > FONT_STACK_MAX_TOTAL_BYTES) continue
      const data = fs.readFileSync(file)
      total += data.byteLength
      out.push({
        family: path.basename(file).replace(/\.[^.]+$/, ''),
        file,
        data: new Uint8Array(data)
      })
    } catch {
      // Archivo ilegible: se saltea en vez de tirar abajo la cadena.
    }
  }
  return out.length > 0 ? out : null
}

/**
 * Detect the system's default monospace font.
 * Linux: fc-match (fontconfig), Windows: Consolas, macOS: Menlo.
 */
function detectSystemMonoFont(): string | null {
  const platform = process.platform

  if (platform === 'linux') {
    try {
      const result = execSync('fc-match --format=%{file} monospace', {
        encoding: 'utf-8',
        timeout: 3000
      }).trim()
      if (result && fs.existsSync(result)) return result
    } catch {}
    // Fallback: common Linux monospace fonts
    const candidates = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
      '/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf',
      '/usr/share/fonts/truetype/noto/NotoSansMono-Regular.ttf',
    ]
    return candidates.find(p => fs.existsSync(p)) ?? null
  }

  if (platform === 'win32') {
    const winFonts = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')
    const candidates = [
      path.join(winFonts, 'consola.ttf'),
      path.join(winFonts, 'lucon.ttf'),
      path.join(winFonts, 'cour.ttf'),
    ]
    return candidates.find(p => fs.existsSync(p)) ?? null
  }

  if (platform === 'darwin') {
    const candidates = [
      '/System/Library/Fonts/Menlo.ttc',
      '/System/Library/Fonts/Courier.dfont',
      '/Library/Fonts/Menlo.ttc',
    ]
    return candidates.find(p => fs.existsSync(p)) ?? null
  }

  return null
}
