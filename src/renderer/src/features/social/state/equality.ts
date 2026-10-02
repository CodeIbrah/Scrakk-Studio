// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Igualdad de contenido para el estado del panel Social.
 *
 * Estas funciones existen por una razón concreta: el provider publica un
 * único contexto gigante, así que **cualquier** cambio de identidad de un
 * array/objeto re-renderiza el panel entero y, con él, la lista de mensajes.
 *
 * Antes, cada refetch (el de seguridad corría cada 10/15s) ponía `friends`,
 * `requests` y `presenceMap` nuevos aunque no cambiara nada: con eso se
 * invalidaban los `memo` de `MessageList` y de cada `MessageBubble`, y el chat
 * largo se recorría entero cada 15 segundos.
 *
 * Con estos comparadores, un poll que no trae diferencias devuelve el MISMO
 * objeto y React no renderiza nada.
 */

import type { Friend, FriendRequest, UserPresence } from '@shared/social'

/** ¿La lista de amigos tiene el mismo contenido? */
export function sameFriends(a: Friend[], b: Friend[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]
    const y = b[i]
    if (x.id !== y.id) return false
    if (
      x.displayName !== y.displayName ||
      x.handle !== y.handle ||
      x.bio !== y.bio ||
      x.avatarUrl !== y.avatarUrl ||
      x.customStatus !== y.customStatus ||
      x.customStatusExpiresAt !== y.customStatusExpiresAt ||
      x.gender !== y.gender ||
      x.since !== y.since
    ) {
      return false
    }
  }
  return true
}

/** ¿La lista de solicitudes tiene el mismo contenido? */
export function sameRequests(a: FriendRequest[], b: FriendRequest[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]
    const y = b[i]
    if (x.id !== y.id || x.direction !== y.direction || x.otherId !== y.otherId) return false
    if (x.handle !== y.handle || x.displayName !== y.displayName) return false
    if (x.avatarUrl !== y.avatarUrl || x.createdAt !== y.createdAt) return false
  }
  return true
}

/** Mismo criterio para el mapa de presencia (`user_id` → fila). */
export function samePresenceMap(
  a: Record<string, UserPresence>,
  b: Record<string, UserPresence>
): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  for (const key of aKeys) {
    const x = a[key]
    const y = b[key]
    if (!y) return false
    if (x.status !== y.status || x.updatedAt !== y.updatedAt) return false
    if (JSON.stringify(x.activity) !== JSON.stringify(y.activity)) return false
  }
  return true
}