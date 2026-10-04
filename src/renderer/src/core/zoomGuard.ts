// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Bloquea el zoom de PÁGINA de Chromium (Ctrl/⌘ + rueda y Ctrl/⌘ + ±).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ
 *
 * La app tiene SUS zooms: el editor y la terminal lo manejan dentro del motor
 * (Ctrl ± / Ctrl+rueda sobre el canvas) y el visor de nodos tiene el suyo. Todos
 * frenan su propia rueda. Pero en el RESTO de la UI —chat, explorer, paneles—
 * `Ctrl+rueda` no lo frenaba nadie, así que disparaba el zoom de la PÁGINA.
 *
 * Eso encoge TODO el IDE y Chromium lo guarda **por origen en el perfil**
 * (`partition.per_host_zoom_levels`), así que sobrevive al reinicio y no hay
 * forma de volver desde la UI. Nos pasó de verdad: quedó `-23.5` para
 * `localhost` en `~/.config/scrakk-studio/Preferences`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÓMO
 *
 * Fase de CAPTURA y `preventDefault` (NO `stopPropagation`): los handlers de la
 * app —canvas del editor y visor de nodos— siguen recibiendo el evento y
 * zoomeando lo suyo, pero Chromium no aplica el zoom de página.
 *
 * El `setZoomFactor(1)` del main cubre el caso de un perfil que ya venía con el
 * zoom guardado; esto evita que vuelva a pasar.
 */
export function initZoomGuard(): void {
  // Rueda: la vía más fácil de disparar sin querer.
  // `passive: false` es imprescindible — con el default (`passive: true`) el
  // navegador IGNORA el preventDefault.
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
    },
    { passive: false, capture: true }
  )

  // Teclado: Ctrl/⌘ + `+` / `-` / `0`. Igual que arriba, sólo se corta el
  // default del NAVEGADOR; el atajo del motor (que escucha en el canvas) sigue
  // funcionando porque la propagación no se detiene.
  document.addEventListener(
    'keydown',
    (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (['+', '-', '=', '_', '0'].includes(event.key)) event.preventDefault()
    },
    { capture: true }
  )
}
