// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Acciones de EDICIÓN sobre el motor Innerta: copiar, cortar, pegar, seleccionar
 * todo, deshacer y rehacer.
 *
 * Son las MISMAS que dispara el teclado (ver `innertaInput`), pero invocables
 * desde afuera del canvas: el menú contextual del editor y el menú **Editar** de
 * la titlebar. Antes la titlebar usaba `document.execCommand(...)`, que opera
 * sobre el DOM y **no** sobre el canvas del motor — por eso sus ítems no hacían
 * nada.
 *
 * Detalles que importan:
 *  - **Copiar/Cortar** escriben el portapapeles del SISTEMA desde
 *    `getSelectedText()`: en WASM el `Ctrl+C` del motor usa su clipboard interno,
 *    no el del SO, así que la tecla sola no alcanza.
 *  - **Pegar** precarga el del sistema (`setWasmClipboard`) y recién entonces
 *    manda `Ctrl+V`; si no, el motor pega su clipboard interno (vacío/viejo).
 *  - **Deshacer/Rehacer** son `Ctrl+Z` / `Ctrl+Y` (lo que escucha el
 *    `InputManager` del motor), no `Ctrl+Shift+Z`.
 */

import type { InnertaModule } from './InnertaEngine'
import { getEditorFiles } from '../../editorBus'
import { innertaModuleFor } from './hostBridge'

// GLFW (glfw3.h): keycodes + modificadores.
const GLFW_KEY_A = 65
const GLFW_KEY_V = 86
const GLFW_KEY_X = 88
const GLFW_KEY_Y = 89
const GLFW_KEY_Z = 90
const GLFW_MOD_CTRL = 0x02

/** Las acciones del bloque Editar. */
export type EditorEditAction = 'copy' | 'cut' | 'paste' | 'selectAll' | 'undo' | 'redo'

function sendCombo(module: InnertaModule, key: number, mods: number): void {
  module.key(key, 1, mods)
}

function writeSystemClipboard(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => {
    // Sin permiso: se pierde el copiado al SO, pero el motor conserva el suyo.
  })
}

/** El módulo del editor ACTIVO (según `activePath`), o `null` si no hay ninguno. */
export function activeEditorModule(): InnertaModule | null {
  return innertaModuleFor(getEditorFiles().activePath)
}

export function copyFromEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  const text = module.getSelectedText?.() ?? ''
  if (text) writeSystemClipboard(text)
  return true
}

export function cutFromEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  const text = module.getSelectedText?.() ?? ''
  if (text) writeSystemClipboard(text)
  // El motor borra la selección (ShortcutManager: ctrl+x → innerta.cut.text).
  sendCombo(module, GLFW_KEY_X, GLFW_MOD_CTRL)
  return true
}

export function pasteIntoEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  navigator.clipboard
    ?.readText()
    .then((text) => {
      module.setWasmClipboard?.(text)
      sendCombo(module, GLFW_KEY_V, GLFW_MOD_CTRL)
    })
    .catch(() => {
      // Sin permiso de lectura: la tecla va igual (clipboard interno previo).
      sendCombo(module, GLFW_KEY_V, GLFW_MOD_CTRL)
    })
  return true
}

export function selectAllInEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  sendCombo(module, GLFW_KEY_A, GLFW_MOD_CTRL)
  return true
}

export function undoInEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  sendCombo(module, GLFW_KEY_Z, GLFW_MOD_CTRL)
  return true
}

export function redoInEditor(module: InnertaModule | null): boolean {
  if (!module) return false
  sendCombo(module, GLFW_KEY_Y, GLFW_MOD_CTRL)
  return true
}

/**
 * Ejecuta una acción del menú Editar.
 *
 * Con `module` explícito (el menú contextual quiere el editor donde se clickeó);
 * sin él, resuelve el editor ACTIVO. Devuelve `false` cuando no hay motor — el
 * llamador decide qué hacer (p. ej. caer al comportamiento DOM de siempre).
 */
export function performEditorEdit(
  action: EditorEditAction,
  module?: InnertaModule | null
): boolean {
  const mod = module === undefined ? activeEditorModule() : module
  switch (action) {
    case 'copy':
      return copyFromEditor(mod)
    case 'cut':
      return cutFromEditor(mod)
    case 'paste':
      return pasteIntoEditor(mod)
    case 'selectAll':
      return selectAllInEditor(mod)
    case 'undo':
      return undoInEditor(mod)
    case 'redo':
      return redoInEditor(mod)
  }
}
