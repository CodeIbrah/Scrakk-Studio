// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Menú contextual del EDITOR — usa el ContextMenu GLOBAL de Scrakk (@ui).
 *
 * Acciones básicas: Copiar · Pegar · Seleccionar todo
 * Acción avanzada: Ir a definición (abre el archivo destino en tab).
 *
 * TODO es POR ENGINE: recibe el module (InnertaModule) del engine donde se
 * clickeó. Así cada instancia (archivo multi-editor) ejecuta sus acciones de
 * clipboard en SU módulo — nada de singletons globales
 * (`window.__scrakkInnerta` / activePath) que con varios engines apuntaban al
 * módulo/archivo equivocado.
 *
 * Los combos al engine replican el flujo del TECLADO (innertaInput): Pegar
 * PRECARGA el clipboard del engine (SetInnertaWasmClipboard) antes de la
 * tecla — sin eso el engine pega su clipboard interno (vacío/viejo) y el
 * botón "no hace nada".
 */

import type { ContextMenuItem } from '@ui'
import type { InnertaModule } from './InnertaEngine'
import { showContextMenu } from './menuHost'

// GLFW: C=67, V=86, A=65; mods: ctrl=0x02
const GLFW_KEY_C = 67
const GLFW_KEY_V = 86
const GLFW_KEY_A = 65
const GLFW_MOD_CTRL = 0x02

/** Ejecuta un "atajo" DENTRO del engine dado (mismo camino que el teclado). */
function sendEngineCombo(module: InnertaModule | null, combo: { key: number; mods: number }): void {
  module?.key(combo.key, 1, combo.mods)
}

/** Copia la selección del engine al portapapeles del sistema. */
function copyFromEngine(module: InnertaModule | null): void {
  const text = module?.getSelectedText?.() ?? ''
  if (!text) return
  void navigator.clipboard?.writeText(text).catch(() => {
    // Fallback: el engine también escribe el clipboard por su cuenta (EM_ASM).
    sendEngineCombo(module, { key: GLFW_KEY_C, mods: GLFW_MOD_CTRL })
  })
}

/** Pega: precarga el clipboard del navegador en el engine y entrega Ctrl+V. */
function pasteIntoEngine(module: InnertaModule | null): void {
  if (!module) return
  navigator.clipboard
    ?.readText()
    .then((text) => {
      module.setWasmClipboard?.(text)
      sendEngineCombo(module, { key: GLFW_KEY_V, mods: GLFW_MOD_CTRL })
    })
    .catch(() => {
      // Sin permiso de lectura: la tecla va igual (clipboard interno previo).
      sendEngineCombo(module, { key: GLFW_KEY_V, mods: GLFW_MOD_CTRL })
    })
}

export function openEditorContextMenu(
  module: InnertaModule | null,
  clientX: number,
  clientY: number
): void {
  const items: ContextMenuItem[] = [
    {
      label: 'Copiar',
      disabled: !module,
      onClick: () => copyFromEngine(module)
    },
    {
      label: 'Pegar',
      disabled: !module,
      onClick: () => pasteIntoEngine(module)
    },
    {
      label: 'Seleccionar todo',
      separatorBefore: true,
      disabled: !module,
      onClick: () => sendEngineCombo(module, { key: GLFW_KEY_A, mods: GLFW_MOD_CTRL })
    }
  ]

  showContextMenu(clientX, clientY, items)
}
