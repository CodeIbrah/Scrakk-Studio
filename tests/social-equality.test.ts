// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Igualdad de contenido del estado Social.
 *
 * Regresión del lag del panel: el provider expone UN contexto con todo
 * (mensajes + presencia + amigos + typing), así que poner un array/objeto nuevo
 * re-renderiza el panel entero y con él la lista de mensajes. Los refetch de
 * seguridad (10s/15s) lo hacían siempre, aunque no hubiera cambios, y eso
 * invalidaba los `memo` de `MessageList` y de cada `MessageBubble`.
 *
 * Estos comparadores son la defensa: si no cambió nada, se devuelve el MISMO
 * objeto y React no renderiza.
 */

import { describe, it, expect } from 'vitest'
import {
  sameFriends,
  samePresenceMap,
  sameRequests
} from '../src/renderer/src/features/social/state/equality'
import type {
  Friend,
  FriendRequest,
  UserPresence
} from '../src/shared/social'

const friend = (over: Partial<Friend> = {}): Friend => ({
  id: 'u1',
  handle: 'ana',
  displayName: 'Ana',
  avatarUrl: null,
  bio: null,
  gender: null,
  customStatus: null,
  customStatusExpiresAt: null,
  createdAt: null,
  since: '2026-01-01',
  ...over
})

const request = (over: Partial<FriendRequest> = {}): FriendRequest => ({
  id: 'r1',
  direction: 'incoming',
  otherId: 'u2',
  handle: 'beto',
  displayName: 'Beto',
  avatarUrl: null,
  createdAt: '2026-01-01',
  ...over
})

const presence = (over: Partial<UserPresence> = {}): UserPresence => ({
  userId: 'u1',
  status: 'online',
  activity: {},
  updatedAt: '2026-01-01T00:00:00Z',
  ...over
})

describe('sameFriends', () => {
  it('true con listas equivalentes pero distinto objeto', () => {
    expect(sameFriends([friend()], [friend()])).toBe(true)
  })

  it('detecta cada campo que la UI lee', () => {
    expect(sameFriends([friend()], [friend({ displayName: 'Ana B.' })])).toBe(false)
    expect(sameFriends([friend()], [friend({ avatarUrl: 'x.png' })])).toBe(false)
    expect(sameFriends([friend()], [friend({ customStatus: 'hola' })])).toBe(false)
    expect(sameFriends([friend()], [friend({ bio: 'hola' })])).toBe(false)
  })

  it('diferente longitud o id → false', () => {
    expect(sameFriends([friend()], [])).toBe(false)
    expect(sameFriends([friend()], [friend({ id: 'u9' })])).toBe(false)
  })

  it('respeta el ORDEN (el mapa del explorer también)', () => {
    expect(sameFriends([friend(), friend({ id: 'u2' })], [friend({ id: 'u2' }), friend()])).toBe(
      false
    )
  })
})

describe('sameRequests', () => {
  it('true si sólo cambia la identidad', () => {
    expect(sameRequests([request()], [request()])).toBe(true)
  })

  it('detecta direction y otherId', () => {
    expect(sameRequests([request()], [request({ direction: 'outgoing' })])).toBe(false)
    expect(sameRequests([request()], [request({ otherId: 'u9' })])).toBe(false)
  })
})

describe('samePresenceMap', () => {
  it('true con el mismo contenido', () => {
    expect(samePresenceMap({ u1: presence() }, { u1: presence() })).toBe(true)
  })

  it('un latido con otro updatedAt NO es "igual"', () => {
    // El heartbeat refresca `updated_at` a propósito (es lo que mantiene el
    // "online" contra el TTL), así que SÍ hay que propagar ese cambio.
    expect(
      samePresenceMap({ u1: presence() }, { u1: presence({ updatedAt: '2026-01-02T00:00:00Z' }) })
    ).toBe(false)
  })

  it('detecta cambio de estado y de actividad', () => {
    expect(samePresenceMap({ u1: presence() }, { u1: presence({ status: 'away' }) })).toBe(false)
    expect(
      samePresenceMap({ u1: presence() }, { u1: presence({ activity: { project: 'app' } }) })
    ).toBe(false)
  })

  it('detecta alta y baja de usuarios', () => {
    expect(samePresenceMap({ u1: presence() }, {})).toBe(false)
    expect(samePresenceMap({}, { u1: presence() })).toBe(false)
  })
})