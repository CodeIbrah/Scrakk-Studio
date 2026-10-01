// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Tabs VIRTUALES — abrir un handler sobre contenido que NO es un archivo.
 *
 * `scrakk-view://<handlerId>/<payload>` viaja por el mismo `editorBus` que un
 * archivo real (por eso el reconcile no la cierra) y el dispatcher la resuelve
 * POR ID, sin tocar el disco. Sirve para que el MISMO visor funcione dentro de
 * un panel (p. ej. la card de un `codefile` del chat) y como tab de primera
 * clase, sin duplicar componentes.
 */

import { virtualPathOf } from '@features/fileHandlers'
import { openFileInEditor } from './editorBus'

/**
 * Abre (o activa) una tab virtual para el handler indicado.
 * `payload` es opaco para el core: lo interpreta el visor.
 */
export function openVirtualTab(handlerId: string, payload = '', title?: string): void {
  openFileInEditor(virtualPathOf(handlerId, payload), title ?? handlerId)
}
